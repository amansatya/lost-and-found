const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
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
    const error = new Error(data?.message || "Admin request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const adminApi = {
  login(email, password) {
    return request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return request("/api/admin/me");
  },

  logout() {
    return request("/api/admin/logout", { method: "POST" });
  },

  users() {
    return request("/api/admin/users");
  },

  updateUser(id, payload) {
    return request(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteUser(id) {
    return request(`/api/admin/users/${id}`, { method: "DELETE" });
  },

  items() {
    return request("/api/admin/items");
  },

  updateItem(id, payload) {
    return request(`/api/admin/items/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteItem(id) {
    return request(`/api/admin/items/${id}`, { method: "DELETE" });
  },
};
