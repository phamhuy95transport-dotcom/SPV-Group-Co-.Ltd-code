import React, { useState, useEffect } from 'react';
import { X, Printer, FileCheck2, MapPin, Globe, ExternalLink, FileText, Loader2, RefreshCw } from 'lucide-react';
import { ShipmentRecord, CustomerItem, WarehouseItem, findCustomerByName, formatDateVN } from '../types';
import { lookupTaxCode, TaxLookupResult } from '../lib/taxLookup';

interface DeliveryReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ShipmentRecord | null;
  customers?: CustomerItem[];
  warehouses?: WarehouseItem[];
}

export const DeliveryReceiptModal: React.FC<DeliveryReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  customers = [],
  warehouses = [],
}) => {
  if (!isOpen || !record) return null;

  const formattedReceiptNo = String(record.id || '1').replace(/\D/g, '').slice(-5).padStart(5, '0') || '00001';

  // 1. Strictly extract Tax Code from Customer Catalog
  const custObj = findCustomerByName(record.customer, customers);
  const extractedTaxCode = (
    record.return_invoice_type === 'other'
      ? (record.return_invoice_tax_code || custObj?.tax_code || '')
      : (custObj?.tax_code || record.return_invoice_tax_code || '')
  ).trim();

  // State to hold live data fetched from masothue.com
  const [taxData, setTaxData] = useState<{
    companyName: string;
    address: string;
    loading: boolean;
    source: string;
  }>({
    companyName: record.return_invoice_company_name || custObj?.company_full_name || custObj?.customer_name || record.customer || '—',
    address: record.return_invoice_address || custObj?.address || '—',
    loading: false,
    source: 'Danh mục'
  });

  // Fetch company name & address from masothue.com based on the extracted tax code
  useEffect(() => {
    let isMounted = true;

    async function fetchMasothueData() {
      if (!extractedTaxCode || extractedTaxCode === '—') {
        if (isMounted) {
          setTaxData({
            companyName: custObj?.company_full_name || custObj?.customer_name || record?.customer || '—',
            address: custObj?.address || '—',
            loading: false,
            source: 'Danh mục'
          });
        }
        return;
      }

      setTaxData(prev => ({ ...prev, loading: true }));

      try {
        const result: TaxLookupResult = await lookupTaxCode(extractedTaxCode);
        if (isMounted) {
          if (result && result.found && (result.companyName || result.address)) {
            setTaxData({
              companyName: result.companyName || custObj?.company_full_name || custObj?.customer_name || record?.customer || '—',
              address: result.address || custObj?.address || '—',
              loading: false,
              source: result.source || 'masothue.com'
            });
          } else {
            // Fallback to catalog if tax lookup returned empty
            setTaxData({
              companyName: custObj?.company_full_name || custObj?.customer_name || record?.customer || '—',
              address: custObj?.address || '—',
              loading: false,
              source: 'Danh mục (Không tìm thấy trên masothue.com)'
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching masothue data:', err);
        if (isMounted) {
          setTaxData({
            companyName: custObj?.company_full_name || custObj?.customer_name || record?.customer || '—',
            address: custObj?.address || '—',
            loading: false,
            source: 'Danh mục (Lỗi kết nối masothue.com)'
          });
        }
      }
    }

    fetchMasothueData();

    return () => {
      isMounted = false;
    };
  }, [extractedTaxCode, record?.id, record?.customer, customers]);

  // Find Warehouse Location info - Show exact warehouse location
  const matchedWarehouse = warehouses.find(
    w =>
      (w.warehouse_name && record.warehouse && w.warehouse_name.trim().toLowerCase() === record.warehouse.trim().toLowerCase()) ||
      w.id === record.warehouse ||
      (w.location && record.warehouse && w.location.trim().toLowerCase() === record.warehouse.trim().toLowerCase())
  );
  const warehouseLocationDisplay = matchedWarehouse?.location?.trim() || record.warehouse || 'Theo hợp đồng';

  // Customer display name: prefer live company name from masothue.com if available
  const customerDisplayName = (taxData.companyName && taxData.companyName !== '—')
    ? taxData.companyName
    : (record.return_invoice_company_name?.trim() || custObj?.company_full_name || record.customer || '—');

  const cleanTaxForUrl = extractedTaxCode.replace(/\D/g, '');

  const handlePrint = () => {
    try {
      window.focus();
      setTimeout(() => {
        window.print();
      }, 150);
    } catch (e) {
      console.warn('Standard window.print call failed, launching popup:', e);
      handleOpenNewWindowPrint();
    }
  };

  const handleOpenNewWindowPrint = () => {
    const content = document.getElementById('printable-receipt-content');
    if (!content) return;

    const printWin = window.open('', '_blank', 'width=850,height=1100');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Biên Bản Giao Nhận - SPV Group - Số ${formattedReceiptNo}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4 portrait; margin: 10mm 12mm; }
              body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #ffffff; color: #000000; padding: 20px; }
              .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <div class="max-w-3xl mx-auto bg-white">
              ${content.innerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      alert('Vui lòng cho phép bật Cửa Sổ Bật Lên (Pop-up) trên trình duyệt để in hoặc tải file PDF.');
    }
  };

  return (
    <div
      id="printable-receipt-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-6 print-container">
        {/* Top Action Bar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center no-print border-b border-slate-800">
          <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-400" />
            <span>Biên Bản Giao Nhận Hàng Hóa Vận Chuyển</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewWindowPrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              title="Mở biên bản trong cửa sổ mới để in / xuất PDF"
            >
              <ExternalLink className="w-3.5 h-3.5" /> In / Tải PDF (Cửa Sổ Mới)
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition ml-2 p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTENT */}
        <div id="printable-receipt-content" className="p-6 sm:p-8 space-y-5 text-slate-900 bg-white print:p-0 print:space-y-4">

          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                <img
                  src="https://sf-static.upanhlaylink.com/img/image_20260808ce6a226944e9d1371a2e2fae6e437f23.jpg"
                  alt="SPV Group Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-black text-base sm:text-lg text-indigo-950 uppercase tracking-tight">
                  CÔNG TY TNHH SPV GROUP
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  BH01-12A Mahathan, Vinhome Imperia, Hồng Bàng, Hải Phòng | Hotline: 0922.0123.95
                </p>
                <p className="text-[11px] sm:text-xs text-slate-600 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  Website: https://spv.biz.vn
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Số Biên Bản
              </span>
              <span className="font-mono font-black text-indigo-600 text-base sm:text-lg">
                Số: {formattedReceiptNo}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ngày lập: {formatDateVN(record.delivery_date)}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-1">
            <h1 className="text-lg sm:text-xl font-extrabold uppercase text-slate-900 tracking-wide">
              BIÊN BẢN GIAO NHẬN HÀNG HÓA
            </h1>
            <p className="text-[11px] italic text-slate-500 mt-0.5">
              (V/v Vận chuyển đường bộ Container)
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs print:bg-white print:p-3">
            <div>
              <p className="text-slate-500 font-medium">1. Khách Hàng (Bên Giao/Yêu cầu):</p>
              <p className="font-bold text-slate-900 mt-0.5 leading-snug">{customerDisplayName}</p>
              {record.customer && customerDisplayName !== record.customer && (
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Tên viết tắt: {record.customer}</p>
              )}
            </div>
            <div>
              <p className="text-slate-500 font-medium">2. Đơn Vị Vận Chuyển:</p>
              <div className="border-b border-dashed border-slate-300 mt-1 h-5 min-w-[120px]"></div>
            </div>
            <div>
              <p className="text-slate-500 font-medium">3. Tuyến Đường Vận Chuyển:</p>
              <p className="font-semibold text-slate-800 mt-0.5">{record.route || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">4. Ngày Báo Xe:</p>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDateVN(record.date_announced)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 font-medium">5. Ngày Giao/Trả Hàng Thực Tế:</p>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDateVN(record.delivery_date)}</p>
            </div>
          </div>

          {/* Container Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] sm:text-[11px] border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300 w-10 text-center">STT</th>
                  <th className="p-2.5 border-r border-slate-300">Số Container</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-24">Số Lượng</th>
                  <th className="p-2.5 border-r border-slate-300">Địa Điểm / Vị Trí Kho Xưởng</th>
                  <th className="p-2.5">Người Nhận & SĐT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 text-center font-bold border-r border-slate-200">1</td>
                  <td className="p-2.5 font-mono font-bold text-indigo-700 text-xs sm:text-sm border-r border-slate-200 break-words">
                    {record.cont_number || '—'}
                  </td>
                  <td className="p-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                    {record.cont_quantity || 1} Cont
                  </td>
                  <td className="p-2.5 text-slate-800 border-r border-slate-200 break-words">
                    <span className="font-medium text-slate-900 block">{warehouseLocationDisplay}</span>
                    {matchedWarehouse && matchedWarehouse.location && matchedWarehouse.warehouse_name !== warehouseLocationDisplay && (
                      <span className="text-[10px] text-slate-500 block">({matchedWarehouse.warehouse_name})</span>
                    )}
                  </td>
                  <td className="p-2.5 text-slate-800">
                    <span className="font-bold block">{record.contact_person || 'N/A'}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{record.contact_phone || '—'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Return Container Invoice Info (Thông tin hóa đơn hạ vỏ) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs print:bg-white print:p-2.5 space-y-1.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <div className="flex items-center gap-1.5 font-extrabold uppercase text-[11px] text-indigo-950">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>THÔNG TIN HÓA ĐƠN HẠ VỎ (CONTAINER):</span>
              </div>
              <div className="flex items-center gap-2 no-print">
                {taxData.loading && (
                  <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Đang tra cứu masothue.com...
                  </span>
                )}
                {extractedTaxCode && cleanTaxForUrl && (
                  <a
                    href={`https://masothue.com/${cleanTaxForUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 font-semibold"
                    title="Mở trang masothue.com để xem chi tiết doanh nghiệp"
                  >
                    <ExternalLink className="w-3 h-3" />
                    masothue.com
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">Mã số thuế:</span>
                <span className="font-mono font-bold text-slate-900">{extractedTaxCode || '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 font-medium block text-[11px] flex items-center justify-between">
                  <span>Tên công ty xuất hóa đơn:</span>
                  {taxData.source && !taxData.loading && (
                    <span className="text-[9px] text-slate-400 font-normal no-print italic">
                      (Nguồn: {taxData.source})
                    </span>
                  )}
                </span>
                <span className="font-bold text-slate-900 leading-snug">
                  {taxData.loading ? 'Đang tải từ masothue.com...' : taxData.companyName}
                </span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-slate-500 font-medium block text-[11px]">Địa chỉ công ty:</span>
                <span className="text-slate-800 leading-relaxed">
                  {taxData.loading ? 'Đang tải từ masothue.com...' : taxData.address}
                </span>
              </div>
            </div>
          </div>

          {/* Document Status */}
          <div className="text-xs space-y-1.5">
            <h4 className="font-extrabold text-[11px] uppercase text-slate-700 tracking-wider">
              Tình Trạng Chứng Từ & Hồ Sơ Đi Kèm:
            </h4>
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="shrink-0 font-medium text-xs">1.</span>
                <div className="flex-1 border-b border-dashed border-slate-300 h-4"></div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="shrink-0 font-medium text-xs">2.</span>
                <div className="flex-1 border-b border-dashed border-slate-300 h-4"></div>
              </div>
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
          <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs break-inside-avoid">
            <div>
              <p className="font-extrabold text-slate-900 uppercase">ĐẠI DIỆN BÊN GIAO</p>
              <p className="text-[10px] text-slate-400 italic mb-16">(Ký & ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 uppercase">ĐẠI DIỆN LÁI XE / ĐVVC</p>
              <p className="text-[10px] text-slate-400 italic mb-16">(Ký & ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 uppercase">ĐẠI DIỆN BÊN NHẬN</p>
              <p className="text-[10px] text-slate-400 italic mb-16">(Ký & ghi rõ họ tên)</p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden during print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 justify-between items-center no-print">
          <span className="text-xs text-slate-500 font-medium">
            Mẹo: Trong cửa sổ in, chọn <strong>"Lưu dưới dạng PDF" (Save as PDF)</strong> để xuất file PDF hoặc chọn máy in A4.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewWindowPrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Mở biên bản trong tab mới để in/tải PDF"
            >
              <Printer className="w-4 h-4" />
              <span>In / Tạo File PDF (Cửa Sổ Mới)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
