import { describe, expect, it, vi, beforeEach } from "vitest";
import { MailService } from "../mail.service.js";

describe("MailService", () => {
  let mailService: MailService;

  beforeEach(() => {
    vi.clearAllMocks();
    mailService = new MailService();
  });

  it("should initialize with default sender address", () => {
    expect(mailService.sender).toContain("onboarding@resend.dev");
  });

  it("should simulate email sending when RESEND_API_KEY is not configured", async () => {
    const simulationService = new MailService("");
    const result = await simulationService.sendEmail({
      to: "user@example.com",
      subject: "Test Subject",
      text: "Test content",
      html: "<p>Test content</p>",
    });

    expect(result.id).toMatch(/^simulated-/);
    expect(result.error).toBeNull();
  });

  it("should format and trigger sendVerificationEmail without errors", async () => {
    const spy = vi.spyOn(mailService, "sendEmail");

    await mailService.sendVerificationEmail("newuser@example.com", "John Doe", "token_123");

    expect(spy).toHaveBeenCalledTimes(1);
    const callArgs = spy.mock.calls[0]![0];
    expect(callArgs.to).toBe("newuser@example.com");
    expect(callArgs.subject).toContain("Verify your email");
    expect(callArgs.text).toContain("token=token_123");
    expect(callArgs.html).toContain("John Doe");
    expect(callArgs.html).toContain("token=token_123");
  });

  it("should format and trigger sendPasswordResetEmail without errors", async () => {
    const spy = vi.spyOn(mailService, "sendEmail");

    await mailService.sendPasswordResetEmail("reset@example.com", "Jane Doe", "reset_token_456");

    expect(spy).toHaveBeenCalledTimes(1);
    const callArgs = spy.mock.calls[0]![0];
    expect(callArgs.to).toBe("reset@example.com");
    expect(callArgs.subject).toContain("Reset your password");
    expect(callArgs.text).toContain("reset_token_456");
    expect(callArgs.html).toContain("Reset Password");
  });

  it("should format and trigger sendInviteEmail without errors", async () => {
    const spy = vi.spyOn(mailService, "sendEmail");

    await mailService.sendInviteEmail("invitee@example.com", "Alice Smith", "invite_token_789");

    expect(spy).toHaveBeenCalledTimes(1);
    const callArgs = spy.mock.calls[0]![0];
    expect(callArgs.to).toBe("invitee@example.com");
    expect(callArgs.subject).toContain("invited to");
    expect(callArgs.text).toContain("invite_token_789");
    expect(callArgs.html).toContain("Alice Smith");
  });

  it("should format and trigger sendPasswordChangedEmail without errors", async () => {
    const spy = vi.spyOn(mailService, "sendEmail");

    await mailService.sendPasswordChangedEmail("changed@example.com", "Bob");

    expect(spy).toHaveBeenCalledTimes(1);
    const callArgs = spy.mock.calls[0]![0];
    expect(callArgs.to).toBe("changed@example.com");
    expect(callArgs.subject).toContain("Your password was changed");
    expect(callArgs.text).toContain("forgot-password");
  });

  it("should handle Resend API error gracefully", async () => {
    // Inject mock resend client
    (mailService as any).resend = {
      emails: {
        send: vi.fn().mockResolvedValue({
          data: null,
          error: { name: "validation_error", message: "Domain not verified" },
        }),
      },
    };

    const result = await mailService.sendEmail({
      to: "fail@example.com",
      subject: "Fail",
      text: "Fail",
      html: "<p>Fail</p>",
    });

    expect(result.error).toBe("Domain not verified");
  });

  it("should handle unexpected exception during sending gracefully", async () => {
    // Inject mock resend client throwing an error
    (mailService as any).resend = {
      emails: {
        send: vi.fn().mockRejectedValue(new Error("Network connection timeout")),
      },
    };

    const result = await mailService.sendEmail({
      to: "timeout@example.com",
      subject: "Timeout",
      text: "Timeout",
      html: "<p>Timeout</p>",
    });

    expect(result.error).toContain("Network connection timeout");
  });
});
