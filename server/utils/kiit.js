export function normalizeRollNo(value) {
  return String(value || "").trim();
}

export function isValidRollNo(value) {
  const rollNo = normalizeRollNo(value);
  return /^\d{2,}$/.test(rollNo);
}

export function getAllowedAdmissionYearRange() {
  const currentYear = new Date().getFullYear();
  return {
    currentYear,
    earliestYear: currentYear - 4,
  };
}

export function validateStudentRollNo(value) {
  const rollNo = normalizeRollNo(value);

  if (!rollNo) {
    return "Roll number is required.";
  }

  if (!isValidRollNo(rollNo)) {
    return "Roll number must contain digits only.";
  }

  const { currentYear, earliestYear } = getAllowedAdmissionYearRange();
  const admissionYear = 2000 + Number(rollNo.slice(0, 2));
  const currentYearSuffix = currentYear % 100;

  if (admissionYear < earliestYear || admissionYear > currentYear) {
    return `For B.Tech registration in ${currentYear}, the roll number must begin with an admission year from ${String(earliestYear).slice(-2)} to ${String(currentYear).slice(-2)}.`;
  }

  // Prevent ambiguous future-looking two-digit prefixes such as 00–21
  // while keeping the actual validation tied to the current year.
  if (Number(rollNo.slice(0, 2)) > currentYearSuffix) {
    return "The admission year in the roll number cannot be in the future.";
  }

  return "";
}

export function emailForRollNo(rollNo) {
  return `${normalizeRollNo(rollNo).toLowerCase()}@kiit.ac.in`;
}

export function isEmailForRollNo(email, rollNo) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail === emailForRollNo(rollNo);
}
