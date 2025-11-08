import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  UntypedFormGroup,
} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonLoading,
  IonToast,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoadingController, NavController } from '@ionic/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { chevronBackOutline, mailOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgotten-password.page.html',
  styleUrls: ['./forgotten-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonList,
    IonItem,
    IonButton,
    IonInput,
    IonToast,
    IonLoading,
    IonIcon,
  ],
})
export class ForgottenPasswordPage implements OnInit {
  form!: UntypedFormGroup;
  submitAttempt = false;
  isLoading = false;

  toastOption = { color: '', message: '', show: false };

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly navCtrl = inject(NavController);

  @ViewChild('emailInput', { static: false }) emailInput!: IonInput;

  constructor() {
    addIcons({
      chevronBackOutline,
      mailOutline,
    });
  }

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

  goBack() {
    this.navCtrl.navigateBack('/login');
  }
}
