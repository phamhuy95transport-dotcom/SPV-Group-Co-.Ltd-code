import React, { useMemo } from 'react';
import { CheckCircle2, Clock3, FileSearch, History, Pencil, PlusCircle, X } from 'lucide-react';
import type { AuditEvent, ShipmentRecord } from '../types';

interface ShipmentAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ShipmentRecord | null;
  events: AuditEvent[];
}

const actionPresentation: Record<AuditEvent['action'], { label: string; icon: React.ReactNode; className: string }> = {
  shipment_created: { label: 'Tạo chuyến hàng', icon: <PlusCircle className="h-4 w-4" />, className: 'bg-emerald-100 text-emerald-800' },
  shipment_updated: { label: 'Cập nhật', icon: <Pencil className="h-4 w-4" />, className: 'bg-blue-100 text-blue-800' },
  shipment_confirmed: { label: 'Đã xác nhận', icon: <CheckCircle2 className="h-4 w-4" />, className: 'bg-emerald-100 text-emerald-800' },
  shipment_draft_created: { label: 'Bản nháp OCR', icon: <FileSearch className="h-4 w-4" />, className: 'bg-violet-100 text-violet-800' },
  ocr_applied: { label: 'Áp dụng OCR', icon: <FileSearch className="h-4 w-4" />, className: 'bg-violet-100 text-violet-800' },
  master_saved: { label: 'Lưu danh mục', icon: <Pencil className="h-4 w-4" />, className: 'bg-slate-100 text-slate-800' },
  master_merged: { label: 'Gộp danh mục', icon: <History className="h-4 w-4" />, className: 'bg-amber-100 text-amber-800' },
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
};

export const ShipmentAuditModal: React.FC<ShipmentAuditModalProps> = ({ isOpen, onClose, record, events }) => {
  const shipmentEvents = useMemo(
    () => events.filter(event => event.entityType === 'shipment' && event.entityId === record?.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [events, record?.id],
  );

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex gap-2.5">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><History className="h-5 w-5" /></div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Lịch sử kiểm tra & thay đổi</h3>
              <p className="mt-0.5 text-xs text-slate-500">Cont: {record.cont_number || 'Chưa có'} · {record.customer || 'Chưa có khách hàng'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[63vh] overflow-y-auto p-5">
          {shipmentEvents.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              <Clock3 className="mx-auto mb-2 h-7 w-7 text-slate-300" />
              Chưa có lịch sử cho chuyến này. Các thay đổi mới sẽ được ghi nhận từ bây giờ.
            </div>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {shipmentEvents.map(event => {
                const display = actionPresentation[event.action];
                return (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[1.8rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-slate-600" />
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ${display.className}`}>{display.icon}{display.label}</span>
                        <span className="text-[10px] font-medium text-slate-400">{formatDateTime(event.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-800">{event.message}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{event.actor?.name || 'Hệ thống'}{event.actor?.email ? ` · ${event.actor.email}` : ''}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};
