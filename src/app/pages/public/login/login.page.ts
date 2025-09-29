import { Component, inject, OnInit } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
import { AuthService } from 'src/app/services/auth/auth.service';
import { BiometricAuthService } from 'src/app/services/auth/biometric-auth.service';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonText,
  IonIcon,
  IonSpinner,
  IonLoading,
  IonAlert,
  IonToast,
  IonInputPasswordToggle,
  IonImg,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, logInOutline } from 'ionicons/icons';
import { BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonImg,
    IonToast,
    IonAlert,
    IonLoading,
    IonIcon,
    IonSpinner,
    IonText,
    IonInput,
    IonItem,
    IonList,
    IonContent,
    IonButton,
    IonToolbar,
    IonHeader,
    IonInputPasswordToggle,
    ReactiveFormsModule,
  ],
})
export class LoginPage implements OnInit {
  signin_form!: FormGroup;
  submit_attempt: boolean = false;
  showBiometricButton = false;
  biometricType = '';
  isBiometricLoading = false;
  isLoading = false;
  isAlertOpen = false;
  alertHeader = '';
  alertMessage = '';
  alertButtons: any[] = [];
  toastOption = { color: '', message: '', show: false };

  private authService = inject(AuthService);
  private biometricAuth = inject(BiometricAuthService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);

  constructor() {
    addIcons({ fingerPrintOutline, logInOutline });
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
    try {
      const isAvailable = await this.biometricAuth.isBiometricAvailable();

      if (isAvailable) {
        const types = await this.biometricAuth.getBiometricTypes();
        this.biometricType = this.getBiometricDisplayName(types);
        this.showBiometricButton =
          await this.biometricAuth.isBiometricEnabled();
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
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

      this.isLoading = false;

      await this.promptBiometricSetup(this.signin_form.value.email);

      await this.router.navigate(['/secure']);
    } catch (error: any) {
      this.isLoading = false;
    }
  }

  async loginWithBiometric(): Promise<void> {
    try {
      this.isBiometricLoading = true;
      const result = await this.authService.loginWithBiometric();

      if (result.success) {
        await this.router.navigate(['/secure']);
        return;
      }
      if (result.error === 'REAUTH_REQUIRED') {
        this.showBiometricButton = false;

        this.alertHeader = 'For your security, please sign in again';
        this.alertMessage = `<div class="ion-text-left">
          <p>It’s been <strong>over 30 days</strong> since you last used the app, so your session has expired.</p>
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
    } catch (error) {
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
    try {
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
    } catch (error) {
      console.error('Error setting up biometric:', error);
    }
  }

  private showBiometricSetupAlert(biometricName: string): Promise<boolean> {
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
