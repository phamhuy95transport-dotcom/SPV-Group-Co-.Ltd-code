import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Coins,
  TrendingUp,
  Boxes,
  FileSpreadsheet,
  FileUp,
  Printer,
  BarChart3,
  Search,
  Filter,
  Calendar,
  Building2,
  Truck,
  MapPin,
  RefreshCw,
  Lock
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
import { ShipmentRecord, UserAccount, formatDateVN, normalizeDateToISO } from '../types';

interface FinancialReportProps {
  records: ShipmentRecord[];
  currentUser?: UserAccount | null;
  onImportExcel: (importedRecords: Partial<ShipmentRecord>[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  records,
  currentUser,
  onImportExcel,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedTransporter, setSelectedTransporter] = useState('all');
  const [selectedCompareRoute, setSelectedCompareRoute] = useState('');

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Filter dropdown options
  const monthsList = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const d = r.delivery_date || r.date_announced || '';
      if (d && d.length >= 7) {
        set.add(d.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  const customersList = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.customer && r.customer.trim()) {
        set.add(r.customer.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  const transportersList = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.transporter && r.transporter.trim()) {
        set.add(r.transporter.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  const routesList = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.route && r.route.trim()) {
        set.add(r.route.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Default route selection for comparison charts
  const activeRouteForCompare = selectedCompareRoute || (routesList[0] || '');

  // Filtered records based on all active criteria
  const filtered = useMemo(() => {
    return records.filter(r => {
      // Customer Account Data Isolation
      if (currentUser?.role === 'customer') {
        if (currentUser.customer_name) {
          if (r.customer !== currentUser.customer_name) return false;
        } else if (currentUser.name) {
          if (!r.customer || !r.customer.toLowerCase().includes(currentUser.name.toLowerCase())) return false;
        }
      }

      const matchSearch = !searchQuery.trim() ||
        Object.values(r).some(val =>
          String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

      const d = r.delivery_date || r.date_announced || '';
      const recMonth = d.length >= 7 ? d.substring(0, 7) : '';
      const matchMonth = selectedMonth === 'all' || recMonth === selectedMonth;

      const matchCustomer = selectedCustomer === 'all' || (r.customer || '').trim() === selectedCustomer;

      const matchTransporter = selectedTransporter === 'all' || (r.transporter || '').trim() === selectedTransporter;

      return matchSearch && matchMonth && matchCustomer && matchTransporter;
    });
  }, [records, searchQuery, selectedMonth, selectedCustomer, selectedTransporter, currentUser]);

  // Financial Summary Stats
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

  // Group Data by Customer for Revenue/Cost Chart
  const customerChartData = useMemo(() => {
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

    return Object.values(customerMap);
  }, [filtered]);

  // Chart 1: So sánh giá trung bình giữa các đơn vị vận chuyển (nhà xe) cùng tuyến đường
  const transporterComparisonData = useMemo(() => {
    const targetRoute = activeRouteForCompare;
    const routeRecords = records.filter(r => !targetRoute || r.route === targetRoute);
    const map: { [trans: string]: { transporter: string; totalBase: number; totalSale: number; totalQty: number } } = {};

    routeRecords.forEach(r => {
      const trans = r.transporter?.trim() || 'Khác';
      const qty = Number(r.cont_quantity) || 1;
      const baseUnit = Number(r.base_price) || 0;
      const saleUnit = Number(r.sale_price) || 0;

      if (!map[trans]) {
        map[trans] = { transporter: trans, totalBase: 0, totalSale: 0, totalQty: 0 };
      }
      map[trans].totalBase += baseUnit * qty;
      map[trans].totalSale += saleUnit * qty;
      map[trans].totalQty += qty;
    });

    return Object.values(map).map(item => ({
      transporter: item.transporter,
      'Giá Gốc TB/Cont': item.totalQty ? Math.round(item.totalBase / item.totalQty) : 0,
      'Giá Bán TB/Cont': item.totalQty ? Math.round(item.totalSale / item.totalQty) : 0,
      totalQty: item.totalQty
    }));
  }, [records, activeRouteForCompare]);

  // Chart 2: So sánh giá trung bình giữa các tháng cùng tuyến đường
  const monthlyComparisonData = useMemo(() => {
    const targetRoute = activeRouteForCompare;
    const routeRecords = records.filter(r => !targetRoute || r.route === targetRoute);
    const map: { [month: string]: { month: string; totalBase: number; totalSale: number; totalQty: number } } = {};

    routeRecords.forEach(r => {
      const d = r.delivery_date || r.date_announced || '';
      const month = d.length >= 7 ? d.substring(0, 7) : 'Chưa phân loại';
      const qty = Number(r.cont_quantity) || 1;
      const baseUnit = Number(r.base_price) || 0;
      const saleUnit = Number(r.sale_price) || 0;

      if (!map[month]) {
        map[month] = { month, totalBase: 0, totalSale: 0, totalQty: 0 };
      }
      map[month].totalBase += baseUnit * qty;
      map[month].totalSale += saleUnit * qty;
      map[month].totalQty += qty;
    });

    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => {
        const displayMonth = item.month.includes('-')
          ? `T${item.month.split('-')[1]}/${item.month.split('-')[0]}`
          : item.month;
        return {
          month: displayMonth,
          'Giá Gốc TB/Cont': item.totalQty ? Math.round(item.totalBase / item.totalQty) : 0,
          'Giá Bán TB/Cont': item.totalQty ? Math.round(item.totalSale / item.totalQty) : 0,
          totalQty: item.totalQty
        };
      });
  }, [records, activeRouteForCompare]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMonth('all');
    setSelectedCustomer('all');
    setSelectedTransporter('all');
  };

  const exportToExcel = () => {
    try {
      const exportData = filtered.map((r, idx) => ({
        'STT': idx + 1,
        'Ngày Báo Xe': formatDateVN(r.date_announced),
        'Ngày Đóng/Trả Hàng': formatDateVN(r.delivery_date),
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
        'HĐ Cước VC': r.hd_dich_vu ? 'Có' : 'Không',
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
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          onShowToast('File Excel không chứa dữ liệu!', 'error');
          return;
        }

        const imported: Partial<ShipmentRecord>[] = data.map(item => ({
          date_announced: normalizeDateToISO(item['Ngày Báo Xe'] || item['date_announced']) || new Date().toISOString().split('T')[0],
          delivery_date: normalizeDateToISO(item['Ngày Đóng/Trả Hàng'] || item['delivery_date']) || new Date().toISOString().split('T')[0],
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
          hd_dich_vu: String(item['HĐ Cước VC'] || item['HĐ Dịch Vụ']).toLowerCase() === 'có' || item['hd_dich_vu'] === true,
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Báo cáo vận chuyển</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Thống kê doanh thu, chi phí và phân tích so sánh.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Bộ Lọc Báo Cáo Vận Chuyển</span>
          </div>
          {(selectedMonth !== 'all' || selectedCustomer !== 'all' || selectedTransporter !== 'all' || searchQuery !== '') && (
            <button
              onClick={resetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Đặt lại bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filter by Month */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Theo Tháng:</span>
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">-- Tất cả các tháng --</option>
              {monthsList.map(m => (
                <option key={m} value={m}>
                  Tháng {m.split('-')[1]}/{m.split('-')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Customer */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Theo Khách Hàng:</span>
            </label>
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">-- Tất cả khách hàng --</option>
              {customersList.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Transporter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-amber-500" />
              <span>Theo Nhà Xe (Đơn vị vận chuyển):</span>
            </label>
            <select
              value={selectedTransporter}
              onChange={e => setSelectedTransporter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="all">-- Tất cả nhà xe --</option>
              {transportersList.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Text Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tìm Kiếm Nhanh:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Số cont, số lô, kho..."
                className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
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
          <p className="text-xs text-slate-500 mt-2">Giá bán/cont</p>
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
          <p className="text-xs text-slate-500 mt-2">Giá gốc/cont</p>
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
          <p className="text-xs text-slate-500 mt-2">Sản lượng theo lọc</p>
        </div>
      </div>

      {/* 1. TABLE SECTION PLACED ABOVE CHARTS (Requirement 5) */}
      <div className="space-y-3">
        {/* Financial Toolbar & Import Button */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <span>Danh sách chuyến xe phù hợp ({filtered.length} chuyến)</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs">
              <FileUp className="w-4 h-4 text-indigo-600" />
              <span>Nhập Dữ Liệu Excel</span>
              <input type="file" onChange={handleFileUpload} accept=".csv, .xlsx, .xls" className="hidden" />
            </label>
          </div>
        </div>

        {/* Full Financial Data Table with HĐ đầu vào & HĐ đầu ra columns (Requirement 7) */}
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
                  <th className="p-3.5 text-center">HĐ đầu vào</th>
                  <th className="p-3.5 text-center">HĐ đầu ra</th>
                  <th className="p-3.5 text-right bg-amber-50 text-amber-950 font-black">Giá gốc/cont</th>
                  <th className="p-3.5 text-right bg-emerald-50 text-emerald-950 font-black">Giá bán/cont</th>
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
                  const isEmployeeHidden = currentUser?.role === 'employee' && record.admin_edited_price;

                  const hasInputInvoice = record.hd_dich_vu || record.hd_dau_vao;
                  const hasOutputInvoice = record.hd_dau_ra;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                      <td className="p-3.5 font-bold text-slate-900">{record.customer || '—'}</td>
                      <td className="p-3.5 font-mono text-indigo-700 font-bold">{record.cont_number || '—'}</td>
                      <td className="p-3.5 text-slate-700">{record.route || '—'}</td>
                      <td className="p-3.5 text-slate-700">{record.transporter || '—'}</td>
                      <td className="p-3.5 text-center font-bold">{record.cont_quantity || 1}</td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hasInputInvoice ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {hasInputInvoice ? 'Có' : 'Không'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hasOutputInvoice ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {hasOutputInvoice ? 'Có' : 'Không'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-800 bg-amber-50/50">
                        {isEmployeeHidden ? (
                          <span className="text-amber-700 text-xs font-mono font-normal italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" /> ***
                          </span>
                        ) : (
                          formatCurrency(record.base_price)
                        )}
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-700 bg-emerald-50/50">
                        {isEmployeeHidden ? (
                          <span className="text-emerald-700 text-xs font-mono font-normal italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" /> ***
                          </span>
                        ) : (
                          formatCurrency(record.sale_price)
                        )}
                      </td>
                      <td className={`p-3.5 text-right font-black ${itemProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {isEmployeeHidden ? (
                          <span className="text-slate-400 text-xs font-mono font-normal italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" /> ***
                          </span>
                        ) : (
                          formatCurrency(itemProfit)
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 text-xs">
                        {record.created_by?.name || 'Hệ thống'}
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      Không tìm thấy dữ liệu báo cáo vận chuyển phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. CHARTS SECTION (PLACED BELOW TABLE) */}
      {/* Main Overview Bar Chart (Customer Revenue & Base Cost) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Biểu Đồ Doanh Thu & Chi Phí Theo Khách Hàng (Dữ Liệu Đang Lọc)</span>
          </h4>
          <span className="text-xs text-slate-400 font-medium">Đơn vị: VNĐ</span>
        </div>
        <div className="h-64 sm:h-72 w-full">
          {customerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerChartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="customer" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(val) => `${val / 1000000}Tr`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="sale" name="Doanh Thu (Giá Bán)" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="base" name="Chi Phí (Giá Gốc)" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Chưa có dữ liệu phù hợp với bộ lọc để hiển thị biểu đồ.
            </div>
          )}
        </div>
      </div>

      {/* COMPARISON CHARTS SECTION */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Phân Tích So Sánh Đơn Giá Theo Tuyến Đường</span>
            </h4>
            <p className="text-xs text-slate-500">
              So sánh mức đơn giá gốc & giá bán trung bình/cont giữa các nhà xe và giữa các tháng trên cùng một tuyến.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 shrink-0">Chọn Tuyến Đường:</label>
            <select
              value={activeRouteForCompare}
              onChange={e => setSelectedCompareRoute(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl text-xs font-bold px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
            >
              {routesList.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              {routesList.length === 0 && <option value="">Chưa có tuyến đường</option>}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: So sánh giá giữa các nhà xe trên cùng tuyến đường */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>1. So Sánh Đơn Giá Giữa Các Nhà Xe (Tuyến: {activeRouteForCompare || 'N/A'})</span>
              </h5>
              <span className="text-[10px] text-slate-400 font-medium">VNĐ/Cont</span>
            </div>
            <div className="h-60 w-full">
              {transporterComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transporterComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="transporter" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}Tr`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Giá Gốc TB/Cont" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Giá Bán TB/Cont" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Không có dữ liệu nhà xe cho tuyến này.
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: So sánh giá giữa các tháng trên cùng tuyến đường */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>2. So Sánh Đơn Giá Giữa Các Tháng (Tuyến: {activeRouteForCompare || 'N/A'})</span>
              </h5>
              <span className="text-[10px] text-slate-400 font-medium">VNĐ/Cont</span>
            </div>
            <div className="h-60 w-full">
              {monthlyComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}Tr`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Giá Gốc TB/Cont" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Giá Bán TB/Cont" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Không có dữ liệu biến động tháng cho tuyến này.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

