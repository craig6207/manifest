import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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

type VerifyMode = 'register' | 'reset';

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
    addIcons({ close });
  }

  otp = '';
  toastOption = { color: '', message: '', show: false };
  resendCountdown = 0;

  // mode = 'register' by default
  mode: VerifyMode = 'register';
  // only used in reset mode; for register we read from the store
  resetEmail: string | null = null;

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private registerStore = inject(RegisterStore);
  private loadingCtrl = inject(LoadingController);

  ngOnInit() {
    // Read query params: mode=reset&email=...
    this.route.queryParamMap.subscribe((qp) => {
      const qpMode = (qp.get('mode') ?? 'register').toLowerCase() as VerifyMode;
      this.mode = qpMode === 'reset' ? 'reset' : 'register';
      this.resetEmail = qp.get('email');

      // If reset mode but no email provided, bounce back to forgot-password
      if (this.mode === 'reset' && !this.resetEmail) {
        this.router.navigate(['/forgot-password']);
      }
    });

    this.startResendCountdown();
  }

  // Helper: the email we’ll verify against in the current flow
  private getFlowEmail(): string {
    return this.mode === 'reset'
      ? this.resetEmail ?? ''
      : this.registerStore.email();
  }

  // Helper display text (keeps template tidy)
  get headline(): string {
    return 'Enter the 6-digit code';
  }

  get subtext(): string {
    // You’re sending via SMS now
    return this.mode === 'reset'
      ? 'We sent a verification code via SMS to the phone linked to this account.'
      : 'We sent a verification code via SMS to your phone.';
  }

  onOtpComplete(event: CustomEvent) {
    this.otp = event.detail.value;
    this.submitOtp();
  }

  async submitOtp() {
    if (this.otp.length < 6) return;

    const loading = await this.loadingCtrl.create({ message: 'Verifying...' });
    await loading.present();

    if (this.mode === 'register') {
      // Existing registration flow
      this.authService
        .verifyCode(this.registerStore.email(), this.otp)
        .subscribe({
          next: async (response) => {
            await loading.dismiss();
            this.registerStore.setUserId(response.userId);
            this.router.navigate(['/profile-setup']);
          },
          error: async (_err: HttpErrorResponse) => {
            await loading.dismiss();
            this.toastOption = {
              color: 'danger',
              message: 'Invalid code. Please try again.',
              show: true,
            };
          },
        });
    } else {
      const email = this.getFlowEmail();
      this.authService.verifyPasswordResetCode(email, this.otp).subscribe({
        next: async () => {
          await loading.dismiss();
          this.router.navigate(['/new-password'], {
            queryParams: { email, code: this.otp },
          });
        },
        error: async (_err: HttpErrorResponse) => {
          await loading.dismiss();
          this.toastOption = {
            color: 'danger',
            message: 'Invalid or expired code. Please try again.',
            show: true,
          };
        },
      });
    }
  }

  async resendCode() {
    if (this.resendCountdown > 0) return;

    if (this.mode === 'register') {
      this.authService
        .sendOtp(
          this.registerStore.email(),
          this.registerStore.password(),
          this.registerStore.phoneNumber()
        )
        .subscribe({
          next: () => {
            this.toastOption = {
              color: 'success',
              message: 'Code resent via SMS.',
              show: true,
            };
            this.startResendCountdown();
          },
          error: (_err: HttpErrorResponse) => {
            this.toastOption = {
              color: 'danger',
              message: 'Failed to resend code.',
              show: true,
            };
          },
        });
    } else {
      const email = this.getFlowEmail();
      this.authService.requestPasswordResetOtp(email).subscribe({
        next: () => {
          this.toastOption = {
            color: 'success',
            message: 'Code resent via SMS.',
            show: true,
          };
          this.startResendCountdown();
        },
        error: (_err: HttpErrorResponse) => {
          this.toastOption = {
            color: 'danger',
            message: 'Failed to resend code.',
            show: true,
          };
        },
      });
    }
  }

  startResendCountdown() {
    this.resendCountdown = 60;
    const intervalId = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown === 0) clearInterval(intervalId);
    }, 1000);
  }

  setToast() {
    this.toastOption = { color: '', message: '', show: false };
  }
}
