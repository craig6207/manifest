import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
  IonModal,
  IonRange,
  IonAlert,
  IonText,
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
  trashOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { AuthService } from 'src/app/services/auth/auth.service';
import {
  ProfilePicService,
  UploadImageResponse,
} from 'src/app/services/profile-pic/profile-pic.service';
import { AccountService } from 'src/app/services/account/account.service';

const DEFAULT_AVATAR = 'https://ionicframework.com/docs/img/demos/avatar.svg';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonText,
    IonAlert,
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
    IonModal,
    IonRange,
    ReactiveFormsModule,
    RouterModule,
  ],
})
export class ProfilePage implements OnDestroy {
  private readonly profilePicService = inject(ProfilePicService);
  private readonly store = inject(ProfileStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);
  private readonly fb = inject(FormBuilder);
  private readonly accountService = inject(AccountService);

  isAvatarSheetOpen = signal(false);
  isUploading = signal(false);
  toastMsg = signal('');

  rateModalOpen = signal(false);
  deleteConfirmOpen = signal(false);
  isDeletingAccount = signal(false);

  readonly deleteAlertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Delete',
      role: 'destructive',
      handler: () => this.deleteAccount(),
    },
  ];
  myRateForm: FormGroup;

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
  hourlyRate = computed(() => this.store.profile()?.expectedPay ?? null);
  hourlyRateLabel = computed(() => {
    const v = this.hourlyRate();
    if (v == null || Number.isNaN(v)) return null;
    return `£${v.toFixed(2)}`;
  });

  formatHourly = (v: number) => `£${Math.round(v)}/h`;
  formatDaily = (v: number) => `£${Math.round(v)}/d`;

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
      trashOutline,
    });

    this.myRateForm = this.fb.group({
      hourlyRate: [
        30,
        [Validators.required, Validators.min(5), Validators.max(100)],
      ],
      dayRate: [
        300,
        [Validators.required, Validators.min(50), Validators.max(1000)],
      ],
    });
  }

  async ionViewWillEnter() {
    await this.store.ensureAvatarLoaded();
  }

  openRateModal(): void {
    const profile = this.store.profile();
    const hourly = profile?.expectedPay ?? 30;
    const day = profile?.expectedDayRate ?? 300;

    this.myRateForm.reset(
      {
        hourlyRate: hourly,
        dayRate: day,
      },
      { emitEvent: false }
    );
    this.myRateForm.markAsPristine();
    this.rateModalOpen.set(true);
  }

  closeRateModal(): void {
    this.rateModalOpen.set(false);
  }

  onConfirmRate(): void {
    if (this.myRateForm.invalid) {
      this.myRateForm.markAllAsTouched();
      return;
    }

    const current = this.store.profile();
    if (!current) {
      this.closeRateModal();
      return;
    }

    const value = this.myRateForm.value as {
      hourlyRate: number;
      dayRate: number;
    };

    const payload = {
      ...current,
      expectedPay: value.hourlyRate,
      expectedDayRate: value.dayRate,
    };

    this.store.updateProfile(payload);

    this.closeRateModal();
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
    } catch {
      this.toastMsg.set('Could not update photo');
    } finally {
      this.isUploading.set(false);
      this.isAvatarSheetOpen.set(false);
    }
  }

  async logout() {
    await this.authService.logout();
    this.store.clearAvatarCache();
    await this.nav.navigateRoot('/');
  }

  openNotifications(): void {
    this.nav.navigateForward('/secure/tabs/notifications');
  }
  openSettings(): void {
    this.nav.navigateForward('secure/tabs/profile/settings');
  }

  openDeleteAccountConfirm(): void {
    this.deleteConfirmOpen.set(true);
  }

  private async deleteAccount(): Promise<void> {
    this.deleteConfirmOpen.set(false);
    if (this.isDeletingAccount()) return;
    this.isDeletingAccount.set(true);
    this.toastMsg.set('Deleting account...');
    try {
      await firstValueFrom(this.accountService.deleteMe());

      await this.authService.logout();
      this.store.clearAvatarCache();

      this.toastMsg.set('Account deleted');
      setTimeout(() => {
        this.nav.navigateRoot('/');
      }, 600);
    } catch {
      this.toastMsg.set('Could not delete account. Please try again.');
    } finally {
      this.isDeletingAccount.set(false);
    }
  }

  ngOnDestroy(): void {
    this.toastMsg.set('');
    this.isDeletingAccount.set(false);
    this.deleteConfirmOpen.set(false);
  }
}
