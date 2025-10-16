import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonSkeletonText,
  IonImg,
} from '@ionic/angular/standalone';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { addIcons } from 'ionicons';
import { briefcaseOutline, arrowForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonImg,
    IonText,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSkeletonText,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  private route = inject(ActivatedRoute);
  private profileStore = inject(ProfileStore);
  private router = inject(Router);

  constructor() {
    addIcons({ briefcaseOutline, arrowForwardOutline });
    const resolved = this.route.snapshot.data['jobCount'] as number | undefined;
    this.jobCount.set(resolved ?? 0);
    this.jobCountLoaded.set(true);
  }

  readonly jobCount = signal(0);
  private readonly jobCountLoaded = signal(false);

  private readonly profileReady = computed(() => !!this.profileStore.profile());
  readonly isLoading = computed(
    () => !this.profileReady() || !this.jobCountLoaded()
  );
  readonly firstName = computed(() => {
    const profile = this.profileStore.profile();
    const name = (profile?.firstName ?? 'there').trim();
    return name.length ? name : 'there';
  });

  goBrowse(): void {
    this.router.navigate(['/secure/tabs/job-search']);
  }
}
