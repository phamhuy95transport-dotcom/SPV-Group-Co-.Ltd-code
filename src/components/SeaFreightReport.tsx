import React, { useState, useMemo } from 'react';
import {
  Ship,
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Anchor,
  ShieldCheck,
  Clock,
  Layers,
  ArrowUpRight,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Tag,
  Users,
  MapPin,
  Briefcase
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  SeaFreightRecord,
  CustomerItem,
  RouteItem,
  TransporterItem,
  UserAccount,
  formatUSD,
  formatDateVN,
  formatMonthYearVN
} from '../types';

interface SeaFreightReportProps {
  records: SeaFreightRecord[];
  customers: CustomerItem[];
  routes: RouteItem[];
  transporters: TransporterItem[];
  currentUser?: UserAccount | null;
}

type ReportViewTab = 'details' | 'by_customer' | 'by_route' | 'by_agent';
type TimePreset = 'all' | 'today' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

export const SeaFreightReport: React.FC<SeaFreightReportProps> = ({
  records,
  customers,
  routes,
  transporters,
  currentUser
}) => {
  // Navigation & Sub-views
  const [activeSubTab, setActiveSubTab] = useState<ReportViewTab>('details');
  const [timePreset, setTimePreset] = useState<TimePreset>('all');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterApproved, setFilterApproved] = useState<'all' | 'approved' | 'pending'>('all');

  // Role permissions
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Apply Time Preset
  const handleSelectTimePreset = (preset: TimePreset) => {
    setTimePreset(preset);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'this_month') {
      const start = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const end = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'last_month') {
      const start = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const end = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'this_quarter') {
      const quarter = Math.floor(currentMonth / 3);
      const start = new Date(currentYear, quarter * 3, 1).toISOString().split('T')[0];
      const end = new Date(currentYear, (quarter + 1) * 3, 0).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'this_year') {
      const start = `${currentYear}-01-01`;
      const end = `${currentYear}-12-31`;
      setFromDate(start);
      setToDate(end);
    }
  };

  // Quick reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setTimePreset('all');
    setFromDate('');
    setToDate('');
    setFilterCustomer('');
    setFilterRoute('');
    setFilterAgent('');
    setFilterApproved('all');
  };

  // Base filtered records for role & criteria
  const userFilteredRecords = useMemo(() => {
    let list = records;

    // Customer role restriction
    if (currentUser?.role === 'customer') {
      const custName = (currentUser.customer_name || currentUser.name || '').trim().toLowerCase();
      list = list.filter(r => (r.customer || '').trim().toLowerCase() === custName);
    }

    return list;
  }, [records, currentUser]);

  // Autocomplete Suggestions
  const customerList = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => c.customer_name && set.add(c.customer_name.trim()));
    records.forEach(r => r.customer && set.add(r.customer.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [customers, records]);

  const routeList = useMemo(() => {
    const set = new Set<string>();
    routes.forEach(r => r.route_name && set.add(r.route_name.trim()));
    records.forEach(r => r.route && set.add(r.route.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [routes, records]);

  const agentList = useMemo(() => {
    const set = new Set<string>();
    transporters.forEach(t => t.transporter_name && set.add(t.transporter_name.trim()));
    records.forEach(r => r.agent && set.add(r.agent.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [transporters, records]);

  // Filtered & Sorted Records (Sorted by booking_date Newest First)
  const filteredRecords = useMemo(() => {
    return userFilteredRecords
      .filter(item => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchMbl = (item.mbl_hbl || '').toLowerCase().includes(q);
          const matchRoute = (item.route || '').toLowerCase().includes(q);
          const matchCustomer = (item.customer || '').toLowerCase().includes(q);
          const matchAgent = (item.agent || '').toLowerCase().includes(q);
          const matchNotes = (item.notes || '').toLowerCase().includes(q);
          const matchStaff = (item.created_by?.name || '').toLowerCase().includes(q);
          if (!matchMbl && !matchRoute && !matchCustomer && !matchAgent && !matchNotes && !matchStaff) {
            return false;
          }
        }

        // Date Range
        if (fromDate) {
          const itemDate = (item.booking_date || '').split('T')[0];
          if (itemDate && itemDate < fromDate) return false;
        }
        if (toDate) {
          const itemDate = (item.booking_date || '').split('T')[0];
          if (itemDate && itemDate > toDate) return false;
        }

        // Customer filter
        if (filterCustomer && (item.customer || '').trim().toLowerCase() !== filterCustomer.trim().toLowerCase()) {
          return false;
        }

        // Route filter
        if (filterRoute && (item.route || '').trim().toLowerCase() !== filterRoute.trim().toLowerCase()) {
          return false;
        }

        // Agent filter
        if (filterAgent && (item.agent || '').trim().toLowerCase() !== filterAgent.trim().toLowerCase()) {
          return false;
        }

        // Approval status
        if (filterApproved === 'approved' && !item.approved) return false;
        if (filterApproved === 'pending' && item.approved) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort newest first by booking_date, then createdAt
        const dateA = a.booking_date || a.createdAt || '';
        const dateB = b.booking_date || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
  }, [userFilteredRecords, searchQuery, fromDate, toDate, filterCustomer, filterRoute, filterAgent, filterApproved]);

  // Overall Financial Metrics
  const metrics = useMemo(() => {
    let totalBuy = 0;
    let totalSell = 0;
    let totalProfit = 0;
    let approvedCount = 0;

    filteredRecords.forEach(r => {
      const buy = Number(r.buy_price) || 0;
      const sell = Number(r.sell_price) || 0;
      const profit = typeof r.profit === 'number' ? r.profit : (sell - buy);

      totalBuy += buy;
      totalSell += sell;
      totalProfit += profit;
      if (r.approved) approvedCount++;
    });

    const profitMargin = totalSell > 0 ? (totalProfit / totalSell) * 100 : 0;
    const approvalRate = filteredRecords.length > 0 ? (approvedCount / filteredRecords.length) * 100 : 0;

    return {
      totalRecords: filteredRecords.length,
      totalBuy,
      totalSell,
      totalProfit,
      profitMargin,
      approvedCount,
      pendingCount: filteredRecords.length - approvedCount,
      approvalRate
    };
  }, [filteredRecords]);

  // Grouping Analysis: By Customer
  const customerAnalysis = useMemo(() => {
    const map = new Map<string, {
      customer: string;
      count: number;
      buy: number;
      sell: number;
      profit: number;
      approvedCount: number;
    }>();

    filteredRecords.forEach(r => {
      const cust = (r.customer || 'Khách vãng lai').trim();
      const buy = Number(r.buy_price) || 0;
      const sell = Number(r.sell_price) || 0;
      const profit = typeof r.profit === 'number' ? r.profit : (sell - buy);

      if (!map.has(cust)) {
        map.set(cust, {
          customer: cust,
          count: 0,
          buy: 0,
          sell: 0,
          profit: 0,
          approvedCount: 0
        });
      }

      const entry = map.get(cust)!;
      entry.count += 1;
      entry.buy += buy;
      entry.sell += sell;
      entry.profit += profit;
      if (r.approved) entry.approvedCount += 1;
    });

    const list = Array.from(map.values()).sort((a, b) => b.sell - a.sell);
    return list;
  }, [filteredRecords]);

  // Grouping Analysis: By Route
  const routeAnalysis = useMemo(() => {
    const map = new Map<string, {
      route: string;
      count: number;
      buy: number;
      sell: number;
      profit: number;
    }>();

    filteredRecords.forEach(r => {
      const rt = (r.route || 'Chưa xác định').trim();
      const buy = Number(r.buy_price) || 0;
      const sell = Number(r.sell_price) || 0;
      const profit = typeof r.profit === 'number' ? r.profit : (sell - buy);

      if (!map.has(rt)) {
        map.set(rt, {
          route: rt,
          count: 0,
          buy: 0,
          sell: 0,
          profit: 0
        });
      }

      const entry = map.get(rt)!;
      entry.count += 1;
      entry.buy += buy;
      entry.sell += sell;
      entry.profit += profit;
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [filteredRecords]);

  // Grouping Analysis: By Shipping Line / Agent
  const agentAnalysis = useMemo(() => {
    const map = new Map<string, {
      agent: string;
      count: number;
      buy: number;
      sell: number;
      profit: number;
    }>();

    filteredRecords.forEach(r => {
      const ag = (r.agent || 'Chưa xác định').trim();
      const buy = Number(r.buy_price) || 0;
      const sell = Number(r.sell_price) || 0;
      const profit = typeof r.profit === 'number' ? r.profit : (sell - buy);

      if (!map.has(ag)) {
        map.set(ag, {
          agent: ag,
          count: 0,
          buy: 0,
          sell: 0,
          profit: 0
        });
      }

      const entry = map.get(ag)!;
      entry.count += 1;
      entry.buy += buy;
      entry.sell += sell;
      entry.profit += profit;
    });

    return Array.from(map.values()).sort((a, b) => b.buy - a.buy);
  }, [filteredRecords]);

  // Export Multi-sheet Excel in USD
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('Không có dữ liệu cước biển nào để xuất.');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Chi tiết từng booking
    const detailData = filteredRecords.map((r, index) => {
      const buy = Number(r.buy_price) || 0;
      const sell = Number(r.sell_price) || 0;
      const profit = typeof r.profit === 'number' ? r.profit : (sell - buy);
      const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) + '%' : '0%';

      return {
        'STT': index + 1,
        'Ngày đặt': formatDateVN(r.booking_date),
        'Tuyến đường': r.route || '',
        'Số MBL/HBL': r.mbl_hbl || '',
        'Số cont/Kg/CBM': r.volume_info || '',
        'Đại lý / Hãng tàu': r.agent || '',
        'Khách hàng': r.customer || '',
        'Giá mua (USD)': buy,
        'Giá bán (USD)': sell,
        'Lợi nhuận (USD)': profit,
        'Tỷ suất LN': margin,
        'Nhân viên nhập': r.created_by?.name || '---',
        'Trạng thái duyệt': r.approved ? 'ĐÃ DUYỆT' : 'CHƯA DUYỆT',
        'Ngày duyệt': r.approved_date ? formatDateVN(r.approved_date) : '',
        'Người duyệt': r.approved_by?.name || '',
        'Ghi chú': r.notes || ''
      };
    });

    // Add summary row to detail sheet
    detailData.push({
      'STT': 'TỔNG CỘNG' as any,
      'Ngày đặt': '',
      'Tuyến đường': `${filteredRecords.length} booking`,
      'Số MBL/HBL': '',
      'Số cont/Kg/CBM': '',
      'Đại lý / Hãng tàu': '',
      'Khách hàng': '',
      'Giá mua (USD)': metrics.totalBuy,
      'Giá bán (USD)': metrics.totalSell,
      'Lợi nhuận (USD)': metrics.totalProfit,
      'Tỷ suất LN': `${metrics.profitMargin.toFixed(1)}%`,
      'Nhân viên nhập': '',
      'Trạng thái duyệt': `Đã duyệt: ${metrics.approvedCount}`,
      'Ngày duyệt': '',
      'Người duyệt': '',
      'Ghi chú': ''
    });

    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Chi_Tiet_Booking_USD');

    // Sheet 2: Phân tích theo Khách Hàng
    const customerData = customerAnalysis.map((c, index) => {
      const margin = c.sell > 0 ? ((c.profit / c.sell) * 100).toFixed(1) + '%' : '0%';
      const share = metrics.totalSell > 0 ? ((c.sell / metrics.totalSell) * 100).toFixed(1) + '%' : '0%';
      return {
        'STT': index + 1,
        'Khách hàng': c.customer,
        'Số lượng booking': c.count,
        'Doanh thu bán (USD)': c.sell,
        'Chi phí mua (USD)': c.buy,
        'Lợi nhuận (USD)': c.profit,
        'Biên lợi nhuận': margin,
        'Tỷ trọng doanh thu': share,
        'Đã duyệt': `${c.approvedCount}/${c.count}`
      };
    });
    const customerSheet = XLSX.utils.json_to_sheet(customerData);
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Theo_Khach_Hang');

    // Sheet 3: Phân tích theo Tuyến Đường
    const routeData = routeAnalysis.map((rt, index) => {
      const margin = rt.sell > 0 ? ((rt.profit / rt.sell) * 100).toFixed(1) + '%' : '0%';
      return {
        'STT': index + 1,
        'Tuyến đường': rt.route,
        'Số chuyến / booking': rt.count,
        'Doanh thu bán (USD)': rt.sell,
        'Chi phí mua (USD)': rt.buy,
        'Lợi nhuận gộp (USD)': rt.profit,
        'Biên lợi nhuận': margin,
        'LN bình quân / đơn (USD)': rt.count > 0 ? Math.round(rt.profit / rt.count) : 0
      };
    });
    const routeSheet = XLSX.utils.json_to_sheet(routeData);
    XLSX.utils.book_append_sheet(workbook, routeSheet, 'Theo_Tuyen_Duong');

    // Sheet 4: Phân tích theo Hãng Tàu / Đại Lý
    const agentData = agentAnalysis.map((ag, index) => {
      const margin = ag.sell > 0 ? ((ag.profit / ag.sell) * 100).toFixed(1) + '%' : '0%';
      return {
        'STT': index + 1,
        'Hãng tàu / Đại lý': ag.agent,
        'Số booking': ag.count,
        'Chi phí cước (USD)': ag.buy,
        'Doanh thu bán (USD)': ag.sell,
        'Lợi nhuận (USD)': ag.profit,
        'Biên lợi nhuận': margin
      };
    });
    const agentSheet = XLSX.utils.json_to_sheet(agentData);
    XLSX.utils.book_append_sheet(workbook, agentSheet, 'Theo_Hang_Tau');

    const fileName = `Bao_Cao_Tai_Chinh_Cuoc_Bien_USD_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Autocomplete Datalists */}
      <datalist id="sf-report-customer-list">
        {customerList.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="sf-report-route-list">
        {routeList.map(r => <option key={r} value={r} />)}
      </datalist>
      <datalist id="sf-report-agent-list">
        {agentList.map(a => <option key={a} value={a} />)}
      </datalist>

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800">Báo Cáo Tài Chính Cước Biển</h2>
              <span className="bg-blue-100 text-blue-800 font-black text-[11px] px-2.5 py-0.5 rounded-full border border-blue-200">
                Đơn vị tiền tệ: USD ($)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân tích doanh thu cước tàu, chi phí hãng tàu, lợi nhuận gộp và hiệu suất vận chuyển đường biển
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            title="Xuất bảng báo cáo Excel đa phân hệ (USD)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            title="In trang báo cáo tài chính"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Financial Executive Summary Cards (USD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Số lượng Booking */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Số Booking Cước</p>
            <p className="text-2xl font-black text-slate-800">{metrics.totalRecords}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className="text-emerald-600 font-bold">{metrics.approvedCount} đã duyệt</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">{metrics.pendingCount} chờ duyệt</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Anchor className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Doanh Thu Bán (USD) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Doanh Thu (Giá Bán)</p>
            <p className="text-2xl font-black text-blue-600">{formatUSD(metrics.totalSell)}</p>
            <p className="text-[11px] text-slate-400 font-medium">Thu từ khách hàng (USD)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Chi Phí Hãng Tàu (USD) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Chi Phí (Giá Mua)</p>
            <p className="text-2xl font-black text-slate-700">{formatUSD(metrics.totalBuy)}</p>
            <p className="text-[11px] text-slate-400 font-medium">Trả hãng tàu / đại lý (USD)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Tổng Lợi Nhuận Cước Biển Ròng */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Lợi Nhuận Cước Ròng</span>
              <span className="bg-white/20 text-[10px] font-black px-2 py-0.5 rounded-full">
                {metrics.profitMargin.toFixed(1)}% Margin
              </span>
            </div>
            <p className="text-2xl font-black text-white">{formatUSD(metrics.totalProfit)}</p>
            <p className="text-[11px] text-emerald-100 font-medium">
              = Doanh thu - Chi phí (USD $)
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Period Selector Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Quick Time Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Kỳ báo cáo:
            </span>
            <button
              type="button"
              onClick={() => handleSelectTimePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePreset === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePreset('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePreset === 'this_month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePreset('last_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePreset === 'last_month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tháng trước
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePreset('this_quarter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePreset === 'this_quarter'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Quý này
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePreset('this_year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePreset === 'this_year'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Năm nay
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Quick Search */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tìm kiếm booking</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="MBL/HBL, Tuyến, Khách hàng..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => {
                setTimePreset('custom');
                setFromDate(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={e => {
                setTimePreset('custom');
                setToDate(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Customer */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Khách hàng</label>
            <input
              type="text"
              list="sf-report-customer-list"
              placeholder="Tất cả KH"
              value={filterCustomer}
              onChange={e => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Approval Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Trạng thái duyệt</label>
            <select
              value={filterApproved}
              onChange={e => setFilterApproved(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="approved">Đã duyệt</option>
              <option value="pending">Chờ duyệt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('details')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'details'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Bảng Kê Chi Tiết Từng Lô ({filteredRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('by_customer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'by_customer'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Phân Tích Theo Khách Hàng ({customerAnalysis.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('by_route')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'by_route'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Phân Tích Tuyến Vận Tải ({routeAnalysis.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('by_agent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'by_agent'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Anchor className="w-4 h-4" />
          <span>Phân Tích Hãng Tàu / Đại Lý ({agentAnalysis.length})</span>
        </button>
      </div>

      {/* VIEW 1: Bảng Kê Chi Tiết Từng Lô Cước Biển */}
      {activeSubTab === 'details' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h3 className="text-sm font-bold text-slate-800">
                Danh Sách Chi Tiết Các Lô Cước Biển (Sắp xếp theo ngày gần nhất)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Đang hiển thị <strong>{filteredRecords.length}</strong> lô hàng
            </span>
          </div>

          <div className="overflow-x-auto max-h-[640px] scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-3 w-28">Ngày đặt</th>
                  <th className="py-3 px-3 min-w-[170px]">Tuyến đường</th>
                  <th className="py-3 px-3 min-w-[150px]">Số MBL/HBL</th>
                  <th className="py-3 px-3 w-32">Số cont / Thể tích</th>
                  <th className="py-3 px-3 min-w-[140px]">Đại lý / Hãng tàu</th>
                  <th className="py-3 px-3 min-w-[150px]">Khách hàng</th>
                  <th className="py-3 px-3 text-right w-28">Doanh thu ($)</th>
                  <th className="py-3 px-3 text-right w-28">Chi phí ($)</th>
                  <th className="py-3 px-3 text-right w-28">Lợi nhuận ($)</th>
                  <th className="py-3 px-3 text-right w-20">Biên LN</th>
                  <th className="py-3 px-3 w-32">Nhân viên</th>
                  <th className="py-3 px-3 text-center w-28">Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <Ship className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm">Không có dữ liệu cước biển nào trong khoảng thời gian này</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, index) => {
                    const buy = Number(item.buy_price) || 0;
                    const sell = Number(item.sell_price) || 0;
                    const profit = typeof item.profit === 'number' ? item.profit : (sell - buy);
                    const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : '0.0';
                    const isPositive = profit >= 0;

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDateVN(item.booking_date)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">{item.route}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {item.mbl_hbl || '---'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-600">
                          {item.volume_info || '---'}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {item.agent || '---'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {item.customer || '---'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-blue-600 whitespace-nowrap">
                          {formatUSD(sell)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                          {formatUSD(buy)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-block font-black px-2 py-0.5 rounded-lg border ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {isPositive ? '+' : ''}{formatUSD(profit)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-600">
                          {margin}%
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {item.created_by?.name || 'Admin'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.approved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ĐÃ DUYỆT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>CHỜ DUYỆT</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Grand Total Footer */}
              {filteredRecords.length > 0 && (
                <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={7} className="py-3 px-3 text-right uppercase tracking-wider text-slate-600">
                      TỔNG CỘNG ({filteredRecords.length} Booking):
                    </td>
                    <td className="py-3 px-3 text-right text-blue-700 font-black text-sm whitespace-nowrap">
                      {formatUSD(metrics.totalSell)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800 font-black text-sm whitespace-nowrap">
                      {formatUSD(metrics.totalBuy)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-black text-sm whitespace-nowrap">
                      {formatUSD(metrics.totalProfit)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800 font-black text-xs">
                      {metrics.profitMargin.toFixed(1)}%
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-xs text-slate-500">
                      Đã duyệt {metrics.approvedCount}/{filteredRecords.length}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Phân Tích Doanh Thu & Lợi Nhuận Theo Khách Hàng */}
      {activeSubTab === 'by_customer' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Bảng Xếp Hạng Doanh Thu & Lợi Nhuận Theo Khách Hàng</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Xác định khách hàng trọng điểm và biên lợi nhuận đóng góp</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-3 text-center w-12">Hạng</th>
                  <th className="py-3 px-3 min-w-[200px]">Khách hàng</th>
                  <th className="py-3 px-3 text-center w-28">Số booking</th>
                  <th className="py-3 px-3 text-right w-32">Doanh thu bán ($)</th>
                  <th className="py-3 px-3 text-right w-32">Chi phí mua ($)</th>
                  <th className="py-3 px-3 text-right w-32">Lợi nhuận gộp ($)</th>
                  <th className="py-3 px-3 text-right w-24">Biên LN</th>
                  <th className="py-3 px-3 min-w-[160px]">Tỷ trọng doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customerAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Chưa có dữ liệu phân tích khách hàng
                    </td>
                  </tr>
                ) : (
                  customerAnalysis.map((c, idx) => {
                    const margin = c.sell > 0 ? ((c.profit / c.sell) * 100).toFixed(1) : '0.0';
                    const share = metrics.totalSell > 0 ? (c.sell / metrics.totalSell) * 100 : 0;

                    return (
                      <tr key={c.customer} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-black">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto text-[11px]">1</span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center mx-auto text-[11px]">2</span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center mx-auto text-[11px]">3</span>
                          ) : (
                            <span className="text-slate-400">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{c.customer}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{c.count} lô</td>
                        <td className="py-3 px-3 text-right font-black text-blue-600">{formatUSD(c.sell)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">{formatUSD(c.buy)}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600">+{formatUSD(c.profit)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-700">{margin}%</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${Math.min(100, share)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 w-10 text-right">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Phân Tích Hiệu Quả Tuyến Vận Tải */}
      {activeSubTab === 'by_route' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Hiệu Quả Kinh Doanh Từng Tuyến Cảng Biển (Route Profitability)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Đánh giá tuyến đường có doanh thu và tỷ suất lợi nhuận cao nhất</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-3 min-w-[220px]">Tuyến đường cảng biển</th>
                  <th className="py-3 px-3 text-center w-28">Số booking</th>
                  <th className="py-3 px-3 text-right w-32">Doanh thu bán ($)</th>
                  <th className="py-3 px-3 text-right w-32">Chi phí mua ($)</th>
                  <th className="py-3 px-3 text-right w-32">Lợi nhuận gộp ($)</th>
                  <th className="py-3 px-3 text-right w-28">Biên LN (%)</th>
                  <th className="py-3 px-3 text-right w-32">LN bình quân/đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {routeAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Chưa có dữ liệu tuyến đường
                    </td>
                  </tr>
                ) : (
                  routeAnalysis.map((rt, idx) => {
                    const margin = rt.sell > 0 ? ((rt.profit / rt.sell) * 100).toFixed(1) : '0.0';
                    const avgProfit = rt.count > 0 ? Math.round(rt.profit / rt.count) : 0;

                    return (
                      <tr key={rt.route} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{rt.route}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{rt.count} chuyến</td>
                        <td className="py-3 px-3 text-right font-black text-blue-600">{formatUSD(rt.sell)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">{formatUSD(rt.buy)}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600">+{formatUSD(rt.profit)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-700">{margin}%</td>
                        <td className="py-3 px-3 text-right font-bold text-indigo-600">{formatUSD(avgProfit)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: Phân Tích Đại Lý & Hãng Tàu */}
      {activeSubTab === 'by_agent' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Anchor className="w-4 h-4 text-indigo-600" />
                <span>Thống Kê Chi Phí & Doanh Thu Theo Hãng Tàu / Đại Lý</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Theo dõi dòng tiền thanh toán và hợp tác với các đối tác vận tải biển</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-3 min-w-[200px]">Hãng tàu / Đại lý</th>
                  <th className="py-3 px-3 text-center w-28">Số booking</th>
                  <th className="py-3 px-3 text-right w-32">Chi phí cước mua ($)</th>
                  <th className="py-3 px-3 text-right w-32">Doanh thu bán ($)</th>
                  <th className="py-3 px-3 text-right w-32">Lợi nhuận ($)</th>
                  <th className="py-3 px-3 text-right w-24">Biên LN</th>
                  <th className="py-3 px-3 min-w-[160px]">Tỷ trọng chi phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {agentAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Chưa có dữ liệu hãng tàu / đại lý
                    </td>
                  </tr>
                ) : (
                  agentAnalysis.map((ag, idx) => {
                    const margin = ag.sell > 0 ? ((ag.profit / ag.sell) * 100).toFixed(1) : '0.0';
                    const share = metrics.totalBuy > 0 ? (ag.buy / metrics.totalBuy) * 100 : 0;

                    return (
                      <tr key={ag.agent} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{ag.agent}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{ag.count} booking</td>
                        <td className="py-3 px-3 text-right font-black text-slate-800">{formatUSD(ag.buy)}</td>
                        <td className="py-3 px-3 text-right font-bold text-blue-600">{formatUSD(ag.sell)}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600">+{formatUSD(ag.profit)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-700">{margin}%</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, share)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 w-10 text-right">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
