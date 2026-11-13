/** React Native/Expo-neutral API client. Auth access token is supplied by the app's secure session layer. */
export interface LearnerNotification { id: string; title: string; message: string; isRead: boolean; isDismissible: boolean; createdAt: string }
export interface NotificationPage { data: LearnerNotification[]; unreadCount: number; pagination: { page: number; totalPages: number; total: number } }
export class NotificationClient {
  constructor(private readonly baseUrl: string, private readonly getToken: () => Promise<string>) {}
  private async request<T>(path: string, method = 'GET'): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl.replace(/\/$/,'')}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Notification request failed (${response.status})`);
    return response.json() as Promise<T>;
  }
  inbox(locale: string, page=1) { return this.request<NotificationPage>(`/auth/learner/notifications?locale=${encodeURIComponent(locale)}&page=${page}`); }
  unreadCount() { return this.request<{ unreadCount: number }>('/auth/learner/notifications/unread-count'); }
  markRead(id: string) { return this.request<{ success: boolean }>(`/auth/learner/notifications/${encodeURIComponent(id)}/read`, 'POST'); }
  dismiss(id: string) { return this.request<{ success: boolean }>(`/auth/learner/notifications/${encodeURIComponent(id)}/dismiss`, 'POST'); }
}
