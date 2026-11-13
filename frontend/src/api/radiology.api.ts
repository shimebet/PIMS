import { api } from './client';

export interface RadiologyResult {
  id: string;
  radiologyOrderId?: string;
  findings?: string | null;
  impression?: string | null;
  reportedByPractitionerId?: string | null;
  status?: string | null;
  reportedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RadiologyOrder {
  id: string;
  orderNumber?: string;
  patientId: string;
  encounterId: string;
  practitionerId?: string | null;
  modality: string;
  bodySite?: string | null;
  studyDescription: string;
  clinicalIndication?: string | null;
  priority?: string | null;
  status: string;
  orderedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  result?: RadiologyResult | null;
}

export interface CreateRadiologyOrderRequest {
  practitionerId?: string;
  modality: string;
  bodySite?: string;
  studyDescription: string;
  clinicalIndication?: string;
  priority?: string;
}

export interface CreateRadiologyResultRequest {
  findings?: string;
  impression?: string;
  reportedByPractitionerId?: string;
  status?: string;
  reportedAt?: string;
}

export const radiologyApi = {
  async createOrder(
    encounterId: string,
    data: CreateRadiologyOrderRequest,
  ): Promise<RadiologyOrder> {
    const response = await api.post<RadiologyOrder>(
      `/encounters/${encodeURIComponent(encounterId)}/radiology-orders`,
      data,
    );
    return response.data;
  },

  async getOrder(id: string): Promise<RadiologyOrder> {
    const response = await api.get<RadiologyOrder>(
      `/radiology-orders/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  async getPatientOrders(patientId: string): Promise<RadiologyOrder[]> {
    const response = await api.get<RadiologyOrder[]>(
      `/patients/${encodeURIComponent(patientId)}/radiology-orders`,
    );
    return response.data;
  },

  async createResult(
    orderId: string,
    data: CreateRadiologyResultRequest,
  ): Promise<RadiologyResult> {
    const response = await api.post<RadiologyResult>(
      `/radiology-orders/${encodeURIComponent(orderId)}/result`,
      data,
    );
    return response.data;
  },
};