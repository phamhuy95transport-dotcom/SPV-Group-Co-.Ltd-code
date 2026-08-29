import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Users,
  Award,
  Filter,
  Printer,
  Download,
  Building2,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  CreditCard,
  Search,
  X,
  RefreshCw,
  UserCheck,
  Tag
} from 'lucide-react';
import {
  CustomsDeclarationRecord,
  CustomerItem,
  UserAccount,
  CustomsDeclarationType,
  formatDateVN,
  formatMonthYearVN,
  hasPermission,
  KPIRateItem,
  calculateCustomsKPI
} from '../types';

interface CustomsReportProps {
  declarations: CustomsDeclarationRecord[];
  customers: CustomerItem[];
  users: UserAccount[];
  currentUser?: UserAccount | null;
  paidAmounts?: Record<string, number>;
  onUpdatePaidAmount?: (key: string, amount: number) => void;
  kpiRates?: KPIRateItem[];
}

export const CustomsReport: React.FC<CustomsReportProps> = ({
  declarations,
  customers,
  users,
  currentUser,
  paidAmounts = {},
  onUpdatePaidAmount,
  kpiRates
}) => {
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterType, setFilterType] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // Base user declarations (Customer sees their customer data, Authorized roles see all, standard staff sees own)
  const userDeclarations = useMemo(() => {
    if (currentUser?.role === 'customer') {
      if (currentUser.customer_name) {
        return declarations.filter(item => item.customer === currentUser.customer_name);
      } else if (currentUser.name) {
        const custName = currentUser.name.toLowerCase();
        return declarations.filter(item => (item.customer || '').toLowerCase().includes(custName));
      }
    }

    const canViewAllCustomsReport = 
      currentUser?.role === 'admin' || 
      currentUser?.role === 'manager' || 
      currentUser?.role === 'employee_accounting' || 
      hasPermission(currentUser, 'customs_report', 'view') || 
      hasPermission(currentUser, 'finance_report', 'view') || 
      hasPermission(currentUser, 'finance', 'view');

    if (!canViewAllCustomsReport && currentUser) {
      return declarations.filter(item => {
        const isCreator = item.created_by?.uid === currentUser.id || item.created_by?.email === currentUser.email;
        const isAssignedStaff = item.support_transfer?.staff_id === currentUser.id;
        return isCreator || isAssignedStaff;
      });
    }
    return declarations;
  }, [declarations, currentUser]);

  // Unique Customer list for smart autocomplete
  const customerSuggestions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.customer_name?.trim()) set.add(c.customer_name.trim());
    });
    declarations.forEach(d => {
      if (d.customer?.trim()) set.add(d.customer.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [customers, declarations]);

  // Unique Staff list for smart autocomplete
  const staffSuggestions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    users.forEach(u => {
      if (u.name?.trim()) map.set(u.name.trim().toLowerCase(), { id: u.id, name: u.name.trim() });
    });
    declarations.forEach(d => {
      const name = d.support_transfer?.staff_name?.trim();
      const id = d.support_transfer?.staff_id || '';
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { id, name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [users, declarations]);

  // Filtered Declarations
  const filteredDeclarations = useMemo(() => {
    return userDeclarations.filter(item => {
      // Keyword search across declaration number, customer, staff, notes
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = (item.declaration_number || '').toLowerCase().includes(q);
        const custMatch = (item.customer || '').toLowerCase().includes(q);
        const staffMatch = (item.support_transfer?.staff_name || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);
        const creatorMatch = (item.created_by?.name || '').toLowerCase().includes(q);
        if (!numMatch && !custMatch && !staffMatch && !notesMatch && !creatorMatch) return false;
      }

      const dateToCheck = item.approved_date || item.completed_date || item.execution_date;
      if (fromDate && dateToCheck < fromDate) return false;
      if (toDate && dateToCheck > toDate) return false;

      // Smart customer search (partial or exact)
      if (filterCustomer.trim()) {
        const targetCust = filterCustomer.trim().toLowerCase();
        const itemCust = (item.customer || '').toLowerCase();
        if (!itemCust.includes(targetCust)) return false;
      }

      // Smart staff search (matches staff name or staff ID)
      if (filterStaff.trim()) {
        const targetStaff = filterStaff.trim().toLowerCase();
        const staffName = (item.support_transfer?.staff_name || '').toLowerCase();
        const staffId = (item.support_transfer?.staff_id || '').toLowerCase();
        if (!staffName.includes(targetStaff) && staffId !== targetStaff) return false;
      }

      // Declaration type filter
      if (filterType.trim()) {
        if (item.type !== filterType.trim()) return false;
      }

      return true;
    });
  }, [userDeclarations, searchQuery, fromDate, toDate, filterCustomer, filterStaff, filterType]);

  const isFiltering = Boolean(
    searchQuery ||
    fromDate ||
    toDate ||
    filterCustomer ||
    filterStaff ||
    filterType
  );

  const resetFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setFilterCustomer('');
    setFilterStaff('');
    setFilterType('');
  };

  // Overall Statistics
  const totalCount = filteredDeclarations.length;
  const completedCount = filteredDeclarations.filter(d => d.completed).length;
  const approvedCount = filteredDeclarations.filter(d => d.approved).length;
  // Requirement 4: Parity in KPI calculation - sum of KPI for items where approved is true
  const totalKpiBonus = filteredDeclarations
    .filter(d => d.approved)
    .reduce((sum, d) => sum + calculateCustomsKPI(d, kpiRates), 0);

  // Requirement 5: Total KPI Paid Amount sum across all months/staff
  const totalPaidAmountSum = Object.values(paidAmounts || {}).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);

  // Requirement 3: Group by Staff & Month using the month of ô duyệt (approved_date)
  const staffMonthlyBreakdown = useMemo(() => {
    const map = new Map<string, {
      key: string;
      staff_id: string;
      staff_name: string;
      month_year: string;
      total: number;
      totalConts: number;
      completed: number;
      approved: number;
      kpiApprovedTotal: number;
    }>();

    filteredDeclarations.forEach(item => {
      const staffId = item.support_transfer?.staff_id || 'unknown';
      const staffName = item.support_transfer?.staff_name || 'Khách / Chưa gán';
      // Month of ô duyệt
      const dateToUse = item.approved_date || item.completed_date || item.execution_date || new Date().toISOString().split('T')[0];
      const monthYear = formatMonthYearVN(dateToUse);
      const key = `${staffId}_${monthYear}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          staff_id: staffId,
          staff_name: staffName,
          month_year: monthYear,
          total: 0,
          totalConts: 0,
          completed: 0,
          approved: 0,
          kpiApprovedTotal: 0
        });
      }

      const entry = map.get(key)!;
      entry.total += 1;
      entry.totalConts += (item.cont_quantity || 1);
      if (item.completed) {
        entry.completed += 1;
      }
      if (item.approved) {
        entry.approved += 1;
        // Requirement 4: Calculate approved KPI consistently
        entry.kpiApprovedTotal += calculateCustomsKPI(item, kpiRates);
      }
    });

    const result = Array.from(map.values()).sort((a, b) => b.month_year.localeCompare(a.month_year));
    if (!isAdminOrManager) {
      return result.filter(r => r.staff_id === currentUser?.id);
    }
    return result;
  }, [filteredDeclarations, isAdminOrManager, currentUser?.id, kpiRates]);

  // Group by Customer
  const customerBreakdown = useMemo(() => {
    const map = new Map<string, { customer_name: string; total: number; totalConts: number; completed: number; approved: number; kpiApprovedTotal: number }>();

    filteredDeclarations.forEach(item => {
      const cust = item.customer || 'Khác / Chưa gán';

      if (!map.has(cust)) {
        map.set(cust, { customer_name: cust, total: 0, totalConts: 0, completed: 0, approved: 0, kpiApprovedTotal: 0 });
      }

      const entry = map.get(cust)!;
      entry.total += 1;
      entry.totalConts += (item.cont_quantity || 1);
      if (item.completed) {
        entry.completed += 1;
      }
      if (item.approved) {
        entry.approved += 1;
        entry.kpiApprovedTotal += calculateCustomsKPI(item, kpiRates);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredDeclarations, kpiRates]);

  // Group by Declaration Type
  const typeBreakdown = useMemo(() => {
    const types = ['Xuất khẩu', 'Nhập khẩu', 'XKTC', 'NKTC', 'XNKTC'];
    return types.map(t => {
      const list = filteredDeclarations.filter(d => d.type === t);
      const completed = list.filter(d => d.completed).length;
      const approved = list.filter(d => d.approved).length;
      const totalConts = list.reduce((sum, d) => sum + (d.cont_quantity || 1), 0);
      const totalKpiApproved = list.filter(d => d.approved).reduce((sum, d) => sum + calculateCustomsKPI(d, kpiRates), 0);
      return {
        type_name: t,
        total: list.length,
        totalConts,
        completed,
        approved,
        kpiApprovedTotal: totalKpiApproved
      };
    });
  }, [filteredDeclarations, kpiRates]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Báo Cáo Tổng Hợp Thủ Tục Hải Quan & Thưởng KPI</span>
          </h2>
          <p className="text-xs text-slate-500">
            Thống kê chi tiết năng suất công việc, tình trạng tờ khai và quỹ thưởng KPI theo tháng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Datalists for Smart Auto-suggestions */}
      <datalist id="customs-report-customer-datalist">
        {customerSuggestions.map(cust => (
          <option key={cust} value={cust} />
        ))}
      </datalist>

      <datalist id="customs-report-staff-datalist">
        {staffSuggestions.map(st => (
          <option key={st.id || st.name} value={st.name} />
        ))}
      </datalist>

      <datalist id="customs-report-type-datalist">
        {['Xuất khẩu', 'Nhập khẩu', 'XKTC', 'NKTC', 'XNKTC'].map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Bộ Lọc Tìm Kiếm Thông Minh</span>
            {isFiltering && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-extrabold">
                Đang lọc ({filteredDeclarations.length} kết quả)
              </span>
            )}
          </div>

          {isFiltering && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        {/* Primary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Ô tìm kiếm từ khóa tổng hợp */}
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Từ khóa tìm kiếm:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Số tờ khai, ghi chú..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  title="Xóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Ô nhập thông minh: Khách hàng */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-600" />
                <span>Khách hàng:</span>
              </span>
              {filterCustomer && (
                <button
                  type="button"
                  onClick={() => setFilterCustomer('')}
                  className="text-[10px] text-rose-500 hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                list="customs-report-customer-datalist"
                value={filterCustomer}
                onChange={e => setFilterCustomer(e.target.value)}
                placeholder="Nhập tên khách hàng (gợi ý tự động)..."
                className="w-full pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
              {filterCustomer && (
                <button
                  type="button"
                  onClick={() => setFilterCustomer('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Ô nhập thông minh: Nhân viên */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-indigo-600" />
                <span>Nhân viên thực hiện:</span>
              </span>
              {filterStaff && (
                <button
                  type="button"
                  onClick={() => setFilterStaff('')}
                  className="text-[10px] text-rose-500 hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                list="customs-report-staff-datalist"
                value={filterStaff}
                onChange={e => setFilterStaff(e.target.value)}
                placeholder="Nhập tên nhân viên (gợi ý tự động)..."
                className="w-full pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
              {filterStaff && (
                <button
                  type="button"
                  onClick={() => setFilterStaff('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Ô nhập thông minh: Loại tờ khai */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-600" />
                <span>Loại tờ khai:</span>
              </span>
              {filterType && (
                <button
                  type="button"
                  onClick={() => setFilterType('')}
                  className="text-[10px] text-rose-500 hover:underline"
                >
                  Tất cả
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                list="customs-report-type-datalist"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                placeholder="Xuất khẩu, Nhập khẩu, XKTC..."
                className="w-full pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
              {filterType && (
                <button
                  type="button"
                  onClick={() => setFilterType('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Khoảng thời gian: Từ ngày - Đến ngày */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-600" />
              <span>Khoảng thời gian:</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                title="Từ ngày"
                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium focus:bg-white focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                title="Đến ngày"
                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {(customerSuggestions.length > 0 || staffSuggestions.length > 0) && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-semibold mr-1">Gợi ý nhanh:</span>
            {customerSuggestions.slice(0, 5).map(cust => (
              <button
                key={cust}
                type="button"
                onClick={() => setFilterCustomer(filterCustomer === cust ? '' : cust)}
                className={`px-2 py-0.5 rounded-lg border transition ${
                  filterCustomer === cust
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                }`}
              >
                {cust}
              </button>
            ))}
            {staffSuggestions.slice(0, 4).map(st => (
              <button
                key={st.id || st.name}
                type="button"
                onClick={() => setFilterStaff(filterStaff === st.name ? '' : st.name)}
                className={`px-2 py-0.5 rounded-lg border transition ${
                  filterStaff === st.name
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                }`}
              >
                NV: {st.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      {isAdminOrManager && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Tổng Tờ Khai</span>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Đã Hoàn Thành ("Đã")</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {completedCount} <span className="text-xs font-normal text-slate-400">({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Đã Duyệt ("Có")</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {approvedCount} <span className="text-xs font-normal text-slate-400">({totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold text-indigo-200 uppercase">Tổng Thưởng KPI Đã Duyệt</span>
          <div className="text-2xl font-black text-amber-300 mt-1">
            {totalKpiBonus.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-200 uppercase">Tổng Thưởng KPI Đã Thanh Toán</span>
          <div className="text-2xl font-black text-emerald-300 mt-1">
            {totalPaidAmountSum.toLocaleString('vi-VN')} đ
          </div>
        </div>
      </div>
      )}

      {/* Section 1: Thống kê theo Nhân viên (Requirement 3) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">1. Báo Cáo Thưởng KPI Theo Nhân Viên (Theo Tháng Phát Sinh)</h3>
          </div>
          <span className="text-[11px] text-slate-300 bg-slate-700 px-2.5 py-0.5 rounded-full font-medium">
            Tháng/Năm (mm/yyyy)
          </span>
        </div>

        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 shadow-xs">
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                <th className="p-3 text-center w-12 border-r border-slate-200">STT</th>
                <th className="p-3 border-r border-slate-200">Họ và Tên Nhân Viên</th>
                <th className="p-3 text-center border-r border-slate-200">Tháng/Năm</th>
                <th className="p-3 text-center border-r border-slate-200">Số Tờ Khai</th>
                <th className="p-3 text-center border-r border-slate-200">Số lượng cont/lô</th>
                <th className="p-3 text-center border-r border-slate-200">Đã Hoàn Thành</th>
                <th className="p-3 text-center border-r border-slate-200">Đã Duyệt</th>
                <th className="p-3 text-right border-r border-slate-200">Thành Tiền KPI đã duyệt</th>
                <th className="p-3 text-right min-w-[180px]">Đã thanh toán cho tháng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {staffMonthlyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">Chưa có dữ liệu.</td>
                </tr>
              ) : (
                staffMonthlyBreakdown.map((item, idx) => (
                  <tr key={item.key} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-100">{item.staff_name}</td>
                    <td className="p-3 text-center font-bold text-indigo-700 bg-indigo-50/50 border-r border-slate-100 whitespace-nowrap">
                      {item.month_year}
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700 border-r border-slate-100">{item.total}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800 border-r border-slate-100">{item.totalConts}</td>
                    <td className="p-3 text-center font-bold text-emerald-600 border-r border-slate-100">{item.completed}</td>
                    <td className="p-3 text-center font-bold text-amber-600 border-r border-slate-100">{item.approved}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm border-r border-slate-100">
                      {item.kpiApprovedTotal.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={paidAmounts[item.key] ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                            if (onUpdatePaidAmount) {
                              onUpdatePaidAmount(item.key, val);
                            }
                          }}
                          className="w-28 px-2 py-1 text-right font-mono font-bold text-indigo-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-400">đ</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid Section 2 & 3: Thống kê theo Khách hàng & Loại Tờ Khai */}
      {isAdminOrManager && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 2: Theo Khách Hàng */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-800 text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">2. Thống Kê Theo Khách Hàng</h3>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-xs">
                <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                  <th className="p-3 border-r border-slate-200">Khách Hàng</th>
                  <th className="p-3 text-center border-r border-slate-200">Số Tờ Khai</th>
                  <th className="p-3 text-center border-r border-slate-200">Số cont/lô</th>
                  <th className="p-3 text-right">Thành Tiền KPI đã duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customerBreakdown.map(c => (
                  <tr key={c.customer_name} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-100">{c.customer_name}</td>
                    <td className="p-3 text-center font-semibold text-slate-700 border-r border-slate-100">{c.total}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800 border-r border-slate-100">{c.totalConts}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">{c.kpiApprovedTotal.toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Theo Loại Tờ Khai */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-800 text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">3. Thống Kê Theo Loại Tờ Khai</h3>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-xs">
                <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                  <th className="p-3 border-r border-slate-200">Loại Tờ Khai</th>
                  <th className="p-3 text-center border-r border-slate-200">Số Lượng</th>
                  <th className="p-3 text-center border-r border-slate-200">Số cont/lô</th>
                  <th className="p-3 text-right">Thành Tiền KPI đã duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {typeBreakdown.map(t => (
                  <tr key={t.type_name} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-100">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold">
                        {t.type_name}
                      </span>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700 border-r border-slate-100">{t.total}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800 border-r border-slate-100">{t.totalConts}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">{t.kpiApprovedTotal.toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
