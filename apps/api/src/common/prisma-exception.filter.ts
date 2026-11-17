import {
  ArgumentsHost,
  Catch,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

type PrismaLikeError = {
  code: string;
  meta?: Record<string, unknown>;
};

function isPrismaKnownError(error: unknown): error is PrismaLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    /^P\d{4}$/.test((error as { code: string }).code)
  );
}

/**
 * Turns database errors that services did not handle into clean HTTP errors
 * instead of a generic 500:
 *
 *  P2002 unique value already exists      -> 409
 *  P2003 still referenced by other rows   -> 409 (used by "permanent delete")
 *  P2025 record not found                 -> 404
 *
 * Other Prisma errors become a logged 500; non-Prisma errors use Nest's default handling.
 */
@Catch()
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('PrismaExceptionFilter');

  override catch(exception: unknown, host: ArgumentsHost): void {
    // Normal Nest errors (400/401/403/404 ...) keep the default handling.
    if (!isPrismaKnownError(exception)) {
      super.catch(exception, host);
      return;
    }

    const response = host.switchToHttp().getResponse<Response>();

    const send = (statusCode: number, message: string, error: string) => {
      response.status(statusCode).json({ statusCode, message, error });
    };

    switch (exception.code) {
      case 'P2002':
        return send(
          HttpStatus.CONFLICT,
          'This value already exists (duplicate slug, code or unique field).',
          'Conflict',
        );

      case 'P2003':
      case 'P2014':
        return send(
          HttpStatus.CONFLICT,
          'This item is still used by other records. Remove or reassign those first, or archive it instead of deleting.',
          'Conflict',
        );

      case 'P2025':
        return send(HttpStatus.NOT_FOUND, 'Record not found', 'Not Found');

      default:
        this.logger.error(
          `Unhandled Prisma error ${exception.code}`,
          JSON.stringify(exception.meta ?? {}),
        );

        return send(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Internal server error',
          'Internal Server Error',
        );
    }
  }
}
