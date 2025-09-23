export interface Notification {
  id: string;
  type: string;
  title?: string;
  preview?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  expiresAt?: string | null;
  actionRequired: boolean;
  allowedActionsCsv?: string | null;
  jobListingId?: number | null;
  applicationId?: number | null;
  data?: string | null;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CandidateResponse {
  jobListingId: number;
  candidateId: number;
  action: 'accept' | 'decline';
}

export interface CandidateConfirmApplyRequest {
  jobListingId: number;
  candidateId: number;
  bankSortCode: string;
  bankAccountNumber: string;
  niNumber: string;
}
