import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonList,
  IonNote,
  IonItem,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCardSubtitle,
  IonText,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-cookies',
  templateUrl: './cookies.page.html',
  styleUrls: ['./cookies.page.scss'],
  standalone: true,
  imports: [
    IonText,
    IonCardSubtitle,
    IonCardContent,
    IonCardTitle,
    IonCardHeader,
    IonCard,
    IonItem,
    IonNote,
    IonList,
    IonButtons,
    IonBackButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class CookiesPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
