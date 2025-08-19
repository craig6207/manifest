import { Component, inject, signal } from '@angular/core';
import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonButtons,
  IonBackButton,
  IonModal,
  IonListHeader,
  IonButton,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { UserProfile } from 'src/app/interfaces/user-profile';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';
import { ProfileEditPage } from '../profile-edit/profile-edit.page';

@Component({
  selector: 'app-personal-details',
  templateUrl: './personal-details.page.html',
  styleUrl: './personal-details.page.scss',
  imports: [
    IonText,
    IonIcon,
    IonButton,
    IonListHeader,
    IonModal,
    IonBackButton,
    IonButtons,
    IonHeader,
    IonContent,
    IonToolbar,
    IonTitle,
    IonList,
    IonItem,
    ProfileEditPage,
  ],
})
export class PersonalDetailsPage {
  private readonly store = inject(ProfileStore);

  personalDetails = this.store.profile;
  loading = this.store.loading;
  error = this.store.error;
  isEditOpen = signal(false);

  constructor() {
    addIcons({ createOutline });
  }

  ionViewWillEnter(): void {
    this.store.loadProfile();
  }

  openEdit(): void {
    if (this.personalDetails()) this.isEditOpen.set(true);
  }
  closeEdit(): void {
    this.isEditOpen.set(false);
  }

  handleSave(patch: Partial<UserProfile>): void {
    const current = this.personalDetails();
    if (!current) return;
    const payload = { ...current, ...patch } as UserProfile;

    this.store.updateProfile(payload);
    this.isEditOpen.set(false);
  }
}
