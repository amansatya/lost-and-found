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


export function validateRollNo(rollNo) {
  const value = String(rollNo || "").trim();

  if (!value) return "Roll number is required.";
  if (!/^\d{2,}$/.test(value)) return "Roll number must contain digits only.";

  const currentYear = new Date().getFullYear();
  const earliestYear = currentYear - 4;
  const admissionYear = 2000 + Number(value.slice(0, 2));

  if (admissionYear < earliestYear || admissionYear > currentYear) {
    return `For B.Tech registration in ${currentYear}, your roll number must begin with an admission year from ${String(earliestYear).slice(-2)} to ${String(currentYear).slice(-2)}.`;
  }

  return "";
}

export function emailMatchesRollNo(email, rollNo) {
  return String(email || "").trim().toLowerCase() === `${String(rollNo || "").trim().toLowerCase()}@kiit.ac.in`;
}
