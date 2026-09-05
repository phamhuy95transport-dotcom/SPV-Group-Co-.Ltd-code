import {
  estimateBase64Bytes,
  isOcrSupportedMimeType,
  OCR_MAX_FILES,
  OCR_MAX_FILE_BYTES,
  OCR_MAX_TOTAL_BYTES,
  type OcrRequestDocument,
  type ShipmentOcrApiResponse,
  type ShipmentOcrResult,
} from './ocrContract';

const readFileAsBase64 = async (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error(`Không thể đọc tệp ${file.name}.`));
  reader.onload = () => {
    const value = String(reader.result || '');
    const marker = ';base64,';
    const index = value.indexOf(marker);
    if (index < 0) {
      reject(new Error(`Tệp ${file.name} không ở định dạng base64 hợp lệ.`));
      return;
    }
    resolve(value.slice(index + marker.length));
  };
  reader.readAsDataURL(file);
});

export const validateOcrFiles = (files: File[]): string | undefined => {
  if (files.length === 0) return 'Hãy chọn ít nhất một chứng từ.';
  if (files.length > OCR_MAX_FILES) return `Mỗi lần chỉ xử lý tối đa ${OCR_MAX_FILES} chứng từ.`;

  let total = 0;
  for (const file of files) {
    const mimeType = (file.type || '').toLowerCase();
    if (!isOcrSupportedMimeType(mimeType)) {
      return `${file.name}: chỉ hỗ trợ PDF, JPG, PNG hoặc WEBP.`;
    }
    if (file.size > OCR_MAX_FILE_BYTES) {
      return `${file.name}: dung lượng tối đa là ${Math.floor(OCR_MAX_FILE_BYTES / 1024 / 1024)} MB.`;
    }
    total += file.size;
  }
  if (total > OCR_MAX_TOTAL_BYTES) {
    return `Tổng dung lượng mỗi lượt tối đa là ${Math.floor(OCR_MAX_TOTAL_BYTES / 1024 / 1024)} MB.`;
  }
  return undefined;
};

export const filesToOcrDocuments = async (files: File[]): Promise<OcrRequestDocument[]> => {
  const validationError = validateOcrFiles(files);
  if (validationError) throw new Error(validationError);

  const documents = await Promise.all(files.map(async file => ({
    name: file.name,
    mimeType: file.type.toLowerCase(),
    size: file.size,
    data: await readFileAsBase64(file),
  })));

  const estimatedTotal = documents.reduce((sum, document) => sum + estimateBase64Bytes(document.data), 0);
  if (estimatedTotal > OCR_MAX_TOTAL_BYTES) {
    throw new Error(`Tổng dung lượng giải mã vượt ${Math.floor(OCR_MAX_TOTAL_BYTES / 1024 / 1024)} MB.`);
  }
  return documents;
};

export const extractShipmentDocuments = async (files: File[]): Promise<ShipmentOcrResult[]> => {
  const documents = await filesToOcrDocuments(files);
  const response = await fetch('/api/ocr/extract-shipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents }),
  });

  let payload: ShipmentOcrApiResponse | undefined;
  try {
    payload = await response.json() as ShipmentOcrApiResponse;
  } catch {
    // Return the transport-level error below instead of leaking an invalid response body.
  }

  if (!response.ok || !payload?.success || !payload.results) {
    throw new Error(payload?.error || 'Không thể trích xuất chứng từ. Hãy thử lại sau.');
  }
  return payload.results;
};
