import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  UntypedFormGroup,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonButton,
  IonText,
  IonInput,
  IonToast,
  IonImg,
  IonLoading,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgotten-password.page.html',
  styleUrls: ['./forgotten-password.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonButton,
    IonText,
    IonInput,
    IonToast,
    IonImg,
    IonLoading,
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class ForgottenPasswordPage implements OnInit {
  form!: UntypedFormGroup;
  submitAttempt = false;
  isLoading = false;

  toastOption = { color: '', message: '', show: false };

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);

  @ViewChild('emailInput', { static: false }) emailInput!: IonInput;

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ionViewDidEnter() {
    setTimeout(() => this.emailInput?.setFocus(), 0);
  }

  async onSubmit(): Promise<void> {
    this.submitAttempt = true;
    if (this.form.invalid) return;

    const email: string = this.form.value.email;

    const loading = await this.loadingCtrl.create({
      message: 'Sending code...',
      spinner: 'crescent',
      backdropDismiss: false,
      translucent: true,
    });
    this.isLoading = true;
    await loading.present();

    this.auth.requestPasswordResetOtp(email).subscribe({
      next: async () => {
        await loading.dismiss();
        this.isLoading = false;

        this.router.navigate(['/verify-code'], {
          queryParams: { mode: 'reset', email },
        });
      },
      error: async (err: HttpErrorResponse) => {
        await loading.dismiss();
        this.isLoading = false;

        const msg =
          err?.error?.message ??
          'Failed to send reset code. Please check the email and try again.';

        this.toastOption = { color: 'danger', message: msg, show: true };
      },
    });
  }

  setToast() {
    this.toastOption = { color: '', message: '', show: false };
  }
}
