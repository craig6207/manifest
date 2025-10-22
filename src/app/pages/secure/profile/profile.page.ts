import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonAvatar,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonActionSheet,
  IonLoading,
  IonToast,
  IonRow,
  IonGrid,
  IonCol,
  IonBadge,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, imageOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { RatingBarComponent } from 'src/app/components/rating-bar/rating-bar.component';
import { AuthService } from 'src/app/services/auth/auth.service';
import {
  ProfilePicService,
  UploadImageResponse,
} from 'src/app/services/profile-pic/profile-pic.service';
import { ChangeDetectionStrategy } from '@angular/core';

const DEFAULT_AVATAR = 'https://ionicframework.com/docs/img/demos/avatar.svg';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonBadge,
    IonCol,
    IonGrid,
    IonRow,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonAvatar,
    IonFooter,
    IonList,
    IonItem,
    IonLabel,
    IonActionSheet,
    IonLoading,
    IonToast,
    IonSkeletonText,
    RouterModule,
    RatingBarComponent,
  ],
})
export class ProfilePage implements OnDestroy {
  private readonly profilePicService = inject(ProfilePicService);
  private readonly store = inject(ProfileStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isAvatarSheetOpen = signal(false);
  isUploading = signal(false);
  toastMsg = signal('');

  loadingPage = computed(() => !this.store.avatarLoaded());
  avatarSrc = computed(() => this.store.avatarDataUrl() ?? DEFAULT_AVATAR);

  rating = computed(() => this.store.profile()?.rating);
  displayName = computed(() => {
    const p = this.store.profile();
    const fn = (p?.firstName ?? '').trim();
    const ln = (p?.lastName ?? '').trim();
    const name = `${fn} ${ln}`.trim();
    return name || 'Your profile';
  });

  unreadCount = computed(() => this.store.unreadNotificationCount());
  unreadBadgeText = computed(() => {
    const n = this.unreadCount();
    return n > 99 ? '99+' : `${n}`;
  });

  lastUpload = signal<UploadImageResponse | null>(null);

  constructor() {
    addIcons({ cameraOutline, imageOutline });
  }

  async ionViewWillEnter() {
    await this.store.ensureAvatarLoaded();
  }

  ngOnDestroy(): void {
    // Nothing to revoke now; we’re using data URLs (no object URLs).
  }

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
    } catch (err) {
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
}
