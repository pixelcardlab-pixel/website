export const ADMIN_SESSION_COOKIE = "pcl_admin_session";

function readRequiredEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function getAdminPassword() {
  return readRequiredEnv("ADMIN_PASSWORD");
}

export function getAdminSessionToken() {
  return readRequiredEnv("ADMIN_SESSION_TOKEN");
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword() && getAdminSessionToken());
}

export function isValidAdminPassword(password) {
  const adminPassword = getAdminPassword();
  return Boolean(adminPassword) && password === adminPassword;
}

export function isAdminRequestAuthenticated(request) {
  const token = getAdminSessionToken();
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  return Boolean(token) && cookieValue === token;
}

export function isAdminServerAuthenticated(cookieStore) {
  const token = getAdminSessionToken();
  const cookieValue = cookieStore?.get(ADMIN_SESSION_COOKIE)?.value || "";
  return Boolean(token) && cookieValue === token;
}
