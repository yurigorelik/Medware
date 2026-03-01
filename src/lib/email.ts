import { Resend } from "resend";
import crypto from "crypto";

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_ADDRESS = "MedWare <onboarding@resend.dev>";

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  const { error } = await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Reset your MedWare password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MedWare</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937;">Password Reset Request</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${name}, we received a request to reset your password. Click the button below
            to choose a new password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #2563eb; font-size: 14px; word-break: break-all;">
            ${resetUrl}
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            This link will expire in 1 hour.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

export async function sendDoctorMessage(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  message: string,
  consultationId: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const consultationUrl = `${baseUrl}/patient/consultation/${consultationId}/summary`;

  const { error } = await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to: patientEmail,
    subject: `Message from Dr. ${doctorName} - MedWare`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MedWare</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937;">Hello, ${patientName}</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dr. ${doctorName} has sent you a message regarding your consultation:
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
            <p style="color: #1f2937; white-space: pre-wrap; margin: 0;">${message}</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${consultationUrl}"
               style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              View Consultation
            </a>
          </div>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send doctor message email: ${error.message}`);
  }
}
