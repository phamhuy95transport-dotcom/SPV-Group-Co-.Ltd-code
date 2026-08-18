import React, { useState, useMemo } from 'react';
import {
  Ship,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Check,
  X,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  User,
  Copy,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  RefreshCw,
  Anchor,
  Box,
  MapPin,
  Sparkles,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  SeaFreightRecord,
  UserAccount,
  CustomerItem,
  RouteItem,
  TransporterItem,
  CatalogSubTab
} from '../types';

interface SeaFreightManagerProps {
  records: SeaFreightRecord[];
  customers: CustomerItem[];
  routes: RouteItem[];
  transporters: TransporterItem[];
  users: UserAccount[];
  currentUser: UserAccount | null;
  onSaveRecord: (record: SeaFreightRecord) => Promise<void>;
  onDeleteRecord: (id: string, name: string) => void;
  onToggleApproval: (id: string, currentApproved: boolean) => Promise<void>;
  onSaveCatalogItem?: (subTab: CatalogSubTab, itemData: any) => Promise<void>;
  onOpenLoginModal?: () => void;
}

const QUICK_VOLUME_TAGS = ['1x20GP', '1x40GP', '1x40HC', '2x40HC', '10 CBM', '20 CBM', '5,000 Kgs', '15,000 Kgs'];

