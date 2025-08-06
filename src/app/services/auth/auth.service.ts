import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import { BiometricAuthService } from './biometric-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private biometricAuth = inject(BiometricAuthService);

  sendOtp(email: string, password: string): Observable<any> {
    console.log('we are here');
    console.log(environment.apiEndpoint);
    return this.http.post<any>(`${environment.apiEndpoint}/api/auth/otc`, {
      email,
      password,
    });
  }

  verifyCode(email: string, oneTimeCode: string): Observable<any> {
    return this.http.post<any>(`${environment.apiEndpoint}/api/auth/verify`, {
      email,
      oneTimeCode,
    });
  }

  async register(email: string, password: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ token: string }>(
        `${environment.apiEndpoint}/api/auth/register`,
        { email, password }
      )
    );
    localStorage.setItem('access_token', response.token);

    return response.token;
  }

  async login(email: string, password: string): Promise<string> {
    console.log(environment.apiEndpoint);
    console.log('Request Origin:', window.location.origin);
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string }>(
          `${environment.apiEndpoint}/api/auth/login`,
          { email, password }
        )
      );
      localStorage.setItem('access_token', response.token);

      await this.checkBiometricSetup(email);

      return response.token;
    } catch (error: any) {
      console.log(error);
      const errorMessage =
        error?.error?.[0] ?? 'An unexpected error occurred. Please try again.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Login using biometric authentication
   */
  async loginWithBiometric(): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    try {
      const biometricResult =
        await this.biometricAuth.authenticateWithBiometric();

      if (biometricResult.success && biometricResult.email) {
        // Check if we have a valid token for this user
        const existingToken = this.getStoredToken();
        console.log(existingToken);

        if (existingToken) {
          return {
            success: true,
            token: existingToken,
          };
        } else {
          // Token expired or invalid, clear biometric data
          this.biometricAuth.clearBiometricData();
          return {
            success: false,
            error: 'Session expired. Please login with email and password.',
          };
        }
      }

      return {
        success: false,
        error: biometricResult.error || 'Biometric authentication failed',
      };
    } catch (error) {
      console.error('Biometric login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Check if biometric setup should be prompted
   */
  private async checkBiometricSetup(email: string): Promise<void> {
    try {
      console.log('we got here');
      const isAvailable = await this.biometricAuth.isBiometricAvailable();
      const isEnabled = this.biometricAuth.isBiometricEnabled();

      // Only prompt if biometric is available but not enabled
      if (isAvailable && !isEnabled) {
        // This will be handled by the login component
        return;
      }

      // If biometric is enabled but for a different email, update it
      if (isEnabled) {
        const storedEmail = this.biometricAuth.getStoredEmail();
        if (storedEmail !== email) {
          await this.biometricAuth.enableBiometric(email);
        }
      }
    } catch (error) {
      console.error('Error checking biometric setup:', error);
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometricAuth(email: string): Promise<boolean> {
    return await this.biometricAuth.enableBiometric(email);
  }

  /**
   * Validate token with backend
   */
  private async validateToken(token: string): Promise<boolean> {
    try {
      // You might want to add a validation endpoint in your backend
      // For now, we'll assume the token is valid if it exists
      // Replace this with actual token validation logic
      await firstValueFrom(
        this.http.get(`${environment.apiEndpoint}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Get stored token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.biometricAuth.clearBiometricData();
  }
}
