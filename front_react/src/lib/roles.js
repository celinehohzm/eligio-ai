export const ROLE_PATIENT_SCHEDULER = "patient_scheduler";
export const ROLE_REFERRING_PROVIDER = "referring_provider";

// Legacy roles kept so older accounts do not lose access unexpectedly.
export const ROLE_PROVIDER = "provider";
export const ROLE_ADMIN = "admin";

export const CHAT_ALLOWED_ROLES = [
  ROLE_PATIENT_SCHEDULER,
  ROLE_PROVIDER,
  ROLE_ADMIN,
];

export const UPLOAD_ALLOWED_ROLES = [
  ROLE_PATIENT_SCHEDULER,
  ROLE_REFERRING_PROVIDER,
  ROLE_PROVIDER,
  ROLE_ADMIN,
];

export const normalizeRole = (role) => {
  if (!role) {
    return null;
  }

  return String(role).trim().toLowerCase().replace(/-/g, "_");
};

export const canAccessChat = (role) =>
  CHAT_ALLOWED_ROLES.includes(normalizeRole(role));

export const canAccessUpload = (role) =>
  UPLOAD_ALLOWED_ROLES.includes(normalizeRole(role));

export const getDefaultRouteForRole = (role) => {
  if (canAccessChat(role)) {
    return "/chat";
  }

  if (canAccessUpload(role)) {
    return "/external-provider-upload";
  }

  return "/";
};
