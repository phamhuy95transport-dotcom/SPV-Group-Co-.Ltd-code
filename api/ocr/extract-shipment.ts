import { allowOcrRequest, getRequestClientKey } from '../../server/ocrRateLimit';
import { extractShipmentDocuments, OcrRequestError } from '../../server/shipmentOcr';

interface VercelRequestLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { documents?: unknown };
  socket?: { remoteAddress?: string };
}

interface VercelResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponseLike;
  json(value: unknown): void;
}

/** Vercel serverless entry point; local development uses the matching Express route. */
export default async function handler(req: VercelRequestLike, res: VercelResponseLike): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  const rateLimit = allowOcrRequest(getRequestClientKey(req.headers, req.socket?.remoteAddress));
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds || 60));
    res.status(429).json({
      success: false,
      error: 'Bạn đã gửi quá nhiều lượt OCR. Hãy thử lại sau ít phút.',
    });
    return;
  }

  try {
    const results = await extractShipmentDocuments(req.body?.documents);
    res.status(200).json({ success: true, results });
  } catch (error) {
    const status = error instanceof OcrRequestError ? error.status : 500;
    if (!(error instanceof OcrRequestError)) {
      console.error('Shipment OCR failed:', error);
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Không thể trích xuất chứng từ.',
    });
  }
}
