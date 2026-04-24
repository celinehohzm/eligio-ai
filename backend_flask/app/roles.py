ROLE_PATIENT_SCHEDULER = "patient_scheduler"
ROLE_REFERRING_PROVIDER = "referring_provider"

# Legacy roles kept for backwards compatibility with existing users/data.
ROLE_PROVIDER = "provider"
ROLE_ADMIN = "admin"

DEFAULT_REGISTRATION_ROLE = ROLE_PATIENT_SCHEDULER

REGISTRATION_ALLOWED_ROLES = {
    ROLE_PATIENT_SCHEDULER,
    ROLE_REFERRING_PROVIDER,
}

CHAT_ALLOWED_ROLES = {
    ROLE_PATIENT_SCHEDULER,
    ROLE_PROVIDER,
    ROLE_ADMIN,
}

REFERRAL_SEARCH_ALLOWED_ROLES = {
    ROLE_PATIENT_SCHEDULER,
}

UPLOAD_ALLOWED_ROLES = {
    ROLE_PATIENT_SCHEDULER,
    ROLE_REFERRING_PROVIDER,
    ROLE_PROVIDER,
    ROLE_ADMIN,
}

ROLE_ALIASES = {
    "patient scheduler": ROLE_PATIENT_SCHEDULER,
    "patient-scheduler": ROLE_PATIENT_SCHEDULER,
    "receiving provider and scheduler": ROLE_PATIENT_SCHEDULER,
    "receiving_provider_and_scheduler": ROLE_PATIENT_SCHEDULER,
    ROLE_PATIENT_SCHEDULER: ROLE_PATIENT_SCHEDULER,
    "referring provider": ROLE_REFERRING_PROVIDER,
    "referring-provider": ROLE_REFERRING_PROVIDER,
    ROLE_REFERRING_PROVIDER: ROLE_REFERRING_PROVIDER,
    ROLE_PROVIDER: ROLE_PROVIDER,
    ROLE_ADMIN: ROLE_ADMIN,
}


def normalize_role(raw_role, default=DEFAULT_REGISTRATION_ROLE):
    if raw_role is None:
        return default

    normalized = str(raw_role).strip().lower().replace("-", "_")
    return ROLE_ALIASES.get(normalized, normalized)


def can_access_chat(role):
    return normalize_role(role) in CHAT_ALLOWED_ROLES


def can_access_referral_search(role):
    return normalize_role(role) in REFERRAL_SEARCH_ALLOWED_ROLES


def can_access_upload(role):
    return normalize_role(role) in UPLOAD_ALLOWED_ROLES


def can_register_as(role):
    return normalize_role(role) in REGISTRATION_ALLOWED_ROLES
