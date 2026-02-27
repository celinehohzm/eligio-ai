from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from config.config import Config
import logging

from app.extensions import db
from app.models import Document, Submission

upload_bp = Blueprint('upload', __name__)

# Document categories and subtypes
DOCUMENT_CATEGORIES = {
    "Referral Note": ["General", "Specialist", "Emergency"],
    "Clinical Notes": ["Progress Note", "Discharge Summary", "Admission Note"],
    "Imaging Notes": ["MRI", "CT", "PET", "Ultrasound"],
    "Lab Results": ["CBC", "CMP", "CSF", "Genetic Test", "Other"],
    "Other Test Results": ["EEG", "EMG", "Sleep Study", "Other"]
}

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def create_upload_directory():
    """Create upload directory with date subfolder"""
    today = datetime.now().strftime('%Y-%m-%d')
    upload_dir = os.path.join(Config.UPLOAD_FOLDER, today)
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    return upload_dir

@upload_bp.route('/upload-documents', methods=['POST'])
def upload_documents():
    """Handle document uploads from external providers"""
    saved_paths = []
    try:
        # Create upload directory
        upload_dir = create_upload_directory()
        
        # Parse form data
        patient_data = {
            'fullName': request.form.get('fullName'),
            'age': request.form.get('age'),
            'dateOfBirth': request.form.get('dateOfBirth'),
            'address': request.form.get('address'),
            'phoneNumber': request.form.get('phoneNumber')
        }
        
        # Validate required patient fields
        missing_fields = [k for k, v in patient_data.items() if not v]
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Process uploaded files
        uploaded_files = []
        file_keys = [key for key in request.files.keys() if key.startswith('file_')]
        submission_id = str(uuid.uuid4())

        submission = Submission(
            id=submission_id,
            full_name=patient_data['fullName'],
            age=patient_data['age'],
            date_of_birth=patient_data['dateOfBirth'],
            address=patient_data['address'],
            phone_number=patient_data['phoneNumber'],
            status='received'
        )

        db.session.add(submission)
        
        for file_key in file_keys:
            file = request.files[file_key]
            
            if file and file.filename and allowed_file(file.filename):
                # Generate unique filename
                original_filename = secure_filename(file.filename)
                file_extension = original_filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
                
                # Save file
                file_path = os.path.join(upload_dir, unique_filename)
                file.save(file_path)
                saved_paths.append(file_path)
                
                # Extract metadata from form.
                # Supports both:
                # - category_file_0_0 / subtype_file_0_0
                # - category_0_0 / subtype_0_0 (frontend format)
                key_suffix = file_key[5:] if file_key.startswith('file_') else file_key
                category = (
                    request.form.get(f'category_{file_key}')
                    or request.form.get(f'category_{key_suffix}')
                    or 'Unknown'
                )
                subtype = (
                    request.form.get(f'subtype_{file_key}')
                    or request.form.get(f'subtype_{key_suffix}')
                    or 'Unknown'
                )
                
                document = Document(
                    id=str(uuid.uuid4()),
                    submission_id=submission_id,
                    original_name=original_filename,
                    filename=unique_filename,
                    file_path=file_path,
                    category=category,
                    subtype=subtype,
                    size=os.path.getsize(file_path),
                    status='uploaded'
                )
                db.session.add(document)
                
                uploaded_files.append(document)
            else:
                logging.warning(f"Invalid file skipped: {file.filename}")

        db.session.commit()
        
        return jsonify({
            'success': True,
            'submissionId': submission_id,
            'message': f'Successfully uploaded {len(uploaded_files)} documents',
            'uploadedFiles': len(uploaded_files)
        })
        
    except Exception as e:
        db.session.rollback()
        for saved_path in saved_paths:
            try:
                if os.path.exists(saved_path):
                    os.remove(saved_path)
            except Exception:
                pass
        logging.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Failed to upload documents'}), 500

@upload_bp.route('/document-categories', methods=['GET'])
def get_document_categories():
    """Return available document categories and subtypes"""
    return jsonify(DOCUMENT_CATEGORIES)

@upload_bp.route('/upload/health', methods=['GET'])
def upload_health():
    """Health check endpoint for upload service"""
    return jsonify({
        'status': 'healthy',
        'service': 'Document Upload Service',
        'upload_folder': Config.UPLOAD_FOLDER,
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
