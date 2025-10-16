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
