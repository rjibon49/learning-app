import { apiRequest } from './client';

/**
 * API delete rule (same for every resource):
 *   DELETE /resource/:id                 -> safe delete (archive / deactivate)
 *   DELETE /resource/:id?permanent=true  -> SUPER_ADMIN only, removes the row
 */
export function withPermanent(path: string, permanent?: boolean): string {
  if (!permanent) return path;
  return `${path}${path.includes('?') ? '&' : '?'}permanent=true`;
}

export function deleteResource<T = unknown>(path: string, permanent = false): Promise<T> {
  return apiRequest<T>(withPermanent(path, permanent), { method: 'DELETE' });
}
