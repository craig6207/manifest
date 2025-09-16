import { Component, computed, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
  IonActionSheet,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  home,
  calendar,
  search,
  person,
  addCircleOutline,
} from 'ionicons/icons';
import { NavController } from '@ionic/angular';
import type { ActionSheetButton } from '@ionic/core';
import { ProfileStore } from 'src/app/+state/profile-signal.store';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    IonBadge,
    IonActionSheet,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
  ],
})
export class TabsPage {
  private readonly nav = inject(NavController);
  private profileStore = inject(ProfileStore);
  unreadCount = computed(() => this.profileStore.unreadNotificationCount());
  public readonly actionSheetButtons: ReadonlyArray<ActionSheetButton> = [
    {
      text: 'Check in / out',
      handler: () => this.nav.navigateForward('secure/tabs/check-in-out'),
    },
    {
      text: 'Job history',
      handler: () => this.nav.navigateForward('secure/tabs/job-history'),
    },
    {
      text: 'Certificate management',
      handler: () =>
        this.nav.navigateForward('secure/tabs/certificate-management'),
    },
    {
      text: 'Cancel',
      role: 'cancel',
      icon: 'close-outline',
    },
  ];

  constructor() {
    addIcons({ home, calendar, search, person, add, addCircleOutline });
  }
}
