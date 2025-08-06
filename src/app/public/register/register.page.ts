import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
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
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  IonInputPasswordToggle,
  IonToast,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/services/toast/toast.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { RegisterStore } from 'src/app/+state/register-signal.store';
import { HttpErrorResponse } from '@angular/common/http';
import { LoadingController } from '@ionic/angular';

function strongPasswordValidator(control: any) {
  const value = control.value || '';

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumeric = /[0-9]/.test(value);
  const hasMinLength = value.length >= 9;

  const valid = hasUpperCase && hasLowerCase && hasNumeric && hasMinLength;

  return valid ? null : { strongPassword: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    IonToast,
    IonCol,
    IonRow,
    IonGrid,
    IonText,
    IonButton,
    IonItem,
    IonList,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonToolbar,
    IonInput,
    IonInputPasswordToggle,
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class RegisterPage implements OnInit {
  signup_form!: UntypedFormGroup;
  submit_attempt: boolean = false;
  toastOption = { color: '', message: '', show: false };
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private registerStore = inject(RegisterStore);
  private loadingCtrl = inject(LoadingController);

  ngOnInit() {
    this.signup_form = this.formBuilder.group({
      email: ['', [Validators.email, Validators.required]],
      password: ['', [Validators.required, strongPasswordValidator]],
      password_repeat: ['', [Validators.required]],
    });
  }

  async signUp() {
    this.submit_attempt = true;

    const { email, password, password_repeat } = this.signup_form.value;

    if (password !== password_repeat) {
      this.toastOption = {
        color: 'danger',
        message: 'Passwords must match',
        show: true,
      };
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Loading...',
    });
    await loading.present();

    this.authService.sendOtp(email, password).subscribe({
      next: async () => {
        await loading.dismiss();
        this.registerStore.setEmailPassword(email, password);
        this.router.navigate(['/verify-code']);
      },
      error: async (err: HttpErrorResponse) => {
        await loading.dismiss();
        this.toastOption = {
          color: 'danger',
          message: 'Failed to send code. Please try again.',
          show: true,
        };
      },
    });
  }

  setToast() {
    this.toastOption = {
      color: '',
      message: '',
      show: false,
    };
  }
}
