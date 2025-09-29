import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
  AbstractControl,
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
  IonInputPasswordToggle,
  IonToast,
  IonImg,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { RegisterStore } from 'src/app/+state/register-signal.store';
import { HttpErrorResponse } from '@angular/common/http';
import { LoadingController } from '@ionic/angular';
import { COUNTRY_DIALS } from 'src/app/interfaces/country-code';

function strongPasswordValidator(control: AbstractControl) {
  const value = control.value || '';
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumeric = /[0-9]/.test(value);
  const hasMinLength = value.length >= 9;
  return hasUpperCase && hasLowerCase && hasNumeric && hasMinLength
    ? null
    : { strongPassword: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    IonImg,
    IonToast,
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
    IonSelect,
    IonSelectOption,
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class RegisterPage implements OnInit {
  signup_form!: UntypedFormGroup;
  submit_attempt = false;
  toastOption = { color: '', message: '', show: false };
  readonly countries = COUNTRY_DIALS;
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private registerStore = inject(RegisterStore);
  private loadingCtrl = inject(LoadingController);

  @ViewChild('emailInput', { static: false }) emailInput!: IonInput;

  ionViewDidEnter() {
    setTimeout(() => this.emailInput?.setFocus(), 0);
  }

  ngOnInit() {
    this.signup_form = this.formBuilder.group({
      email: ['', [Validators.email, Validators.required]],
      password: ['', [Validators.required, strongPasswordValidator]],
      passwordRepeat: ['', [Validators.required]],
      countryIso2: ['GB', [Validators.required]],
      phoneLocal: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]],
    });
  }

  private buildE164(iso2: string, local: string): string {
    const dial = this.countries.find((c) => c.iso2 === iso2)?.dialCode ?? '+44';
    const nsn = String(local).replace(/\D+/g, '').replace(/^0+/, '');
    return `${dial}${nsn}`;
  }

  async signUp() {
    this.submit_attempt = true;

    const { email, password, passwordRepeat, countryIso2, phoneLocal } =
      this.signup_form.value;

    if (password !== passwordRepeat) {
      this.toastOption = {
        color: 'danger',
        message: 'Passwords must match',
        show: true,
      };
      return;
    }

    if (this.signup_form.invalid) return;

    const phoneNumber = this.buildE164(countryIso2, phoneLocal);

    if (!/^\+\d{8,15}$/.test(phoneNumber)) {
      this.toastOption = {
        color: 'danger',
        message: 'Please enter a valid phone number.',
        show: true,
      };
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Loading...' });
    await loading.present();

    this.authService.sendOtp(email, password, phoneNumber).subscribe({
      next: async () => {
        await loading.dismiss();
        this.registerStore.setEmailPasswordPhone(email, password, phoneNumber);
        this.router.navigate(['/verify-code']);
      },
      error: async (_err: HttpErrorResponse) => {
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
    this.toastOption = { color: '', message: '', show: false };
  }
}
