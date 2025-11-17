import { Component, OnInit, inject } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonAlert,
  IonButton,
  IonContent,
  IonIcon,
  IonImg,
  IonInput,
  IonItem,
  IonLoading,
  IonToast,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  eyeOffOutline,
  eyeOutline,
  fingerPrintOutline,
  lockClosedOutline,
  logInOutline,
  mailOutline,
} from 'ionicons/icons';
import { BiometryType } from '@aparajita/capacitor-biometric-auth';
import { AuthService } from 'src/app/services/auth/auth.service';
import { BiometricAuthService } from 'src/app/services/auth/biometric-auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonSpinner,
    IonImg,
    IonToast,
    IonAlert,
    IonLoading,
    IonIcon,
    IonInput,
    IonItem,
    IonContent,
    IonButton,
    ReactiveFormsModule,
  ],
})
export class LoginPage implements OnInit {
  signin_form!: FormGroup;
  submit_attempt = false;

  showBiometricButton = false;
  biometricType = '';

  isBiometricLoading = false;
  isLoading = false;

  isAlertOpen = false;
  alertHeader = '';
  alertMessage = '';
  alertButtons: any[] = [];

  toastOption = { color: '', message: '', show: false };

  showPassword = false;

  private readonly authService = inject(AuthService);
  private readonly biometricAuth = inject(BiometricAuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      fingerPrintOutline,
      logInOutline,
      mailOutline,
      lockClosedOutline,
      arrowForward,
      eyeOutline,
      eyeOffOutline,
    });
  }

  async ngOnInit() {
    this.signin_form = this.formBuilder.group({
      email: ['', Validators.compose([Validators.email, Validators.required])],
      password: [
        '',
        Validators.compose([Validators.minLength(9), Validators.required]),
      ],
    });

    await this.checkBiometricAvailability();

    if (
      this.showBiometricButton &&
      (await this.biometricAuth.isBiometricEnabled())
    ) {
      setTimeout(() => {
        this.loginWithBiometric();
      }, 500);
    }
  }

  private async checkBiometricAvailability(): Promise<void> {
    const isAvailable = await this.biometricAuth.isBiometricAvailable();
    if (isAvailable) {
      const types = await this.biometricAuth.getBiometricTypes();
      this.biometricType = this.getBiometricDisplayName(types);
      this.showBiometricButton = await this.biometricAuth.isBiometricEnabled();
    }
  }

  async signIn() {
    this.submit_attempt = true;

    if (
      this.signin_form.value.email === '' ||
      this.signin_form.value.password === ''
    ) {
      this.toastOption = {
        color: 'danger',
        message: 'Please input email and password',
        show: true,
      };
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await Keyboard.hide();
    }

    this.isLoading = true;

    try {
      await this.authService.login(
        this.signin_form.value.email,
        this.signin_form.value.password
      );

      await this.promptBiometricSetup(this.signin_form.value.email);
      this.isLoading = false;

      await this.router.navigateByUrl('/secure/tabs/home', {
        replaceUrl: true,
      });
    } catch {
      this.isLoading = false;
    }
  }

  async loginWithBiometric(): Promise<void> {
    try {
      this.isBiometricLoading = true;
      const result = await this.authService.loginWithBiometric();

      if (result.success) {
        await this.router.navigateByUrl('/secure/tabs/home', {
          replaceUrl: true,
        });
        return;
      }

      if (result.error === 'REAUTH_REQUIRED') {
        this.showBiometricButton = false;

        this.alertHeader = 'For your security, please sign in again';
        this.alertMessage = `<div class="ion-text-left">
          <p>It's been <strong>over 30 days</strong> since you last used the app, so your session has expired.</p>
          <p>To keep your account safe, we need you to sign in with your email and password.</p>
          <ul>
            <li>Tap <em>Use email & password</em> to continue.</li>
            <li>Forgot it? Choose <em>Reset password</em>.</li>
          </ul>
        </div>`;

        this.alertButtons = [
          {
            text: 'Use email & password',
            role: 'confirm',
            handler: () => {},
          },
          {
            text: 'Reset password',
            handler: () => this.router.navigate(['/password-reset']),
          },
        ];
        this.isAlertOpen = true;
        return;
      }

      const msg = result.error || 'Biometric authentication failed';
      this.toastOption = {
        color: 'warning',
        message: msg.includes('Session expired')
          ? 'Your session expired. Please use email and password.'
          : 'Biometric authentication failed. Please use email and password.',
        show: true,
      };
    } catch {
      this.toastOption = {
        color: 'danger',
        message: 'Biometric authentication failed. Please try again.',
        show: true,
      };
    } finally {
      this.isBiometricLoading = false;
    }
  }

  private async promptBiometricSetup(email: string): Promise<void> {
    const isAvailable = await this.biometricAuth.isBiometricAvailable();
    const isEnabled = await this.biometricAuth.isBiometricEnabled();

    if (isAvailable && !isEnabled) {
      const types = await this.biometricAuth.getBiometricTypes();
      const biometricName = this.getBiometricDisplayName(types);
      const userWantsToEnable = await this.showBiometricSetupAlert(
        biometricName
      );

      if (userWantsToEnable) {
        const success = await this.authService.enableBiometricAuth(email);
        if (success) {
          this.toastOption = {
            color: 'success',
            message: `${biometricName} has been enabled for future logins`,
            show: true,
          };
          this.showBiometricButton = true;
        }
      }
    }
  }

  private showBiometricSetupAlert(biometricName: string): Promise<boolean> {
    this.isLoading = false;
    return new Promise((resolve) => {
      this.alertHeader = 'Enable Biometric Login';
      this.alertMessage = `Would you like to use ${biometricName} for faster login in the future?`;
      this.alertButtons = [
        {
          text: 'Not Now',
          role: 'cancel',
          handler: () => resolve(false),
        },
        {
          text: 'Enable',
          handler: () => resolve(true),
        },
      ];
      this.isAlertOpen = true;
    });
  }

  private getBiometricDisplayName(types: BiometryType[]): string {
    if (types.includes(BiometryType.faceId)) return 'Face ID';
    if (types.includes(BiometryType.fingerprintAuthentication))
      return 'Touch ID';
    return 'Biometric Authentication';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  setToast() {
    this.toastOption = {
      color: '',
      message: '',
      show: false,
    };
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToForgottenPassword() {
    this.router.navigate(['/forgotten-password']);
  }
}
