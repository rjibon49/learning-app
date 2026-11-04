import type { AdminRole } from '../generated/prisma/client.js';

export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: AdminRole;
  ver: number;
};

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
};
