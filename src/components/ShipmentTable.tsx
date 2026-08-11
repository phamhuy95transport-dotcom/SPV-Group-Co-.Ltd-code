import React, { useState } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Copy,
  Edit2,
  Trash2,
  Lock,
  User,
  ArrowUpDown,
  RotateCcw,
  Boxes,
  Truck,
  Building,
  CheckCheck
} from 'lucide-react';
import { ShipmentRecord, UserAccount } from '../types';

interface ShipmentTableProps {
  records: ShipmentRecord[];
  currentUser: UserAccount | null;
  onOpenReceiptModal: (record: ShipmentRecord) => void;
  onDuplicateRecord: (record: ShipmentRecord) => void;
  onOpenEditModal: (record: ShipmentRecord) => void;
  onConfirmDeleteTrip: (record: ShipmentRecord) => void;
  onToggleCheckbox: (record: ShipmentRecord, field: keyof ShipmentRecord) => void;
  onOpenNewTripModal: () => void;
  onOpenLoginModal?: () => void;
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  records,
  currentUser,
  onOpenReceiptModal,
  onDuplicateRecord,
  onOpenEditModal,
  onConfirmDeleteTrip,
  onToggleCheckbox,
  onOpenNewTripModal,
  onOpenLoginModal,
}) => {
  const isCustomer = currentUser?.role === 'customer';
  const isEmployee = currentUser?.role === 'employee';
  const isAdmin = currentUser?.role === 'admin';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterTransporter, setFilterTransporter] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof ShipmentRecord>('date_announced');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Unique Customer & Transporter lists
  const uniqueCustomers = Array.from(new Set(records.map(r => r.customer).filter(Boolean)));
  const uniqueTransporters = Array.from(new Set(records.map(r => r.transporter).filter(Boolean)));

  // Filter Logic
  let filtered = [...records];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      Object.values(r).some(val =>
        typeof val === 'object'
          ? JSON.stringify(val).toLowerCase().includes(q)
          : String(val || '').toLowerCase().includes(q)
      )
    );
  }

  if (filterCustomer) {
    filtered = filtered.filter(r => r.customer === filterCustomer);
  }

  if (filterTransporter && !isCustomer) {
    filtered = filtered.filter(r => r.transporter === filterTransporter);
  }

  if (filterDateFrom) {
    filtered = filtered.filter(r => (r.date_announced || r.delivery_date) >= filterDateFrom);
  }

  if (filterDateTo) {
    filtered = filtered.filter(r => (r.date_announced || r.delivery_date) <= filterDateTo);
  }

  // Sorting
  filtered.sort((a, b) => {
    let valA: any = a[sortColumn] ?? '';
    let valB: any = b[sortColumn] ?? '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    return sortOrder === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedRecords = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (col: keyof ShipmentRecord) => {
    if (sortColumn === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCustomer('');
    setFilterTransporter('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Helper to check if current user can edit/delete this specific record
  const canModifyRecord = (record: ShipmentRecord): boolean => {
    if (isCustomer) return false; // Read-only customer
    if (isAdmin) return true; // Admin has full access
    if (isEmployee) {
      // Employee can only modify if created by themselves
      if (!record.created_by) return true; // fallback for legacy
      return record.created_by.email?.toLowerCase() === currentUser?.email.toLowerCase() ||
             record.created_by.uid === currentUser?.id;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-slate-50 to-indigo-500/5 border border-indigo-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              Chế độ Vận hành & Tra cứu Chuyến Xe
              {isCustomer ? (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                  <Lock className="w-3 h-3 text-amber-600" /> Tài khoản Khách hàng (Chỉ xem)
                </span>
              ) : isEmployee ? (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-blue-300">
                  Phân quyền Nhân viên
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-300">
                  Toàn quyền Quản trị viên (Admin)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCustomer
                ? 'Đã ẩn danh mục kho, nhà xe và báo cáo tài chính bảo mật.'
                : isEmployee
                ? 'Nhân viên chỉ có quyền chỉnh sửa/xóa các chuyến do chính mình nhập liệu.'
                : 'Cập nhật trực tiếp Cloud Database & Đồng bộ toàn hệ thống.'}
            </p>
          </div>
        </div>

        {!isCustomer && (
          <button
            onClick={onOpenNewTripModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-xs flex items-center gap-2 whitespace-nowrap"
          >
            + Nhập Chuyến Mới
          </button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Tổng Chuyến Xe</p>
              <p className="text-xl sm:text-3xl font-extrabold text-slate-800 mt-1">{records.length}</p>
            </div>
            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Đồng bộ Cloud DB Realtime
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-200 shadow-xs bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider">Tổng Số Container</p>
              <p className="text-2xl sm:text-4xl font-black text-indigo-700 mt-1">
                {records.reduce((sum, r) => sum + (Number(r.cont_quantity) || 0), 0)}
              </p>
            </div>
            <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-indigo-600 font-medium mt-2">Sản lượng hoàn thành hệ thống</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Khách Hàng</p>
              <p className="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                {currentUser ? uniqueCustomers.length : '***'}
              </p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {currentUser ? 'Đối tác đang phục vụ' : 'Đã bảo mật danh tính'}
          </p>
        </div>

        {/* Transporter Stat Card */}
        {!isCustomer ? (
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Nhà Xe / ĐVVC</p>
                <p className="text-xl sm:text-3xl font-extrabold text-purple-600 mt-1">
                  {currentUser ? uniqueTransporters.length : '***'}
                </p>
              </div>
              <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {currentUser ? 'Đơn vị vận tải hợp tác' : 'Đã bảo mật thông tin'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Bảo mật đơn vị vận chuyển</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Thông tin nhà xe bị ẩn đối với tài khoản Khách hàng.</p>
          </div>
        )}
      </div>

      {/* Guest View vs Logged In View */}
      {!currentUser ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h4 className="text-base sm:text-lg font-bold text-slate-900">Chi Tiết Danh Sách Chuyến Hàng Yêu Cầu Đăng Nhập</h4>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Quý khách đang truy cập ở chế độ Khách. Hệ thống chỉ công khai <strong>tổng số lượng container ({records.reduce((sum, r) => sum + (Number(r.cont_quantity) || 0), 0)} cont)</strong>. Vui lòng đăng nhập tài khoản Quản trị, Nhân viên hoặc Khách hàng để tra cứu danh sách chi tiết và các tiện ích nghiệp vụ.
            </p>
          </div>
          {onOpenLoginModal && (
            <div className="pt-3">
              <button
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-indigo-500/20 transition"
              >
                <User className="w-4 h-4" />
                <span>Đăng Nhập Tài Khoản Của Bạn</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filter Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm số cont, tuyến đường, khách hàng..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={filterCustomer}
              onChange={e => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tất cả Khách Hàng</option>
              {uniqueCustomers.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {!isCustomer && (
            <div>
              <select
                value={filterTransporter}
                onChange={e => setFilterTransporter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              >
                <option value="">Tất cả Nhà Xe</option>
                {uniqueTransporters.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {(searchQuery || filterCustomer || filterTransporter || filterDateFrom || filterDateTo) && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Đang lọc (Tìm thấy <strong className="text-indigo-600">{filtered.length}</strong> chuyến)
            </span>
            <button
              onClick={resetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">STT</th>
                <th
                  onClick={() => handleSort('date_announced')}
                  className="p-3.5 cursor-pointer hover:bg-slate-200/60 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Ngày báo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('delivery_date')}
                  className="p-3.5 cursor-pointer hover:bg-slate-200/60 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Ngày giao</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 whitespace-nowrap">Tuyến đường</th>

                {/* Hide Transporter for Customer */}
                {!isCustomer && <th className="p-3.5 whitespace-nowrap">Nhà xe / ĐVVC</th>}

                <th
                  onClick={() => handleSort('cont_number')}
                  className="p-3.5 cursor-pointer hover:bg-slate-200/60 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Số Cont</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 whitespace-nowrap">Khách hàng</th>
                <th className="p-3.5 whitespace-nowrap">Số lô</th>
                <th className="p-3.5 text-center whitespace-nowrap">SL Cont</th>

                {/* Hide Warehouse columns for Customer */}
                {!isCustomer && (
                  <>
                    <th className="p-3.5 whitespace-nowrap">Kho/xưởng</th>
                    <th className="p-3.5 whitespace-nowrap">Người giao/nhận</th>
                    <th className="p-3.5 whitespace-nowrap">SĐT nhận hàng</th>
                  </>
                )}

                <th className="p-3.5 text-center whitespace-nowrap">Phơi nâng</th>
                <th className="p-3.5 text-center whitespace-nowrap">Phơi hạ</th>
                <th className="p-3.5 text-center whitespace-nowrap">HĐ hạ rỗng</th>
                <th className="p-3.5 text-center whitespace-nowrap">HĐ đầu vào</th>
                <th className="p-3.5 text-center whitespace-nowrap">HĐ đầu ra</th>
                <th className="p-3.5 whitespace-nowrap">Ghi chú</th>

                {/* Requirement 5: Created By / Người Nhập Liệu */}
                <th className="p-3.5 whitespace-nowrap bg-indigo-50/60 text-indigo-950 font-extrabold border-l border-indigo-100">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Người Nhập Liệu</span>
                  </div>
                </th>

                <th className="p-3.5 text-right w-36 whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {paginatedRecords.map((record, index) => {
                const canModify = canModifyRecord(record);

                return (
                  <tr key={record.id} className="hover:bg-indigo-50/30 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400 text-xs">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="p-3.5 font-medium whitespace-nowrap">{record.date_announced || '—'}</td>
                    <td className="p-3.5 font-medium whitespace-nowrap">{record.delivery_date || '—'}</td>
                    <td className="p-3.5 font-semibold text-slate-800 whitespace-nowrap">{record.route || '—'}</td>

                    {/* Requirement 2: Hide Transporter for Customer */}
                    {!isCustomer && (
                      <td className="p-3.5 font-bold text-indigo-900 whitespace-nowrap">
                        {record.transporter || '—'}
                      </td>
                    )}

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200/60 text-xs font-bold shadow-xs">
                        {record.cont_number || '—'}
                      </span>
                    </td>

                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{record.customer || '—'}</td>
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">{record.batch_number || '—'}</td>
                    <td className="p-3.5 text-center font-bold text-indigo-600">{record.cont_quantity || 1}</td>

                    {/* Requirement 2: Hide Warehouse for Customer */}
                    {!isCustomer && (
                      <>
                        <td className="p-3.5 text-slate-700 whitespace-nowrap">{record.warehouse || '—'}</td>
                        <td className="p-3.5 font-medium text-slate-800 whitespace-nowrap">
                          {record.contact_person || '—'}
                        </td>
                        <td className="p-3.5 font-mono text-indigo-600 font-semibold whitespace-nowrap">
                          {record.contact_phone || '—'}
                        </td>
                      </>
                    )}

                    {/* Checkbox status toggles */}
                    {(['phoi_nang', 'phoi_ha', 'hd_ha_rong', 'hd_dich_vu', 'hd_dau_ra'] as const).map(field => (
                      <td key={field} className="p-3.5 text-center whitespace-nowrap">
                        <button
                          disabled={!canModify}
                          onClick={() => onToggleCheckbox(record, field)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                            record[field]
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          } ${canModify ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {record[field] ? 'Có' : 'Không'}
                        </button>
                      </td>
                    ))}

                    <td className="p-3.5 text-slate-600 max-w-[180px] truncate" title={record.notes}>
                      {record.notes || '—'}
                    </td>

                    {/* Requirement 5: Display Creator / Người nhập liệu */}
                    <td className="p-3.5 whitespace-nowrap bg-indigo-50/40 border-l border-indigo-100">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            record.created_by?.role === 'admin'
                              ? 'bg-amber-500'
                              : record.created_by?.role === 'employee'
                              ? 'bg-blue-500'
                              : 'bg-emerald-500'
                          }`}
                        ></span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            {record.created_by?.name || 'Hệ thống'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {record.created_by?.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Row Action Buttons */}
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      {/* Delivery Receipt Button (Available for all roles) */}
                      <button
                        onClick={() => onOpenReceiptModal(record)}
                        className="p-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 rounded-lg transition"
                        title="In Biên bản giao nhận hàng hóa"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {!isCustomer && (
                        <button
                          onClick={() => onDuplicateRecord(record)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Nhân bản chuyến"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit button: enabled if canModify */}
                      {canModify ? (
                        <button
                          onClick={() => onOpenEditModal(record)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="p-1.5 text-slate-300 cursor-not-allowed inline-block"
                          title="Bạn không có quyền sửa chuyến của tài khoản nhân viên khác"
                        >
                          <Lock className="w-4 h-4 opacity-40" />
                        </span>
                      )}

                      {/* Delete button: enabled if canModify */}
                      {canModify ? (
                        <button
                          onClick={() => onConfirmDeleteTrip(record)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa chuyến xe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {paginatedRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={isCustomer ? 13 : 17}
                    className="p-12 text-center text-slate-400 font-medium"
                  >
                    Không tìm thấy dữ liệu chuyến xe phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
            <span>
              Trang {currentPage} / {totalPages} (Tổng {filtered.length} bản ghi)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-100 transition shadow-xs"
              >
                Trước
              </button>
              <span className="px-2 font-bold text-slate-800">{currentPage}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-100 transition shadow-xs"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
};
