export interface SiteAddress {
  line1: string;
  line2?: string | null;
  city: string;
  postcode: string;
  notes?: string | null;
}

export interface SiteContact {
  name: string;
  phone: string;
  email?: string | null;
}

export interface Hours {
  start: string;
  end: string;
  breakMins?: number | null;
}

export interface Ppe {
  hardHat: boolean;
  hiVis: boolean;
  safetyBoots: boolean;
  gloves: boolean;
  eyeProtection: boolean;
  earProtection: boolean;
  harness: boolean;
  other?: string | null;
}

export interface JobPlacementDetails {
  jobListingId: number;
  siteAddress: SiteAddress;
  siteContact: SiteContact;
  hours: Hours;
  ppe: Ppe;
}
