import type { AdminRole } from '@/types/auth';

export const Permissions = {
  canCreateOrEditContent(role?: AdminRole | null): boolean {
    return (
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN' ||
      role === 'CONTENT_EDITOR'
    );
  },

  canDeleteVocabulary(role?: AdminRole | null): boolean {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  },

  canManageBusiness(role?: AdminRole | null): boolean {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  },

  canManageSystem(role?: AdminRole | null): boolean {
    return role === 'SUPER_ADMIN';
  },
};