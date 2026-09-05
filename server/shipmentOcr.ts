import { GoogleGenAI, Type } from '@google/genai';
import {
  estimateBase64Bytes,
  isOcrSupportedMimeType,
  makeOcrMetadata,
  OCR_MAX_FILES,
  OCR_MAX_FILE_BYTES,
  OCR_MAX_TOTAL_BYTES,
  OCR_SHIPMENT_FIELDS,
  type OcrRequestDocument,
  type ShipmentOcrDraft,
  type ShipmentOcrFieldEvidence,
  type ShipmentOcrFieldName,
  type ShipmentOcrResult,
} from '../src/lib/ocrContract';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export class OcrRequestError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'OcrRequestError';
  }
}

const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING },
    draft: {
      type: Type.OBJECT,
      properties: {
        date_announced: { type: Type.STRING },
        delivery_date: { type: Type.STRING },
        route: { type: Type.STRING },
        transporter: { type: Type.STRING },
        cont_number: { type: Type.STRING },
        customer: { type: Type.STRING },
        batch_number: { type: Type.STRING },
        cont_quantity: { type: Type.INTEGER },
        warehouse: { type: Type.STRING },
        contact_person: { type: Type.STRING },
        contact_phone: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
    },
    fields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          evidence: { type: Type.STRING },
          page: { type: Type.INTEGER },
        },
        required: ['field', 'confidence'],
      },
    },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['documentType', 'draft', 'fields', 'warnings'],
};

