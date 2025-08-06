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
import { ToastService } from 'src/app/services/toast/toast.service';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonLabel,
  IonText,
  IonIcon,
  IonSpinner,
  IonLoading,
  IonAlert,
  IonBackButton,
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
    IonBackButton,
    IonAlert,
    IonLoading,
    IonIcon,
    IonSpinner,
    IonText,
    IonLabel,
    IonInput,
    IonItem,
    IonList,
    IonContent,
    IonButton,
    IonButtons,
    IonToolbar,
    IonHeader,
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

  private authService = inject(AuthService);
  private biometricAuth = inject(BiometricAuthService);
  private formBuilder = inject(FormBuilder);
  private toastService = inject(ToastService);
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

    // If user has biometric enabled, try biometric login first
    if (this.showBiometricButton && this.biometricAuth.isBiometricEnabled()) {
      // Small delay for better UX
      setTimeout(() => {
        this.loginWithBiometric();
      }, 500);
    }
  }

  /**
   * Check if biometric authentication is available
   */
  private async checkBiometricAvailability(): Promise<void> {
    try {
      const isAvailable = await this.biometricAuth.isBiometricAvailable();

      if (isAvailable) {
        const types = await this.biometricAuth.getBiometricTypes();
        this.biometricType = this.getBiometricDisplayName(types);
        this.showBiometricButton = this.biometricAuth.isBiometricEnabled();
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  }

  /**
   * Standard email/password login
   */
  async signIn() {
    this.submit_attempt = true;

    if (
      this.signin_form.value.email === '' ||
      this.signin_form.value.password === ''
    ) {
      this.toastService.presentToast(
        'Please input email and password',
        'top',
        'danger',
        3000,
        'Error'
      );
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
      console.log(error);
      this.isLoading = false;
    }
  }

  /**
   * Biometric authentication login
   */
  async loginWithBiometric(): Promise<void> {
    try {
      this.isBiometricLoading = true;
      const result = await this.authService.loginWithBiometric();
      console.log(result);

      if (result.success) {
        this.toastService.presentToast(
          `${this.biometricType} authentication successful!`,
          'top',
          'success',
          2000,
          'Success'
        );
        await this.router.navigate(['/secure']);
      } else {
        const errorMessage = result.error || 'Biometric authentication failed';

        if (errorMessage.includes('Session expired')) {
          await this.showSessionExpiredAlert();
          this.showBiometricButton = false;
        } else {
          this.toastService.presentToast(
            'Biometric authentication failed. Please use email and password.',
            'top',
            'warning',
            3000,
            'Authentication Failed'
          );
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      this.toastService.presentToast(
        'Biometric authentication failed. Please try again.',
        'top',
        'danger',
        3000,
        'Error'
      );
    } finally {
      this.isBiometricLoading = false;
    }
  }

  /**
   * Prompt user to enable biometric authentication after successful login
   */
  private async promptBiometricSetup(email: string): Promise<void> {
    try {
      const isAvailable = await this.biometricAuth.isBiometricAvailable();
      const isEnabled = this.biometricAuth.isBiometricEnabled();

      console.log('we got to this place');
      if (isAvailable && !isEnabled) {
        const types = await this.biometricAuth.getBiometricTypes();
        const biometricName = this.getBiometricDisplayName(types);
        console.log(types + ' biometric name: ' + biometricName);
        const userWantsToEnable = await this.showBiometricSetupAlert(
          biometricName
        );

        console.log(types + ' biometric name: ' + biometricName);

        if (userWantsToEnable) {
          const success = await this.authService.enableBiometricAuth(email);
          if (success) {
            this.toastService.presentToast(
              `${biometricName} has been enabled for future logins`,
              'top',
              'success',
              3000,
              'Success'
            );
            this.showBiometricButton = true;
          }
        }
      }
    } catch (error) {
      console.error('Error setting up biometric:', error);
    }
  }

  /**
   * Show biometric setup confirmation alert
   */
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

  /**
   * Show session expired alert
   */
  private async showSessionExpiredAlert(): Promise<void> {
    this.alertHeader = 'Session Expired';
    this.alertMessage =
      'Your session has expired. Please login with your email and password.';
    this.alertButtons = ['OK'];
    this.isAlertOpen = true;
  }

  /**
   * Get biometric display name for user prompt
   */
  private getBiometricDisplayName(types: BiometryType[]): string {
    if (types.includes(BiometryType.faceId)) return 'Face ID';
    if (types.includes(BiometryType.fingerprintAuthentication))
      return 'Touch ID';
    return 'Biometric Authentication';
  }
}
