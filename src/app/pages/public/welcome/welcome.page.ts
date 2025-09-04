import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonText } from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  imports: [
    IonText,
    IonButton,
    IonContent,
    CommonModule,
    FormsModule,
    RouterModule,
  ],
})
export class WelcomePage {
  clearFocus() {
    let el: Element | null = document.activeElement;
    while (el && (el as any).shadowRoot?.activeElement) {
      el = (el as any).shadowRoot.activeElement as Element;
    }
    (el as HTMLElement | null)?.blur?.();
  }

  ionViewWillLeave() {
    this.clearFocus();
  }
}
