export interface CandidateProfile {
  userId?: number;
  candidateId?: number;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  sex: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  locationRadiusMeters: number;
  tradeCategory: string;
  tradeSubcategory: string;
  expectedPay: number;
  bankAccountNumber?: string;
  bankSortCode?: string;
  niNumber?: string;
  rating?: number;
  tradeId?: number;
  tradeSubcategoryIds?: number[];
  expectedDayRate?: number;
  certificateIds?: number[];
  avatarUrl?: string;
  profilePhotoBlobName?: string;
  profilePhotoContentType?: string;
}
