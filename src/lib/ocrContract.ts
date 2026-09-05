import type { ShipmentOcrMetadata, ShipmentRecord, ShipmentSourceDocument } from '../types';

/** The application only accepts document formats Gemini can inspect reliably. */
export const OCR_SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const OCR_MAX_FILES = 8;
export const OCR_MAX_FILE_BYTES = 12 * 1024 * 1024;
export const OCR_MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export type OcrSupportedMimeType = typeof OCR_SUPPORTED_MIME_TYPES[number];

export type ShipmentOcrFieldName = keyof Pick<
  ShipmentRecord,
  | 'date_announced'
  | 'delivery_date'
  | 'route'
  | 'transporter'
  | 'cont_number'
  | 'customer'
  | 'batch_number'
  | 'cont_quantity'
  | 'warehouse'
  | 'contact_person'
  | 'contact_phone'
  | 'notes'
>;

export const OCR_SHIPMENT_FIELDS: ShipmentOcrFieldName[] = [
  'date_announced',
  'delivery_date',
  'route',
  'transporter',
  'cont_number',
  'customer',
  'batch_number',
  'cont_quantity',
  'warehouse',
  'contact_person',
  'contact_phone',
  'notes',
];

export type ShipmentOcrDraft = Partial<Pick<ShipmentRecord, ShipmentOcrFieldName>>;

export interface OcrRequestDocument {
  name: string;
  mimeType: string;
  size: number;
  /** Pure base64 content. Data URLs are deliberately not accepted at the API boundary. */
  data: string;
}

export interface ShipmentOcrFieldEvidence {
  field: ShipmentOcrFieldName;
  confidence: number;
  evidence?: string;
  page?: number;
}

export interface ShipmentOcrResult {
  documentName: string;
  documentType: string;
  draft: ShipmentOcrDraft;
  fields: ShipmentOcrFieldEvidence[];
  warnings: string[];
  metadata: ShipmentOcrMetadata;
}

export interface ShipmentOcrApiResponse {
  success: boolean;
  results?: ShipmentOcrResult[];
  error?: string;
}

export const isOcrSupportedMimeType = (mimeType?: string): mimeType is OcrSupportedMimeType =>
  OCR_SUPPORTED_MIME_TYPES.includes((mimeType || '').toLowerCase() as OcrSupportedMimeType);

export const estimateBase64Bytes = (value: string): number => {
  const clean = value.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
};

export const makeOcrMetadata = (
  model: string,
  sourceDocuments: ShipmentSourceDocument[],
  warnings: string[] = [],
): ShipmentOcrMetadata => ({
  provider: 'gemini',
  model,
  extractedAt: new Date().toISOString(),
  sourceDocuments,
  warnings,
  reviewStatus: 'needs_review',
});
