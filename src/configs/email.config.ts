import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

import { EMAIL_CONFIG_TOKEN } from "~/common/constants/config";
import { AsBoolean } from "~/common/decorators/as-boolean.decorator";
import { validatedConfig } from "~/common/utils/validate-config";

export const emailProviderMap = {
  smtp: "smtp",
  sendgrid: "sendgrid",
  ses: "ses",
} as const;

export class EmailConfig {
  @Expose({ name: "EMAIL_PROVIDER" })
  @IsString()
  @IsIn(Object.values(emailProviderMap))
  @IsNotEmpty()
  provider: keyof typeof emailProviderMap = "smtp";

  @Expose({ name: "EMAIL_FROM_ADDRESS" })
  @IsString()
  @IsNotEmpty()
  fromAddress = "";

  @Expose({ name: "EMAIL_FROM_NAME" })
  @IsString()
  @IsNotEmpty()
  fromName = "";

  @Expose({ name: "SMTP_HOST" })
  @IsString()
  @IsOptional()
  host = "";

  @Expose({ name: "SMTP_PORT" })
  @IsNumber()
  @IsOptional()
  port: number = 587;

  @Expose({ name: "SMTP_SECURE" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  secure: boolean = false;

  @Expose({ name: "SMTP_USER" })
  @IsString()
  @IsOptional()
  user = "";

  @Expose({ name: "SMTP_PASS" })
  @IsString()
  @IsOptional()
  pass = "";
}

export const emailConfig = registerAs<EmailConfig>(EMAIL_CONFIG_TOKEN, () =>
  validatedConfig(process.env, EmailConfig)
);
