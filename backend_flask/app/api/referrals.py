from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from app.extensions import limiter
from app.models import Submission, User
from app.roles import can_access_referral_search

referrals_bp = Blueprint('referrals', __name__)


def _get_scheduler_user():
    current_email = get_jwt_identity()
    if not current_email:
        return None
    return User.query.filter_by(email=current_email).first()


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

    return jsonify(submission.to_dict())
