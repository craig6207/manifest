import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { DatePipe } from '@angular/common';
import { SegmentChangeEventDetail, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  chevronForward,
  linkOutline,
  mailUnreadOutline,
  calendarOutline,
  timeOutline,
} from 'ionicons/icons';
import { NotificationsService } from 'src/app/services/notification/notification.service';
import { Notification } from 'src/app/interfaces/notification';
import { JobInviteComponent } from 'src/app/components/job-invite/job-invite.component';
import { JobExtraDetailsComponent } from 'src/app/components/job-extra-details/job-extra-details.component';
import { JobSuccessConfirmationComponent } from 'src/app/components/job-success-confirmation/job-success-confirmation.component';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonSegment,
    IonSegmentButton,
    DatePipe,
    ToolbarBackComponent,
  ],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  providers: [ModalController],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private notificationService = inject(NotificationsService);
  private modal = inject(ModalController);
  private profileStore = inject(ProfileStore);

  items = signal<Notification[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = signal<number>(20);
  total = signal<number>(0);
  filter = signal<'all' | 'unread'>('all');

  visibleItems = computed(() => {
    const all = this.items();
    return this.filter() === 'unread' ? all.filter((n) => !n.isRead) : all;
  });
  showEmpty = computed(
    () => !this.loading() && this.visibleItems().length === 0
  );
  unreadCount = computed(() =>
    this.items().reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0)
  );

  constructor() {
    addIcons({
      notificationsOutline,
      chevronForward,
      linkOutline,
      mailUnreadOutline,
      calendarOutline,
      timeOutline,
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    const page = this.page();
    const pageSize = this.pageSize();
    const unreadOnly = false;

    this.notificationService
      .getNotificationsList(page, pageSize, unreadOnly, true)
      .subscribe({
        next: (res) => {
          this.items.set(res.items ?? []);
          this.total.set(res.total ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load notifications.');
          this.loading.set(false);
        },
      });
  }

  refresh(ev?: CustomEvent) {
    this.page.set(1);
    this.load();
    if (ev) setTimeout(() => (ev.target as any)?.complete(), 300);
  }

  onFilterChanged(ev: CustomEvent<SegmentChangeEventDetail>) {
    const v = ev.detail.value as string | undefined;
    this.filter.set(v === 'unread' ? 'unread' : 'all');
  }

  async open(notification: Notification) {
    if (!notification.isRead && notification.id) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          this.markReadLocally(notification.id!);
          this.decrementUnreadCountOnce();
        },
      });
    }

    const type = (notification.type ?? '').toLowerCase();

    if (type === 'job_connection_request') {
      if (!notification.jobListingId) return;
      const modal = await this.modal.create({
        component: JobInviteComponent,
        componentProps: {
          notification,
          jobListingId: notification.jobListingId,
        },
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (data?.action || data?.refresh) this.refresh();
      return;
    }

    if (type === 'job_details_shared') {
      const modal = await this.modal.create({
        component: JobExtraDetailsComponent,
        componentProps: {
          notification,
          jobListingId: notification.jobListingId ?? null,
        },
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (data?.refresh) this.refresh();
      return;
    }

    if (type === 'client_placement_decision' || type === 'placement_response') {
      const action = this.extractAction(notification);
      if (action === 'accept') {
        const jobListingId =
          notification.jobListingId ?? this.extractJobId(notification);
        const modal = await this.modal.create({
          component: JobSuccessConfirmationComponent,
          componentProps: {
            notification,
            jobListingId,
            action,
          },
        });
        await modal.present();
        const { data } = await modal.onDidDismiss();
        if (data?.refresh) this.refresh();
      }
      return;
    }
  }

  private markReadLocally(id: string) {
    const next = this.items().map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    this.items.set(next);
  }

  private decrementUnreadCountOnce() {
    this.profileStore.loadUnreadNotificationCount();
  }

  private extractAction(n: Notification): string | null {
    const raw = n.data ?? '';
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const p = parsed?.payload ?? {};
      const a =
        p?.clientPlacementDecision?.action ??
        p?.placementResponse?.action ??
        p?.jobConnectionResponse?.action ??
        null;
      return typeof a === 'string' ? a.toLowerCase().trim() : null;
    } catch {
      return null;
    }
  }

  private extractJobId(n: Notification): number | null {
    const raw = n.data ?? '';
    if (!raw) return n.jobListingId ?? null;
    try {
      const parsed = JSON.parse(raw);
      const p = parsed?.payload ?? {};
      const fromKnown =
        p?.clientPlacementDecision?.jobListingId ??
        p?.placementResponse?.jobListingId ??
        p?.job?.jobListingId ??
        null;
      return n.jobListingId ?? fromKnown ?? null;
    } catch {
      return n.jobListingId ?? null;
    }
  }

  toDate(d: string | undefined) {
    return d ? new Date(d) : null;
  }
}
