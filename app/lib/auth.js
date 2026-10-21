// Client-side session and auth persistence utility for CabGo

const TOKEN_KEY = "cabgo_token";
const USER_KEY = "cabgo_user";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
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
  window.dispatchEvent(new Event("cabgo_auth_change"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("cabgo_auth_change"));
}

export function isAuthenticated() {
  return Boolean(getStoredToken());
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
