const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Keep data null for non-JSON errors.
  }

  if (!response.ok || !data?.success) {
    const error = new Error(data?.message || "Request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  signup(name, email, password) {
    return request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  verifyOtp(email, otp) {
    return request("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  resendOtp(email) {
    return request("/api/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  login(email, password) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  google(idToken) {
    return request("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
  },

  me() {
    return request("/api/auth/me");
  },

  logout() {
    return request("/api/auth/logout", {
      method: "POST",
    });
  },
};

export { API_URL };
