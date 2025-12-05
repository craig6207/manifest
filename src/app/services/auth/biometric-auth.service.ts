import { Injectable } from '@angular/core';
import {
  BiometricAuth,
  BiometryType,
  AndroidBiometryStrength,
} from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private readonly USER_EMAIL_KEY = 'biometric_user_email';

  async isBiometricAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch {
      return false;
    }
  }

  async getBiometricTypes(): Promise<BiometryType[]> {
    try {
      const result = await BiometricAuth.checkBiometry();
      return result.biometryTypes ?? [];
    } catch {
      return [];
    }
  }

  async setLoginEmail(email: string): Promise<void> {
    if (!email) return;

    try {
      await SecureStoragePlugin.set({
        key: this.USER_EMAIL_KEY,
        value: email,
      });
    } catch {
      console.log('error storing biometric email');
    }
  }

  async enableBiometric(email: string): Promise<boolean> {
    if (!(await this.isBiometricAvailable())) return false;
    if (!email) return false;

    try {
      await this.setLoginEmail(email);

      await SecureStoragePlugin.set({
        key: this.BIOMETRIC_ENABLED_KEY,
        value: 'true',
      });

      return true;
    } catch {
      return false;
    }
  }

  async authenticateWithBiometric(): Promise<{
    success: boolean;
    email?: string;
    error?: string;
  }> {
    const isEnabled = await this.isBiometricEnabled();
    if (!isEnabled) {
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

      const email = await this.getStoredEmail();

      if (!email) {
        return {
          success: false,
          error: 'No stored email for biometric login',
        };
      }

      return {
        success: true,
        email,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) return false;
      const result = await SecureStoragePlugin.get({
        key: this.BIOMETRIC_ENABLED_KEY,
      });
      return result?.value === 'true';
    } catch {
      return false;
    }
  }

  async getStoredEmail(): Promise<string | null> {
    try {
      const result = await SecureStoragePlugin.get({
        key: this.USER_EMAIL_KEY,
      });
      return result.value;
    } catch {
      return null;
    }
  }

  async disableBiometric(): Promise<void> {
    try {
      await SecureStoragePlugin.remove({ key: this.BIOMETRIC_ENABLED_KEY });
    } catch {}

    try {
      await SecureStoragePlugin.remove({ key: this.USER_EMAIL_KEY });
    } catch {}
  }

  async clearBiometricData(): Promise<void> {
    await this.disableBiometric();
  }
}
