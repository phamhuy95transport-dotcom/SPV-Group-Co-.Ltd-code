import React, { useState } from 'react';
import {
  DollarSign,
  Coins,
  TrendingUp,
  Boxes,
  FileSpreadsheet,
  FileUp,
  Printer,
  BarChart3,
  Search
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import * as XLSX from 'xlsx';
import { ShipmentRecord } from '../types';

interface FinancialReportProps {
  records: ShipmentRecord[];
  onImportExcel: (importedRecords: Partial<ShipmentRecord>[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  records,
  onImportExcel,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const filtered = records.filter(r =>
    !searchQuery.trim() ||
    Object.values(r).some(val =>
      String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const totalBasePrice = filtered.reduce(
    (sum, r) => sum + (Number(r.base_price) || 0) * (Number(r.cont_quantity) || 1),
    0
  );

  const totalSalePrice = filtered.reduce(
    (sum, r) => sum + (Number(r.sale_price) || 0) * (Number(r.cont_quantity) || 1),
    0
  );

  const profit = totalSalePrice - totalBasePrice;
  const marginPercent = totalSalePrice ? ((profit / totalSalePrice) * 100).toFixed(1) : '0';
  const totalContQty = filtered.reduce((sum, r) => sum + (Number(r.cont_quantity) || 0), 0);

  // Group Data by Customer for Chart
  const customerMap: { [cust: string]: { customer: string; base: number; sale: number } } = {};

  filtered.forEach(r => {
    const cust = r.customer || 'Khác';
    const qty = Number(r.cont_quantity) || 1;
    const base = (Number(r.base_price) || 0) * qty;
    const sale = (Number(r.sale_price) || 0) * qty;

    if (!customerMap[cust]) {
      customerMap[cust] = { customer: cust, base: 0, sale: 0 };
    }
    customerMap[cust].base += base;
    customerMap[cust].sale += sale;
  });

  const chartData = Object.values(customerMap);

  const exportToExcel = () => {
    try {
      const exportData = filtered.map((r, idx) => ({
        'STT': idx + 1,
        'Ngày Báo Xe': r.date_announced,
        'Ngày Đóng/Trả Hàng': r.delivery_date,
        'Tuyến Đường': r.route,
        'Đơn Vị Vận Chuyển': r.transporter,
        'Số Container': r.cont_number,
        'Khách Hàng': r.customer,
        'Số Lô': r.batch_number,
        'Số Lượng Cont': r.cont_quantity,
        'Kho/Xưởng': r.warehouse,
        'Người Liên Hệ': r.contact_person,
        'SĐT': r.contact_phone,
        'Phơi Nâng': r.phoi_nang ? 'Có' : 'Không',
        'Phơi Hạ': r.phoi_ha ? 'Có' : 'Không',
        'HĐ Hạ Rỗng': r.hd_ha_rong ? 'Có' : 'Không',
        'HĐ Dịch Vụ': r.hd_dich_vu ? 'Có' : 'Không',
        'Ghi Chú': r.notes,
        'Người Nhập Liệu': r.created_by?.name || '—',
        'Giá Gốc/Cont (VNĐ)': r.base_price,
        'Giá Bán/Cont (VNĐ)': r.sale_price,
        'Tổng Doanh Thu': (r.sale_price || 0) * (r.cont_quantity || 1),
        'Tổng Chi Phí': (r.base_price || 0) * (r.cont_quantity || 1),
        'Lợi Nhuận': ((r.sale_price || 0) - (r.base_price || 0)) * (r.cont_quantity || 1)
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoTaiChinh');
      XLSX.writeFile(wb, `Bao_Cao_Tai_Chinh_SPV_${new Date().toISOString().split('T')[0]}.xlsx`);
      onShowToast('Xuất báo cáo tài chính Excel thành công!');
    } catch (e: any) {
      onShowToast('Lỗi xuất file Excel: ' + e.message, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          onShowToast('File Excel không chứa dữ liệu!', 'error');
          return;
        }

        const imported: Partial<ShipmentRecord>[] = data.map(item => ({
          date_announced: item['Ngày Báo Xe'] || item['date_announced'] || new Date().toISOString().split('T')[0],
          delivery_date: item['Ngày Đóng/Trả Hàng'] || item['delivery_date'] || new Date().toISOString().split('T')[0],
          route: item['Tuyến Đường'] || item['route'] || '',
          transporter: item['Đơn Vị Vận Chuyển'] || item['transporter'] || '',
          cont_number: String(item['Số Container'] || item['cont_number'] || '').toUpperCase(),
          customer: item['Khách Hàng'] || item['customer'] || '',
          batch_number: item['Số Lô'] || item['batch_number'] || '',
          cont_quantity: Number(item['Số Lượng Cont'] || item['cont_quantity']) || 1,
          warehouse: item['Kho/Xưởng'] || item['warehouse'] || '',
          contact_person: item['Người Liên Hệ'] || item['contact_person'] || '',
          contact_phone: item['SĐT'] || item['contact_phone'] || '',
          phoi_nang: String(item['Phơi Nâng']).toLowerCase() === 'có' || item['phoi_nang'] === true,
          phoi_ha: String(item['Phơi Hạ']).toLowerCase() === 'có' || item['phoi_ha'] === true,
          hd_ha_rong: String(item['HĐ Hạ Rỗng']).toLowerCase() === 'có' || item['hd_ha_rong'] === true,
          hd_dich_vu: String(item['HĐ Dịch Vụ']).toLowerCase() === 'có' || item['hd_dich_vu'] === true,
          notes: item['Ghi Chú'] || item['notes'] || '',
          base_price: Number(item['Giá Gốc/Cont (VNĐ)'] || item['base_price']) || 0,
          sale_price: Number(item['Giá Bán/Cont (VNĐ)'] || item['sale_price']) || 0,
        }));

        onImportExcel(imported);
        onShowToast(`Đã nhập thành công ${imported.length} chuyến xe từ file Excel!`);
      } catch (err: any) {
        console.error('Excel import error:', err);
        onShowToast('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file!', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Khu Vực Báo Cáo Tài Chính & Lợi Nhuận Nội Bộ</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Phân tích Cột Q (Giá gốc) & Cột R (Giá bán) dành riêng cho Quản trị viên (Admin).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Báo Cáo Excel
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm border border-slate-700"
          >
            <Printer className="w-4 h-4" /> In Báo Cáo
          </button>
        </div>
      </div>

      {/* Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Tổng Doanh Thu</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                {formatCurrency(totalSalePrice)}
              </p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Cột R (Giá bán/cont)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Tổng Chi Phí Gốc</p>
              <p className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
                {formatCurrency(totalBasePrice)}
              </p>
            </div>
            <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Cột Q (Giá gốc/cont)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Lợi Nhuận Ước Tính</p>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${profit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xs font-semibold mt-2 ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            Tỷ suất lợi nhuận: {marginPercent}%
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Số Cont Vận Chuyển</p>
              <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">{totalContQty}</p>
            </div>
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Tổng sản lượng chuyến</p>
        </div>
      </div>

      {/* Financial Bar Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Biểu Đồ Doanh Thu & Chi Phí Theo Khách Hàng</span>
          </h4>
          <span className="text-xs text-slate-400 font-medium">Đơn vị: VNĐ</span>
        </div>
        <div className="h-64 sm:h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="customer" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `${val / 1000000}Tr`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="sale" name="Doanh Thu (Giá Bán)" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="base" name="Chi Phí (Giá Gốc)" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Chưa có dữ liệu chuyến xe để hiển thị biểu đồ.
            </div>
          )}
        </div>
      </div>

      {/* Financial Toolbar & Table */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm thông tin tài chính..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs">
            <FileUp className="w-4 h-4 text-indigo-600" />
            <span>Nhập Dữ Liệu Excel</span>
            <input type="file" onChange={handleFileUpload} accept=".csv, .xlsx, .xls" className="hidden" />
          </label>
        </div>
      </div>

      {/* Full Financial Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">STT</th>
                <th className="p-3.5">Khách Hàng</th>
                <th className="p-3.5">Số Cont</th>
                <th className="p-3.5">Tuyến Đường</th>
                <th className="p-3.5">Đơn Vị Vận Chuyển</th>
                <th className="p-3.5 text-center">SL Cont</th>
                <th className="p-3.5 text-right bg-amber-50 text-amber-950 font-black">Q. Giá gốc/cont</th>
                <th className="p-3.5 text-right bg-emerald-50 text-emerald-950 font-black">R. Giá bán/cont</th>
                <th className="p-3.5 text-right font-black">Thành Tiền (Giá Bán)</th>
                <th className="p-3.5 text-right font-black">Lợi Nhuận Chuyến</th>
                <th className="p-3.5">Người Nhập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filtered.map((record, index) => {
                const qty = Number(record.cont_quantity) || 1;
                const base = (Number(record.base_price) || 0) * qty;
                const sale = (Number(record.sale_price) || 0) * qty;
                const itemProfit = sale - base;

                return (
                  <tr key={record.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900">{record.customer || '—'}</td>
                    <td className="p-3.5 font-mono text-indigo-700 font-bold">{record.cont_number || '—'}</td>
                    <td className="p-3.5 text-slate-700">{record.route || '—'}</td>
                    <td className="p-3.5 text-slate-700">{record.transporter || '—'}</td>
                    <td className="p-3.5 text-center font-bold">{record.cont_quantity || 1}</td>
                    <td className="p-3.5 text-right font-bold text-slate-800 bg-amber-50/50">
                      {formatCurrency(record.base_price)}
                    </td>
                    <td className="p-3.5 text-right font-black text-emerald-700 bg-emerald-50/50">
                      {formatCurrency(record.sale_price)}
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900">
                      {formatCurrency(sale)}
                    </td>
                    <td className={`p-3.5 text-right font-black ${itemProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {formatCurrency(itemProfit)}
                    </td>
                    <td className="p-3.5 text-slate-600 text-xs">
                      {record.created_by?.name || 'Hệ thống'}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Không tìm thấy dữ liệu báo cáo tài chính.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
