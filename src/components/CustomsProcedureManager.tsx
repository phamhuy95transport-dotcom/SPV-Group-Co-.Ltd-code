import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Lock,
  Edit2,
  Trash2,
  Copy,
  FileSpreadsheet,
  Calendar,
  User,
  Building2,
  Award,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Check,
  X,
  LogIn,
  RefreshCw,
  Tag,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import {
  CustomsDeclarationRecord,
  CustomerItem,
  UserAccount,
  KPIRateItem,
  CustomsDeclarationType,
  formatDateVN,
  CatalogSubTab,
  calculateCustomsKPI
} from '../types';

interface CustomsProcedureManagerProps {
  declarations: CustomsDeclarationRecord[];
  customers: CustomerItem[];
  users: UserAccount[];
  kpiRates: KPIRateItem[];
  currentUser: UserAccount | null;
  totalPaidAmount?: number;
  onOpenLoginModal?: () => void;
  onSaveDeclaration: (record: CustomsDeclarationRecord) => void;
  onDeleteDeclaration: (id: string, name: string) => void;
  onToggleApproval: (id: string, currentApprovedStatus: boolean) => void;
  onToggleCompleted: (id: string, currentCompletedStatus: boolean) => void;
  onToggleDamage?: (id: string, currentHasDamageStatus: boolean) => void;
  onSaveCatalogItem?: (subTab: CatalogSubTab, itemData: any) => Promise<void>;
}

const DECLARATION_TYPES: CustomsDeclarationType[] = [
  'Xuất khẩu',
  'Nhập khẩu',
  'XKTC',
  'NKTC',
  'XNKTC'
];

const RATIO_OPTIONS = [
  { label: '0 (Không chuyển hỗ trợ - Hưởng 100%)', value: 0, text: '0' },
  { label: '1/3 (Chuyển hỗ trợ 1/3)', value: 1 / 3, text: '1/3' },
  { label: '1/2 (Chuyển hỗ trợ 1/2)', value: 0.5, text: '1/2' },
  { label: '2/3 (Chuyển hỗ trợ 2/3)', value: 2 / 3, text: '2/3' },
  { label: '1 (Chuyển hỗ trợ 100%)', value: 1, text: '1' }
];

