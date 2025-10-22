import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import { BiometricAuthService } from './biometric-auth.service';
import { DeviceInfoService } from '../device-info/device-info.service';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private biometricAuth = inject(BiometricAuthService);
  private deviceInfo = inject(DeviceInfoService);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  async setSecureItem(key: string, value: string): Promise<void> {
    await SecureStoragePlugin.set({ key, value });
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      const result = await SecureStoragePlugin.get({ key });
      return result.value;
    } catch {
      return null;
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    await SecureStoragePlugin.remove({ key });
  }

  sendOtp(
    email: string,
    password: string,
    phoneNumber: string
  ): Observable<any> {
    return this.http.post<any>(
      `${environment.apiEndpoint}/api/auth/otc/candidate`,
      {
        email,
        password,
        phoneNumber,
      }
    );
  }

  requestPasswordResetOtp(email: string) {
    return this.http.post(
      `${environment.apiEndpoint}/api/auth/otc/candidate/password`,
      {
        email,
      }
    );
  }

  verifyPasswordResetCode(email: string, code: string) {
    return this.http.post(
      `${environment.apiEndpoint}/api/auth/password/verify`,
      { email, oneTimeCode: code }
    );
  }

  completePasswordReset(email: string, code: string, newPassword: string) {
    return this.http.post(
      `${environment.apiEndpoint}/api/auth/password/reset`,
      { email, oneTimeCode: code, newPassword }
    );
  }

  verifyCode(email: string, oneTimeCode: string): Observable<any> {
    return new Observable<any>((observer) => {
      this.deviceInfo
        .getDeviceMetadata()
        .then((device) => {
          this.http
            .post<{ token: string; refreshToken: string }>(
              `${environment.apiEndpoint}/api/auth/verify/candidate`,
              {
                email,
                oneTimeCode,
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                ipAddress: device.ipAddress,
              }
            )
            .subscribe({
              next: async (response) => {
                await this.setSecureItem('access_token', response.token);
                await this.setSecureItem(
                  'refresh_token',
                  response.refreshToken
                );
                this.startTokenRefreshWatcher();
                observer.next(response);
                observer.complete();
              },
              error: (err) => observer.error(err),
            });
        })
        .catch((error) => observer.error(error));
    });
  }

  async login(email: string, password: string): Promise<string> {
    try {
      const device = await this.deviceInfo.getDeviceMetadata();

      const response = await firstValueFrom(
        this.http.post<{ token: string; refreshToken: string }>(
          `${environment.apiEndpoint}/api/auth/login`,
          {
            email,
            password,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            ipAddress: device.ipAddress,
          }
        )
      );

      await this.setSecureItem('access_token', response.token);
      await this.setSecureItem('refresh_token', response.refreshToken);
      this.startTokenRefreshWatcher();
      await this.checkBiometricSetup(email);

      return response.token;
    } catch (error: any) {
      const errorMessage =
        error?.error?.[0] ?? 'An unexpected error occurred. Please try again.';
      throw new Error(errorMessage);
    }
  }

  async loginWithBiometric(): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    try {
      const biometricResult =
        await this.biometricAuth.authenticateWithBiometric();
      if (!biometricResult.success || !biometricResult.email) {
        return {
          success: false,
          error: biometricResult.error || 'Biometric authentication failed',
        };
      }

      const device = await this.deviceInfo.getDeviceMetadata();

      const response = await firstValueFrom(
        this.http.post<{ token: string; refreshToken: string }>(
          `${environment.apiEndpoint}/api/auth/biometric-login`,
          {
            email: biometricResult.email,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            ipAddress: device.ipAddress,
          }
        )
      );

      await this.setSecureItem('access_token', response.token);
      await this.setSecureItem('refresh_token', response.refreshToken);
      this.startTokenRefreshWatcher();

      return { success: true, token: response.token };
    } catch (err: any) {
      const code =
        err?.error?.errors?.[0] ??
        err?.error?.[0] ??
        err?.error?.message ??
        err?.message;

      if (code === 'REAUTH_REQUIRED') {
        return { success: false, error: 'REAUTH_REQUIRED' };
      }

      return {
        success: false,
        error:
          typeof code === 'string' ? code : 'Biometric authentication failed',
      };
    }
  }

  private async checkBiometricSetup(email: string): Promise<void> {
    const isAvailable = await this.biometricAuth.isBiometricAvailable();
    const isEnabled = await this.biometricAuth.isBiometricEnabled();

    if (isAvailable && !isEnabled) return;

    if (isEnabled) {
      const storedEmail = await this.biometricAuth.getStoredEmail();
      if (storedEmail !== email) {
        await this.biometricAuth.enableBiometric(email);
      }
    }
  }

  async enableBiometricAuth(email: string): Promise<boolean> {
    return await this.biometricAuth.enableBiometric(email);
  }

  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = await this.getSecureItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      return false;
    }

    try {
      const device = await this.deviceInfo.getDeviceMetadata();

      const response = await firstValueFrom(
        this.http.post<{ token: string; refreshToken: string }>(
          `${environment.apiEndpoint}/api/auth/refresh`,
          {
            refreshToken,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            ipAddress: device.ipAddress,
          }
        )
      );

      await this.setSecureItem('access_token', response.token);
      await this.setSecureItem('refresh_token', response.refreshToken);

      this.startTokenRefreshWatcher();
      return true;
    } catch (error: any) {
      const status = error?.status;
      const msg =
        error?.error?.errors?.[0] ??
        error?.error?.message ??
        error?.message ??
        '';

      const revoked =
        status === 401 ||
        String(msg).toLowerCase().includes('revoked') ||
        String(msg).toLowerCase().includes('expired');

      if (revoked) {
        await this.biometricAuth.clearBiometricData();
      }
      this.logout();
      return false;
    }
  }

  async startTokenRefreshWatcher(): Promise<void> {
    const token = await this.getSecureItem('access_token');
    if (!token) return;

    const payload = this.decodeJwt(token);
    if (!payload?.exp) return;

    const expiry = payload.exp * 1000;
    const now = Date.now();
    const refreshBeforeMs = 60 * 1000;
    const timeUntilRefresh = expiry - now - refreshBeforeMs;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, timeUntilRefresh);
    }
  }

  stopTokenRefreshWatcher(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private decodeJwt(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getSecureItem('access_token');
    return !!token;
  }

  logout(): void {
    this.removeSecureItem('access_token');
    this.removeSecureItem('refresh_token');
    this.stopTokenRefreshWatcher();
  }

  async getAccessToken(): Promise<string | null> {
    return this.getSecureItem('access_token');
  }
}
