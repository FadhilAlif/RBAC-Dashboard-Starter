import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { env } from "../../config/env.js";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  id?: string;
  error?: string | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private readonly fromAddress: string;

  constructor(apiKey?: string, fromAddress?: string) {
    this.fromAddress = fromAddress || env.EMAIL_FROM || env.RESEND_FROM || "onboarding@resend.dev";

    const effectiveKey = apiKey !== undefined ? apiKey : env.RESEND_API_KEY;

    if (effectiveKey && effectiveKey.trim() !== "") {
      this.resend = new Resend(effectiveKey);
      this.logger.log("Resend client initialized successfully");
    } else {
      this.logger.warn("RESEND_API_KEY is not configured. Emails will be simulated in console logs.");
    }
  }

  /**
   * Mengembalikan format alamat pengirim standar RFC 5322
   */
  get sender(): string {
    return `"${env.APP_NAME}" <${this.fromAddress}>`;
  }

  /**
   * Helper inti pengiriman email via Resend SDK dengan fallback simulasi
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.resend) {
      this.logger.log(
        `[Mail Simulation] To: ${options.to} | Subject: "${options.subject}" | From: ${this.sender}`,
      );
      return { id: `simulated-${Date.now()}`, error: null };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.sender,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error(
          `Failed to send email via Resend to ${options.to}: ${error.message} (${error.name})`,
        );
        return { error: error.message };
      }

      this.logger.log(`Email successfully sent via Resend to ${options.to} (id: ${data?.id})`);
      return { id: data?.id, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Unexpected exception sending email to ${options.to}: ${message}`);
      return { error: message };
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    const text = `Hi ${name},\n\nPlease verify your email address by visiting the link below:\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you did not register an account, you can safely ignore this email.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 700;">Verify your email address</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Thanks for registering for <strong>${env.APP_NAME}</strong>. Please verify your email address to activate your account and start using the platform.</p>
        <div style="margin: 32px 0;">
          <a href="${verificationUrl}"
             style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #64748b;">Or copy this link into your browser:</p>
        <p style="font-size: 13px; line-height: 1.5; color: #4f46e5; word-break: break-all;"><a href="${verificationUrl}" style="color: #4f46e5;">${verificationUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">This verification link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Verify your email — ${env.APP_NAME}`,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    const text = `Hi ${name},\n\nYou requested a password reset. Visit the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 30 minutes.\n\nIf you did not request this, you can safely ignore this email.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 700;">Reset your password</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">You requested a password reset for your <strong>${env.APP_NAME}</strong> account. Click the button below to set a new password.</p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #64748b;">Or copy this link into your browser:</p>
        <p style="font-size: 13px; line-height: 1.5; color: #4f46e5; word-break: break-all;"><a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">This link expires in 30 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Reset your password — ${env.APP_NAME}`,
      text,
      html,
    });
  }

  async sendInviteEmail(to: string, name: string, token: string): Promise<void> {
    const inviteUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    const text = `Hi ${name},\n\nAn account has been created for you on ${env.APP_NAME}. Set your password to activate it:\n\n${inviteUrl}\n\nThis link expires in 7 days.\n\nIf you were not expecting this invitation, you can safely ignore this email.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 700;">You've been invited to ${env.APP_NAME}</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">An account has been created for you on <strong>${env.APP_NAME}</strong>. Click the button below to set your password and activate your account.</p>
        <div style="margin: 32px 0;">
          <a href="${inviteUrl}"
             style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center;">
            Set Your Password
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #64748b;">Or copy this link into your browser:</p>
        <p style="font-size: 13px; line-height: 1.5; color: #4f46e5; word-break: break-all;"><a href="${inviteUrl}" style="color: #4f46e5;">${inviteUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">This invitation link expires in 7 days. If you were not expecting this email, you can safely ignore it.</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `You've been invited to ${env.APP_NAME}`,
      text,
      html,
    });
  }

  async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/forgot-password`;

    const text = `Hi ${name},\n\nYour password was just changed. If this was you, no action is needed.\n\nIf you did not make this change, reset your password immediately:\n\n${resetUrl}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 700;">Your password was changed</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Your password for <strong>${env.APP_NAME}</strong> was just changed. If this was you, no further action is required.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #dc2626;">If you did not make this change, please reset your password immediately to secure your account.</p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 28px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center;">
            Reset Password
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">If you made this change yourself, you can safely ignore this notification.</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Your password was changed — ${env.APP_NAME}`,
      text,
      html,
    });
  }
}
