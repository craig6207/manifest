export type CertDefinition = {
  id: number;
  name: string;
  code?: string;
  required: boolean;
  requiresFrontBack: boolean;
  acceptedFormats?: string[];
  typicalExpiryMonths?: number | null;
};

export type UploadStatus = 'empty' | 'processing' | 'uploaded' | 'error';

export type Attachment = {
  side: 'single' | 'front' | 'back';
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
  status: UploadStatus;
  progress: number;
};

export type UploadItem = {
  id: string;
  cert: CertDefinition;
  expiresOn: string | null;
  attachments: Attachment[];
  createdAt: number;
};

export interface TradeCertificateRef {
  id: number;
  tradeId: number;
  name: string;
  slug: string;
}

export interface CreateCertPayload {
  certificateId?: number;
  otherName?: string;
  issuer?: string | null;
  issuedOn?: Date | null;
  expiresOn?: Date | null;
  notes?: string | null;
  file: File;
}

export interface CreateCertResult {
  certificateId: number;
  fileId: number;
  blobName: string;
  contentType: string;
  size: number;
  storedAs: string;
}

export interface CandidateCertificateFileView {
  fileId: number;
  contentType: string;
  sizeBytes: number;
  uploadedAtUtc: string;
  isPrimary: boolean;
  downloadUrl: string;
}

export interface CandidateCertificateView {
  id: number;
  certificateId?: number | null;
  otherName?: string | null;
  displayName: string;
  issuer?: string | null;
  issuedOn?: string | null;
  expiresOn?: string | null;
  notes?: string | null;
  status: string;
  createdAtUtc: string;
  file?: CandidateCertificateFileView | null;
}
