import { Component, EventEmitter, Output, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonTitle,
  IonIcon,
  IonButton,
  IonButtons,
  IonToolbar,
  IonText,
} from '@ionic/angular/standalone';
import { AlertController, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack, calendarOutline } from 'ionicons/icons';

@Component({
  selector: 'app-toolbar-back',
  templateUrl: './toolbar-back.component.html',
  styleUrls: ['./toolbar-back.component.scss'],
  imports: [IonText, IonTitle, IonIcon, IonButton, IonButtons, IonToolbar],
})
export class ToolbarBackComponent {
  title = input('');
  navigation = input('');
  profileStep = input('');
  backButtonShow = input<boolean>(true);
  calendarShow = input<boolean>(false);
  confirmOnBack = input<boolean>(false);
  confirmHeader = input<string>('Leave profile setup?');
  confirmMessage = input<string>(
    'You cannot access the app until you complete the profile setup. You can finish it next time you log in. Still want to leave?'
  );
  confirmOkText = input<string>('OK');
  confirmCancelText = input<string>('Cancel');

  @Output() calendarClick = new EventEmitter<void>();

  private router = inject(Router);
  private nav = inject(NavController);
  private alertController = inject(AlertController);

  constructor() {
    addIcons({
      arrowBack,
      calendarOutline,
    });
  }

  async goBack() {
    if (!this.confirmOnBack()) {
      this.nav.back();
      return;
    }

    const alert = await this.alertController.create({
      header: this.confirmHeader(),
      message: this.confirmMessage(),
      buttons: [
        { text: this.confirmCancelText(), role: 'cancel' },
        {
          text: this.confirmOkText(),
          role: 'confirm',
          handler: () => {
            this.nav.back();
          },
        },
      ],
    });

    await alert.present();
  }

  onCalendarClick(): void {
    this.calendarClick.emit();
  }
}
