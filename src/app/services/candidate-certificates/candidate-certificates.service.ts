import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import {
  CandidateCertificateView,
  CreateCertPayload,
  CreateCertResult,
} from 'src/app/interfaces/certificate';

@Injectable({ providedIn: 'root' })
export class CandidateCertificatesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiEndpoint;

  uploadOne(payload: CreateCertPayload): Observable<CreateCertResult> {
    const fd = new FormData();

    if (payload.certificateId != null) {
      fd.append('certificateId', String(payload.certificateId));
    } else if (payload.otherName) {
      fd.append('otherName', payload.otherName.trim());
    } else {
      throw new Error('Either certificateId or otherName is required.');
    }

    if (payload.issuer) fd.append('issuer', payload.issuer);
    if (payload.issuedOn) fd.append('issuedOn', payload.issuedOn.toISOString());
    if (payload.expiresOn)
      fd.append('expiresOn', payload.expiresOn.toISOString());
    if (payload.notes) fd.append('notes', payload.notes);

    fd.append('file', payload.file, payload.file.name);

    return this.http.post<CreateCertResult>(
      `${this.api}/api/candidatecertificates/me`,
      fd
    );
  }

  uploadOneWithProgress(
    payload: CreateCertPayload
  ): Observable<{ progress: number; result?: CreateCertResult }> {
    const fd = new FormData();

    if (payload.certificateId != null) {
      fd.append('certificateId', String(payload.certificateId));
    } else if (payload.otherName) {
      fd.append('otherName', payload.otherName.trim());
    } else {
      throw new Error('Either certificateId or otherName is required.');
    }

    if (payload.issuer) fd.append('issuer', payload.issuer);
    if (payload.issuedOn) fd.append('issuedOn', payload.issuedOn.toISOString());
    if (payload.expiresOn)
      fd.append('expiresOn', payload.expiresOn.toISOString());
    if (payload.notes) fd.append('notes', payload.notes);

    fd.append('file', payload.file, payload.file.name);

    return this.http
      .post(`${this.api}/api/candidatecertificates/me`, fd, {
        observe: 'events',
        reportProgress: true,
      })
      .pipe(
        map((evt: HttpEvent<any>) => {
          switch (evt.type) {
            case HttpEventType.UploadProgress: {
              const progress = evt.total
                ? Math.round((evt.loaded * 100) / evt.total)
                : 0;
              return { progress };
            }
            case HttpEventType.Response: {
              return { progress: 100, result: evt.body as CreateCertResult };
            }
            default:
              return { progress: 0 };
          }
        })
      );
  }

  getCandidateCertificates(): Observable<CandidateCertificateView[]> {
    return this.http.get<CandidateCertificateView[]>(
      `${this.api}/api/candidatecertificates/me`
    );
  }

  downloadCertificate(fileId: number): Observable<Blob> {
    return this.http.get(
      `${this.api}/api/candidatecertificates/me/file/${fileId}`,
      {
        responseType: 'blob',
      }
    );
  }

  getMyFileUrl(fileId: number): string {
    return `${this.api}/api/candidatecertificates/me/file/${fileId}`;
  }

  deleteCertificate(certificateId: number) {
    return this.http.delete<void>(
      `${this.api}/api/candidatecertificates/me/${certificateId}`
    );
  }

  deleteFile(fileId: number) {
    return this.http.delete<void>(
      `${this.api}/api/candidatecertificates/me/file/${fileId}`
    );
  }
}
