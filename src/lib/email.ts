import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/api/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"MedWare" <noreply@medware.com>',
    to: email,
    subject: "Verify your MedWare account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MedWare</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937;">Welcome, ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for creating a MedWare account. Please verify your email address
            by clicking the button below:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}"
               style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #2563eb; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            If you didn't create an account on MedWare, please ignore this email.
          </p>
        </div>
      </div>
    `,
  });
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

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"MedWare" <noreply@medware.com>',
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
}
