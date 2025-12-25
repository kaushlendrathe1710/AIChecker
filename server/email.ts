import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Use SMTP_USER as from address since that's the authenticated sender
const getFromAddress = () => {
  const fromEmail = process.env.SMTP_EMAIL || process.env.SMTP_USER;
  return `"PlagiarismGuard" <${fromEmail}>`;
};

export async function sendOtpEmail(
  email: string,
  otp: string,
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: email,
      subject: "Your Login Code - PlagiarismGuard",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
          <div style="max-width: 460px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">PlagiarismGuard</h1>
            </div>
            <div style="padding: 40px 32px;">
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Your verification code</h2>
              <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Enter this code to sign in to your account. It will expire in 10 minutes.
              </p>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${otp}</span>
              </div>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
            <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                PlagiarismGuard - Trusted Academic Integrity
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: email,
      subject: "Welcome to PlagiarismGuard!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
          <div style="max-width: 460px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Welcome to PlagiarismGuard</h1>
            </div>
            <div style="padding: 40px 32px;">
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Hi ${name}!</h2>
              <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Your account has been created successfully. You can now start checking your documents for plagiarism with our advanced AI-powered detection system.
              </p>
              <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 24px;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 500;">
                  Get started by uploading your first document from the dashboard.
                </p>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                PlagiarismGuard - Trusted Academic Integrity
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}
