import os
import magic
from PIL import Image
import PyPDF2
from config.config import Config
import logging

def validate_file_type(file_path):
    """Validate file type using python-magic"""
    try:
        mime = magic.Magic(mime=True)
        file_type = mime.from_file(file_path)
        
        allowed_types = {
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'image/jpeg': 'jpg',
            'image/png': 'png'
        }
        
        return allowed_types.get(file_type)
        
    except Exception as e:
        logging.error(f"File type validation error: {str(e)}")
        return None

def extract_pdf_text(file_path):
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
            
            return text.strip()
            
    except Exception as e:
        logging.error(f"PDF text extraction error: {str(e)}")
        return None

def extract_image_metadata(file_path):
    """Extract metadata from image file"""
    try:
        with Image.open(file_path) as img:
            return {
                'format': img.format,
                'size': img.size,
                'mode': img.mode
            }
    except Exception as e:
        logging.error(f"Image metadata extraction error: {str(e)}")
        return None

def get_file_info(file_path):
    """Get comprehensive file information"""
    try:
        stat = os.stat(file_path)
        file_type = validate_file_type(file_path)
        
        info = {
            'name': os.path.basename(file_path),
            'size': stat.st_size,
            'created': stat.st_ctime,
            'modified': stat.st_mtime,
            'type': file_type
        }
        
        # Add type-specific metadata
        if file_type == 'pdf':
            info['text_content'] = extract_pdf_text(file_path)
        elif file_type in ['jpg', 'jpeg', 'png']:
            info['image_metadata'] = extract_image_metadata(file_path)
        
        return info
        
    except Exception as e:
        logging.error(f"File info extraction error: {str(e)}")
        return None

def sanitize_filename(filename):
    """Sanitize filename for safe storage"""
    import re
    # Remove or replace unsafe characters
    filename = re.sub(r'[^\w\-_.]', '_', filename)
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    return filename
