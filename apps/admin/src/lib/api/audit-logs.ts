import { apiRequest } from './client';

export interface AuditLog {
  id: string;
  adminId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any | null;
  createdAt: string;
  admin?: {
    email: string;
    displayName?: string | null;
    role: string;
  } | null;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  return apiRequest<AuditLog[]>('/audit-logs');
}