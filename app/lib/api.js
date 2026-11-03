// Centralized API client for RideGo frontend
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://cab-booking-backend-f4sj.onrender.com"
).replace(/\/+$/, "");

/**
 * Universal fetch wrapper with authorization header and consistent error parsing
 */
export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Automatically attach auth token if available in browser
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("ridego_token") ||
      localStorage.getItem("cabgo_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const config = {
    ...options,
    headers,
  };

  let res;
  try {
    res = await fetch(url, config);
  } catch (netErr) {
    const error = new Error("Unable to connect to RideGo backend server. Please check your internet connection.");
    error.status = 0;
    error.cause = netErr;
    throw error;
  }

  let data = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = { message: "Invalid JSON response from server." };
    }
  } else {
    try {
      const text = await res.text();
      data = { message: text };
    } catch {
      data = { message: "Empty response from server." };
    }
  }

  if (!res.ok) {
    let errorMsg = data?.message;
    if (!errorMsg) {
      if (res.status === 401) {
        errorMsg = "Invalid email or password.";
      } else if (res.status === 409) {
        errorMsg = "An account with this email already exists.";
      } else if (res.status === 400) {
        errorMsg = "Invalid request. Please check your input.";
      } else if (res.status === 403) {
        errorMsg = "You do not have permission to perform this action.";
      } else if (res.status === 404) {
        errorMsg = "Requested resource not found.";
      } else if (res.status >= 500) {
        errorMsg = "Backend server error. Please try again shortly.";
      } else {
        errorMsg = `Request failed with status ${res.status}`;
      }
    }
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
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
  guestLogin: (payload = {}) =>
    apiRequest("/api/auth/guest", {
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
  confirmQrPayment: (rideId, amount = null, utr = null) =>
    apiRequest("/api/payments/confirm-qr", {
      method: "POST",
      body: JSON.stringify({ ride_id: rideId, amount, utr }),
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
