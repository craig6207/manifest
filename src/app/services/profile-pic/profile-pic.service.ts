import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class ProfilePicService {
  async getPhotoFrom(source: 'camera' | 'photos'): Promise<Blob> {
    const cameraSource =
      source === 'camera' ? CameraSource.Camera : CameraSource.Photos;

    const photo = await Camera.getPhoto({
      source: cameraSource,
      allowEditing: true,
      quality: 80,
      resultType: CameraResultType.Uri,
      saveToGallery: false,
      correctOrientation: true,
      presentationStyle: 'popover',
      webUseInput: Capacitor.getPlatform() === 'web',
    });

    return this.photoToBlob(photo);
  }

  private async photoToBlob(photo: Photo): Promise<Blob> {
    if (photo.webPath) return (await fetch(photo.webPath)).blob();
    if (photo.dataUrl) return (await fetch(photo.dataUrl)).blob();
    if (photo.base64String) {
      const bin = atob(photo.base64String);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: 'image/jpeg' });
    }
    throw new Error('No image data received from Camera');
  }
}
