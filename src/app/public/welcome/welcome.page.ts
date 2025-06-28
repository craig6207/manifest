import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonText } from '@ionic/angular/standalone';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [IonText, IonButton, IonContent, CommonModule, FormsModule],
})
export class WelcomePage {
  private msalService = inject(MsalService);

  login(): void {
    this.msalService.loginRedirect({
      scopes: [
        'https://dfrecruittest.onmicrosoft.com/dfrecruit/api/recruitment.read',
        'https://dfrecruittest.onmicrosoft.com/dfrecruit/api/recruitment.write',
      ],
    });
  }
}
