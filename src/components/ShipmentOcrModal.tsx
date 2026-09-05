import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import type { ShipmentOcrMetadata, ShipmentRecord } from '../types';
import {
  OCR_SHIPMENT_FIELDS,
  type ShipmentOcrDraft,
  type ShipmentOcrFieldName,
  type ShipmentOcrResult,
} from '../lib/ocrContract';
import { extractShipmentDocuments, validateOcrFiles } from '../lib/shipmentOcrClient';
import {
  type ShipmentMasterData,
  validateShipmentDraft,
} from '../lib/shipmentValidation';

type OcrMode = 'single' | 'batch';

interface ShipmentOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: OcrMode;
  masterData: ShipmentMasterData;
  existingRecords: ShipmentRecord[];
  onApplyDraft?: (draft: ShipmentOcrDraft, metadata: ShipmentOcrMetadata) => void;
  onCreateDrafts?: (drafts: Array<{ draft: ShipmentOcrDraft; metadata: ShipmentOcrMetadata; documentName: string }>) => Promise<void>;
}

const FIELD_LABELS: Record<ShipmentOcrFieldName, string> = {
  date_announced: 'Ngày báo xe',
  delivery_date: 'Ngày đóng/trả hàng',
  route: 'Tuyến đường',
  transporter: 'Đơn vị vận chuyển',
  cont_number: 'Số cont',
  customer: 'Khách hàng',
  batch_number: 'Số lô',
  cont_quantity: 'Số lượng cont',
  warehouse: 'Kho/xưởng',
  contact_person: 'Người liên hệ',
  contact_phone: 'Số điện thoại',
  notes: 'Ghi chú',
};

const fieldInputType = (field: ShipmentOcrFieldName): React.HTMLInputTypeAttribute => {
  if (field === 'date_announced' || field === 'delivery_date') return 'date';
  if (field === 'cont_quantity') return 'number';
  if (field === 'contact_phone') return 'tel';
  return 'text';
};

const resultKey = (result: ShipmentOcrResult, index: number) => `${index}:${result.documentName}`;

const uniqueWarnings = (warnings: string[]) => [...new Set(warnings)];

