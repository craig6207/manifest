import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonText,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { UserProfile } from 'src/app/interfaces/user-profile';
import { ProfileEditPage } from '../profile-edit/profile-edit.page';

@Component({
  selector: 'app-job-preferences',
  templateUrl: './job-preferences.page.html',
  styleUrl: './job-preferences.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonText,
    IonModal,
    ProfileEditPage,
  ],
})
export class JobPreferencesPage {
  private readonly store = inject(ProfileStore);
  jobPreferences = computed(() => this.store.profile());
  isEditOpen = signal(false);
  loading = this.store.loading;
  error = this.store.error;

  private readonly CATEGORY_OPTIONS = [
    'Electrician',
    'Plumber',
    'Joiner',
    'Painter',
    'Labourer',
  ];
  private readonly SUBCATEGORY_OPTIONS = [
    'Domestic',
    'Commercial',
    'Industrial',
    'Maintenance',
    'Installation',
  ];

  tradeCategories = signal<string[]>(this.CATEGORY_OPTIONS);
  tradeSubcategories = signal<string[]>(this.SUBCATEGORY_OPTIONS);

  constructor() {
    addIcons({ createOutline });
  }

  ionViewWillEnter(): void {
    this.store.loadProfile();
  }

  openEdit(): void {
    if (this.jobPreferences()) this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
  }

  handleSave(patch: Partial<UserProfile>): void {
    const current = this.jobPreferences();
    if (!current) return;
    const payload = { ...current, ...patch } as UserProfile;

    this.store.updateProfile(payload);
    this.isEditOpen.set(false);
  }
}
