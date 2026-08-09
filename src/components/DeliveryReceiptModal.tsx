import React from 'react';
import { X, Printer, FileCheck2, MapPin, Globe } from 'lucide-react';
import { ShipmentRecord } from '../types';

interface DeliveryReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ShipmentRecord | null;
}

export const DeliveryReceiptModal: React.FC<DeliveryReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!isOpen || !record) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formattedReceiptNo = String(record.id || '1').replace(/\D/g, '').slice(-5).padStart(5, '0') || '00001';

  return (
    <div
      id="printable-receipt-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-6 print-container">
        {/* Top Action Bar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center no-print border-b border-slate-800">
          <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <span>Biên Bản Giao Nhận Hàng Hóa Vận Chuyển</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" /> In / Xuất PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTENT */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-900 bg-white">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                <img
                  src="https://sf-static.upanhlaylink.com/img/image_20260808ce6a226944e9d1371a2e2fae6e437f23.jpg"
                  alt="SPV Group Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-black text-lg sm:text-xl text-indigo-950 uppercase tracking-tight">
                  CÔNG TY TNHH SPV GROUP
                </h2>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  BH01-12A Mahathan, Vinhome Imperia, Hồng Bàng, Hải Phòng | Hotline: 0922.0123.95
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  Website: https://spv.biz.vn
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right border-l-2 sm:border-l-0 border-indigo-500 pl-3 sm:pl-0 shrink-0">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Số Biên Bản
              </span>
              <span className="font-mono font-black text-indigo-600 text-base sm:text-lg">
                Số: {formattedReceiptNo}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ngày lập: {formatDate(record.delivery_date)}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-2">
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase text-slate-900 tracking-wide">
              BIÊN BẢN GIAO NHẬN HÀNG HÓA
            </h1>
            <p className="text-xs italic text-slate-500 mt-1">
              (V/v Vận chuyển đường bộ Container)
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 font-medium">1. Khách Hàng (Bên Giao/Yêu cầu):</p>
              <p className="font-bold text-sm text-slate-900 mt-0.5">{record.customer || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">2. Đơn Vị Vận Chuyển:</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {record.transporter || '......................................................................'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">3. Tuyến Đường Vận Chuyển:</p>
              <p className="font-semibold text-slate-800 mt-0.5">{record.route || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">4. Ngày Báo Xe:</p>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDate(record.date_announced)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500 font-medium">5. Ngày Giao/Trả Hàng Thực Tế:</p>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDate(record.delivery_date)}</p>
            </div>
          </div>

          {/* Container Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-200/80 text-slate-800 font-bold uppercase text-[11px] border-b border-slate-300">
                  <th className="p-3 border-r border-slate-300 w-12 text-center">STT</th>
                  <th className="p-3 border-r border-slate-300">Số Container</th>
                  <th className="p-3 border-r border-slate-300 text-center">Số Lượng Cont</th>
                  <th className="p-3 border-r border-slate-300">Địa Điểm Kho/Xưởng Giao Nhận</th>
                  <th className="p-3">Người Nhận Hàng & SĐT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 text-center font-bold border-r border-slate-200">1</td>
                  <td className="p-3 font-mono font-bold text-indigo-700 text-sm border-r border-slate-200">
                    {record.cont_number || '—'}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-800 border-r border-slate-200">
                    {record.cont_quantity || 1} Cont
                  </td>
                  <td className="p-3 text-slate-800 border-r border-slate-200">
                    {record.warehouse || 'Theo hợp đồng'}
                  </td>
                  <td className="p-3 text-slate-800">
                    <span className="font-bold block">{record.contact_person || 'N/A'}</span>
                    <span className="text-slate-500 font-mono">{record.contact_phone || '—'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Document Status */}
          <div className="text-xs space-y-2">
            <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">
              Tình Trạng Chứng Từ & Hồ Sơ Đi Kèm:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-medium">
              <div>Phơi nâng: <strong className="text-indigo-600">{record.phoi_nang ? 'Có' : 'Không'}</strong></div>
              <div>Phơi hạ: <strong className="text-indigo-600">{record.phoi_ha ? 'Có' : 'Không'}</strong></div>
              <div>HĐ hạ rỗng: <strong className="text-indigo-600">{record.hd_ha_rong ? 'Có' : 'Không'}</strong></div>
              <div>HĐ dịch vụ: <strong className="text-indigo-600">{record.hd_dich_vu ? 'Có' : 'Không'}</strong></div>
            </div>
          </div>

          {/* Notes */}
          <div className="text-xs">
            <span className="font-bold text-slate-700">Ghi chú giao nhận: </span>
            <span className="text-slate-600 italic">
              {record.notes ||
                'Hàng hóa đã được kiểm tra đầy đủ, đúng quy cách và nguyên niêm phong seal khi bàn giao.'}
            </span>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-extrabold text-slate-900 uppercase">ĐẠI DIỆN BÊN GIAO</p>
              <p className="text-[11px] text-slate-400 italic mb-20">(Ký & ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 uppercase">ĐẠI DIỆN LÁI XE / ĐVVC</p>
              <p className="text-[11px] text-slate-400 italic mb-20">(Ký & ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 uppercase">ĐẠI DIỆN BÊN NHẬN</p>
              <p className="text-[11px] text-slate-400 italic mb-20">(Ký & ghi rõ họ tên)</p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden during print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center no-print">
          <span className="text-xs text-slate-500">
            Mẹo: Bạn có thể chọn "Lưu dưới dạng PDF" ở cửa sổ in của trình duyệt.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
