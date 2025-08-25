import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import {
  IonButton,
  IonHeader,
  IonRow,
  IonText,
  IonContent,
  IonGrid,
  IonToolbar,
  IonCol,
  IonTitle,
  IonInputOtp,
  IonButtons,
  IonIcon,
  IonToast,
} from '@ionic/angular/standalone';
import { LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RegisterStore } from 'src/app/+state/register-signal.store';
import { HttpErrorResponse } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

@Component({
  selector: 'app-verify-code',
  imports: [
    IonToast,
    IonButtons,
    IonTitle,
    IonCol,
    IonToolbar,
    IonGrid,
    IonContent,
    IonRow,
    IonHeader,
    IonButton,
    IonText,
    IonInputOtp,
    IonIcon,
    FormsModule,
  ],
  templateUrl: './verify-code.page.html',
  styleUrls: ['./verify-code.page.scss'],
})
export class VerifyCodePage implements OnInit {
  constructor() {
    addIcons({
      close,
    });
  }
  otp = '';
  toastOption = { color: '', message: '', show: false };
  resendCountdown = 0;

  private authService = inject(AuthService);
  private router = inject(Router);
  private registerStore = inject(RegisterStore);
  private loadingCtrl = inject(LoadingController);

  ngOnInit() {
    this.startResendCountdown();
  }

  onOtpComplete(event: CustomEvent) {
    this.otp = event.detail.value;
    this.submitOtp();
  }

  async submitOtp() {
    if (this.otp.length < 6) return;

    const loading = await this.loadingCtrl.create({
      message: 'Loading...',
    });
    await loading.present();
    this.authService
      .verifyCode(this.registerStore.email(), this.otp)
      .subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.registerStore.setUserId(response.userId);
          this.router.navigate(['/profile-setup']);
        },
        error: async (err: HttpErrorResponse) => {
          await loading.dismiss();
          this.toastOption = {
            color: 'danger',
            message: 'Invalid code. Please try again',
            show: true,
          };
        },
      });
  }

  async resendCode() {
    this.authService
      .sendOtp(this.registerStore.email(), this.registerStore.password())
      .subscribe({
        next: () => {
          this.toastOption = {
            color: 'success',
            message: 'Code resent to your email',
            show: true,
          };
        },
        error: (err: HttpErrorResponse) => {
          this.toastOption = {
            color: 'danger',
            message: 'Failed to resend code',
            show: true,
          };
        },
      });
  }

  startResendCountdown() {
    this.resendCountdown = 60;
    const intervalId = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown === 0) clearInterval(intervalId);
    }, 1000);
  }

  setToast() {
    this.toastOption = {
      color: '',
      message: '',
      show: false,
    };
  }
}
