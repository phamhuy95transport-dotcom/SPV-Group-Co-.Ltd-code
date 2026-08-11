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
  CreditCard
} from 'lucide-react';
import {
  CustomsDeclarationRecord,
  CustomerItem,
  UserAccount,
  formatDateVN,
  formatMonthYearVN
} from '../types';

interface CustomsReportProps {
  declarations: CustomsDeclarationRecord[];
  customers: CustomerItem[];
  users: UserAccount[];
  currentUser?: UserAccount | null;
  paidAmounts?: Record<string, number>;
  onUpdatePaidAmount?: (key: string, amount: number) => void;
}

export const CustomsReport: React.FC<CustomsReportProps> = ({
  declarations,
  customers,
  users,
  currentUser,
  paidAmounts = {},
  onUpdatePaidAmount
}) => {
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // Base user declarations (Employee only sees their own data)
  const userDeclarations = useMemo(() => {
    if (!isAdmin && currentUser) {
      return declarations.filter(item => {
        const isCreator = item.created_by?.uid === currentUser.id || item.created_by?.email === currentUser.email;
        const isAssignedStaff = item.support_transfer?.staff_id === currentUser.id;
        return isCreator || isAssignedStaff;
      });
    }
    return declarations;
  }, [declarations, isAdmin, currentUser]);

  // Filtered Declarations
  const filteredDeclarations = useMemo(() => {
    return userDeclarations.filter(item => {
      const dateToCheck = item.approved_date || item.completed_date || item.execution_date;
      if (fromDate && dateToCheck < fromDate) return false;
      if (toDate && dateToCheck > toDate) return false;
      if (selectedCustomer && item.customer !== selectedCustomer) return false;
      if (selectedStaff && item.support_transfer?.staff_id !== selectedStaff) return false;
      return true;
    });
  }, [userDeclarations, fromDate, toDate, selectedCustomer, selectedStaff]);

  // Overall Statistics
  const totalCount = filteredDeclarations.length;
  const completedCount = filteredDeclarations.filter(d => d.completed).length;
  const approvedCount = filteredDeclarations.filter(d => d.approved).length;
  // Requirement 2: Thành Tiền KPI đã duyệt = sum of KPI for items where approved is true
  const totalKpiBonus = filteredDeclarations
    .filter(d => d.approved)
    .reduce((sum, d) => sum + (d.kpi_amount || 0), 0);

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
        // Requirement 2: Calculate approved KPI
        entry.kpiApprovedTotal += (item.kpi_amount || 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.month_year.localeCompare(a.month_year));
  }, [filteredDeclarations]);

  // Group by Customer
  const customerBreakdown = useMemo(() => {
    const map = new Map<string, { customer_name: string; total: number; totalConts: number; completed: number; kpiTotal: number }>();

    filteredDeclarations.forEach(item => {
      const cust = item.customer || 'Khác / Chưa gán';

      if (!map.has(cust)) {
        map.set(cust, { customer_name: cust, total: 0, totalConts: 0, completed: 0, kpiTotal: 0 });
      }

      const entry = map.get(cust)!;
      entry.total += 1;
      entry.totalConts += (item.cont_quantity || 1);
      if (item.completed) {
        entry.completed += 1;
        entry.kpiTotal += item.kpi_amount || 0;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredDeclarations]);

  // Group by Declaration Type
  const typeBreakdown = useMemo(() => {
    const types = ['Xuất khẩu', 'Nhập khẩu', 'XKTX', 'NKTC', 'XNKTC'];
    return types.map(t => {
      const list = filteredDeclarations.filter(d => d.type === t);
      const completed = list.filter(d => d.completed).length;
      const totalConts = list.reduce((sum, d) => sum + (d.cont_quantity || 1), 0);
      const totalKpi = list.filter(d => d.completed).reduce((sum, d) => sum + (d.kpi_amount || 0), 0);
      return {
        type_name: t,
        total: list.length,
        totalConts,
        completed,
        kpiTotal: totalKpi
      };
    });
  }, [filteredDeclarations]);

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

      {/* Filter Toolbar */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Từ ngày:
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Đến ngày:
          </label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Khách hàng:
          </label>
          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium"
          >
            <option value="">-- Tất cả Khách hàng --</option>
            {customers.map(c => (
              <option key={c.id} value={c.customer_name}>
                {c.customer_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Nhân viên thực hiện:
          </label>
          <select
            value={selectedStaff}
            onChange={e => setSelectedStaff(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium"
          >
            <option value="">-- Tất cả Nhân viên --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 2: Theo Khách Hàng */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-800 text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">2. Thống Kê Theo Khách Hàng</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
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
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">{c.kpiTotal.toLocaleString('vi-VN')} đ</td>
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

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
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
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">{t.kpiTotal.toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
