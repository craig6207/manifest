import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
  IonNote,
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
} from 'ionicons/icons';
import { NotificationsService } from 'src/app/services/notification/notification.service';
import { Notification } from 'src/app/interfaces/notification';
import { JobInviteComponent } from 'src/app/components/job-invite/job-invite.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonSegment,
    IonSegmentButton,
    DatePipe,
  ],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  providers: [ModalController],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private notificationService = inject(NotificationsService);
  private modal = inject(ModalController);

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
      .getNotificationsList(page, pageSize, unreadOnly, false)
      .subscribe({
        next: (res) => {
          this.items.set(res.items ?? []);
          this.total.set(res.total ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
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
    if (!notification.jobListingId) return;

    const modal = await this.modal.create({
      component: JobInviteComponent,
      componentProps: { notification, jobListingId: notification.jobListingId },
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.action) {
      this.refresh();
    }
  }

  toDate(d: string | undefined) {
    return d ? new Date(d) : null;
  }
}
