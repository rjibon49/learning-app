import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedAdmin } from './admin-auth.types.js';

type AdminRequest = Request & {
  admin?: AuthenticatedAdmin;
};

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    return request.admin;
  },
);
