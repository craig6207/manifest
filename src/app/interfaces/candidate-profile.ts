export interface CandidateProfile {
  userId: number;
  candidateId?: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  sex: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  locationRadiusMeters: number;
  tradeCategory: string;
  tradeSubcategory: string;
  expectedPay: number;
  bankAccountNumber: string;
  bankSortCode: string;
  niNumber: string;
  rating: number;
  /** @deprecated */
  location?: string;
  /** @deprecated */
  locationRadius?: number;
}
