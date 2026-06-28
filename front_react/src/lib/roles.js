export const ROLE_PATIENT_SCHEDULER = "patient_scheduler";
export const ROLE_REFERRING_PROVIDER = "referring_provider";

// Legacy roles kept so older accounts do not lose access unexpectedly.
export const ROLE_PROVIDER = "provider";
export const ROLE_ADMIN = "admin";

export const ROLE_PATIENT_SCHEDULER_LABEL = "Receiving provider and scheduler";
export const ROLE_REFERRING_PROVIDER_LABEL = "Referring provider";

export const CHAT_ALLOWED_ROLES = [
  ROLE_PATIENT_SCHEDULER,
  ROLE_PROVIDER,
  ROLE_ADMIN,
];

export const REFERRAL_SEARCH_ALLOWED_ROLES = [
  ROLE_PATIENT_SCHEDULER,
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

export const canAccessReferralSearch = (role) =>
  REFERRAL_SEARCH_ALLOWED_ROLES.includes(normalizeRole(role));

export const canAccessUpload = (role) =>
  UPLOAD_ALLOWED_ROLES.includes(normalizeRole(role));

export const getRoleDisplayName = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLE_PATIENT_SCHEDULER) {
    return ROLE_PATIENT_SCHEDULER_LABEL;
  }

  if (normalizedRole === ROLE_REFERRING_PROVIDER) {
    return ROLE_REFERRING_PROVIDER_LABEL;
  }

  return role;
};

export const getTopNavItemsForRole = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLE_PATIENT_SCHEDULER) {
    return [
      { to: "/patients", label: "Patients" },
      { to: "/referral-queue", label: "Referral Search" },
      { to: "/specialists-list", label: "Specialists List" },
    ];
  }

  if (normalizedRole === ROLE_REFERRING_PROVIDER) {
    return [{ to: "/external-provider-upload", label: "Referral Upload" }];
  }

  const items = [];

  if (canAccessChat(normalizedRole)) {
    items.push({ to: "/chat", label: "Patient Triage Chat" });
  }

  if (canAccessReferralSearch(normalizedRole)) {
    items.push({ to: "/referral-queue", label: "Referral Search" });
    items.push({ to: "/specialists-list", label: "Specialists List" });
  }

  if (canAccessUpload(normalizedRole)) {
    items.push({ to: "/external-provider-upload", label: "Referral Upload" });
  }

  return items;
};

export const getDefaultRouteForRole = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLE_PATIENT_SCHEDULER) {
    return "/patients";
  }

  if (normalizedRole === ROLE_REFERRING_PROVIDER) {
    return "/external-provider-upload";
  }

  if (canAccessChat(normalizedRole)) {
    return "/chat";
  }

  if (canAccessReferralSearch(normalizedRole)) {
    return "/patients";
  }

  if (canAccessUpload(normalizedRole)) {
    return "/external-provider-upload";
  }

  return "/";
};

export const getPrimaryActionLabelForRole = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLE_PATIENT_SCHEDULER) {
    return "Go to Patients";
  }

  if (normalizedRole === ROLE_REFERRING_PROVIDER) {
    return "Go to Referral Upload";
  }

  if (canAccessChat(normalizedRole)) {
    return "Go to Patient Triage Chat";
  }

  if (canAccessUpload(normalizedRole)) {
    return "Go to Referral Upload";
  }

  return "Go to Eligio AI";
};
