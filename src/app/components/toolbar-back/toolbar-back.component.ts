import { Component, inject, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonTitle,
  IonIcon,
  IonButton,
  IonButtons,
  IonToolbar,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';

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

  private router = inject(Router);

  constructor() {
    addIcons({
      arrowBack,
    });
  }

  goBack() {
    this.router.navigate([this.navigation()]);
  }
}
