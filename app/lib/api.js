// Centralized API client for CabGo frontend
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cab-booking-backend-f4sj.onrender.com";

/**
 * Universal fetch wrapper with authorization header and consistent error parsing
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Automatically attach auth token if available in browser
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("cabgo_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(url, config);
    let data = null;

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { message: text };
    }

    if (!res.ok) {
      const error = new Error(data?.message || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      const netError = new Error("Unable to connect to CabGo backend server. Please check if backend is running on https://cab-booking-backend-f4sj.onrender.com.");
      netError.status = 0;
      throw netError;
    }
    throw err;
  }
}

// Authentication API endpoints
export const authApi = {
  login: (credentials) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  register: (payload) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// Rides API endpoints
export const ridesApi = {
  requestRide: (rideData) =>
    apiRequest("/api/rides", {
      method: "POST",
      body: JSON.stringify(rideData),
    }),
  getMyRides: () => apiRequest("/api/rides/my-rides"),
  getRideDetails: (rideId) => apiRequest(`/api/rides/${rideId}`),
  resendOtp: (rideId) =>
    apiRequest(`/api/rides/${rideId}/resend-otp`, {
      method: "POST",
    }),
  rateRide: (rideId, ratingData) =>
    apiRequest(`/api/rides/${rideId}/rate`, {
      method: "POST",
      body: JSON.stringify(ratingData),
    }),
  cancelRide: (rideId) =>
    apiRequest(`/api/rides/${rideId}/cancel`, {
      method: "POST",
    }),
};

// Driver API endpoints
export const driverApi = {
  getAvailableRides: (lat = null, lng = null, radius = 2.0) => {
    let url = "/api/driver/rides/available";
    if (lat !== null && lng !== null) {
      url += `?lat=${lat}&lng=${lng}&radius=${radius}`;
    }
    return apiRequest(url);
  },
  getActiveRide: () => apiRequest("/api/driver/rides/active"),
  acceptRide: (rideId) =>
    apiRequest(`/api/driver/rides/${rideId}/accept`, {
      method: "PATCH",
    }),
  updateRideStatus: (rideId, status, otp = null, payment_method = null, payment_status = null) =>
    apiRequest(`/api/driver/rides/${rideId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, otp, payment_method, payment_status }),
    }),
  updateLocation: (lat, lng, rideId = null) =>
    apiRequest("/api/driver/location", {
      method: "PUT",
      body: JSON.stringify({ lat, lng, rideId }),
    }),
  cancelRide: (rideId, reason = "") =>
    apiRequest(`/api/driver/rides/${rideId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// Payment API endpoints
export const paymentApi = {
  createOrder: (rideId) =>
    apiRequest("/api/payments/create-order", {
      method: "POST",
      body: JSON.stringify({ ride_id: rideId }),
    }),
  verifyPayment: (payload) =>
    apiRequest("/api/payments/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  confirmQrPayment: (rideId, amount = null) =>
    apiRequest("/api/payments/confirm-qr", {
      method: "POST",
      body: JSON.stringify({ ride_id: rideId, amount }),
    }),
  getStatus: (identifier) => apiRequest(`/api/payments/status/${identifier}`),
};

// Profile API endpoints
export const profileApi = {
  getProfile: () => apiRequest("/api/profile"),
  updateProfile: (profileData) =>
    apiRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),
};
