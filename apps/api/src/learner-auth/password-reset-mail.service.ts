
import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class PasswordResetMailService {
  private readonly transporter:
    ReturnType<typeof nodemailer.createTransport>;

  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
  ) {
    const host = this.config.getOrThrow<string>(
      'SMTP_HOST',
    );

    const port = Number(
      this.config.getOrThrow<string>('SMTP_PORT'),
    );

    const user = this.config.getOrThrow<string>(
      'SMTP_USER',
    );

    const pass = this.config.getOrThrow<string>(
      'SMTP_PASSWORD',
    );

    this.from = this.config.getOrThrow<string>(
      'SMTP_FROM',
    );

    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error('Invalid SMTP_PORT');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  async sendResetToken(
    email: string,
    token: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Reset your Learning Platform password',
        text: [
          'A password reset was requested.',
          '',
          'Your password reset token:',
          token,
          '',
          'This token expires in 15 minutes.',
          'It can only be used once.',
          '',
          'If you did not request this reset,',
          'you can ignore this email.',
          '',
          'Check your Spam/Junk folder if needed.',
        ].join('\n'),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Password reset email could not be sent',
      );
    }
  }
}
