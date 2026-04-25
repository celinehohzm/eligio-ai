import io

from flask import Blueprint, current_app, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from app.extensions import db, limiter
from app.models import Document, Submission, User
from app.roles import can_access_referral_search

referrals_bp = Blueprint('referrals', __name__)


def _get_scheduler_user():
    current_email = get_jwt_identity()
    if not current_email:
        return None
    return User.query.filter_by(email=current_email).first()


def _build_referral_triage_data(submission):
    triage_profile = {
        "insurance": None,
        "medicalRecordNumber": None,
        "chiefComplaint": submission.chief_complaint or submission.reason_for_referral,
        "historyOfPresentIllness": None,
        "physicalExam": None,
        "imagingResults": None,
        "labResults": None,
        "otherProviders": None,
    }

    referral_document = next(
        (document for document in submission.documents if document.category == "Referral PDF"),
        None,
    )
    if not referral_document:
        return triage_profile

    try:
        file_bytes = current_app.storage_service.read_file(
            referral_document.storage_key or referral_document.file_path
        )
        processed_pdf = current_app.pdf_ocr_service.process_referral_pdf(file_bytes)
        triage_profile.update(
            current_app.ai_service.extract_referral_triage_profile(
                processed_pdf.extracted_text or "",
                reason_for_referral=submission.reason_for_referral,
            )
        )
    except Exception:
        current_app.logger.warning(
            "Failed to derive triage profile for referral %s",
            submission.id,
            exc_info=True,
        )

    return triage_profile


def _serialize_referral(submission):
    payload = submission.to_dict()
    triage_profile = _build_referral_triage_data(submission)
    payload["patientInfo"]["insurance"] = triage_profile.get("insurance")
    payload["patientInfo"]["medicalRecordNumber"] = triage_profile.get("medicalRecordNumber")
    payload["triageHighlights"] = {
        "chiefComplaint": triage_profile.get("chiefComplaint"),
        "historyOfPresentIllness": triage_profile.get("historyOfPresentIllness"),
        "physicalExam": triage_profile.get("physicalExam"),
        "imagingResults": triage_profile.get("imagingResults"),
        "labResults": triage_profile.get("labResults"),
        "otherProviders": triage_profile.get("otherProviders"),
    }
    return payload


@referrals_bp.route('/referrals', methods=['GET'])
@jwt_required()
@limiter.limit('60 per minute')
def list_referrals():
    user = _get_scheduler_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not can_access_referral_search(user.role):
        return jsonify({'error': 'Referral search is not available for your role'}), 403

    query_text = (request.args.get('q') or '').strip()
    query = Submission.query.order_by(Submission.submitted_at.desc())

    if query_text:
        search_term = f"%{query_text}%"
        query = query.filter(
            or_(
                Submission.full_name.ilike(search_term),
                Submission.doctor_name.ilike(search_term),
                Submission.reason_for_referral.ilike(search_term),
                Submission.chief_complaint.ilike(search_term),
                Submission.diagnosis.ilike(search_term),
            )
        )

    items = [submission.to_referral_list_item() for submission in query.limit(50).all()]
    return jsonify({'items': items})


@referrals_bp.route('/referrals/<submission_id>', methods=['GET'])
@jwt_required()
@limiter.limit('120 per minute')
def get_referral(submission_id):
    user = _get_scheduler_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not can_access_referral_search(user.role):
        return jsonify({'error': 'Referral search is not available for your role'}), 403

    submission = Submission.query.filter_by(id=submission_id).first()
    if not submission:
        return jsonify({'error': 'Referral not found'}), 404

    return jsonify(_serialize_referral(submission))


@referrals_bp.route('/referrals/<submission_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit('30 per minute')
def delete_referral(submission_id):
    user = _get_scheduler_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not can_access_referral_search(user.role):
        return jsonify({'error': 'Referral search is not available for your role'}), 403

    submission = Submission.query.filter_by(id=submission_id).first()
    if not submission:
        return jsonify({'error': 'Referral not found'}), 404

    for document in submission.documents:
        current_app.storage_service.delete_file(document.storage_key or document.file_path)

    db.session.delete(submission)
    db.session.commit()

    return jsonify({'message': 'Referral deleted successfully'})


@referrals_bp.route('/referrals/<submission_id>/documents/<document_id>/content', methods=['GET'])
@jwt_required()
@limiter.limit('120 per minute')
def get_referral_document_content(submission_id, document_id):
    user = _get_scheduler_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not can_access_referral_search(user.role):
        return jsonify({'error': 'Referral search is not available for your role'}), 403

    document = Document.query.filter_by(id=document_id, submission_id=submission_id).first()
    if not document:
        return jsonify({'error': 'Referral document not found'}), 404

    if document.category != "Referral PDF":
        return jsonify({'error': 'Only referral PDF documents can be previewed'}), 400

    try:
        file_bytes = io.BytesIO(current_app.storage_service.read_file(document.storage_key or document.file_path))
    except FileNotFoundError:
        return jsonify({'error': 'Referral document file is unavailable'}), 404
    except Exception:
        return jsonify({'error': 'Failed to load referral document'}), 500

    return send_file(
        file_bytes,
        mimetype='application/pdf',
        as_attachment=False,
        download_name=document.original_name,
        max_age=0,
    )
