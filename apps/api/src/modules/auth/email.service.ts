import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { getConfig } from '@umcp/config';
import { createLogger } from '@umcp/logger';

@Injectable()
export class EmailService {
  private readonly logger = createLogger('EmailService');
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const config = getConfig();
    const smtpUser = process.env.SMTP_USER || config.SMTP_USER || 'businessrajmor@gmail.com';
    const smtpPass = process.env.SMTP_PASS || config.SMTP_PASS || '';
    const smtpHost = process.env.SMTP_HOST || config.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || String(config.SMTP_PORT) || '587', 10);

    if (smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.info(`SMTP Transporter configured for ${smtpUser} via ${smtpHost}:${smtpPort}`);
    } else {
      // Fallback for dev mode when SMTP_PASS is not provided yet
      this.logger.info(`SMTP initialized in development mode for ${smtpUser} (logs OTP to console)`);
    }
  }

  async sendOtpEmail(toEmail: string, otpCode: string, name?: string): Promise<boolean> {
    const config = getConfig();
    const smtpUser = process.env.SMTP_USER || config.SMTP_USER || 'businessrajmor@gmail.com';
    const fromAddress = process.env.SMTP_FROM || `Universal MCP Cloud <${smtpUser}>`;

    const recipientName = name || toEmail.split('@')[0];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
            .card { max-width: 480px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 40px; text-align: center; }
            .logo { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #4f46e5; border-radius: 16px; margin-bottom: 20px; }
            h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 0 0 24px 0; }
            .otp-box { background: #1e1b4b; border: 1px solid #4338ca; border-radius: 16px; padding: 18px; margin: 24px 0; }
            .otp-code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #818cf8; margin: 0; }
            .warning { font-size: 12px; color: #64748b; margin-top: 24px; border-t: 1px solid #1e293b; pt: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <h1>Verification Code</h1>
            <p>Hello ${recipientName}, use the single-use OTP below to complete your passwordless authentication for Universal MCP Cloud.</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <p style="font-size: 12px; color: #64748b;">This code will expire in <strong>10 minutes</strong>.</p>
            <div class="warning">
              If you did not request this verification code, please ignore this email. Never share this code with anyone.
            </div>
          </div>
        </body>
      </html>
    `;

    // Always log OTP in development console for instant local debugging
    this.logger.info(`[DEV OTP LOG] Verification code for ${toEmail}: ${otpCode}`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: `${otpCode} is your Universal MCP Cloud verification code`,
          html: htmlContent,
        });
        this.logger.info(`Sent OTP email to ${toEmail} via SMTP from ${smtpUser}`);
        return true;
      } catch (error) {
        this.logger.error({ err: error }, `Failed to send SMTP email to ${toEmail}`);
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes('535') || errMsg.includes('BadCredentials') || errMsg.includes('Username and Password not accepted')) {
          throw new Error('Gmail SMTP authentication failed: Invalid App Password or 2-Step Verification disabled on businessrajmor@gmail.com');
        }
        throw new Error(`Failed to deliver email via SMTP: ${errMsg}`);
      }
    }

    return true;
  }
}
