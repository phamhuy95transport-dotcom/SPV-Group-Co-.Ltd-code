import React, { useState, useRef } from 'react';
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
  CheckCheck,
  Download,
  Upload
} from 'lucide-react';
import { ShipmentRecord, UserAccount, formatDateVN } from '../types';
import { exportShipmentsToExcel, parseShipmentsFromExcel } from '../lib/excel';

interface ShipmentTableProps {
  records: ShipmentRecord[];
  currentUser: UserAccount | null;
  onOpenReceiptModal: (record: ShipmentRecord) => void;
  onDuplicateRecord: (record: ShipmentRecord) => void;
  onOpenEditModal: (record: ShipmentRecord) => void;
  onConfirmDeleteTrip: (record: ShipmentRecord) => void;
  onBatchDeleteTrips?: (selectedRecords: ShipmentRecord[]) => void;
  onToggleCheckbox: (record: ShipmentRecord, field: keyof ShipmentRecord) => void;
  onOpenNewTripModal: () => void;
  onOpenLoginModal?: () => void;
  onImportShipments?: (records: Partial<ShipmentRecord>[]) => void;
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  records,
  currentUser,
  onOpenReceiptModal,
  onDuplicateRecord,
  onOpenEditModal,
  onConfirmDeleteTrip,
  onBatchDeleteTrips,
  onToggleCheckbox,
  onOpenNewTripModal,
  onOpenLoginModal,
  onImportShipments,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedRecords = await parseShipmentsFromExcel(file);
      if (onImportShipments) {
        onImportShipments(parsedRecords);
      }
    } catch (err) {
      console.error('Failed to parse excel:', err);
      alert('Đã xảy ra lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const isCustomer = currentUser?.role === 'customer';
  const isAccounting = currentUser?.role === 'employee_accounting' || (currentUser?.permissions?.finance?.edit ?? false);
  const isLogisticsEmployee = currentUser?.role === 'employee_logistics' || currentUser?.role === ('employee' as any);
  const isEmployee = isLogisticsEmployee || currentUser?.role === 'employee_accounting' || currentUser?.role === ('employee' as any);
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterTransporter, setFilterTransporter] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterHdDauVao, setFilterHdDauVao] = useState<'all' | 'yes' | 'no'>('all');
  const [filterHdDauRa, setFilterHdDauRa] = useState<'all' | 'yes' | 'no'>('all');
  const [sortColumn, setSortColumn] = useState<keyof ShipmentRecord>('date_announced');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Unique Customer & Transporter lists
  const uniqueCustomers = Array.from(new Set(records.map(r => r.customer).filter(Boolean)));
  const uniqueTransporters = Array.from(new Set(records.map(r => r.transporter).filter(Boolean)));

  // Filter Logic
  let filtered = [...records];

  // Customer Account Isolation: Customer role can ONLY see shipments with their assigned customer name
  if (isCustomer && currentUser) {
    if (currentUser.customer_name) {
      filtered = filtered.filter(r => r.customer === currentUser.customer_name);
    } else if (currentUser.name) {
      const custName = currentUser.name.toLowerCase();
      filtered = filtered.filter(r => (r.customer || '').toLowerCase().includes(custName));
    }
  }

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

  if (filterHdDauVao !== 'all') {
    filtered = filtered.filter(r => {
      const hasInput = Boolean(r.hd_dich_vu || r.hd_dau_vao);
      return filterHdDauVao === 'yes' ? hasInput : !hasInput;
    });
  }

  if (filterHdDauRa !== 'all') {
    filtered = filtered.filter(r => {
      const hasOutput = Boolean(r.hd_dau_ra);
      return filterHdDauRa === 'yes' ? hasOutput : !hasOutput;
    });
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
    setFilterHdDauVao('all');
    setFilterHdDauRa('all');
  };

  // Helper to check if current user can edit/delete this specific record
  const canModifyRecord = (record: ShipmentRecord): boolean => {
    if (isCustomer) return false; // Read-only customer
    if (isAdmin || isManager) return true; // Admin and Manager have full access
    if (isAccounting) return true; // NV Kế toán được quyền sửa của tất cả người nhập liệu
    if (isLogisticsEmployee) {
      // Logistics Employee can only modify if created by themselves
      if (!record.created_by) return true; // fallback for legacy
      return record.created_by.email?.toLowerCase() === currentUser?.email.toLowerCase() ||
             record.created_by.uid === currentUser?.id;
    }
    return false;
  };

  // Selection state & actions
  const selectedFilteredRecords = filtered.filter(r => selectedIds.includes(r.id));
  const isAllFilteredSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id));
  const isSomeFilteredSelected = filtered.some(r => selectedIds.includes(r.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filtered.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const filteredIds = filtered.map(r => r.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const recordsToExport = selectedFilteredRecords.length > 0 ? selectedFilteredRecords : filtered;
    exportShipmentsToExcel(
      recordsToExport,
      selectedFilteredRecords.length > 0
        ? `danh-sach-chuyen-hang-da-chon-${selectedFilteredRecords.length}-muc.xlsx`
        : 'danh-sach-chuyen-hang.xlsx'
    );
  };

  const handleBatchDelete = () => {
    if (selectedFilteredRecords.length === 0) return;
    const deletableRecords = selectedFilteredRecords.filter(canModifyRecord);
    const nonDeletableCount = selectedFilteredRecords.length - deletableRecords.length;

    if (deletableRecords.length === 0) {
      alert('Bạn không có quyền xóa các chuyến hàng đã chọn.');
      return;
    }

    if (nonDeletableCount > 0) {
      const confirmMsg = `Trong số ${selectedFilteredRecords.length} chuyến hàng đã chọn, có ${nonDeletableCount} chuyến do người dùng khác tạo mà bạn không có quyền xóa.\n\nBạn có muốn tiếp tục xóa ${deletableRecords.length} chuyến do bạn tạo không?`;
      if (!confirm(confirmMsg)) return;
    }

    if (onBatchDeleteTrips) {
      onBatchDeleteTrips(deletableRecords);
      const deletedSet = new Set(deletableRecords.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !deletedSet.has(id)));
    }
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
              Thông tin vận chuyển
              {isCustomer ? (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                  <Lock className="w-3 h-3 text-amber-600" /> Tài khoản Khách hàng (Chỉ xem)
                </span>
              ) : isAccounting ? (
                <span className="bg-cyan-100 text-cyan-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-cyan-300">
                  Phân quyền Nhân viên Kế toán
                </span>
              ) : isLogisticsEmployee ? (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-blue-300">
                  Phân quyền Nhân viên Logistics
                </span>
              ) : isManager ? (
                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-purple-300">
                  Phân quyền Quản lý (Manager)
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
                : isAccounting
                ? 'Nhân viên Kế toán có quyền chỉnh sửa ô HĐ đầu vào/ra của tất cả người nhập liệu.'
                : isLogisticsEmployee
                ? 'Nhân viên Logistics có quyền chỉnh sửa các chuyến do chính mình nhập liệu.'
                : 'Cập nhật trực tiếp Cloud Database & Đồng bộ toàn hệ thống.'}
            </p>
          </div>
        </div>

        {!isCustomer && (
          <div className="flex items-center gap-2">
            {(isAdmin || isManager) && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-xs flex items-center gap-2 whitespace-nowrap border border-emerald-200"
                  title="Nhập Excel"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Nhập</span>
                </button>
                <button
                  onClick={handleExport}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-xs flex items-center gap-2 whitespace-nowrap border border-blue-200 cursor-pointer"
                  title={selectedFilteredRecords.length > 0 ? `Xuất ${selectedFilteredRecords.length} chuyến đã chọn` : "Xuất Excel"}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {selectedFilteredRecords.length > 0 ? `Xuất (${selectedFilteredRecords.length})` : 'Xuất'}
                  </span>
                </button>
              </>
            )}
            <button
              onClick={onOpenNewTripModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-xs flex items-center gap-2 whitespace-nowrap"
            >
              + <span className="hidden sm:inline">Nhập Chuyến Mới</span>
            </button>
          </div>
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

          <div>
            <select
              value={filterHdDauVao}
              onChange={e => setFilterHdDauVao(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
            >
              <option value="all">Tất cả HĐ Đầu Vào</option>
              <option value="yes">Có HĐ Đầu Vào</option>
              <option value="no">Chưa có HĐ Đầu Vào</option>
            </select>
          </div>

          <div>
            <select
              value={filterHdDauRa}
              onChange={e => setFilterHdDauRa(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
            >
              <option value="all">Tất cả HĐ Đầu Ra</option>
              <option value="yes">Có HĐ Đầu Ra</option>
              <option value="no">Chưa có HĐ Đầu Ra</option>
            </select>
          </div>
        </div>

        {(searchQuery || filterCustomer || filterTransporter || filterDateFrom || filterDateTo || filterHdDauVao !== 'all' || filterHdDauRa !== 'all') && (
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

      {/* Batch Actions Toolbar */}
      {selectedFilteredRecords.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-indigo-700/80">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-indigo-600/90 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 border border-indigo-500/50 shadow-inner">
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              Đã chọn <strong className="text-amber-300 text-sm sm:text-base">{selectedFilteredRecords.length}</strong> / {filtered.length} chuyến
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-indigo-200 hover:text-white hover:underline transition font-medium cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
            {!isAllFilteredSelected && (
              <button
                onClick={toggleSelectAllFiltered}
                className="text-xs text-amber-300 hover:text-amber-200 hover:underline transition font-bold cursor-pointer"
              >
                Chọn tất cả ({filtered.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 border border-emerald-500 cursor-pointer"
              title="Xuất các mục đã chọn ra file Excel"
            >
              <Download className="w-4 h-4" />
              <span>Kết xuất Excel ({selectedFilteredRecords.length})</span>
            </button>

            {!isCustomer && (
              <button
                onClick={handleBatchDelete}
                className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 border border-rose-500 cursor-pointer"
                title="Xóa các mục đã chọn"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa đã chọn ({selectedFilteredRecords.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected;
                    }}
                    onChange={toggleSelectAllFiltered}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    title="Chọn / Bỏ chọn tất cả theo bộ lọc"
                  />
                </th>
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
                const isSelected = selectedIds.includes(record.id);

                return (
                  <tr
                    key={record.id}
                    className={`transition ${isSelected ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600' : 'hover:bg-indigo-50/30'}`}
                  >
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(record.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      />
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-400 text-xs">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="p-3.5 font-medium whitespace-nowrap">{formatDateVN(record.date_announced) || '—'}</td>
                    <td className="p-3.5 font-medium whitespace-nowrap">{formatDateVN(record.delivery_date) || '—'}</td>
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
                    {(['phoi_nang', 'phoi_ha', 'hd_ha_rong', 'hd_dich_vu', 'hd_dau_ra'] as const).map(field => {
                      const isInvoiceField = field === 'hd_dich_vu' || field === 'hd_dau_ra';
                      const canToggleThisField = isInvoiceField
                        ? (isAccounting || isAdmin || isManager || canModify)
                        : canModify;

                      return (
                        <td key={field} className="p-3.5 text-center whitespace-nowrap">
                          <button
                            disabled={!canToggleThisField}
                            onClick={() => onToggleCheckbox(record, field)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                              record[field]
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            } ${canToggleThisField ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            title={
                              canToggleThisField
                                ? `Bấm để đổi trạng thái ${field === 'hd_dich_vu' ? 'HĐ đầu vào' : field === 'hd_dau_ra' ? 'HĐ đầu ra' : ''}`
                                : (isCustomer ? 'Tài khoản khách hàng chỉ xem' : 'Chỉ người tạo hoặc NV kế toán/Quản lý mới có quyền chỉnh sửa')
                            }
                          >
                            {record[field] ? 'Có' : 'Không'}
                          </button>
                        </td>
                      );
                    })}

                    <td className="p-3.5 max-w-[200px]" title={record.notes}>
                      {record.notes && record.notes.trim() ? (
                        <span className="inline-block bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-1 rounded-lg text-xs font-semibold truncate max-w-full shadow-2xs">
                          📝 {record.notes}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
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
                    colSpan={isCustomer ? 14 : 18}
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
