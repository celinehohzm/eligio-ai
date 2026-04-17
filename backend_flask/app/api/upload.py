from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from config.config import Config
import logging

from app.extensions import db, limiter
from app.models import Document, Submission
from app.models import User
from app.roles import can_access_upload

upload_bp = Blueprint('upload', __name__)

REFERRAL_DOCUMENT_CATEGORY = "Referral PDF"
REFERRAL_DOCUMENT_SUBTYPE = "Referral Intake"


def allowed_referral_pdf(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() == "pdf"

def authorize_upload_request():
    """Allow either a trusted external upload API key or an authenticated user JWT."""
    required_api_key = Config.UPLOAD_API_KEY

    request_api_key = request.headers.get("X-Upload-Api-Key")
    if required_api_key and request_api_key == required_api_key:
        return True, None

    if request.headers.get("Authorization", "").startswith("Bearer "):
        try:
            verify_jwt_in_request()
            current_email = get_jwt_identity()
            user = User.query.filter_by(email=current_email).first()
            if not user:
                return False, 'User not found'
            if not can_access_upload(user.role):
                return False, 'Upload access is not available for your role'
            return True, None
        except Exception:
            return False, 'Unauthorized upload request'

    return (not required_api_key), ('Unauthorized upload request' if required_api_key else None)

@upload_bp.route('/upload-documents', methods=['POST'])
@limiter.limit("20 per minute")
def upload_documents():
    """Handle document uploads from external providers"""
    saved_keys = []
    try:
        is_authorized, auth_error = authorize_upload_request()
        if not is_authorized:
            status_code = 403 if auth_error == 'Upload access is not available for your role' else 401
            return jsonify({'error': auth_error or 'Unauthorized upload request'}), status_code

        # Parse form data
        referral_data = {
            'fullName': request.form.get('fullName'),
            'dateOfBirth': request.form.get('dateOfBirth'),
            'address': request.form.get('address'),
            'phoneNumber': request.form.get('phoneNumber'),
            'doctorName': request.form.get('doctorName'),
            'reasonForReferral': request.form.get('reasonForReferral'),
        }
        referral_packet_text = request.form.get('referralPacketText', '')

        missing_fields = [k for k, v in referral_data.items() if not v]
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400

        if len(request.files) != 1:
            return jsonify({'error': 'Exactly one PDF file is required'}), 400

        file = request.files.get('referralPdf') or next(iter(request.files.values()), None)
        if not file or not file.filename:
            return jsonify({'error': 'A referral PDF is required'}), 400

        if not allowed_referral_pdf(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400

        submission_id = str(uuid.uuid4())

        submission = Submission(
            id=submission_id,
            full_name=referral_data['fullName'],
            date_of_birth=referral_data['dateOfBirth'],
            address=referral_data['address'],
            phone_number=referral_data['phoneNumber'],
            doctor_name=referral_data['doctorName'],
            reason_for_referral=referral_data['reasonForReferral'],
            status='received'
        )

        extracted_summary = current_app.ai_service.extract_referral_summary(
            referral_packet_text,
            reason_for_referral=referral_data['reasonForReferral'],
        )
        submission.chief_complaint = extracted_summary.get('chiefComplaint')
        submission.evaluation = extracted_summary.get('evaluation')
        submission.diagnosis = extracted_summary.get('diagnosis')

        db.session.add(submission)

        uploaded_files = []
        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
        file.stream.seek(0, os.SEEK_END)
        file_size = file.stream.tell()
        file.stream.seek(0)

        relative_dir = datetime.now().strftime('%Y-%m-%d')
        relative_path = os.path.join(relative_dir, unique_filename)
        storage_result = current_app.storage_service.save_file(
            file,
            relative_path,
            content_type=file.mimetype,
        )
        saved_keys.append(storage_result['storage_key'])

        document = Document(
            id=str(uuid.uuid4()),
            submission_id=submission_id,
            original_name=original_filename,
            filename=unique_filename,
            file_path=storage_result['file_path'],
            category=REFERRAL_DOCUMENT_CATEGORY,
            subtype=REFERRAL_DOCUMENT_SUBTYPE,
            size=file_size,
            status='uploaded',
            storage_provider=storage_result['provider'],
            storage_key=storage_result['storage_key'],
        )
        db.session.add(document)
        uploaded_files.append(document)

        db.session.commit()
        
        return jsonify({
            'success': True,
            'submissionId': submission_id,
            'message': f'Successfully uploaded {len(uploaded_files)} documents',
            'uploadedFiles': len(uploaded_files)
        })
        
    except Exception as e:
        db.session.rollback()
        for saved_key in saved_keys:
            try:
                current_app.storage_service.delete_file(saved_key)
            except Exception:
                pass
        logging.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Failed to upload documents'}), 500

@upload_bp.route('/document-categories', methods=['GET'])
def get_document_categories():
    """Return the single supported referral upload type."""
    return jsonify({
        REFERRAL_DOCUMENT_CATEGORY: [REFERRAL_DOCUMENT_SUBTYPE]
    })

@upload_bp.route('/upload/health', methods=['GET'])
def upload_health():
    """Health check endpoint for upload service"""
    return jsonify({
        'status': 'healthy',
        'service': 'Document Upload Service',
        'upload_folder': Config.UPLOAD_FOLDER,
        'storage_provider': Config.STORAGE_PROVIDER,
        'max_file_size': Config.MAX_CONTENT_LENGTH,
        'allowed_extensions': list(Config.ALLOWED_EXTENSIONS)
    })

@upload_bp.route('/submissions/<submission_id>', methods=['GET'])
def get_submission(submission_id):
    """Get submission details by ID (for testing/admin)"""
    try:
        submission = Submission.query.filter_by(id=submission_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        return jsonify(submission.to_dict())
        
    except Exception as e:
        logging.error(f"Error retrieving submission: {str(e)}")
        return jsonify({'error': 'Failed to retrieve submission'}), 500