export const ShipmentOcrModal: React.FC<ShipmentOcrModalProps> = ({
  isOpen,
  onClose,
  mode,
  masterData,
  existingRecords,
  onApplyDraft,
  onCreateDrafts,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ShipmentOcrResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editedDrafts, setEditedDrafts] = useState<Record<string, ShipmentOcrDraft>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeResult = results[activeIndex];
  const activeKey = activeResult ? resultKey(activeResult, activeIndex) : '';
  const activeDraft = activeResult ? (editedDrafts[activeKey] || activeResult.draft) : {};
  // The server preserves request order, so index avoids mixing previews when two
  // different documents happen to share the same file name.
  const activeFile = files[activeIndex];

  useEffect(() => {
    if (!isOpen) return;
    setFiles([]);
    setResults([]);
    setEditedDrafts({});
    setActiveIndex(0);
    setError(null);
  }, [isOpen, mode]);

  useEffect(() => {
    if (!activeFile) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(activeFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [activeFile]);

  const validation = useMemo(
    () => validateShipmentDraft(activeDraft, masterData, existingRecords),
    [activeDraft, masterData, existingRecords],
  );
  const errors = validation.issues.filter(issue => issue.severity === 'error');
  const warnings = validation.issues.filter(issue => issue.severity === 'warning');
  const evidenceByField = new Map(activeResult?.fields.map(field => [field.field, field]) || []);

  if (!isOpen) return null;

  const handleChooseFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const validationError = validateOcrFiles(selected);
    setError(validationError || null);
    if (!validationError) {
      setFiles(selected);
      setResults([]);
      setEditedDrafts({});
      setActiveIndex(0);
    }
    event.target.value = '';
  };

  const handleExtract = async () => {
    const validationError = validateOcrFiles(files);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsExtracting(true);
    try {
      const extracted = await extractShipmentDocuments(files);
      setResults(extracted);
      setActiveIndex(0);
      setEditedDrafts({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể trích xuất chứng từ.');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateActiveDraft = (field: ShipmentOcrFieldName, value: string) => {
    if (!activeResult) return;
    const nextValue = field === 'cont_quantity'
      ? (value.trim() ? Number(value) : undefined)
      : value;
    setEditedDrafts(previous => ({
      ...previous,
      [activeKey]: { ...activeDraft, [field]: nextValue } as ShipmentOcrDraft,
    }));
  };

  const useCanonicalValue = (field: ShipmentOcrFieldName, value?: string) => {
    if (value) updateActiveDraft(field, value);
  };

  const metadataFor = (result: ShipmentOcrResult, reviewStatus: ShipmentOcrMetadata['reviewStatus']): ShipmentOcrMetadata => ({
    ...result.metadata,
    reviewStatus,
    warnings: uniqueWarnings([
      ...(result.metadata.warnings || []),
      ...result.warnings,
    ]),
    extractedAt: result.metadata.extractedAt,
    sourceDocuments: result.metadata.sourceDocuments,
  });

  const applySingle = () => {
    if (!activeResult || !onApplyDraft || errors.length > 0) return;
    onApplyDraft(activeDraft, metadataFor(activeResult, 'applied'));
    onClose();
  };

  const createBatchDrafts = async () => {
    if (!onCreateDrafts || results.length === 0) return;
    setIsApplying(true);
    try {
      await onCreateDrafts(results.map((result, index) => ({
        draft: editedDrafts[resultKey(result, index)] || result.draft,
        metadata: metadataFor(result, 'needs_review'),
        documentName: result.documentName,
      })));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tạo bản nháp.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl my-auto">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-indigo-300/30 bg-indigo-400/15 p-2">
              <Sparkles className="h-5 w-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                {mode === 'batch' ? 'Nhập nhiều chứng từ bằng AI' : 'Đọc chứng từ bằng AI'}
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">
                AI chỉ tạo bản nháp. Các trường thiếu, độ tin cậy thấp hoặc không khớp danh mục phải được kiểm tra trước khi lưu.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Đóng OCR">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-5">
          {results.length === 0 ? (
            <div className="mx-auto max-w-2xl space-y-4 py-4 sm:py-8">
              <label className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/45 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
                <UploadCloud className="h-10 w-10 text-indigo-500" />
                <span className="mt-3 text-sm font-extrabold text-slate-800">Chọn chứng từ cần trích xuất</span>
                <span className="mt-1 text-xs text-slate-500">PDF, JPG, PNG hoặc WEBP · tối đa 12 MB/tệp, {mode === 'batch' ? '8 tệp/lượt' : 'chọn 1 tệp để dễ đối chiếu'}</span>
                <input
                  type="file"
                  className="sr-only"
                  multiple={mode === 'batch'}
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleChooseFiles}
                />
              </label>

              {files.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-bold text-slate-700">Đã chọn {files.length} tệp</p>
                  <div className="max-h-28 space-y-1 overflow-y-auto">
                    {files.map(file => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-xs text-slate-600">
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{error}</p>}

              <button
                type="button"
                disabled={files.length === 0 || isExtracting}
                onClick={() => void handleExtract()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                {isExtracting ? 'Đang đọc và đối chiếu chứng từ…' : 'Trích xuất thành bản nháp'}
              </button>
            </div>
          ) : activeResult ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-800">{activeResult.documentName}</p>
                    <p className="text-[11px] text-slate-500">{activeResult.documentType} · {activeResult.metadata.model}</p>
                  </div>
                </div>
                {results.length > 1 && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <button type="button" className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40" disabled={activeIndex === 0} onClick={() => setActiveIndex(index => index - 1)}><ChevronLeft className="h-4 w-4" /></button>
                    {activeIndex + 1}/{results.length}
                    <button type="button" className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40" disabled={activeIndex === results.length - 1} onClick={() => setActiveIndex(index => index + 1)}><ChevronRight className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700">
                    <ImageIcon className="h-4 w-4 text-slate-400" /> Chứng từ gốc
                  </div>
                  <div className="flex min-h-64 items-center justify-center p-2">
                    {previewUrl && activeFile?.type === 'application/pdf' ? (
                      <iframe title={`Xem trước ${activeFile.name}`} src={previewUrl} className="h-[29rem] w-full rounded-lg bg-white" />
                    ) : previewUrl ? (
                      <img src={previewUrl} alt={`Xem trước ${activeFile?.name || 'chứng từ'}`} className="max-h-[29rem] max-w-full rounded-lg object-contain" />
                    ) : (
                      <p className="px-4 text-center text-xs text-slate-500">Không có bản xem trước cho tệp này.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {(activeResult.warnings.length > 0 || warnings.length > 0) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                      <div className="flex items-center gap-1.5 font-extrabold"><AlertTriangle className="h-4 w-4 text-amber-600" /> Cần kiểm tra</div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-amber-900">
                        {[...activeResult.warnings, ...warnings.map(issue => issue.message)].slice(0, 6).map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                      </ul>
                    </div>
                  )}
                  {errors.length > 0 && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                      <p className="font-extrabold">Cần bổ sung trước khi áp dụng</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5">{errors.map(issue => <li key={`${issue.code}-${issue.field}`}>{issue.message}</li>)}</ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {OCR_SHIPMENT_FIELDS.map(field => {
                      const evidence = evidenceByField.get(field);
                      const value = activeDraft[field];
                      const isNotes = field === 'notes';
                      return (
                        <label key={field} className={`block rounded-xl border p-2.5 ${evidence?.confidence !== undefined && evidence.confidence < 0.75 ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'} ${isNotes ? 'sm:col-span-2' : ''}`}>
                          <span className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
                            {FIELD_LABELS[field]}
                            {evidence && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${evidence.confidence >= 0.9 ? 'bg-emerald-100 text-emerald-800' : evidence.confidence >= 0.75 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{Math.round(evidence.confidence * 100)}%</span>}
                          </span>
                          {isNotes ? (
                            <textarea value={String(value || '')} onChange={event => updateActiveDraft(field, event.target.value)} rows={2} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                          ) : (
                            <input type={fieldInputType(field)} min={field === 'cont_quantity' ? 1 : undefined} value={value === undefined ? '' : String(value)} onChange={event => updateActiveDraft(field, event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                          )}
                          {evidence?.evidence && <span className="mt-1 block truncate text-[10px] text-slate-400" title={evidence.evidence}>{evidence.evidence}{evidence.page ? ` · tr.${evidence.page}` : ''}</span>}
                        </label>
                      );
                    })}
                  </div>

                  {validation.masterMatches.some(match => match.canonicalValue && String(activeDraft[match.field] || '') !== match.canonicalValue) && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs">
                      <p className="font-extrabold text-indigo-950">Gợi ý danh mục chuẩn</p>
                      <div className="mt-2 space-y-1.5">
                        {validation.masterMatches.filter(match => match.canonicalValue && String(activeDraft[match.field] || '') !== match.canonicalValue).map(match => (
                          <div key={match.field} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1.5 text-slate-700">
                            <span>{FIELD_LABELS[match.field]} → <b>{match.canonicalValue}</b></span>
                            <button type="button" onClick={() => useCanonicalValue(match.field, match.canonicalValue)} className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700">Dùng tên chuẩn</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{error}</p>}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Hủy</button>
                {mode === 'single' ? (
                  <button type="button" disabled={errors.length > 0} onClick={applySingle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> Điền vào biểu mẫu để kiểm tra tiếp
                  </button>
                ) : (
                  <button type="button" disabled={isApplying} onClick={() => void createBatchDrafts()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {isApplying ? 'Đang tạo bản nháp…' : `Tạo ${results.length} bản nháp chờ duyệt`}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
