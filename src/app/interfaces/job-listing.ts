export interface JobListing {
  id: number;
  trade: string;
  tradeSubCategory: string;
  certification: string[] | null;
  projectInfo: string;
  location: string;
  hours: string[];
  startDate: string;
  endDate: string;
  payRate: number;
  profileId: number;
}

export type JobFilterOptions = {
  skip?: number;
  take?: number;
  includePast?: boolean;
  subCategory?: string;
  minPay?: number;
  startDateFrom?: string;
};
