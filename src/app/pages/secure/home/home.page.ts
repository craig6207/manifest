import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  NavController,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
} from '@ionic/angular/standalone';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { addIcons } from 'ionicons';
import { briefcaseOutline, arrowForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonText,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  private route = inject(ActivatedRoute);
  private profileStore = inject(ProfileStore);
  private nav = inject(NavController);

  constructor() {
    addIcons({ briefcaseOutline, arrowForwardOutline });
    const resolved = this.route.snapshot.data['jobCount'] as number | undefined;
    this.jobCount.set(resolved ?? 0);
  }

  readonly jobCount = signal(0);

  readonly firstName = computed(() => {
    const profile = this.profileStore.profile();
    return (profile?.firstName ?? 'there').trim();
  });

  goBrowse(): void {
    this.nav.navigateForward(['secure/tabs/job-search']);
  }
}