export const CustomsProcedureManager: React.FC<CustomsProcedureManagerProps> = ({
  declarations,
  customers,
  users,
  kpiRates,
  currentUser,
  totalPaidAmount = 0,
  onOpenLoginModal,
  onSaveDeclaration,
  onDeleteDeclaration,
  onToggleApproval,
  onToggleCompleted,
  onToggleDamage,
  onSaveCatalogItem
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'done' | 'pending'>('all');
  const [approvedFilter, setApprovedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [damageFilter, setDamageFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
    const map = new Map<string, { id: string; name: string; role?: string }>();
    users.forEach(u => {
      if (u.name?.trim()) map.set(u.id, { id: u.id, name: u.name.trim(), role: u.role });
    });
    declarations.forEach(d => {
      const name = d.support_transfer?.staff_name?.trim();
      const id = d.support_transfer?.staff_id;
      if (id && name && !map.has(id)) {
        map.set(id, { id, name, role: 'employee' });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [users, declarations]);

  // Inline note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState<string>('');

  // Inline Completed Date editing state (Requirement 1)
  const [editingCompletedDateId, setEditingCompletedDateId] = useState<string | null>(null);
  const [editingCompletedDateValue, setEditingCompletedDateValue] = useState<string>('');

  // Inline Approved Date editing state (Requirement 4)
  const [editingApprovedDateId, setEditingApprovedDateId] = useState<string | null>(null);
  const [editingApprovedDateValue, setEditingApprovedDateValue] = useState<string>('');

  // Inline Extra Bonus editing state (Requirement 3)
  const [editingExtraBonusId, setEditingExtraBonusId] = useState<string | null>(null);
  const [editingExtraBonusValue, setEditingExtraBonusValue] = useState<number>(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'duplicate'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    execution_date: string;
    completed_date: string;
    approved_date: string;
    declaration_number: string;
    type: CustomsDeclarationType;
    customer: string;
    cont_quantity: number;
    ratio_label: string;
    staff_id: string;
    completed: boolean;
    extra_bonus: number;
    approved: boolean;
    has_damage: boolean;
    notes: string;
  }>({
    execution_date: new Date().toISOString().split('T')[0],
    completed_date: new Date().toISOString().split('T')[0],
    approved_date: new Date().toISOString().split('T')[0],
    declaration_number: '',
    type: 'Xuất khẩu',
    customer: '',
    cont_quantity: 1,
    ratio_label: '0',
    staff_id: currentUser?.id || '',
    completed: true,
    extra_bonus: 0,
    approved: false,
    has_damage: false,
    notes: ''
  });

  // State for pagination (Requirement 2: show 20 rows by default with scrolling)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Calculate KPI Amount helper
  const calculateKpiAmount = (
    type: CustomsDeclarationType,
    ratioLabel: string,
    contQuantity: number,
    isCompleted: boolean,
    extraBonus: number = 0
  ): number => {
    return calculateCustomsKPI(
      {
        type,
        support_transfer: { ratio_label: ratioLabel },
        cont_quantity: contQuantity,
        completed: isCompleted,
        extra_bonus: extraBonus
      },
      kpiRates
    );
  };

  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setModalMode('add');
    setEditingId(null);
    setFormData({
      execution_date: today,
      completed_date: today,
      approved_date: today,
      declaration_number: '',
      type: 'Xuất khẩu',
      customer: customers[0]?.customer_name || '',
      cont_quantity: 1,
      ratio_label: '0',
      staff_id: currentUser?.id || users[0]?.id || '',
      completed: true,
      extra_bonus: 0,
      approved: false,
      has_damage: false,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CustomsDeclarationRecord) => {
    if (item.approved && !isAdmin) {
      alert('Tờ khai đã được Duyệt! Chỉ Quản trị viên mới có thể sửa.');
      return;
    }
    setModalMode('edit');
    setEditingId(item.id);
    setFormData({
      execution_date: item.execution_date,
      completed_date: item.completed_date || item.execution_date,
      approved_date: item.approved_date || item.completed_date || item.execution_date,
      declaration_number: item.declaration_number,
      type: item.type,
      customer: item.customer,
      cont_quantity: item.cont_quantity || 1,
      ratio_label: item.support_transfer?.ratio_label || '1',
      staff_id: item.support_transfer?.staff_id || currentUser?.id || '',
      completed: item.completed,
      extra_bonus: item.extra_bonus || 0,
      approved: item.approved,
      has_damage: item.has_damage || false,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDuplicateDeclaration = (item: CustomsDeclarationRecord) => {
    const today = new Date().toISOString().split('T')[0];
    setModalMode('duplicate');
    setEditingId(null);
    setFormData({
      execution_date: item.execution_date || today,
      completed_date: item.completed_date || item.execution_date || today,
      approved_date: today,
      declaration_number: item.declaration_number ? `${item.declaration_number} (Bản sao)` : '',
      type: item.type,
      customer: item.customer,
      cont_quantity: item.cont_quantity || 1,
      ratio_label: item.support_transfer?.ratio_label || '1',
      staff_id: item.support_transfer?.staff_id || currentUser?.id || '',
      completed: item.completed ?? true,
      extra_bonus: item.extra_bonus || 0,
      approved: false, // Bản sao mới tạo luôn ở trạng thái chưa duyệt
      has_damage: false,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.declaration_number.trim()) {
      alert('Vui lòng nhập Số tờ khai!');
      return;
    }

    const ratioObj = RATIO_OPTIONS.find(r => r.text === formData.ratio_label);
    const numRatio = ratioObj ? ratioObj.value : 1;
    const staffObj = users.find(u => u.id === formData.staff_id);
    const qty = formData.cont_quantity > 0 ? formData.cont_quantity : 1;

    const calculatedKpi = calculateKpiAmount(
      formData.type,
      formData.ratio_label,
      qty,
      formData.completed,
      formData.extra_bonus
    );

    const isApprovedState = isAdmin ? formData.approved : (editingId ? declarations.find(d => d.id === editingId)?.approved || false : false);

    const recordToSave: any = {
      id: editingId || `cd_${Date.now()}`,
      execution_date: formData.execution_date,
      completed_date: formData.completed ? (formData.completed_date || formData.execution_date) : null,
      approved_date: isApprovedState ? (formData.approved_date || formData.completed_date || formData.execution_date) : null,
      declaration_number: formData.declaration_number.trim(),
      type: formData.type,
      customer: formData.customer,
      cont_quantity: qty,
      support_transfer: {
        ratio: numRatio,
        ratio_label: formData.ratio_label,
        staff_id: formData.staff_id,
        staff_name: staffObj ? staffObj.name : currentUser?.name || 'Nhân viên'
      },
      completed: formData.completed,
      kpi_amount: calculatedKpi,
      extra_bonus: Number(formData.extra_bonus) || 0,
      approved: isApprovedState,
      has_damage: isAdmin ? formData.has_damage : (editingId ? declarations.find(d => d.id === editingId)?.has_damage || false : false),
      notes: isAdmin ? formData.notes : (editingId ? declarations.find(d => d.id === editingId)?.notes || '' : ''),
      created_by: editingId
        ? declarations.find(d => d.id === editingId)?.created_by || {
            uid: currentUser?.id || 'guest',
            email: currentUser?.email || 'guest@spv.biz.vn',
            name: currentUser?.name || 'Khách',
            role: currentUser?.role || 'employee'
          }
        : {
            uid: currentUser?.id || 'guest',
            email: currentUser?.email || 'guest@spv.biz.vn',
            name: currentUser?.name || 'Khách',
            role: currentUser?.role || 'employee'
          },
      createdAt: editingId
        ? declarations.find(d => d.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString()
    };

    // Remove null values so we don't accidentally send nulls if not needed, but Firebase allows nulls. Actually, let's just make a shallow copy omitting undefined fields.
    const cleanRecord = Object.fromEntries(Object.entries(recordToSave).filter(([_, v]) => v !== undefined));

    onSaveDeclaration(cleanRecord as unknown as CustomsDeclarationRecord);
    setIsModalOpen(false);
  };

  // Filter declarations based on User Role (Requirement 9: Customer only sees their customer data)
  const userDeclarations = useMemo(() => {
    if (currentUser?.role === 'customer') {
      if (currentUser.customer_name) {
        return declarations.filter(item => item.customer === currentUser.customer_name);
      } else if (currentUser.name) {
        const custName = currentUser.name.toLowerCase();
        return declarations.filter(item => (item.customer || '').toLowerCase().includes(custName));
      }
    }
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
    const result = userDeclarations.filter(item => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const numMatch = (item.declaration_number || '').toLowerCase().includes(term);
        const custMatch = (item.customer || '').toLowerCase().includes(term);
        const staffMatch = (item.support_transfer?.staff_name || '').toLowerCase().includes(term);
        const notesMatch = (item.notes || '').toLowerCase().includes(term);
        const creatorMatch = (item.created_by?.name || '').toLowerCase().includes(term);
        if (!numMatch && !custMatch && !staffMatch && !notesMatch && !creatorMatch) return false;
      }

      // Customer Filter (case-insensitive partial matching)
      if (selectedCustomer.trim()) {
        const custTerm = selectedCustomer.trim().toLowerCase();
        const itemCust = (item.customer || '').toLowerCase();
        if (!itemCust.includes(custTerm)) return false;
      }

      // Type Filter (case-insensitive partial matching)
      if (selectedType.trim()) {
        const typeTerm = selectedType.trim().toLowerCase();
        const itemType = (item.type || '').toLowerCase();
        if (!itemType.includes(typeTerm)) return false;
      }

      // Completed Filter
      if (completedFilter === 'done' && !item.completed) return false;
      if (completedFilter === 'pending' && item.completed) return false;

      // Approved Filter
      if (approvedFilter === 'yes' && !item.approved) return false;
      if (approvedFilter === 'no' && item.approved) return false;

      // Damage Filter
      if (damageFilter === 'yes' && !item.has_damage) return false;
      if (damageFilter === 'no' && item.has_damage) return false;

      // Date Range Filter
      if (fromDate && item.execution_date < fromDate) return false;
      if (toDate && item.execution_date > toDate) return false;

      return true;
    });

    // Requirement 2: Sắp xếp theo thứ tự ngày gần nhất (execution_date DESC, createdAt DESC)
    return result.sort((a, b) => {
      const dateA = a.execution_date || '';
      const dateB = b.execution_date || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [userDeclarations, searchTerm, selectedCustomer, selectedType, completedFilter, approvedFilter, damageFilter, fromDate, toDate]);

  // Reset to first page whenever search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCustomer, selectedType, completedFilter, approvedFilter, damageFilter, fromDate, toDate]);

  const isFiltering = Boolean(
    searchTerm ||
    selectedCustomer ||
    selectedType ||
    completedFilter !== 'all' ||
    approvedFilter !== 'all' ||
    damageFilter !== 'all' ||
    fromDate ||
    toDate
  );

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('');
    setSelectedType('');
    setCompletedFilter('all');
    setApprovedFilter('all');
    setDamageFilter('all');
    setFromDate('');
    setToDate('');
  };

  // Total Summary
  const totalCount = filteredDeclarations.length;
  const completedCount = filteredDeclarations.filter(d => d.completed).length;
  const approvedCount = filteredDeclarations.filter(d => d.approved).length;

  // Requirement 4: Parity in KPI calculation
  // Tổng thưởng KPI đã được duyệt (Approved = true)
  const approvedKpiAmount = filteredDeclarations
    .filter(d => d.approved)
    .reduce((sum, d) => sum + calculateCustomsKPI(d, kpiRates), 0);

  // Tổng thưởng KPI chưa được duyệt (Hoàn thành "chưa" hoặc chưa được duyệt)
  const unapprovedKpiAmount = filteredDeclarations
    .filter(d => !d.approved)
    .reduce((sum, d) => sum + calculateCustomsKPI({ ...d, completed: true }, kpiRates), 0);

  // Formatted preview KPI
  const formKpiPreview = calculateKpiAmount(formData.type, formData.ratio_label, formData.cont_quantity, formData.completed);

  // Requirement 2: Pagination & 20 rows limit
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize) || 1;
  const paginatedDeclarations = useMemo(() => {
    if (pageSize === -1) return filteredDeclarations;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDeclarations.slice(startIndex, startIndex + pageSize);
  }, [filteredDeclarations, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tổng tờ khai</span>
            <div className="text-xl font-bold text-slate-800">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Hoàn thành ("đã")</span>
            <div className="text-xl font-bold text-emerald-600">{completedCount} <span className="text-xs text-slate-400 font-normal">/ {totalCount}</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Đã duyệt ("có")</span>
            <div className="text-xl font-bold text-amber-600">{approvedCount} <span className="text-xs text-slate-400 font-normal">/ {totalCount}</span></div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wide">Tổng thưởng KPI đã được duyệt</span>
            <div className="text-xl font-bold text-emerald-300">{approvedKpiAmount.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900 to-slate-900 text-white p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-400/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wide">Tổng thưởng KPI đã thanh toán</span>
            <div className="text-xl font-bold text-amber-300">{totalPaidAmount.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>
      </div>

      {/* Control & Table for Logged-In Users / Lock Notice for Guests */}
      {currentUser ? (
        <>
          {/* Datalists for Table Filter Auto-suggestions */}
          <datalist id="cpm-filter-customer-list">
            {customerSuggestions.map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <datalist id="cpm-filter-type-list">
            {DECLARATION_TYPES.map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>

          {/* Control & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Bảng Thủ Tục Hải Quan</h2>
                  <p className="text-xs text-slate-500">Tính thưởng KPI & Theo dõi tiến độ tờ khai</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isFiltering && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đặt lại bộ lọc</span>
                  </button>
                )}

                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Tờ Khai Mới</span>
                </button>
              </div>
            </div>

            {/* Search & Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-2 border-t border-slate-100">
              {/* Ô tìm kiếm từ khóa tổng hợp */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Số tờ khai, KH, NV..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                    title="Xóa"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Ô nhập thông minh: Khách hàng */}
              <div className="relative">
                <input
                  type="text"
                  list="cpm-filter-customer-list"
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  placeholder="Tìm khách hàng..."
                  className="w-full pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
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

              {/* Ô nhập thông minh: Loại tờ khai */}
              <div className="relative">
                <input
                  type="text"
                  list="cpm-filter-type-list"
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  placeholder="Loại tờ khai (XK, NK...)"
                  className="w-full pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                />
                {selectedType && (
                  <button
                    type="button"
                    onClick={() => setSelectedType('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={completedFilter}
                  onChange={e => setCompletedFilter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                >
                  <option value="all">Hoàn thành: Tất cả</option>
                  <option value="done">Hoàn thành: Đã</option>
                  <option value="pending">Hoàn thành: Chưa</option>
                </select>
              </div>

              <div>
                <select
                  value={approvedFilter}
                  onChange={e => setApprovedFilter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                >
                  <option value="all">Duyệt: Tất cả</option>
                  <option value="yes">Duyệt: Có</option>
                  <option value="no">Duyệt: Chưa</option>
                </select>
              </div>

              <div>
                <select
                  value={damageFilter}
                  onChange={e => setDamageFilter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                >
                  <option value="all">Thiệt hại: Tất cả</option>
                  <option value="yes">Thiệt hại: Có</option>
                  <option value="no">Thiệt hại: Không</option>
                </select>
              </div>

              <div className="flex gap-1 items-center">
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl"
                  title="Từ ngày"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl"
                  title="Đến ngày"
                />
              </div>
            </div>

            {/* Quick Filter Chips */}
            {(customerSuggestions.length > 0 || DECLARATION_TYPES.length > 0) && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-semibold mr-1">Gợi ý nhanh:</span>
                {customerSuggestions.slice(0, 5).map(cust => (
                  <button
                    key={cust}
                    type="button"
                    onClick={() => setSelectedCustomer(selectedCustomer === cust ? '' : cust)}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      selectedCustomer === cust
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                    }`}
                  >
                    {cust}
                  </button>
                ))}
                {DECLARATION_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(selectedType === t ? '' : t)}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      selectedType === t
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

      {/* Main Table with 20-row scrolling & sticky header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[750px] relative custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white shadow-xs">
              <tr className="text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3 text-center w-12 border-r border-slate-700">STT</th>
                <th className="p-3 border-r border-slate-700">Ngày thực hiện</th>
                <th className="p-3 border-r border-slate-700">Số tờ khai</th>
                <th className="p-3 border-r border-slate-700">Loại</th>
                <th className="p-3 border-r border-slate-700">Khách hàng</th>
                <th className="p-3 text-center border-r border-slate-700">Số lượng cont/lô</th>
                <th className="p-3 border-r border-slate-700">Chuyển hỗ trợ</th>
                <th className="p-3 text-center border-r border-slate-700">Hoàn thành</th>
                <th className="p-3 text-right border-r border-slate-700">Thưởng khác</th>
                <th className="p-3 text-right border-r border-slate-700">Thành tiền KPI</th>
                <th className="p-3 text-center border-r border-slate-700">Phát sinh gây thiệt hại (Admin)</th>
                <th className="p-3 border-r border-slate-700">Ghi chú (Admin)</th>
                <th className="p-3 border-r border-slate-700">Người nhập liệu</th>
                <th className="p-3 text-center border-r border-slate-700">Duyệt (Admin)</th>
                <th className="p-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDeclarations.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-400">
                    Chưa có tờ khai hải quan nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedDeclarations.map((item, index) => {
                  const isRowLockedForUser = item.approved && !isAdmin;
                  const rowSTT = pageSize === -1 ? index + 1 : (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition ${
                        item.approved ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">
                        {rowSTT}
                      </td>

                      {/* Ngày thực hiện (Requirement 2: Formatted dd/mm/yyyy) */}
                      <td className="p-3 font-semibold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {formatDateVN(item.execution_date)}
                      </td>

                      {/* Số tờ khai */}
                      <td className="p-3 font-mono font-bold text-indigo-900 border-r border-slate-100 whitespace-nowrap">
                        {item.declaration_number}
                      </td>

                      {/* Loại */}
                      <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                          {item.type}
                        </span>
                      </td>

                      {/* Khách hàng */}
                      <td className="p-3 font-bold text-slate-800 border-r border-slate-100 max-w-[180px] truncate">
                        {item.customer || '—'}
                      </td>

                      {/* Số lượng cont/lô (Requirement 7) */}
                      <td className="p-3 text-center font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-xs">
                          {item.cont_quantity || 1}
                        </span>
                      </td>

                      {/* Chuyển hỗ trợ */}
                      <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold text-[11px]">
                            Tỷ lệ: {item.support_transfer?.ratio_label || '1'}
                          </span>
                          <span className="text-slate-600 text-[11px] truncate max-w-[120px]">
                            {item.support_transfer?.staff_name || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Hoàn thành & Ngày thực tế (Requirement 1) */}
                      <td className="p-3 text-center border-r border-slate-100 whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              if (isRowLockedForUser) {
                                alert('Tờ khai đã được Duyệt! Nhân viên không thể thay đổi.');
                                return;
                              }
                              onToggleCompleted(item.id, item.completed);
                            }}
                            disabled={isRowLockedForUser}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                              item.completed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                            } ${isRowLockedForUser ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                            title={item.completed ? 'Chuyển sang "chưa"' : 'Chuyển sang "đã"'}
                          >
                            {item.completed ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Đã</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                <span>Chưa</span>
                              </>
                            )}
                          </button>

                          {/* Requirement 1: If "đã", display small date below status button */}
                          {item.completed && (
                            <div className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
                              {editingCompletedDateId === item.id ? (
                                <input
                                  type="date"
                                  value={editingCompletedDateValue}
                                  onChange={e => setEditingCompletedDateValue(e.target.value)}
                                  onBlur={() => {
                                    if (editingCompletedDateValue) {
                                      onSaveDeclaration({ ...item, completed_date: editingCompletedDateValue });
                                    }
                                    setEditingCompletedDateId(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      if (editingCompletedDateValue) {
                                        onSaveDeclaration({ ...item, completed_date: editingCompletedDateValue });
                                      }
                                      setEditingCompletedDateId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingCompletedDateId(null);
                                    }
                                  }}
                                  className="px-1 py-0.5 text-[10px] border border-indigo-300 rounded focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={() => {
                                    if (isAdmin) {
                                      setEditingCompletedDateId(item.id);
                                      setEditingCompletedDateValue(item.completed_date || item.execution_date || new Date().toISOString().split('T')[0]);
                                    }
                                  }}
                                  className={isAdmin ? 'cursor-pointer hover:text-indigo-600 hover:underline flex items-center gap-0.5' : 'flex items-center gap-0.5'}
                                  title={isAdmin ? 'Nhấp để sửa ngày hoàn thành thực tế' : undefined}
                                >
                                  <Calendar className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{formatDateVN(item.completed_date || item.execution_date)}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Thưởng khác (Requirement 3) */}
                      <td className="p-3 text-right border-r border-slate-100 whitespace-nowrap">
                        {editingExtraBonusId === item.id ? (
                          <input
                            type="number"
                            value={editingExtraBonusValue}
                            onChange={e => setEditingExtraBonusValue(Number(e.target.value) || 0)}
                            onBlur={() => {
                              const newBonus = editingExtraBonusValue;
                              const newKpi = calculateKpiAmount(item.type, item.support_transfer?.ratio_label || '1', item.cont_quantity || 1, item.completed, newBonus);
                              onSaveDeclaration({ ...item, extra_bonus: newBonus, kpi_amount: newKpi });
                              setEditingExtraBonusId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const newBonus = editingExtraBonusValue;
                                const newKpi = calculateKpiAmount(item.type, item.support_transfer?.ratio_label || '1', item.cont_quantity || 1, item.completed, newBonus);
                                onSaveDeclaration({ ...item, extra_bonus: newBonus, kpi_amount: newKpi });
                                setEditingExtraBonusId(null);
                              } else if (e.key === 'Escape') {
                                setEditingExtraBonusId(null);
                              }
                            }}
                            className="w-24 px-1.5 py-0.5 text-xs text-right border border-indigo-400 rounded focus:outline-none font-mono font-bold"
                            autoFocus
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (!isRowLockedForUser) {
                                setEditingExtraBonusId(item.id);
                                setEditingExtraBonusValue(item.extra_bonus || 0);
                              }
                            }}
                            className={`font-mono font-semibold ${item.extra_bonus ? 'text-indigo-600 font-bold' : 'text-slate-400'} ${!isRowLockedForUser ? 'cursor-pointer hover:underline hover:text-indigo-800' : ''}`}
                            title={!isRowLockedForUser ? 'Nhấp để chỉnh sửa thưởng khác' : undefined}
                          >
                            {(item.extra_bonus || 0).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </td>

                      {/* Thành tiền KPI */}
                      <td className="p-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                        {(() => {
                          const kpiVal = calculateCustomsKPI(item, kpiRates);
                          if (item.completed || item.approved) {
                            return (
                              <span className="text-emerald-700 font-bold">
                                {kpiVal.toLocaleString('vi-VN')} đ
                              </span>
                            );
                          }
                          return <span className="text-slate-400 font-normal">0 đ</span>;
                        })()}
                      </td>

                      {/* Phát sinh gây thiệt hại (Admin toggle) */}
                      <td className="p-3 text-center border-r border-slate-100 whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (!isAdmin) {
                              alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền chuyển trạng thái "Phát sinh gây thiệt hại"!');
                              return;
                            }
                            if (onToggleDamage) {
                              onToggleDamage(item.id, !!item.has_damage);
                            } else {
                              onSaveDeclaration({ ...item, has_damage: !item.has_damage });
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                            item.has_damage
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          } ${!isAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                          title={!isAdmin ? 'Chỉ Admin được thao tác' : item.has_damage ? 'Chuyển sang "Không"' : 'Chuyển sang "Có"'}
                        >
                          {item.has_damage ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Có</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Không</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Ghi chú (Admin nhập content) */}
                      <td className="p-3 border-r border-slate-100 min-w-[150px] max-w-[220px]">
                        {editingNoteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingNoteValue}
                              onChange={e => setEditingNoteValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  onSaveDeclaration({ ...item, notes: editingNoteValue });
                                  setEditingNoteId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingNoteId(null);
                                }
                              }}
                              className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                onSaveDeclaration({ ...item, notes: editingNoteValue });
                                setEditingNoteId(null);
                              }}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 shrink-0"
                              title="Lưu ghi chú"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 shrink-0"
                              title="Hủy"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1 group">
                            <span className="text-slate-700 text-xs truncate">
                              {item.notes || <span className="text-slate-400 italic">Chưa có ghi chú</span>}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingNoteId(item.id);
                                  setEditingNoteValue(item.notes || '');
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition opacity-0 group-hover:opacity-100 shrink-0"
                                title="Sửa ghi chú (Admin)"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Người nhập liệu */}
                      <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded text-[11px] font-semibold">
                            {item.created_by?.name || 'Hệ thống'}
                          </span>
                          {item.created_by?.role === 'admin' && (
                            <span className="px-1.5 py-0.2 bg-orange-100 text-orange-800 text-[10px] font-bold rounded">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Duyệt (Admin only) (Requirement 4) */}
                      <td className="p-3 text-center border-r border-slate-100 whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              if (!isAdmin) {
                                alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền Duyệt tờ khai!');
                                return;
                              }
                              const newApproved = !item.approved;
                              const today = new Date().toISOString().split('T')[0];
                              const newKpi = calculateCustomsKPI({ ...item, approved: newApproved }, kpiRates);
                              onSaveDeclaration({
                                ...item,
                                approved: newApproved,
                                approved_date: newApproved ? (item.approved_date || today) : undefined,
                                kpi_amount: newKpi
                              });
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                              item.approved
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                            } ${!isAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                            title={
                              !isAdmin
                                ? 'Chỉ Quản trị viên mới được thao tác Duyệt'
                                : item.approved
                                ? 'Bỏ duyệt'
                                : 'Duyệt tờ khai này'
                            }
                          >
                            {item.approved ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>Có</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 text-slate-400" />
                                <span>Chưa</span>
                              </>
                            )}
                          </button>

                          {/* Requirement 4: Show date underneath only when approved ("có") */}
                          {item.approved && (
                            <div className="text-[10px] text-amber-800 font-medium flex items-center justify-center gap-1 mt-0.5">
                              {editingApprovedDateId === item.id ? (
                                <input
                                  type="date"
                                  value={editingApprovedDateValue}
                                  onChange={e => setEditingApprovedDateValue(e.target.value)}
                                  onBlur={() => {
                                    if (editingApprovedDateValue) {
                                      onSaveDeclaration({ ...item, approved_date: editingApprovedDateValue });
                                    }
                                    setEditingApprovedDateId(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      if (editingApprovedDateValue) {
                                        onSaveDeclaration({ ...item, approved_date: editingApprovedDateValue });
                                      }
                                      setEditingApprovedDateId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingApprovedDateId(null);
                                    }
                                  }}
                                  className="px-1 py-0.5 text-[10px] border border-amber-400 rounded focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={() => {
                                    if (isAdmin) {
                                      setEditingApprovedDateId(item.id);
                                      setEditingApprovedDateValue(item.approved_date || item.completed_date || item.execution_date || new Date().toISOString().split('T')[0]);
                                    }
                                  }}
                                  className={isAdmin ? 'cursor-pointer hover:text-amber-900 hover:underline flex items-center gap-0.5' : 'flex items-center gap-0.5'}
                                  title={isAdmin ? 'Nhấp để sửa ngày duyệt thực tế' : undefined}
                                >
                                  <Calendar className="w-2.5 h-2.5 text-amber-600" />
                                  <span>{formatDateVN(item.approved_date || item.completed_date || item.execution_date)}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateDeclaration(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Nhân bản tờ khai (Tạo bản sao mới)"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {isRowLockedForUser ? (
                            <span
                              className="p-1.5 text-slate-300 opacity-50 cursor-not-allowed inline-flex"
                              title="Tờ khai đã được duyệt. Không thể sửa/xóa."
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Sửa tờ khai"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteDeclaration(item.id, `Tờ khai ${item.declaration_number}`)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Xóa tờ khai"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (Requirement 2: Show 20 rows by default, scrollable with pagination) */}
        {totalCount > 0 && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị{' '}
                <strong className="text-slate-900 font-bold">
                  {pageSize === -1 ? 1 : Math.min((currentPage - 1) * pageSize + 1, totalCount)}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-900 font-bold">
                  {pageSize === -1 ? totalCount : Math.min(currentPage * pageSize, totalCount)}
                </strong>{' '}
                trên tổng số <strong className="text-indigo-600 font-bold">{totalCount}</strong> tờ khai
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={20}>20 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                  <option value={-1}>Tất cả ({totalCount})</option>
                </select>
              </div>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang đầu"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang sau"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang cuối"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chế Độ Xem Báo Cáo Chung</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bạn chưa đăng nhập. Bạn đang xem tổng hợp báo cáo chung về thủ tục hải quan. Vui lòng đăng nhập tài khoản để xem chi tiết Bảng thủ tục hải quan và thực hiện thao tác.
          </p>
          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition inline-flex items-center gap-2 mt-1"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập Ngay</span>
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                {modalMode === 'duplicate' ? (
                  <Copy className="w-4 h-4 text-emerald-400" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                )}
                <span>
                  {modalMode === 'edit'
                    ? 'Cập Nhật Tờ Khai Hải Quan'
                    : modalMode === 'duplicate'
                    ? 'Nhân Bản Tờ Khai Hải Quan (Tạo bản sao mới)'
                    : 'Thêm Tờ Khai Hải Quan Mới'}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ngày thực hiện */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày thực hiện *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.execution_date}
                    onChange={e => setFormData({ ...formData, execution_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* Số tờ khai */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số tờ khai *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.declaration_number}
                    onChange={e => setFormData({ ...formData, declaration_number: e.target.value })}
                    placeholder="VD: 105289341020"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Datalists for Modal Inputs */}
              <datalist id="customs-modal-type-list">
                {DECLARATION_TYPES.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              <datalist id="customs-modal-staff-list">
                {staffSuggestions.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.role === 'admin' ? 'Admin' : 'Nhân viên'})
                  </option>
                ))}
              </datalist>

              <datalist id="customs-modal-ratio-list">
                {RATIO_OPTIONS.map(r => (
                  <option key={r.text} value={r.text}>
                    {r.label}
                  </option>
                ))}
              </datalist>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Loại tờ khai */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Loại tờ khai *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="customs-modal-type-list"
                      required
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as CustomsDeclarationType })}
                      placeholder="Chọn hoặc nhập loại tờ khai..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {DECLARATION_TYPES.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                          formData.type === t
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khách hàng */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Khách hàng *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="customs-customer-list"
                      required
                      value={formData.customer}
                      onChange={e => setFormData({ ...formData, customer: e.target.value })}
                      placeholder="Nhập tên khách hàng (gợi ý tự động)..."
                      className="w-full pl-3 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    />
                    {formData.customer && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, customer: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <datalist id="customs-customer-list">
                    {customerSuggestions.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {customerSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {customerSuggestions.slice(0, 3).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData({ ...formData, customer: c })}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition truncate max-w-[120px] ${
                            formData.customer === c
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                          title={c}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.customer?.trim() && !customers.some(c => c.customer_name.toLowerCase() === formData.customer.trim().toLowerCase()) && onSaveCatalogItem && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onSaveCatalogItem('customer', { customer_name: formData.customer.trim(), tax_code: '' });
                      }}
                      className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg transition"
                    >
                      <Plus className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>Thêm "{formData.customer}" vào Danh mục Khách hàng</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Số lượng cont/lô */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số lượng cont/lô *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.cont_quantity}
                    onChange={e => setFormData({ ...formData, cont_quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-950"
                  />
                </div>

                {/* Thưởng khác (Requirement 3) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thưởng khác (VND)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.extra_bonus}
                    onChange={e => setFormData({ ...formData, extra_bonus: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-emerald-800"
                  />
                </div>
              </div>

              {/* Chuyển hỗ trợ Section */}
              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-3">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Thông tin Chuyển hỗ trợ:</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tỷ lệ chuyển hỗ trợ */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Tỷ lệ chuyển hỗ trợ (tỷ lệ khấu trừ)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="customs-modal-ratio-list"
                        value={formData.ratio_label}
                        onChange={e => setFormData({ ...formData, ratio_label: e.target.value })}
                        placeholder="VD: 0, 1/3, 1/2, 2/3, 1"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none font-bold text-indigo-800"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {RATIO_OPTIONS.map(r => (
                        <button
                          key={r.text}
                          type="button"
                          onClick={() => setFormData({ ...formData, ratio_label: r.text })}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition font-bold ${
                            formData.ratio_label === r.text
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                          }`}
                        >
                          {r.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nhân viên thực hiện/hỗ trợ */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Nhân viên thực hiện/hỗ trợ
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="customs-modal-staff-list"
                        value={
                          staffSuggestions.find(s => s.id === formData.staff_id)?.name ||
                          users.find(u => u.id === formData.staff_id)?.name ||
                          formData.staff_id
                        }
                        onChange={e => {
                          const val = e.target.value;
                          const found = staffSuggestions.find(s => s.name.toLowerCase() === val.toLowerCase() || s.id === val) ||
                            users.find(u => u.name.toLowerCase() === val.toLowerCase() || u.id === val);
                          if (found) {
                            setFormData({ ...formData, staff_id: found.id });
                          } else {
                            setFormData({ ...formData, staff_id: val });
                          }
                        }}
                        placeholder="Gõ tên hoặc chọn nhân viên..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none font-medium text-slate-800"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {staffSuggestions.slice(0, 3).map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, staff_id: u.id })}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition truncate max-w-[110px] ${
                            formData.staff_id === u.id
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                              : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100'
                          }`}
                          title={u.name}
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thiệt hại & Ghi chú (Admin section) */}
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Thiệt hại & Ghi chú quản trị (Chỉ Admin):</span>
                  </span>
                  {!isAdmin && (
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium border border-amber-200">
                      Chỉ Admin được thao tác
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phát sinh gây thiệt hại
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={formData.has_damage ? 'true' : 'false'}
                      onChange={e => setFormData({ ...formData, has_damage: e.target.value === 'true' })}
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none font-bold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="false">Không (Không phát sinh thiệt hại)</option>
                      <option value="true">Có (Phát sinh thiệt hại)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Ghi chú
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={isAdmin ? "Nhập ghi chú cho tờ khai..." : "(Chỉ Admin mới có quyền nhập)"}
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none font-medium text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Status Toggles & KPI Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Hoàn thành Checkbox & Ngày thực tế */}
                <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="completed_check"
                      checked={formData.completed}
                      onChange={e => setFormData({ ...formData, completed: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="completed_check" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Trạng thái Hoàn thành ("đã")
                    </label>
                  </div>
                  {formData.completed && (
                    <div className="pl-6 pt-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Ngày thực tế hoàn thành:
                      </label>
                      <input
                        type="date"
                        value={formData.completed_date}
                        onChange={e => setFormData({ ...formData, completed_date: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Duyệt (Admin only) */}
                <div className="flex items-center gap-2 p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    id="approved_check"
                    disabled={!isAdmin}
                    checked={formData.approved}
                    onChange={e => setFormData({ ...formData, approved: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 disabled:opacity-50"
                  />
                  <label htmlFor="approved_check" className={`text-xs font-bold text-amber-900 ${!isAdmin ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}>
                    Duyệt tờ khai ("có") {!isAdmin && '(Chỉ Admin)'}
                  </label>
                </div>
              </div>

              {/* Auto calculated KPI Preview Banner */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">
                  Tự động tính Thưởng KPI:
                </span>
                <span className="text-sm font-mono font-bold text-emerald-700">
                  {formKpiPreview.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  {editingId ? 'Cập Nhật' : 'Lưu Tờ Khai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
