import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonToolbar,
  IonButton,
  IonIcon,
  IonImg,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, notificationsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-toolbar-home',
  templateUrl: './toolbar-home.component.html',
  styleUrls: ['./toolbar-home.component.scss'],
  imports: [IonToolbar, IonButton, IonIcon, IonImg, IonBadge],
})
export class ToolbarHomeComponent {
  firstName = input<string>('there');
  notificationsCount = input<number>(0);

  private router = inject(Router);

  constructor() {
    addIcons({ searchOutline, notificationsOutline });
  }

  readonly hasNotifications = computed(() => this.notificationsCount() > 0);

  openNotifications(): void {
    this.router.navigate(['/secure/tabs/notifications']);
  }
}
