from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename
import io
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


def _clean_form_value(value):
    return (value or "").strip()


def validate_referral_metadata(referral_data):
    cleaned = {key: _clean_form_value(value) for key, value in referral_data.items()}
    missing_fields = [key for key, value in cleaned.items() if not value]
    if missing_fields:
        return None, f"Missing required fields: {', '.join(missing_fields)}"

    return cleaned, None


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
        cleaned_referral_data, metadata_error = validate_referral_metadata(referral_data)
        if metadata_error:
            return jsonify({'error': metadata_error}), 400

        if len(request.files) != 1:
            return jsonify({'error': 'Exactly one PDF file is required'}), 400

        file = request.files.get('referralPdf') or next(iter(request.files.values()), None)
        if not file or not file.filename:
            return jsonify({'error': 'A referral PDF is required'}), 400

        if not allowed_referral_pdf(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400

        original_filename = secure_filename(file.filename)
        file.stream.seek(0)
        original_file_bytes = file.stream.read()
        file.stream.seek(0)

        processed_pdf = current_app.pdf_ocr_service.process_referral_pdf(original_file_bytes)
        if processed_pdf.error:
            return jsonify({'error': processed_pdf.error}), 400

        extracted_pdf_text = processed_pdf.extracted_text or ""

        submission_id = str(uuid.uuid4())

        submission = Submission(
            id=submission_id,
            full_name=cleaned_referral_data['fullName'],
            date_of_birth=cleaned_referral_data['dateOfBirth'],
            address=cleaned_referral_data['address'],
            phone_number=cleaned_referral_data['phoneNumber'],
            doctor_name=cleaned_referral_data['doctorName'],
            reason_for_referral=cleaned_referral_data['reasonForReferral'],
            status='received'
        )

        extracted_summary = current_app.ai_service.extract_referral_summary(
            extracted_pdf_text,
            reason_for_referral=cleaned_referral_data['reasonForReferral'],
        )
        submission.chief_complaint = extracted_summary.get('chiefComplaint')
        submission.evaluation = extracted_summary.get('evaluation')
        submission.diagnosis = extracted_summary.get('diagnosis')

        db.session.add(submission)

        uploaded_files = []
        stored_pdf_bytes = processed_pdf.stored_pdf_bytes or original_file_bytes
        unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
        file_size = len(stored_pdf_bytes)

        relative_dir = datetime.now().strftime('%Y-%m-%d')
        relative_path = os.path.join(relative_dir, unique_filename)
        storage_file = FileStorage(
            stream=io.BytesIO(stored_pdf_bytes),
            filename=original_filename,
            content_type=file.mimetype or "application/pdf",
        )
        storage_result = current_app.storage_service.save_file(
            storage_file,
            relative_path,
            content_type=file.mimetype or "application/pdf",
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
            'uploadedFiles': len(uploaded_files),
            'ocrApplied': processed_pdf.ocr_applied,
        })
        
    except Exception as e:
        if isinstance(e, RequestEntityTooLarge):
            raise
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
    ocr_status = current_app.pdf_ocr_service.get_dependency_status()
    return jsonify({
        'status': 'healthy',
        'service': 'Document Upload Service',
        'upload_folder': current_app.config['UPLOAD_FOLDER'],
        'storage_provider': current_app.config['STORAGE_PROVIDER'],
        'max_file_size': current_app.config['MAX_CONTENT_LENGTH'],
        'allowed_extensions': list(current_app.config['ALLOWED_EXTENSIONS']),
        'pdf_ocr': ocr_status,
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
