export interface PatientContact {
  id?: string;
  contactType: string;
  contactValue: string;
  isPrimary: boolean;
}

export interface PatientIdentifier {
  id?: string;
  identifierType: string;
  identifierValue: string;
  isPrimary: boolean;
}

export interface PatientAddress {
  id?: string;
  country?: string | null;
  region?: string | null;
  zone?: string | null;
  district?: string | null;
  city?: string | null;
  subCity?: string | null;
  kebele?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  isPrimary: boolean;
}

export interface Patient {
  id: string;
  patientNumber: string;
  medicalRecordNumber?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth?: string | null;
  birthDateEstimated?: boolean;
  sexAtBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  preferredLanguage?: string | null;
  occupation?: string | null;
  status: string;
  registrationFacilityId?: string | null;
  contacts?: PatientContact[];
  identifiers?: PatientIdentifier[];
  addresses?: PatientAddress[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientListResponse {
  items: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PatientSearchParams {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  page?: number;
  limit?: number;
}
