import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import {
  IonHeader,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonToggle,
} from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';
import { BiometricAuthService } from 'src/app/services/auth/biometric-auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    ToolbarBackComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  private readonly biometricAuth = inject(BiometricAuthService);

  readonly faceIdEnabled = signal(false);
  readonly cookiesEnabled = signal(false);

  private readonly COOKIES_KEY = 'cookies_enabled';

  async ngOnInit(): Promise<void> {
    await this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    const isFaceId = await this.biometricAuth.isBiometricEnabled();
    this.faceIdEnabled.set(isFaceId);
    try {
      const { value } = await Preferences.get({ key: this.COOKIES_KEY });
      this.cookiesEnabled.set(value === 'true');
    } catch {
      this.cookiesEnabled.set(false);
    }
  }

  async onToggleFaceId(event: CustomEvent): Promise<void> {
    const enable = (event.detail as any).checked as boolean;

    if (!Capacitor.isNativePlatform()) {
      this.faceIdEnabled.set(false);
      return;
    }

    if (enable) {
      const available = await this.biometricAuth.isBiometricAvailable();
      if (!available) {
        this.faceIdEnabled.set(false);
        return;
      }

      const storedEmail = await this.biometricAuth.getStoredEmail();

      if (!storedEmail) {
        this.faceIdEnabled.set(false);
        return;
      }

      const success = await this.biometricAuth.enableBiometric(storedEmail);
      this.faceIdEnabled.set(success);
    } else {
      await this.biometricAuth.disableBiometric();
      this.faceIdEnabled.set(false);
    }
  }

  async onToggleCookies(event: CustomEvent): Promise<void> {
    const enable = (event.detail as any).checked as boolean;

    await Preferences.set({
      key: this.COOKIES_KEY,
      value: enable ? 'true' : 'false',
    });

    this.cookiesEnabled.set(enable);
  }
}
