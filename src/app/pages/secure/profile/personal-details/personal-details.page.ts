import { Component, inject, signal } from '@angular/core';
import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonModal,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { addIcons } from 'ionicons';
import {
  callOutline,
  cardOutline,
  createOutline,
  maleFemaleOutline,
  personOutline,
} from 'ionicons/icons';
import { ProfileEditPage } from '../profile-edit/profile-edit.page';

@Component({
  selector: 'app-personal-details',
  templateUrl: './personal-details.page.html',
  styleUrl: './personal-details.page.scss',
  imports: [
    IonIcon,
    IonButton,
    IonModal,
    IonBackButton,
    IonButtons,
    IonHeader,
    IonContent,
    IonToolbar,
    IonTitle,
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
    addIcons({
      createOutline,
      personOutline,
      callOutline,
      maleFemaleOutline,
      cardOutline,
    });
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

  handleSave(patch: Partial<CandidateProfile>): void {
    const current = this.personalDetails();
    if (!current) return;
    const payload = { ...current, ...patch } as CandidateProfile;

    this.store.updateProfile(payload);
    this.isEditOpen.set(false);
  }
}
