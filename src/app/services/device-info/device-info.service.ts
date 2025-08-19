import { Injectable } from '@angular/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {
  private readonly DEVICE_ID_KEY = 'device_id';

  async getDeviceMetadata(): Promise<{
    deviceId: string;
    deviceName: string;
    ipAddress: string;
  }> {
    let deviceId = (await Preferences.get({ key: this.DEVICE_ID_KEY })).value;

    if (!deviceId) {
      const id = await Device.getId();
      deviceId = id.identifier;
      await Preferences.set({ key: this.DEVICE_ID_KEY, value: deviceId });
    }

    const info = await Device.getInfo();
    const deviceName = `${info.model} (${info.platform})`;

    return {
      deviceId,
      deviceName,
      ipAddress: '',
    };
  }
}
