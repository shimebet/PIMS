import { api } from './client';

export interface ClinicalNote {
  id: string;
  encounterId?: string;
  noteType?: string;
  title?: string | null;
  content?: string | null;
  status?: string;
  createdAt?: string;
  signedAt?: string | null;
}

export interface PatientAllergy {
  id: string;
  substance: string;
  allergyType?: string | null;
  criticality?: string | null;
  reaction?: string | null;
  severity?: string | null;
  clinicalStatus?: string;
  onsetAt?: string | null;
  notes?: string | null;
}

export interface MedicationOrder {
  id: string;
  encounterId?: string;
  medicationName: string;
  medicationCode?: string | null;
  strength?: string | null;
  dose?: number | string | null;
  doseUnit?: string | null;
  route?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  instructions?: string | null;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
}

export const clinicalRecordsApi = {
  async getNotes(encounterId: string): Promise<ClinicalNote[]> {
    const response = await api.get<ClinicalNote[]>(
      `/encounters/${encodeURIComponent(encounterId)}/notes`,
    );
    return response.data;
  },

  async getAllergies(patientId: string): Promise<PatientAllergy[]> {
    const response = await api.get<PatientAllergy[]>(
      `/patients/${encodeURIComponent(patientId)}/allergies`,
    );
    return response.data;
  },

  async getPatientMedications(
    patientId: string,
  ): Promise<MedicationOrder[]> {
    const response = await api.get<MedicationOrder[]>(
      `/patients/${encodeURIComponent(patientId)}/medications`,
    );
    return response.data;
  },
};