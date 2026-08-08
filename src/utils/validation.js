export function isKiitEmail(email) {
  return /^[^\s@]+@kiit\.ac\.in$/i.test(String(email || "").trim());
}

export function validateName(name) {
  const value = String(name || "").trim();

  if (!value) return "Please enter your full name.";
  if (value.length < 2) return "Name must be at least 2 characters.";
  if (value.length > 80) return "Name must be 80 characters or fewer.";

  return "";
}

export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return "";
}
