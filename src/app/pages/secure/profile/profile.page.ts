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

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
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
  private profileStore = inject(ProfileStore);

  isAvatarSheetOpen = signal(false);
  isUploading = signal(false);
  toastMsg = signal('');

  private avatarFetchDone = signal(false);
  loadingPage = computed(() => !this.avatarFetchDone());

  private currentAvatarUrl: string | null = null;
  avatarSrc = signal<string>(
    'https://ionicframework.com/docs/img/demos/avatar.svg'
  );
  lastUpload = signal<UploadImageResponse | null>(null);

  rating = computed(() => this.store.profile()?.rating);
  displayName = computed(() => {
    const p = this.store.profile();
    const fn = (p?.firstName ?? '').trim();
    const ln = (p?.lastName ?? '').trim();
    const name = `${fn} ${ln}`.trim();
    return name || 'Your profile';
  });
  unreadCount = computed(() => this.profileStore.unreadNotificationCount());
  unreadBadgeText = computed(() => {
    const n = this.unreadCount();
    return n > 99 ? '99+' : `${n}`;
  });

  constructor() {
    addIcons({ cameraOutline, imageOutline });
  }

  ionViewWillEnter() {
    this.loadAvatarBlocking();
  }

  ngOnDestroy(): void {
    if (this.currentAvatarUrl) {
      URL.revokeObjectURL(this.currentAvatarUrl);
      this.currentAvatarUrl = null;
    }
  }

  private async loadAvatarBlocking(): Promise<void> {
    this.avatarFetchDone.set(false);
    try {
      const blob = await firstValueFrom(
        this.profilePicService.getMyPhotoBlob()
      );
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        this.setAvatarUrl(url);
      }
    } finally {
      this.avatarFetchDone.set(true);
    }
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
      const previewUrl = URL.createObjectURL(blob);
      this.setAvatarUrl(previewUrl);

      const resp = await firstValueFrom(
        this.profilePicService.uploadPhoto(null, blob)
      );
      this.lastUpload.set(resp);

      await this.loadAvatarBlocking();
      this.toastMsg.set('Profile photo uploaded');
    } catch (err) {
      console.error('Avatar update failed', err);
      this.toastMsg.set('Could not update photo');
    } finally {
      this.isUploading.set(false);
      this.isAvatarSheetOpen.set(false);
    }
  }

  private setAvatarUrl(url: string) {
    if (this.currentAvatarUrl) URL.revokeObjectURL(this.currentAvatarUrl);
    this.currentAvatarUrl = url;
    this.avatarSrc.set(url);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
