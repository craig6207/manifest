import { Component, computed, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
} from '@ionic/angular/standalone';
import { NavController, ActionSheetController } from '@ionic/angular';
import type { ActionSheetButton } from '@ionic/core';
import { addIcons } from 'ionicons';
import {
  add,
  home,
  calendar,
  search,
  person,
  addCircleOutline,
  closeOutline,
} from 'ionicons/icons';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { TimesheetStore } from 'src/app/+state/timesheet-signal.store';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonBadge, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  private readonly nav = inject(NavController);
  private readonly actionSheet = inject(ActionSheetController);
  private readonly profileStore = inject(ProfileStore);
  private readonly timesheetStore = inject(TimesheetStore);

  unreadCount = computed(() => this.profileStore.unreadNotificationCount());

  constructor() {
    addIcons({
      home,
      calendar,
      search,
      person,
      add,
      addCircleOutline,
      closeOutline,
    });
    this.timesheetStore.loadToday();
  }

  async openActions() {
    this.timesheetStore.refresh();

    const canAct = this.timesheetStore.hasActionAvailable();

    const buttons: ActionSheetButton[] = [
      {
        text: 'Check in / out',
        disabled: !canAct,
        handler: () => this.nav.navigateForward('secure/tabs/check-in-out'),
      },
      {
        text: 'Job history',
        handler: () => this.nav.navigateForward('secure/tabs/job-history'),
      },
      { text: 'Cancel', role: 'cancel', icon: 'close-outline' },
    ];

    const sheet = await this.actionSheet.create({
      header: 'Quick actions',
      buttons,
    });
    await sheet.present();
  }
}
