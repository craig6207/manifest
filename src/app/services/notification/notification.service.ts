import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/app/environment/environment';
import { NotificationListResponse } from 'src/app/interfaces/notification';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);

  getUnreadCount() {
    return this.http.get<number>(
      `${environment.apiEndpoint}/api/notifications/unread-count`
    );
  }

  getNotificationsList(
    page = 1,
    pageSize = 20,
    unreadOnly = false,
    includeData = false
  ) {
    return this.http.get<NotificationListResponse>(
      `${environment.apiEndpoint}/api/notifications`,
      { params: { page, pageSize, unreadOnly, includeData } as any }
    );
  }

  markAsRead(id: string) {
    return this.http.post(
      `${environment.apiEndpoint}/api/notifications/${id}/read`,
      {}
    );
  }
}