const EXTRACTION_PROMPT = `
Bạn là bộ trích xuất chứng từ logistics Việt Nam cho SPV Group.

Đọc đúng MỘT chứng từ đính kèm và tạo bản nháp cho biểu mẫu chuyến hàng. Chỉ trả về JSON theo schema đã cho.

Quy tắc an toàn bắt buộc:
1. Chỉ điền dữ liệu nhìn thấy rõ trong chứng từ; không suy đoán, không bù số liệu còn thiếu.
2. Không tạo hay suy luận giá gốc, giá bán, trạng thái hóa đơn, checkbox nội bộ hoặc phân quyền.
3. date_announced và delivery_date phải là YYYY-MM-DD nếu ngày trên chứng từ rõ ràng; nếu không chắc, bỏ trường và thêm cảnh báo.
4. cont_number giữ nguyên tất cả số cont đọc được, viết hoa, cách nhau bằng dấu phẩy nếu có nhiều cont.
5. cont_quantity chỉ điền số nguyên khi chứng từ ghi rõ. Không tự suy ra từ số cont.
6. customer, transporter, warehouse, route phải giữ nguyên cách viết trên chứng từ; hệ thống phía sau sẽ đối chiếu với danh mục chuẩn.
7. Mỗi trường đã điền cần một mục fields gồm field, confidence từ 0 đến 1, evidence ngắn và page (nếu đọc được số trang).
8. Nếu chứng từ không phải lệnh vận chuyển/phiếu giao nhận/booking/invoice logistics phù hợp, nêu documentType và warning thay vì bịa dữ liệu.
9. Tất cả dữ liệu là bản nháp cần người dùng duyệt, vì vậy ưu tiên bỏ trống hơn là đoán.
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cleanText = (value: unknown, maxLength = 300): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
};

const isValidCalendarDate = (year: number, month: number, day: number): boolean => {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
};

const normalizeDate = (value: unknown): string | undefined => {
  const text = cleanText(value, 24);
  if (!text) return undefined;
  const match = text.match(/^(?:(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}))$/);
  if (!match) return undefined;
  const year = Number(match[1] || match[6]);
  const month = Number(match[2] || match[5]);
  const day = Number(match[3] || match[4]);
  if (!isValidCalendarDate(year, month, day)) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const normalizeQuantity = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim())
    ? Number(value.trim())
    : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : undefined;
};

const sanitizeDraft = (value: unknown): ShipmentOcrDraft => {
  const raw = isRecord(value) ? value : {};
  const draft: ShipmentOcrDraft = {};

  const dateAnnounced = normalizeDate(raw.date_announced);
  const deliveryDate = normalizeDate(raw.delivery_date);
  const contQuantity = normalizeQuantity(raw.cont_quantity);
  if (dateAnnounced) draft.date_announced = dateAnnounced;
  if (deliveryDate) draft.delivery_date = deliveryDate;
  if (contQuantity) draft.cont_quantity = contQuantity;

  const stringLimits: Array<[Exclude<ShipmentOcrFieldName, 'date_announced' | 'delivery_date' | 'cont_quantity'>, number]> = [
    ['route', 240],
    ['transporter', 240],
    ['cont_number', 240],
    ['customer', 240],
    ['batch_number', 160],
    ['warehouse', 240],
    ['contact_person', 160],
    ['contact_phone', 48],
    ['notes', 1000],
  ];
  stringLimits.forEach(([field, maxLength]) => {
    const cleaned = cleanText(raw[field], maxLength);
    if (!cleaned) return;
    draft[field] = field === 'cont_number'
      ? cleaned.toUpperCase().replace(/\s*,\s*/g, ', ')
      : cleaned;
  });

  return draft;
};

const isDraftField = (field: unknown): field is ShipmentOcrFieldName =>
  typeof field === 'string' && OCR_SHIPMENT_FIELDS.includes(field as ShipmentOcrFieldName);

const hasDraftValue = (draft: ShipmentOcrDraft, field: ShipmentOcrFieldName): boolean => {
  const value = draft[field];
  return typeof value === 'number' ? Number.isFinite(value) : Boolean(value?.trim());
};

const sanitizeEvidence = (value: unknown, draft: ShipmentOcrDraft): ShipmentOcrFieldEvidence[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<ShipmentOcrFieldName>();
  const evidence: ShipmentOcrFieldEvidence[] = [];

  value.forEach(candidate => {
    if (!isRecord(candidate) || !isDraftField(candidate.field) || seen.has(candidate.field)) return;
    if (!hasDraftValue(draft, candidate.field)) return;
    const rawConfidence = typeof candidate.confidence === 'number' ? candidate.confidence : Number(candidate.confidence);
    if (!Number.isFinite(rawConfidence)) return;
    seen.add(candidate.field);
    const item: ShipmentOcrFieldEvidence = {
      field: candidate.field,
      confidence: Math.min(1, Math.max(0, Number(rawConfidence.toFixed(2)))),
    };
    const note = cleanText(candidate.evidence, 280);
    if (note) item.evidence = note;
    const page = normalizeQuantity(candidate.page);
    if (page) item.page = page;
    evidence.push(item);
  });
  return evidence;
};

const sanitizeWarnings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.reduce<string[]>((warnings, warning) => {
    const text = cleanText(warning, 320);
    if (text && !seen.has(text)) {
      seen.add(text);
      warnings.push(text);
    }
    return warnings;
  }, []);
};

const parseModelJson = (responseText: string): unknown => {
  const trimmed = responseText.trim();
  const json = trimmed.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(json);
  } catch {
    throw new OcrRequestError('AI trả về dữ liệu không đúng định dạng. Hãy thử lại với chứng từ rõ hơn.', 502);
  }
};

export const validateOcrDocuments = (value: unknown): OcrRequestDocument[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OcrRequestError('Hãy gửi ít nhất một chứng từ để trích xuất.');
  }
  if (value.length > OCR_MAX_FILES) {
    throw new OcrRequestError(`Mỗi lần chỉ xử lý tối đa ${OCR_MAX_FILES} chứng từ.`);
  }

  let totalBytes = 0;
  const documents = value.map((candidate, index) => {
    if (!isRecord(candidate)) throw new OcrRequestError(`Chứng từ thứ ${index + 1} không hợp lệ.`);
    const name = cleanText(candidate.name, 180);
    const mimeType = cleanText(candidate.mimeType, 80)?.toLowerCase();
    const data = typeof candidate.data === 'string' ? candidate.data.replace(/\s/g, '') : '';
    const claimedSize = typeof candidate.size === 'number' ? candidate.size : 0;
    if (!name || !mimeType || !isOcrSupportedMimeType(mimeType)) {
      throw new OcrRequestError(`Chứng từ thứ ${index + 1} chỉ hỗ trợ PDF, JPG, PNG hoặc WEBP.`);
    }
    if (!data || data.length % 4 !== 0 || !BASE64_PATTERN.test(data)) {
      throw new OcrRequestError(`Dữ liệu của chứng từ "${name}" không hợp lệ.`);
    }
    const decodedBytes = estimateBase64Bytes(data);
    if (decodedBytes <= 0 || decodedBytes > OCR_MAX_FILE_BYTES || claimedSize > OCR_MAX_FILE_BYTES) {
      throw new OcrRequestError(`Chứng từ "${name}" vượt giới hạn ${Math.floor(OCR_MAX_FILE_BYTES / 1024 / 1024)} MB.`);
    }
    totalBytes += decodedBytes;
    return { name, mimeType, data, size: decodedBytes } as OcrRequestDocument;
  });

  if (totalBytes > OCR_MAX_TOTAL_BYTES) {
    throw new OcrRequestError(`Tổng dung lượng chứng từ vượt ${Math.floor(OCR_MAX_TOTAL_BYTES / 1024 / 1024)} MB.`);
  }
  return documents;
};

export const extractShipmentDocuments = async (
  documentsInput: unknown,
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.OCR_GEMINI_MODEL || DEFAULT_MODEL,
): Promise<ShipmentOcrResult[]> => {
  if (!apiKey) {
    throw new OcrRequestError('OCR chưa được cấu hình. Quản trị viên cần đặt GEMINI_API_KEY ở môi trường máy chủ.', 503);
  }
  const documents = validateOcrDocuments(documentsInput);
  const ai = new GoogleGenAI({ apiKey });

  return Promise.all(documents.map(async document => {
    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: document.mimeType, data: document.data } },
            { text: EXTRACTION_PROMPT },
          ],
        }],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: extractionSchema,
        },
      });
      responseText = response.text || '';
    } catch (error) {
      console.error('Gemini OCR request failed:', error instanceof Error ? error.message : error);
      throw new OcrRequestError('Không thể đọc chứng từ bằng AI lúc này. Hãy thử lại sau.', 502);
    }

    if (!responseText) {
      throw new OcrRequestError('AI không trả về kết quả trích xuất. Hãy thử lại với chứng từ rõ hơn.', 502);
    }

    const raw = parseModelJson(responseText);
    const output = isRecord(raw) ? raw : {};
    const draft = sanitizeDraft(output.draft);
    const warnings = sanitizeWarnings(output.warnings);
    const evidence = sanitizeEvidence(output.fields, draft);
    const documentType = cleanText(output.documentType, 120) || 'Chứng từ logistics';

    if (Object.keys(draft).length === 0) {
      warnings.unshift('Không đọc được trường biểu mẫu nào với độ chắc chắn đủ cao; hãy nhập tay hoặc dùng ảnh rõ hơn.');
    }
    if (evidence.some(item => item.confidence < 0.75)) {
      warnings.push('Có trường có độ tin cậy thấp; hãy đối chiếu lại với chứng từ gốc.');
    }

    return {
      documentName: document.name,
      documentType,
      draft,
      fields: evidence,
      warnings: [...new Set(warnings)],
      metadata: makeOcrMetadata(model, [{
        name: document.name,
        mimeType: document.mimeType,
        size: document.size,
      }]),
    };
  }));
};
