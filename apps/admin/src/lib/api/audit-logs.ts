import { apiRequest } from './client';

export interface AuditLog {
  id: string;
  adminId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  admin?: {
    id?: string;
    email: string;
    displayName?: string | null;
    role: string;
  } | null;
}

export interface AuditLogPage {
  data: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** GET /audit-logs is paginated: { data, pagination }. */
export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
} = {}): Promise<AuditLogPage> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
  });
  if (params.action?.trim()) query.set('action', params.action.trim());
  if (params.entityType?.trim()) query.set('entityType', params.entityType.trim());
  return apiRequest<AuditLogPage>(`/audit-logs?${query.toString()}`);
}
