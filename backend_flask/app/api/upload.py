from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
import json
from datetime import datetime
from config.config import Config
import logging

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
                
                # Extract metadata from form
                category = request.form.get(f'category_{file_key}', 'Unknown')
                subtype = request.form.get(f'subtype_{file_key}', 'Unknown')
                
                file_info = {
                    'id': str(uuid.uuid4()),
                    'originalName': original_filename,
                    'filename': unique_filename,
                    'filePath': file_path,
                    'category': category,
                    'subtype': subtype,
                    'size': os.path.getsize(file_path),
                    'uploadedAt': datetime.now().isoformat(),
                    'status': 'uploaded'
                }
                
                uploaded_files.append(file_info)
            else:
                logging.warning(f"Invalid file skipped: {file.filename}")
        
        # Create submission record
        submission = {
            'id': str(uuid.uuid4()),
            'patientInfo': patient_data,
            'documents': uploaded_files,
            'submittedAt': datetime.now().isoformat(),
            'status': 'received'
        }
        
        # Save submission metadata (in production, save to database)
        save_submission_metadata(submission, upload_dir)
        
        return jsonify({
            'success': True,
            'submissionId': submission['id'],
            'message': f'Successfully uploaded {len(uploaded_files)} documents',
            'uploadedFiles': len(uploaded_files)
        })
        
    except Exception as e:
        logging.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Failed to upload documents'}), 500

def save_submission_metadata(submission, upload_dir):
    """Save submission metadata to JSON file"""
    try:
        metadata_file = os.path.join(upload_dir, f"submission_{submission['id']}.json")
        with open(metadata_file, 'w') as f:
            json.dump(submission, f, indent=2)
        logging.info(f"Submission metadata saved: {metadata_file}")
    except Exception as e:
        logging.error(f"Failed to save submission metadata: {str(e)}")

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
        # In production, this would query a database
        # For now, search upload directories
        for root, dirs, files in os.walk(Config.UPLOAD_FOLDER):
            for file in files:
                if file == f"submission_{submission_id}.json":
                    metadata_path = os.path.join(root, file)
                    with open(metadata_path, 'r') as f:
                        submission = json.load(f)
                    return jsonify(submission)
        
        return jsonify({'error': 'Submission not found'}), 404
        
    except Exception as e:
        logging.error(f"Error retrieving submission: {str(e)}")
        return jsonify({'error': 'Failed to retrieve submission'}), 500
