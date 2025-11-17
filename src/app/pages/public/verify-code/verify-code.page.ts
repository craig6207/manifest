import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonButton,
  IonContent,
  IonInputOtp,
  IonToast,
  IonHeader,
  IonFooter,
} from '@ionic/angular/standalone';
import { LoadingController, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth/auth.service';
import { RegisterStore } from 'src/app/+state/register-signal.store';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';

type VerifyMode = 'register' | 'reset';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [
    IonFooter,
    IonHeader,
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonInputOtp,
    IonToast,
    ToolbarBackComponent,
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

  mode: VerifyMode = 'register';
  resetEmail: string | null = null;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly registerStore = inject(RegisterStore);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly navCtrl = inject(NavController);

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      const qpMode = (qp.get('mode') ?? 'register').toLowerCase() as VerifyMode;
      this.mode = qpMode === 'reset' ? 'reset' : 'register';
      this.resetEmail = qp.get('email');

      if (this.mode === 'reset' && !this.resetEmail) {
        this.router.navigate(['/forgot-password']);
      }
    });

    this.startResendCountdown();
  }

  private getFlowEmail(): string {
    return this.mode === 'reset'
      ? this.resetEmail ?? ''
      : this.registerStore.email();
  }

  get headline(): string {
    return 'Enter the 6-digit code';
  }

  get subtext(): string {
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
      if (this.resendCountdown === 0) {
        clearInterval(intervalId);
      }
    }, 1000);
  }

  setToast() {
    this.toastOption = { color: '', message: '', show: false };
  }

  close() {
    this.navCtrl.navigateBack('/login');
  }
}
