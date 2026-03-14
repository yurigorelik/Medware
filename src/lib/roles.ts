/**
 * Check if a user's role allows them to act as a doctor.
 * Users with DOCTOR or BOTH roles can access doctor features.
 */
export function isDoctor(role: string): boolean {
  return role === "DOCTOR" || role === "BOTH";
}

/**
 * Check if a user's role allows them to act as a patient.
 * Users with PATIENT or BOTH roles can access patient features.
 */
export function isPatient(role: string): boolean {
  return role === "PATIENT" || role === "BOTH";
}
