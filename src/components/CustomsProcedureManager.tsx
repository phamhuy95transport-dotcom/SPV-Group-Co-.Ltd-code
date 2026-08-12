import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Lock,
  Edit2,
  Trash2,
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
  LogIn
} from 'lucide-react';
import {
  CustomsDeclarationRecord,
  CustomerItem,
  UserAccount,
  KPIRateItem,
  CustomsDeclarationType,
  formatDateVN,
  CatalogSubTab
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
  { label: '1 (100%)', value: 1, text: '1' },
  { label: '2/3 (66.7%)', value: 2 / 3, text: '2/3' },
  { label: '1/2 (50%)', value: 0.5, text: '1/2' },
  { label: '1/3 (33.3%)', value: 1 / 3, text: '1/3' },
  { label: '0 (0%)', value: 0, text: '0' }
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
  const isAdmin = currentUser?.role === 'admin';

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'done' | 'pending'>('all');
  const [approvedFilter, setApprovedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [damageFilter, setDamageFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
    ratio_label: '1',
    staff_id: currentUser?.id || '',
    completed: true,
    extra_bonus: 0,
    approved: false,
    has_damage: false,
    notes: ''
  });

  // Calculate KPI Amount helper (Requirement 4: (Định mức * số lượng) - (Định mức * tỷ lệ [làm tròn 3 chữ số]) + thưởng khác nếu hoàn thành, chưa hoàn thành = 0)
  const calculateKpiAmount = (
    type: CustomsDeclarationType,
    ratioLabel: string,
    contQuantity: number,
    isCompleted: boolean,
    extraBonus: number = 0
  ): number => {
    if (!isCompleted) return 0;
    const rateItem = kpiRates.find(r => r.type_name === type);
    const baseReward = rateItem ? rateItem.reward_amount : (type === 'Xuất khẩu' || type === 'Nhập khẩu' ? 30000 : 25000);
    const ratioObj = RATIO_OPTIONS.find(r => r.text === ratioLabel);
    const numericRatio = ratioObj ? ratioObj.value : 1;
    const qty = contQuantity > 0 ? contQuantity : 1;

    // Formula: (Định mức * số lượng) - (Định mức * tỷ lệ [làm tròn 3 chữ số]) + thưởng khác
    const roundedRatio = Math.round(numericRatio * 1000) / 1000;
    const fullAmount = baseReward * qty;
    const supportDeduction = baseReward * roundedRatio;
    const total = fullAmount - supportDeduction + (Number(extraBonus) || 0);
    return Math.max(0, Math.round(total));
  };

  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingId(null);
    setFormData({
      execution_date: today,
      completed_date: today,
      approved_date: today,
      declaration_number: '',
      type: 'Xuất khẩu',
      customer: customers[0]?.customer_name || '',
      cont_quantity: 1,
      ratio_label: '1',
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

    onSaveDeclaration(cleanRecord as CustomsDeclarationRecord);
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
    return userDeclarations.filter(item => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const numMatch = item.declaration_number.toLowerCase().includes(term);
        const custMatch = item.customer.toLowerCase().includes(term);
        const staffMatch = (item.support_transfer?.staff_name || '').toLowerCase().includes(term);
        const notesMatch = (item.notes || '').toLowerCase().includes(term);
        const creatorMatch = (item.created_by?.name || '').toLowerCase().includes(term);
        if (!numMatch && !custMatch && !staffMatch && !notesMatch && !creatorMatch) return false;
      }

      // Customer Filter
      if (selectedCustomer && item.customer !== selectedCustomer) return false;

      // Type Filter
      if (selectedType && item.type !== selectedType) return false;

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
  }, [userDeclarations, searchTerm, selectedCustomer, selectedType, completedFilter, approvedFilter, damageFilter, fromDate, toDate]);

  // Helper to calculate raw/potential KPI for a declaration (= Rate * Quantity * Ratio)
  const getRawKpiAmount = (d: CustomsDeclarationRecord) => {
    const rateItem = kpiRates.find(r => r.type_name === d.type);
    const baseReward = rateItem ? rateItem.reward_amount : (d.type === 'Xuất khẩu' || d.type === 'Nhập khẩu' ? 30000 : 25000);
    const ratioObj = RATIO_OPTIONS.find(r => r.text === (d.support_transfer?.ratio_label || '1'));
    const numericRatio = ratioObj ? ratioObj.value : 1;
    const qty = (d.cont_quantity && d.cont_quantity > 0) ? d.cont_quantity : 1;
    return Math.round(baseReward * qty * numericRatio);
  };

  // Total Summary
  const totalCount = filteredDeclarations.length;
  const completedCount = filteredDeclarations.filter(d => d.completed).length;
  const approvedCount = filteredDeclarations.filter(d => d.approved).length;

  // Tổng thưởng KPI đã được duyệt (Approved = true)
  const approvedKpiAmount = filteredDeclarations
    .filter(d => d.approved)
    .reduce((sum, d) => sum + (d.kpi_amount || getRawKpiAmount(d)), 0);

  // Tổng thưởng KPI chưa được duyệt (Hoàn thành "chưa" hoặc chưa được duyệt = Định mức KPI * tỷ lệ)
  const unapprovedKpiAmount = filteredDeclarations
    .filter(d => !d.approved)
    .reduce((sum, d) => sum + getRawKpiAmount(d), 0);

  // Formatted preview KPI
  const formKpiPreview = calculateKpiAmount(formData.type, formData.ratio_label, formData.cont_quantity, formData.completed);

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
          {/* Control & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Bảng Thủ Tục Hải Quan</h2>
              <p className="text-xs text-slate-500">Tính thưởng KPI</p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tờ Khai Mới</span>
          </button>
        </div>

        {/* Search & Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Số tờ khai, KH, nhân viên..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
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
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
            >
              <option value="">-- Tất cả Loại tờ khai --</option>
              {DECLARATION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={completedFilter}
              onChange={e => setCompletedFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
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
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
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
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
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
              className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
              title="Từ ngày"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
              title="Đến ngày"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
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
                  <td colSpan={14} className="p-8 text-center text-slate-400">
                    Chưa có tờ khai hải quan nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredDeclarations.map((item, index) => {
                  const isRowLockedForUser = item.approved && !isAdmin;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition ${
                        item.approved ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">
                        {index + 1}
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
                        {item.completed ? (
                          <span className="text-emerald-700">
                            {(item.kpi_amount || 0).toLocaleString('vi-VN')} đ
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">0 đ</span>
                        )}
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
                              onSaveDeclaration({
                                ...item,
                                approved: newApproved,
                                approved_date: newApproved ? (item.approved_date || today) : undefined
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
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>{editingId ? 'Cập Nhật Tờ Khai Hải Quan' : 'Thêm Tờ Khai Hải Quan Mới'}</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Loại */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loại tờ khai *
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as CustomsDeclarationType })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  >
                    {DECLARATION_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Khách hàng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khách hàng *
                  </label>
                  <input
                    type="text"
                    list="customs-customer-list"
                    required
                    value={formData.customer}
                    onChange={e => setFormData({ ...formData, customer: e.target.value })}
                    placeholder="Nhập tên khách hàng (gợi ý từ Danh mục)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  />
                  <datalist id="customs-customer-list">
                    {customers.map(c => (
                      <option key={c.id} value={c.customer_name} />
                    ))}
                  </datalist>
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
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tỷ lệ nhận thưởng
                    </label>
                    <select
                      value={formData.ratio_label}
                      onChange={e => setFormData({ ...formData, ratio_label: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none font-bold text-indigo-800"
                    >
                      {RATIO_OPTIONS.map(r => (
                        <option key={r.text} value={r.text}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nhân viên thực hiện/hỗ trợ
                    </label>
                    <select
                      value={formData.staff_id}
                      onChange={e => setFormData({ ...formData, staff_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none font-medium text-slate-800"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'admin' ? 'Admin' : 'Nhân viên'})
                        </option>
                      ))}
                    </select>
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
