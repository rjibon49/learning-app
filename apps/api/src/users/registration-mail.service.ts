
import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class RegistrationMailService {
  private readonly transporter;
  private readonly fromAddress: string;

  constructor(
    private readonly config: ConfigService,
  ) {
    const host = this.config.getOrThrow<string>(
      'SMTP_HOST',
    );

    const port = Number(
      this.config.getOrThrow<string>('SMTP_PORT'),
    );

    const username = this.config.getOrThrow<string>(
      'SMTP_USER',
    );

    const password = this.config.getOrThrow<string>(
      'SMTP_PASSWORD',
    );

    this.fromAddress =
      this.config.getOrThrow<string>('SMTP_FROM');

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
      auth: {
        user: username,
        pass: password,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  async sendVerificationCode(
    email: string,
    code: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Verify your Learning Account',
        text: [
          'Welcome to Learning Platform!',
          '',
          `Your verification code is: ${code}`,
          '',
          'This code expires in 10 minutes.',
          'Do not share this code with anyone.',
          '',
          'If you did not request this code,',
          'you can safely ignore this email.',
        ].join('\n'),

        html: `
          <div style="
            font-family:Arial,sans-serif;
            max-width:520px;
            margin:auto;
            padding:24px;
            color:#172033;
          ">
            <h2>Verify your email</h2>
            <p>
              Enter this code to activate
              your Learning Platform account.
            </p>

            <div style="
              font-size:32px;
              font-weight:bold;
              letter-spacing:8px;
              text-align:center;
              padding:20px;
              background:#f2f5f9;
              border-radius:10px;
            ">
              ${code}
            </div>

            <p>
              This code expires in 10 minutes.
            </p>

            <p>
              Never share your verification code.
            </p>
          </div>
        `,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Verification email could not be sent',
      );
    }
  }
}
