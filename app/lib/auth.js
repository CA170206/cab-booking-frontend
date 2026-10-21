// Client-side session and auth persistence utility for RideGo

const TOKEN_KEY = "ridego_token";
const USER_KEY = "ridego_user";
const GUEST_CONTACT_KEY = "ridego_guest_contact";
const LEGACY_TOKEN_KEY = "cabgo_token";
const LEGACY_USER_KEY = "cabgo_user";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveSession(token, user) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Backward compatibility
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("ridego_auth_change"));
  window.dispatchEvent(new Event("cabgo_auth_change"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(GUEST_CONTACT_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
  window.dispatchEvent(new Event("ridego_auth_change"));
  window.dispatchEvent(new Event("cabgo_auth_change"));
}

export function getGuestContact() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GUEST_CONTACT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveGuestContact(name, phone) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_CONTACT_KEY, JSON.stringify({ name, phone }));
}

export function isAuthenticated() {
  return Boolean(getStoredToken());
}

export function isGuest() {
  const user = getStoredUser();
  return Boolean(user?.isGuest || user?.email?.includes("guest.passenger"));
}

export function isDriver() {
  const user = getStoredUser();
  return user?.role === "driver";
}

export function isRider() {
  const user = getStoredUser();
  return user?.role === "rider" || user?.role === "passenger";
}

export function isPassenger() {
  const user = getStoredUser();
  return user?.role === "rider" || user?.role === "passenger";
}
