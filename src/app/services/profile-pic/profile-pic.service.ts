import { inject, Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';

export interface UploadImageResponse {
  blobName: string;
  contentType: string;
  size: number;
  downloadUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ProfilePicService {
  private http = inject(HttpClient);
  private api = environment.apiEndpoint;

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

  uploadPhoto(
    candidateId: number | null,
    file: Blob,
    filename?: string
  ): Observable<UploadImageResponse> {
    const name = filename ?? this.inferFilename(file);
    const asFile =
      file instanceof File
        ? file
        : new File([file], name, {
            type: (file as any).type || 'image/jpeg',
          });

    const form = new FormData();
    form.append('file', asFile);
    if (candidateId != null) form.append('candidateId', String(candidateId));

    return this.http.post<UploadImageResponse>(
      `${this.api}/api/candidateprofile/me/photo`,
      form
    );
  }

  uploadPhotoWithProgress(
    candidateId: number | null,
    file: Blob,
    filename?: string
  ): Observable<HttpEvent<UploadImageResponse>> {
    const name = filename ?? this.inferFilename(file);
    const asFile =
      file instanceof File
        ? file
        : new File([file], name, {
            type: (file as any).type || 'image/jpeg',
          });

    const form = new FormData();
    form.append('file', asFile);
    if (candidateId != null) form.append('candidateId', String(candidateId));

    return this.http.post<UploadImageResponse>(
      `${this.api}/api/candidateprofile/me/photo`,
      form,
      { observe: 'events', reportProgress: true }
    );
  }

  getMyPhotoBlob(): Observable<Blob> {
    return this.http.get(`${this.api}/api/candidateprofile/me/photo`, {
      responseType: 'blob',
    });
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

  private inferFilename(file: Blob): string {
    const ext = (file.type?.split('/')?.[1] || 'jpg').toLowerCase();
    return `avatar-${Date.now()}.${ext}`;
  }
}
