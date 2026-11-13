import { api } from './client';

export interface LaboratoryResult {
  id: string;
  labOrderItemId: string;
  valueNumeric?: number | string | null;
  valueText?: string | null;
  unit?: string | null;
  referenceRangeLow?: number | string | null;
  referenceRangeHigh?: number | string | null;
  abnormalFlag?: string | null;
  status: string;
  resultedAt?: string | null;
  verifiedByUserId?: string | null;
  verifiedAt?: string | null;
}

export interface LaboratoryOrderItem {
  id: string;
  labOrderId: string;
  testCode?: string | null;
  codeSystem?: string | null;
  testName: string;
  specimenType?: string | null;
  status: string;
  result?: LaboratoryResult | null;
}

export interface LaboratoryOrder {
  id: string;
  orderNumber: string;
  encounterId: string;
  patientId: string;
  practitionerId?: string | null;
  priority: string;
  clinicalInfo?: string | null;
  status: string;
  orderedAt: string;
  createdAt?: string;
  items: LaboratoryOrderItem[];
  patient?: {
    id: string;
    patientNumber?: string;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
  };
}

export interface CreateLaboratoryOrderItem {
  testCode?: string;
  codeSystem?: string;
  testName: string;
  specimenType?: string;
}

export interface CreateLaboratoryOrderRequest {
  practitionerId?: string;
  priority?: string;
  clinicalInfo?: string;
  items: CreateLaboratoryOrderItem[];
}

export interface CreatePreliminaryResultRequest {
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  abnormalFlag?: string;
  status?: 'PRELIMINARY';
  resultedAt?: string;
}

export const laboratoryApi = {
  async createOrder(
    encounterId: string,
    data: CreateLaboratoryOrderRequest,
  ): Promise<LaboratoryOrder> {
    const response = await api.post<LaboratoryOrder>(
      `/encounters/${encodeURIComponent(encounterId)}/lab-orders`,
      data,
    );

    return response.data;
  },

  async getOrder(orderId: string): Promise<LaboratoryOrder> {
    const response = await api.get<LaboratoryOrder>(
      `/lab-orders/${encodeURIComponent(orderId)}`,
    );

    return response.data;
  },

  async getPatientOrders(
    patientId: string,
  ): Promise<LaboratoryOrder[]> {
    const response = await api.get<LaboratoryOrder[]>(
      `/patients/${encodeURIComponent(patientId)}/lab-orders`,
    );

    return response.data;
  },

  async createPreliminaryResult(
    orderId: string,
    itemId: string,
    data: CreatePreliminaryResultRequest,
  ): Promise<LaboratoryResult> {
    const response = await api.post<LaboratoryResult>(
      `/lab-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/result`,
      {
        ...data,
        status: 'PRELIMINARY',
      },
    );

    return response.data;
  },

  async verifyResult(
    orderId: string,
    itemId: string,
  ): Promise<LaboratoryResult> {
    const response = await api.post<LaboratoryResult>(
      `/lab-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/verify`,
    );

    return response.data;
  },
};
