import { Injectable, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private backgroundLogoutThreshold = 5 * 60 * 1000;
  private backgroundTimestamp: number | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        this.handleAppBackground();
      } else {
        this.handleAppResume();
      }
    });
  }

  private handleAppBackground(): void {
    this.backgroundTimestamp = Date.now();
    this.authService.stopTokenRefreshWatcher();

    this.timeoutId = setTimeout(() => {
      this.logoutAndRedirect('App inactive for too long.');
    }, this.backgroundLogoutThreshold);
  }

  private async handleAppResume(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (this.backgroundTimestamp) {
      const elapsed = Date.now() - this.backgroundTimestamp;

      if (elapsed > this.backgroundLogoutThreshold) {
        this.logoutAndRedirect('App was backgrounded too long.');
        return;
      }
    }

    this.backgroundTimestamp = null;

    if (await this.authService.isLoggedIn()) {
      this.authService.startTokenRefreshWatcher();
    }
  }

  private logoutAndRedirect(reason: string): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }
}
