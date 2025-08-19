import { Component, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, imageOutline } from 'ionicons/icons';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { RatingBarComponent } from 'src/app/components/rating-bar/rating-bar/rating-bar.component';
import { ProfilePicService } from 'src/app/services/profile-pic/profile-pic.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  imports: [
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
    RouterModule,
    RatingBarComponent,
  ],
})
export class ProfilePage {
  private readonly profilePicService = inject(ProfilePicService);
  private readonly store = inject(ProfileStore);

  isAvatarSheetOpen = signal(false);
  isUploading = signal(false);
  toastMsg = signal('');

  avatarSrc = signal<string>(
    'https://ionicframework.com/docs/img/demos/avatar.svg'
  );

  rating = computed(() => {
    return this.store.profile()?.rating;
  });

  displayName = computed(() => {
    const p = this.store.profile()!;
    const fn = p.firstName ?? '';
    const ln = p.lastName ?? '';
    return fn || ln ? `${fn} ${ln}`.trim() : 'Craig C Robertson';
  });

  constructor() {
    addIcons({ cameraOutline, imageOutline });
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

      const localUrl = URL.createObjectURL(blob);
      this.avatarSrc.set(localUrl);

      this.toastMsg.set('Profile photo updated');
    } catch (err) {
      console.error('Avatar update failed', err);
      this.toastMsg.set('Could not update photo');
    } finally {
      this.isUploading.set(false);
      this.isAvatarSheetOpen.set(false);
    }
  }
}
