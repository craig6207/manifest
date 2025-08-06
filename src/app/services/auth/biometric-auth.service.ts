import { Injectable } from '@angular/core';
import {
  BiometricAuth,
  BiometryType,
  AndroidBiometryStrength,
} from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private readonly USER_EMAIL_KEY = 'biometric_user_email';

  /**
   * Check if biometric authentication is available on the device
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Get supported biometric types
   */
  async getBiometricTypes(): Promise<BiometryType[]> {
    try {
      const result = await BiometricAuth.checkBiometry();
      return result.biometryTypes ?? [];
    } catch (error) {
      console.error('Biometric type check failed:', error);
      return [];
    }
  }

  /**
   * Enable biometric login and store user identifier
   */
  async enableBiometric(email: string): Promise<boolean> {
    if (!(await this.isBiometricAvailable())) return false;

    localStorage.setItem(this.USER_EMAIL_KEY, email);
    localStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'true');
    return true;
  }

  /**
   * Authenticate the user using biometrics
   */
  async authenticateWithBiometric(): Promise<{
    success: boolean;
    email?: string;
    error?: string;
  }> {
    if (!this.isBiometricEnabled()) {
      return { success: false, error: 'Biometric login not enabled' };
    }

    try {
      await BiometricAuth.authenticate({
        reason: 'Please authenticate to access your account',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Biometric Login',
        androidSubtitle: 'Authenticate using biometrics',
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.weak,
      });

      const email = this.getStoredEmail() ?? undefined;

      return {
        success: true,
        email,
      };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Utility methods
   */
  isBiometricEnabled(): boolean {
    return localStorage.getItem(this.BIOMETRIC_ENABLED_KEY) === 'true';
  }

  getStoredEmail(): string | null {
    return localStorage.getItem(this.USER_EMAIL_KEY);
  }

  disableBiometric(): void {
    localStorage.removeItem(this.BIOMETRIC_ENABLED_KEY);
    localStorage.removeItem(this.USER_EMAIL_KEY);
  }

  clearBiometricData(): void {
    this.disableBiometric();
  }
}
