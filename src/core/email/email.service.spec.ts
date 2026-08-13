import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MailerService } from "@nestjs-modules/mailer";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { EmailService } from "./email.service";

describe("EmailService", () => {
  let service: EmailService;
  let mailerService: { sendMail: Mock };

  beforeEach(async () => {
    mailerService = { sendMail: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mailerService },
        { provide: Logger, useValue: { error: vi.fn() } },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("sends a templated email via MailerService, mapping the template key through EMAIL_TEMPLATE_MAP", async () => {
    mailerService.sendMail.mockResolvedValue(undefined);

    await service.send({
      to: "user@example.com",
      subject: "Verify your email",
      template: "verify-email",
      context: { name: "Ada", actionUrl: "https://example.com/verify" },
    });

    expect(mailerService.sendMail).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Verify your email",
      template: "verify-email",
      context: { name: "Ada", actionUrl: "https://example.com/verify" },
    });
  });

  it("defaults context to an empty object when not provided", async () => {
    mailerService.sendMail.mockResolvedValue(undefined);

    await service.send({
      to: "user@example.com",
      subject: "Reset your password",
      template: "reset-password",
    });

    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ context: {} })
    );
  });

  it("logs and re-throws when the underlying transport fails", async () => {
    const error = new Error("connection refused");
    mailerService.sendMail.mockRejectedValue(error);

    await expect(
      service.send({
        to: "user@example.com",
        subject: "Verify your email",
        template: "verify-email",
      })
    ).rejects.toThrow("connection refused");
  });
});
