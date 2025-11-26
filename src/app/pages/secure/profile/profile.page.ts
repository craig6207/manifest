import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonIcon,
  IonContent,
  IonAvatar,
  IonActionSheet,
  IonLoading,
  IonToast,
  IonBadge,
  IonSkeletonText,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  imageOutline,
  settingsOutline,
  notificationsOutline,
  star,
  createOutline,
  logOutOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { AuthService } from 'src/app/services/auth/auth.service';
import {
  ProfilePicService,
  UploadImageResponse,
} from 'src/app/services/profile-pic/profile-pic.service';

const DEFAULT_AVATAR = 'https://ionicframework.com/docs/img/demos/avatar.svg';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonIcon,
    IonContent,
    IonAvatar,
    IonActionSheet,
    IonLoading,
    IonToast,
    IonBadge,
    IonSkeletonText,
    IonButtons,
    IonButton,
    IonList,
    IonItem,
    RouterModule,
  ],
})
export class ProfilePage implements OnDestroy {
  private readonly profilePicService = inject(ProfilePicService);
  private readonly store = inject(ProfileStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);

  isAvatarSheetOpen = signal(false);
  isUploading = signal(false);
  toastMsg = signal('');

  loadingPage = computed(() => !this.store.avatarLoaded());
  avatarSrc = computed(() => this.store.avatarDataUrl() ?? DEFAULT_AVATAR);

  rating = computed(() => this.store.profile()?.rating ?? 0);
  displayName = computed(() => {
    const p = this.store.profile();
    const fn = (p?.firstName ?? '').trim();
    const ln = (p?.lastName ?? '').trim();
    const name = `${fn} ${ln}`.trim();
    return name || 'Your profile';
  });

  readonly unreadCount = computed(() => this.store.unreadNotificationCount());
  readonly hasNotifications = computed(() => this.unreadCount() > 0);
  readonly unreadBadgeText = computed(() => {
    const n = this.unreadCount();
    return n > 99 ? '99+' : `${n}`;
  });

  lastUpload = signal<UploadImageResponse | null>(null);

  constructor() {
    addIcons({
      cameraOutline,
      imageOutline,
      settingsOutline,
      notificationsOutline,
      star,
      createOutline,
      logOutOutline,
      chevronForwardOutline,
    });
  }

  async ionViewWillEnter() {
    await this.store.ensureAvatarLoaded();
  }

  ngOnDestroy(): void {}

  openAvatarSheet(): void {
    this.isAvatarSheetOpen.set(true);
  }

  async onActionSheetDismiss(ev: CustomEvent) {
    const role = (ev as any).detail?.role as
      | 'camera'
      | 'photos'
      | 'cancel'
      | undefined;
    if (role === 'camera' || role === 'photos') {
      await this.pickAndUpload(role);
    }
  }

  private async pickAndUpload(source: 'camera' | 'photos') {
    try {
      this.isUploading.set(true);
      const blob = await this.profilePicService.getPhotoFrom(source);
      await this.store.setAvatarFromBlob(blob);
      const resp = await firstValueFrom(
        this.profilePicService.uploadPhoto(null, blob)
      );
      this.lastUpload.set(resp);
      this.toastMsg.set('Profile photo uploaded');
    } catch {
      this.toastMsg.set('Could not update photo');
    } finally {
      this.isUploading.set(false);
      this.isAvatarSheetOpen.set(false);
    }
  }

  logout() {
    this.authService.logout();
    this.store.clearAvatarCache();
    this.router.navigate(['/']);
  }

  openNotifications(): void {
    this.nav.navigateForward('/secure/tabs/notifications');
  }
}
