# Email

## Sending an email

```ts
constructor(private readonly emailService: EmailService) {}

await this.emailService.send({
  to: user.email,
  subject: "Reset your password",
  template: "reset-password",
  context: { resetLink },
});
```

`send()` is intentionally narrow — send a templated email, know if it
failed (it throws on failure, after logging). It doesn't handle
retries/queueing/delivery guarantees beyond "the SMTP server accepted it."
If you need those, put a queue (e.g. BullMQ) in front of it rather than
building retry logic into `EmailService` itself.

## Templates

Handlebars templates live in `core/email/templates/*.hbs`:
`index.hbs`, `verify-email.hbs`, `reset-password.hbs`. The `template`
option on `send()` is typed against `EMAIL_TEMPLATE_MAP`
(`common/constants/mappings.ts`) — add a new entry there and a matching
`.hbs` file to add a template; this keeps template names compile-time
checked instead of stringly-typed.

**Note for Docker deployments**: `nest build` doesn't copy non-`.ts`
assets like `.hbs` files into `dist/` on its own. `nest-cli.json` marks
this directory (and the i18n locale files) as build assets, and the
`Dockerfile` in this repo copies them into the production image
explicitly as a result — if you add a new templates directory elsewhere,
make sure it's covered the same way.

## Providers

Configured via `EMAIL_PROVIDER` (`configs/email.config.ts`), resolved to
a Nodemailer transport in `core/email/resolve-transport.ts`:

| Provider         | How it works                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smtp` (default) | `SMTP_URL` directly as the transport. Local dev uses Mailpit (`docker-compose.yaml`) — no real email sent, view at `http://localhost:8025`.                                                                                            |
| `sendgrid`       | Routed through SendGrid's **SMTP relay** (`smtp.sendgrid.net:465`, authenticated with `SENDGRID_API_KEY`) — no SendGrid SDK dependency needed, since it's "just" SMTP under the hood.                                                  |
| `ses`            | **Not implemented.** Throws a clear error at boot if selected — SES needs the AWS SDK and an API-based transport, a materially bigger addition than an SMTP URL. Add AWS SES SDK integration in `resolve-transport.ts` if you need it. |

## Local development

`docker:up` starts Mailpit — point `SMTP_URL=smtp://localhost:1025` (the
`.env.example` default) at it, and every email your app sends shows up in
Mailpit's web UI instead of actually being delivered.