export const SeaFreightManager: React.FC<SeaFreightManagerProps> = ({
  records,
  customers,
  routes,
  transporters,
  users,
  currentUser,
  onSaveRecord,
  onDeleteRecord,
  onToggleApproval,
  onSaveCatalogItem,
  onOpenLoginModal,
}) => {
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRecord, setEditingRecord] = useState<SeaFreightRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    booking_date: new Date().toISOString().split('T')[0],
    route: '',
    mbl_hbl: '',
    volume_info: '1x40HC',
    agent: '',
    customer: '',
    buy_price: 0,
    sell_price: 0,
    notes: '',
    approved: false,
    approved_date: ''
  });

  // Copied feedback tooltip
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Autocomplete Suggestions
  const customerSuggestions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.customer_name?.trim()) set.add(c.customer_name.trim());
    });
    records.forEach(r => {
      if (r.customer?.trim()) set.add(r.customer.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [customers, records]);

  const routeSuggestions = useMemo(() => {
    const set = new Set<string>();
    routes.forEach(r => {
      if (r.route_name?.trim()) set.add(r.route_name.trim());
    });
    records.forEach(r => {
      if (r.route?.trim()) set.add(r.route.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [routes, records]);

  const agentSuggestions = useMemo(() => {
    const set = new Set<string>();
    transporters.forEach(t => {
      if (t.transporter_name?.trim()) set.add(t.transporter_name.trim());
    });
    records.forEach(r => {
      if (r.agent?.trim()) set.add(r.agent.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [transporters, records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(item => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const mblMatch = (item.mbl_hbl || '').toLowerCase().includes(term);
        const routeMatch = (item.route || '').toLowerCase().includes(term);
        const custMatch = (item.customer || '').toLowerCase().includes(term);
        const agentMatch = (item.agent || '').toLowerCase().includes(term);
        const volMatch = (item.volume_info || '').toLowerCase().includes(term);
        const notesMatch = (item.notes || '').toLowerCase().includes(term);
        const creatorMatch = (item.created_by?.name || '').toLowerCase().includes(term);
        if (!mblMatch && !routeMatch && !custMatch && !agentMatch && !volMatch && !notesMatch && !creatorMatch) {
          return false;
        }
      }

      // Customer Filter
      if (selectedCustomer.trim()) {
        const term = selectedCustomer.trim().toLowerCase();
        if (!(item.customer || '').toLowerCase().includes(term)) return false;
      }

      // Route Filter
      if (selectedRoute.trim()) {
        const term = selectedRoute.trim().toLowerCase();
        if (!(item.route || '').toLowerCase().includes(term)) return false;
      }

      // Agent Filter
      if (selectedAgent.trim()) {
        const term = selectedAgent.trim().toLowerCase();
        if (!(item.agent || '').toLowerCase().includes(term)) return false;
      }

      // Approval Filter
      if (approvalFilter === 'approved' && !item.approved) return false;
      if (approvalFilter === 'pending' && item.approved) return false;

      // Date Range (Booking date)
      if (fromDate && item.booking_date < fromDate) return false;
      if (toDate && item.booking_date > toDate) return false;

      return true;
    }).sort((a, b) => (b.booking_date || '').localeCompare(a.booking_date || ''));
  }, [records, searchTerm, selectedCustomer, selectedRoute, selectedAgent, approvalFilter, fromDate, toDate]);

  const isFiltering = Boolean(
    searchTerm ||
    selectedCustomer ||
    selectedRoute ||
    selectedAgent ||
    approvalFilter !== 'all' ||
    fromDate ||
    toDate
  );

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('');
    setSelectedRoute('');
    setSelectedAgent('');
    setApprovalFilter('all');
    setFromDate('');
    setToDate('');
  };

  // Metrics calculation
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

    return {
      totalCount: filteredRecords.length,
      totalBuy,
      totalSell,
      totalProfit,
      profitMargin,
      approvedCount,
      pendingCount: filteredRecords.length - approvedCount
    };
  }, [filteredRecords]);

  // Format Currency
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num || 0)) + ' đ';
  };

  // Format Date VN (DD/MM/YYYY)
  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Modal Handlers
  const handleOpenAddModal = () => {
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }
    setModalMode('add');
    setEditingRecord(null);
    setFormData({
      booking_date: new Date().toISOString().split('T')[0],
      route: routes[0]?.route_name || '',
      mbl_hbl: '',
      volume_info: '1x40HC',
      agent: '',
      customer: customers[0]?.customer_name || '',
      buy_price: 0,
      sell_price: 0,
      notes: '',
      approved: false,
      approved_date: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: SeaFreightRecord) => {
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }
    setModalMode('edit');
    setEditingRecord(rec);
    setFormData({
      booking_date: rec.booking_date || new Date().toISOString().split('T')[0],
      route: rec.route || '',
      mbl_hbl: rec.mbl_hbl || '',
      volume_info: rec.volume_info || '',
      agent: rec.agent || '',
      customer: rec.customer || '',
      buy_price: rec.buy_price || 0,
      sell_price: rec.sell_price || 0,
      notes: rec.notes || '',
      approved: Boolean(rec.approved),
      approved_date: rec.approved_date || ''
    });
    setIsModalOpen(true);
  };

  const handleDuplicateRecord = (rec: SeaFreightRecord) => {
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }
    setModalMode('add');
    setEditingRecord(null);
    setFormData({
      booking_date: rec.booking_date || new Date().toISOString().split('T')[0],
      route: rec.route || '',
      mbl_hbl: rec.mbl_hbl ? `${rec.mbl_hbl} (Bản sao)` : '',
      volume_info: rec.volume_info || '',
      agent: rec.agent || '',
      customer: rec.customer || '',
      buy_price: rec.buy_price || 0,
      sell_price: rec.sell_price || 0,
      notes: rec.notes || '',
      approved: false, // Bản sao mới chưa duyệt
      approved_date: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }

    const buy = Number(formData.buy_price) || 0;
    const sell = Number(formData.sell_price) || 0;
    const calculatedProfit = sell - buy;

    let finalApproved = formData.approved;
    let finalApprovedDate = formData.approved_date;
    let approvedBy = editingRecord?.approved_by;

    if (isAdminOrManager && formData.approved && !finalApprovedDate) {
      finalApprovedDate = new Date().toISOString().split('T')[0];
      approvedBy = {
        uid: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role
      };
    } else if (!formData.approved) {
      finalApprovedDate = undefined;
      approvedBy = undefined;
    }

    const recordToSave: SeaFreightRecord = {
      id: editingRecord?.id || 'sf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      booking_date: formData.booking_date,
      route: formData.route.trim(),
      mbl_hbl: formData.mbl_hbl.trim(),
      volume_info: formData.volume_info.trim(),
      agent: formData.agent.trim(),
      customer: formData.customer.trim(),
      buy_price: buy,
      sell_price: sell,
      profit: calculatedProfit,
      notes: formData.notes.trim() || undefined,
      created_by: editingRecord?.created_by || {
        uid: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role
      },
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
      approved: finalApproved,
      approved_date: finalApprovedDate,
      approved_by: approvedBy
    };

    await onSaveRecord(recordToSave);
    setIsModalOpen(false);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('Không có dữ liệu cước biển nào để xuất.');
      return;
    }

    const exportData = filteredRecords.map((r, index) => {
      const buy = Number(r.buy_price) || 0;
      const sell = Number(r.sell_price) || 0;
      const profit = typeof r.profit === 'number' ? r.profit : (sell - buy);

      return {
        'STT': index + 1,
        'Ngày đặt': formatDateVN(r.booking_date),
        'Tuyến đường': r.route || '',
        'Số MBL/HBL': r.mbl_hbl || '',
        'Số cont/Kg/CBM': r.volume_info || '',
        'Đại lý / Hãng tàu': r.agent || '',
        'Khách hàng': r.customer || '',
        'Giá mua (VNĐ)': buy,
        'Giá bán (VNĐ)': sell,
        'Lợi nhuận (VNĐ)': profit,
        'Nhân viên nhập': r.created_by?.name || '---',
        'Trạng thái duyệt': r.approved ? 'ĐÃ DUYỆT' : 'CHƯA DUYỆT',
        'Ngày duyệt': r.approved_date ? formatDateVN(r.approved_date) : '',
        'Người duyệt': r.approved_by?.name || '',
        'Ghi chú': r.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cuoc_Bien');

    // Auto col width
    const cols = [
      { wch: 6 },  // STT
      { wch: 14 }, // Ngày đặt
      { wch: 28 }, // Tuyến đường
      { wch: 24 }, // MBL/HBL
      { wch: 18 }, // Cont/Kg/CBM
      { wch: 26 }, // Đại lý
      { wch: 26 }, // Khách hàng
      { wch: 16 }, // Giá mua
      { wch: 16 }, // Giá bán
      { wch: 16 }, // Lợi nhuận
      { wch: 20 }, // Nhân viên
      { wch: 14 }, // Duyệt
      { wch: 14 }, // Ngày duyệt
      { wch: 20 }, // Người duyệt
      { wch: 30 }  // Ghi chú
    ];
    worksheet['!cols'] = cols;

    XLSX.writeFile(workbook, `Bao_Cao_Cuoc_Bien_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Datalists for Autocomplete */}
      <datalist id="sf-filter-customer-list">
        {customerSuggestions.map(c => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <datalist id="sf-filter-route-list">
        {routeSuggestions.map(r => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <datalist id="sf-filter-agent-list">
        {agentSuggestions.map(a => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {/* KPI Overview Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tổng đơn */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng đơn cước biển</p>
            <p className="text-2xl font-black text-slate-800">{metrics.totalCount}</p>
            <p className="text-[11px] text-slate-400 font-medium">
              Đã duyệt: <span className="font-bold text-emerald-600">{metrics.approvedCount}</span> | Chờ: <span className="font-bold text-amber-600">{metrics.pendingCount}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Ship className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Tổng Doanh thu (Giá bán) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Giá Bán (Doanh thu)</p>
            <p className="text-lg font-black text-blue-600">{formatVND(metrics.totalSell)}</p>
            <p className="text-[11px] text-slate-400 font-medium">Thu từ khách hàng</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Tổng Chi phí (Giá mua) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Giá Mua (Chi phí)</p>
            <p className="text-lg font-black text-slate-700">{formatVND(metrics.totalBuy)}</p>
            <p className="text-[11px] text-slate-400 font-medium">Trả đại lý/hãng tàu</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Tổng Lợi Nhuận ròng */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Tổng Lợi Nhuận Cước Biển</span>
              <span className="bg-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300/30">
                Biên LN: {metrics.profitMargin.toFixed(1)}%
              </span>
            </div>
            <p className="text-2xl font-black text-white">{formatVND(metrics.totalProfit)}</p>
            <p className="text-[11px] text-emerald-100 font-medium">
              = Tổng Giá Bán - Tổng Giá Mua (Tự động hạch toán)
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Quản Lý & Nhập Liệu Cước Biển</h2>
              <p className="text-xs text-slate-500">Theo dõi booking, giá mua/bán, lợi nhuận và quy trình duyệt</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              title="Xuất file Excel báo cáo cước biển"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>

            {isFiltering && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đặt lại lọc</span>
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nhập Cước Biển Mới</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          {/* Search Term */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="MBL/HBL, Tuyến, Khách..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Customer Filter */}
          <div className="relative">
            <input
              type="text"
              list="sf-filter-customer-list"
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              placeholder="Lọc theo khách hàng..."
              className="w-full pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
            />
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => setSelectedCustomer('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Route Filter */}
          <div className="relative">
            <input
              type="text"
              list="sf-filter-route-list"
              value={selectedRoute}
              onChange={e => setSelectedRoute(e.target.value)}
              placeholder="Lọc theo tuyến đường..."
              className="w-full pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
            />
            {selectedRoute && (
              <button
                type="button"
                onClick={() => setSelectedRoute('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Agent Filter */}
          <div className="relative">
            <input
              type="text"
              list="sf-filter-agent-list"
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              placeholder="Lọc đại lý / hãng tàu..."
              className="w-full pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
            />
            {selectedAgent && (
              <button
                type="button"
                onClick={() => setSelectedAgent('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Approval Filter */}
          <div>
            <select
              value={approvalFilter}
              onChange={e => setApprovalFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
            >
              <option value="all">Duyệt: Tất cả</option>
              <option value="approved">Duyệt: Đã duyệt</option>
              <option value="pending">Duyệt: Chưa duyệt</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex gap-1 items-center">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl"
              title="Từ ngày đặt"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl"
              title="Đến ngày đặt"
            />
          </div>
        </div>

        {/* Quick Customer Chips */}
        {customerSuggestions.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-semibold mr-1">Khách hàng nổi bật:</span>
            {customerSuggestions.slice(0, 6).map(cust => (
              <button
                key={cust}
                type="button"
                onClick={() => setSelectedCustomer(selectedCustomer === cust ? '' : cust)}
                className={`px-2 py-0.5 rounded-lg border transition ${
                  selectedCustomer === cust
                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                }`}
              >
                {cust}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Sea Freight Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 w-28">Ngày đặt</th>
                <th className="py-3 px-3 min-w-[160px]">Tuyến đường</th>
                <th className="py-3 px-3 min-w-[160px]">Số MBL/HBL</th>
                <th className="py-3 px-3 w-32">Số cont / Kg / CBM</th>
                <th className="py-3 px-3 min-w-[140px]">Đại lý / Hãng tàu</th>
                <th className="py-3 px-3 min-w-[150px]">Khách hàng</th>
                <th className="py-3 px-3 text-right w-28">Giá mua</th>
                <th className="py-3 px-3 text-right w-28">Giá bán</th>
                <th className="py-3 px-3 text-right w-32">Lợi nhuận</th>
                <th className="py-3 px-3 w-36">Nhân viên nhập</th>
                <th className="py-3 px-3 text-center w-36">Duyệt</th>
                <th className="py-3 px-3 min-w-[140px]">Ghi chú</th>
                <th className="py-3 px-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <Ship className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm">Chưa có dữ liệu cước biển nào phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Nhấn "Nhập Cước Biển Mới" để thêm đơn cước biển đầu tiên</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, index) => {
                  const buy = Number(item.buy_price) || 0;
                  const sell = Number(item.sell_price) || 0;
                  const profit = typeof item.profit === 'number' ? item.profit : (sell - buy);
                  const isPositive = profit >= 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 transition group"
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Ngày đặt */}
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateVN(item.booking_date)}</span>
                        </div>
                      </td>

                      {/* Tuyến đường */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{item.route || '---'}</span>
                        </div>
                      </td>

                      {/* Số MBL/HBL */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            {item.mbl_hbl || '---'}
                          </span>
                          {item.mbl_hbl && (
                            <button
                              type="button"
                              onClick={() => handleCopy(item.mbl_hbl, item.id)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                              title="Sao chép số MBL/HBL"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Số cont / Kg / CBM */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 bg-slate-100 font-bold text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                          <Box className="w-3 h-3 text-slate-500" />
                          <span>{item.volume_info || '1x40HC'}</span>
                        </span>
                      </td>

                      {/* Đại lý / Hãng tàu */}
                      <td className="py-3 px-3 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={item.agent}>
                            {item.agent || '---'}
                          </span>
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td className="py-3 px-3 font-bold text-indigo-900">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[150px]" title={item.customer}>
                            {item.customer || '---'}
                          </span>
                        </div>
                      </td>

                      {/* Giá mua */}
                      <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                        {formatVND(buy)}
                      </td>

                      {/* Giá bán */}
                      <td className="py-3 px-3 text-right font-bold text-blue-600 whitespace-nowrap">
                        {formatVND(sell)}
                      </td>

                      {/* Lợi nhuận */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-block font-black px-2 py-0.5 rounded-lg border ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isPositive ? '+' : ''}{formatVND(profit)}
                        </span>
                      </td>

                      {/* Nhân viên nhập */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>{item.created_by?.name || 'Admin'}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.createdAt ? formatDateVN(item.createdAt.split('T')[0]) : ''}
                          </p>
                        </div>
                      </td>

                      {/* Duyệt & Ngày duyệt */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isAdminOrManager ? (
                            <button
                              type="button"
                              onClick={() => onToggleApproval(item.id, Boolean(item.approved))}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                                item.approved
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                                  : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 border border-slate-200'
                              }`}
                              title={item.approved ? 'Nhấn để bỏ duyệt' : 'Nhấn để phê duyệt đơn cước biển'}
                            >
                              {item.approved ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đã duyệt</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Chưa duyệt</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                                item.approved
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {item.approved ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Đã duyệt</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Chờ duyệt</span>
                                </>
                              )}
                            </span>
                          )}

                          {/* Hiển thị ngày duyệt bên dưới nút duyệt */}
                          {item.approved && item.approved_date ? (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-100">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{formatDateVN(item.approved_date)}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {item.approved ? 'Đã duyệt' : 'Chưa có ngày duyệt'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3 px-3 text-slate-500 text-xs">
                        <span className="line-clamp-2" title={item.notes}>
                          {item.notes || '---'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRecord(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Nhân bản đơn cước biển (Tạo bản sao mới)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Sửa thông tin"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(item.id, `Đơn cước ${item.mbl_hbl || item.route}`)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa đơn cước biển"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>Hiển thị <strong className="text-slate-800">{filteredRecords.length}</strong> / {records.length} đơn cước biển</span>
          <div className="flex items-center gap-4">
            <span>Tổng Giá bán: <strong className="text-blue-700">{formatVND(metrics.totalSell)}</strong></span>
            <span>Tổng Lợi nhuận: <strong className="text-emerald-700">{formatVND(metrics.totalProfit)}</strong></span>
          </div>
        </div>
      </div>

      {/* Modal: Nhập / Chỉnh sửa Cước Biển */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  {modalMode === 'add' && formData.mbl_hbl?.includes('(Bản sao)') ? (
                    <Copy className="w-5 h-5 text-emerald-300" />
                  ) : (
                    <Ship className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {formData.mbl_hbl?.includes('(Bản sao)') && modalMode === 'add'
                      ? 'Nhân Bản Đơn Cước Biển (Tạo bản sao mới)'
                      : modalMode === 'add'
                      ? 'Nhập Liệu Cước Biển Mới'
                      : 'Chỉnh Sửa Đơn Cước Biển'}
                  </h3>
                  <p className="text-xs text-blue-100">
                    Điền đầy đủ thông tin cước tàu, giá mua, giá bán và phê duyệt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitModal} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Datalists for Modal */}
              <datalist id="modal-cust-list">
                {customerSuggestions.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <datalist id="modal-route-list">
                {routeSuggestions.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>

              <datalist id="modal-agent-list">
                {agentSuggestions.map(a => (
                  <option key={a} value={a} />
                ))}
              </datalist>

              {/* Row 1: Ngày đặt & Tuyến đường */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày đặt *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.booking_date}
                    onChange={e => setFormData({ ...formData, booking_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tuyến đường *
                  </label>
                  <input
                    type="text"
                    list="modal-route-list"
                    required
                    value={formData.route}
                    onChange={e => setFormData({ ...formData, route: e.target.value })}
                    placeholder="VD: Hải Phòng - Los Angeles (USLAX)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: Số MBL/HBL & Số cont/Kg/CBM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số MBL / HBL *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mbl_hbl}
                    onChange={e => setFormData({ ...formData, mbl_hbl: e.target.value })}
                    placeholder="VD: ONE260810HP / HBL-SPV01"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số cont / số Kg / số CBM *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.volume_info}
                    onChange={e => setFormData({ ...formData, volume_info: e.target.value })}
                    placeholder="VD: 2x40HC hoặc 15,000 Kgs hoặc 20 CBM"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                  {/* Quick volume suggestions */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {QUICK_VOLUME_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFormData({ ...formData, volume_info: tag })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                          formData.volume_info === tag
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Đại lý / Hãng tàu & Khách hàng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đại lý / Hãng tàu *
                  </label>
                  <input
                    type="text"
                    list="modal-agent-list"
                    required
                    value={formData.agent}
                    onChange={e => setFormData({ ...formData, agent: e.target.value })}
                    placeholder="VD: Ocean Network Express (ONE), Maersk..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khách hàng *
                  </label>
                  <input
                    type="text"
                    list="modal-cust-list"
                    required
                    value={formData.customer}
                    onChange={e => setFormData({ ...formData, customer: e.target.value })}
                    placeholder="Chọn hoặc nhập tên khách hàng..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-indigo-900"
                  />
                </div>
              </div>

              {/* Row 4: Giá Mua, Giá Bán, Lợi Nhuận Tính Toán Tự Động */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giá mua (Chi phí trả đại lý) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        required
                        value={formData.buy_price}
                        onChange={e => setFormData({ ...formData, buy_price: Number(e.target.value) || 0 })}
                        className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">VNĐ</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{formatVND(formData.buy_price)}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giá bán (Doanh thu thu khách) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        required
                        value={formData.sell_price}
                        onChange={e => setFormData({ ...formData, sell_price: Number(e.target.value) || 0 })}
                        className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">VNĐ</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{formatVND(formData.sell_price)}</p>
                  </div>
                </div>

                {/* Live Profit Preview */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Lợi nhuận ước tính (Giá bán - Giá mua):</span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                        (formData.sell_price - formData.buy_price) >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {(formData.sell_price - formData.buy_price) >= 0 ? '+' : ''}
                      {formatVND(formData.sell_price - formData.buy_price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 5: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về hạ bãi, lưu cont, lưu bãi, điều kiện giao nhận..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Row 6: Duyệt (Chỉ Quản lý hoặc Admin) */}
              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Phê Duyệt Đơn Cước Biển</p>
                      <p className="text-[10px] text-amber-700">
                        {isAdminOrManager ? 'Quyền Quản lý / Admin: Bạn có thể phê duyệt hoặc chuyển trạng thái' : 'Chỉ Quản lý hoặc Quản trị viên mới có quyền phê duyệt'}
                      </p>
                    </div>
                  </div>

                  {isAdminOrManager ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.approved}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData({
                            ...formData,
                            approved: checked,
                            approved_date: checked ? (formData.approved_date || new Date().toISOString().split('T')[0]) : ''
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-2 text-xs font-bold text-slate-700">
                        {formData.approved ? 'Đã duyệt' : 'Chưa duyệt'}
                      </span>
                    </label>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      {formData.approved ? 'Đã duyệt' : 'Chờ duyệt'}
                    </span>
                  )}
                </div>

                {formData.approved && (
                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 text-xs">
                    <label className="font-bold text-amber-900 text-[11px]">Ngày duyệt:</label>
                    {isAdminOrManager ? (
                      <input
                        type="date"
                        value={formData.approved_date || new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({ ...formData, approved_date: e.target.value })}
                        className="px-2 py-1 text-xs bg-white border border-amber-300 rounded-lg font-medium"
                      />
                    ) : (
                      <span className="font-semibold text-emerald-800">
                        {formatDateVN(formData.approved_date)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Creator notice */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Nhân viên nhập:{' '}
                  <strong className="text-slate-700">
                    {editingRecord?.created_by?.name || currentUser?.name || 'Tài khoản hiện tại'}
                  </strong>
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{modalMode === 'add' ? 'Lưu Đơn Cước Biển' : 'Cập Nhật Đơn Cước'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
