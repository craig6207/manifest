import { Component, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
  IonActionSheet,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, home, calendar, search, person } from 'ionicons/icons';
import { NavController } from '@ionic/angular';
import type { ActionSheetButton } from '@ionic/core';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    IonActionSheet,
    IonFabButton,
    IonFab,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
  ],
})
export class TabsPage {
  private readonly nav = inject(NavController);
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
    addIcons({ home, calendar, search, person, add });
  }
}
