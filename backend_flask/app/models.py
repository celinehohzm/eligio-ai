import uuid
from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.roles import DEFAULT_REGISTRATION_ROLE


def new_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default=DEFAULT_REGISTRATION_ROLE)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "email": self.email,
            "name": self.name,
            "role": self.role,
        }


class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)
    full_name = db.Column(db.String(255), nullable=False)
    age = db.Column(db.String(20), nullable=True)
    date_of_birth = db.Column(db.String(20), nullable=False)
    address = db.Column(db.Text, nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    doctor_name = db.Column(db.String(255), nullable=True)
    reason_for_referral = db.Column(db.Text, nullable=True)
    chief_complaint = db.Column(db.Text, nullable=True)
    evaluation = db.Column(db.Text, nullable=True)
    diagnosis = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False, default="received")
    documents = db.relationship(
        "Document",
        back_populates="submission",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patientInfo": {
                "fullName": self.full_name,
                "age": self.age,
                "dateOfBirth": self.date_of_birth,
                "address": self.address,
                "phoneNumber": self.phone_number,
                "doctorName": self.doctor_name,
                "reasonForReferral": self.reason_for_referral,
            },
            "referralInsights": {
                "chiefComplaint": self.chief_complaint,
                "evaluation": self.evaluation,
                "diagnosis": self.diagnosis,
            },
            "summaryLine": self.build_scheduler_summary(),
            "documents": [document.to_dict() for document in self.documents],
            "submittedAt": self.submitted_at.isoformat(),
            "status": self.status,
        }

    def _formatted_referring_doctor(self):
        doctor_name = (self.doctor_name or "").strip()
        if not doctor_name:
            return "an unknown referring physician"
        if doctor_name.lower().startswith("dr"):
            return doctor_name
        return f"Dr {doctor_name}"

    def _summary_value(self, value, fallback):
        cleaned = (value or "").strip()
        if cleaned:
            return cleaned
        return fallback

    def build_scheduler_summary(self):
        return (
            f"Patient {self.full_name}, referred by {self._formatted_referring_doctor()}, "
            f"chief complaint is {self._summary_value(self.chief_complaint, self.reason_for_referral or 'not available in the referral packet')}, "
            f"evaluation is {self._summary_value(self.evaluation, 'not available in the referral packet')}, "
            f"and diagnosis is {self._summary_value(self.diagnosis, 'not available in the referral packet')}."
        )

    def to_referral_list_item(self):
        return {
            "id": self.id,
            "fullName": self.full_name,
            "dateOfBirth": self.date_of_birth,
            "doctorName": self.doctor_name,
            "reasonForReferral": self.reason_for_referral,
            "submittedAt": self.submitted_at.isoformat(),
            "summaryLine": self.build_scheduler_summary(),
        }


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)
    submission_id = db.Column(
        db.String(36),
        db.ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_name = db.Column(db.String(512), nullable=False)
    filename = db.Column(db.String(512), nullable=False)
    file_path = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(255), nullable=False, default="Unknown")
    subtype = db.Column(db.String(255), nullable=False, default="Unknown")
    size = db.Column(db.BigInteger, nullable=False, default=0)
    uploaded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False, default="uploaded")
    storage_provider = db.Column(db.String(20), nullable=False, default="local")
    storage_key = db.Column(db.Text, nullable=True)
    submission = db.relationship("Submission", back_populates="documents")

    def to_dict(self):
        return {
            "id": self.id,
            "originalName": self.original_name,
            "filename": self.filename,
            "filePath": self.file_path,
            "category": self.category,
            "subtype": self.subtype,
            "size": self.size,
            "uploadedAt": self.uploaded_at.isoformat(),
            "status": self.status,
            "storageProvider": self.storage_provider,
        }


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    jti = db.Column(db.String(36), nullable=False, unique=True, index=True)
    token_type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
