import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonImg,
  IonCol,
  IonGrid,
  IonRow,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoadingController, NavController } from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  callOutline,
  chevronBackOutline,
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  mailOutline,
} from 'ionicons/icons';

import { AuthService } from 'src/app/services/auth/auth.service';
import { RegisterStore } from 'src/app/+state/register-signal.store';
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
    IonRow,
    IonGrid,
    IonCol,
    IonImg,
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonList,
    IonItem,
    IonButton,
    IonInput,
    IonToast,
    IonSelect,
    IonSelectOption,
    IonIcon,
  ],
})
export class RegisterPage implements OnInit {
  signup_form!: UntypedFormGroup;
  submit_attempt = false;
  toastOption = { color: '', message: '', show: false };
  selectedDialCode = '';
  selectedDialText = '';
  showPassword = false;
  showRepeatPassword = false;
  readonly countries = COUNTRY_DIALS;

  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly registerStore = inject(RegisterStore);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly navCtrl = inject(NavController);

  constructor() {
    addIcons({
      chevronBackOutline,
      mailOutline,
      lockClosedOutline,
      callOutline,
      eyeOffOutline,
      eyeOutline,
    });
  }

  ngOnInit() {
    this.signup_form = this.formBuilder.group({
      email: ['', [Validators.email, Validators.required]],
      password: ['', [Validators.required, strongPasswordValidator]],
      passwordRepeat: ['', [Validators.required]],
      countryIso2: ['GB', [Validators.required]],
      phoneLocal: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]],
    });

    this.updateSelectedDialCode(this.signup_form.value.countryIso2);

    this.signup_form
      .get('countryIso2')!
      .valueChanges.subscribe((iso2: string) => {
        this.updateSelectedDialCode(iso2);
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

  goBack() {
    this.navCtrl.navigateBack('/');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleRepeatPasswordVisibility(): void {
    this.showRepeatPassword = !this.showRepeatPassword;
  }

  onCountryChange(iso2: string) {
    this.updateSelectedDialCode(iso2);
  }

  private updateSelectedDialCode(iso2: string) {
    const hit = this.countries.find((c) => c.iso2 === iso2);
    this.selectedDialCode = hit?.dialCode ?? '';
    this.selectedDialText = hit ? `${hit.flag}\u00A0${hit.dialCode}` : '';
  }
}
