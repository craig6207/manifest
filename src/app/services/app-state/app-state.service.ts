import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private inactivityTimeout: number = 10 * 60 * 1000;
  private backgroundTimestamp: number | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  private router = inject(Router);

  constructor() {
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        this.handleAppBackground();
      } else {
        this.handleAppResume();
      }
    });
  }

  private handleAppBackground() {
    this.backgroundTimestamp = Date.now();
    this.timeoutId = setTimeout(() => {
      this.router.navigateByUrl('/');
    }, this.inactivityTimeout);
  }

  private handleAppResume() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (this.backgroundTimestamp) {
      const now = Date.now();
      const elapsed = now - this.backgroundTimestamp;
      if (elapsed > this.inactivityTimeout) {
        this.router.navigateByUrl('/');
      }
    }

    this.backgroundTimestamp = null;
  }
}
