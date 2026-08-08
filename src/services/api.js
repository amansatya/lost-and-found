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

export const itemsApi = {
  list() {
    return request("/api/items");
  },

  get(id) {
    return request(`/api/items/${id}`);
  },

  create(item) {
    return request("/api/items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  close(id) {
    return request(`/api/items/${id}/close`, {
      method: "POST",
    });
  },
};

export { API_URL };
