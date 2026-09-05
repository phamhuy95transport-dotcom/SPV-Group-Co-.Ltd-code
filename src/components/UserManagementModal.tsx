import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Clock,
  Trash2,
  ShieldAlert,
  Lock,
  Settings2,
  Pencil,
  Check,
  X,
  KeyRound,
  RotateCcw,
  SquareCheck,
  SquareX,
  Eraser,
  Sparkles,
  Crown,
  Calculator,
  Truck,
  Building2,
  SlidersHorizontal
} from 'lucide-react';
import { 
  UserAccount, 
  UserRole, 
  UserStatus, 
  CustomerItem, 
  canDeleteUser, 
  UserPermissions, 
  getDefaultPermissions, 
  getEmptyPermissions,
  getRoleInfo,
  USER_ROLES_HIERARCHY,
  ROLE_HIERARCHY_ORDER
} from '../types';

interface UserManagementProps {
  isOpen?: boolean;
  embedded?: boolean;
  onClose?: () => void;
  users: UserAccount[];
  customers?: CustomerItem[];
  currentUser: UserAccount | null;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onChangeUserRole: (userId: string, newRole: UserRole) => void;
  onChangeCustomerName?: (userId: string, customerName: string) => void;
  onChangeUserPermissions?: (userId: string, permissions: UserPermissions) => void;
  onChangeUserName?: (userId: string, newName: string) => void;
  onResetUserPassword?: (userId: string) => void;
  onResetAllPermissions?: () => void;
  onResetAllToRoleDefaults?: () => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementProps> = ({
  isOpen = true,
  embedded = false,
  onClose,
  users,
  customers = [],
  currentUser,
  onApproveUser,
  onRejectUser,
  onChangeUserRole,
  onChangeCustomerName,
  onChangeUserPermissions,
  onChangeUserName,
  onResetUserPassword,
  onResetAllPermissions,
  onResetAllToRoleDefaults,
  onDeleteUser
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'admin' | 'manager' | 'employee_accounting' | 'employee_logistics' | 'customer' | 'pending'>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [resetConfirmUser, setResetConfirmUser] = useState<UserAccount | null>(null);
  const [bulkActionConfirm, setBulkActionConfirm] = useState<'clear_all' | 'defaults_all' | null>(null);
  const [showHierarchyGuide, setShowHierarchyGuide] = useState<boolean>(true);

  if (!embedded && !isOpen) return null;

  const pendingUsers = users.filter(u => u.status === 'pending');
  const adminUsers = users.filter(u => u.role === 'admin' && u.status !== 'pending');
  const managerUsers = users.filter(u => u.role === 'manager' && u.status !== 'pending');
  const accountingUsers = users.filter(u => u.role === 'employee_accounting' && u.status !== 'pending');
  const logisticsUsers = users.filter(u => (u.role === 'employee_logistics' || (u.role as any) === 'employee') && u.status !== 'pending');
  const customerUsers = users.filter(u => u.role === 'customer' && u.status !== 'pending');
  
  const displayedUsers = users.filter(u => {
    if (filterTab === 'pending') return u.status === 'pending';
    if (filterTab === 'admin') return u.role === 'admin' && u.status !== 'pending';
    if (filterTab === 'manager') return u.role === 'manager' && u.status !== 'pending';
    if (filterTab === 'employee_accounting') return u.role === 'employee_accounting' && u.status !== 'pending';
    if (filterTab === 'employee_logistics') return (u.role === 'employee_logistics' || (u.role as any) === 'employee') && u.status !== 'pending';
    if (filterTab === 'customer') return u.role === 'customer' && u.status !== 'pending';
    return true; // all
  });

  const getAllPermissions = (): UserPermissions => ({
    dashboard: { view: true, edit: true },
    shipments: { view: true, edit: true },
    customs: { view: true, edit: true },
    sea_freight: { view: true, edit: true },
    customs_report: { view: true, edit: true },
    finance: { view: true, edit: true },
    finance_report: { view: true, edit: true },
    finance_kpi: { view: true, edit: true },
    finance_advances: { view: true, edit: true },
    finance_quotations: { view: true, edit: true },
    finance_debt: { view: true, edit: true },
    catalog: { view: true, edit: true },
    utilities: { view: true, edit: true },
    gdrive: { view: true, edit: true },
  });

  const togglePermission = (userId: string, currentPerms: UserPermissions | undefined, module: keyof UserPermissions, action: 'view' | 'edit') => {
    if (!onChangeUserPermissions) return;
    // Start strictly from current explicit permissions or empty permissions
    const basePerms: UserPermissions = currentPerms
      ? JSON.parse(JSON.stringify(currentPerms))
      : getEmptyPermissions();
    
    const currentModule = basePerms[module] || { view: false, edit: false };
    const isCurrentlyChecked = Boolean(currentModule[action]);
    const nextVal = !isCurrentlyChecked;

    const updatedModule = {
      view: Boolean(currentModule.view),
      edit: Boolean(currentModule.edit),
      [action]: nextVal
    };

    // If edit is true, view must be true
    if (action === 'edit' && nextVal) {
      updatedModule.view = true;
    }
    // If view is false, edit must be false
    if (action === 'view' && !nextVal) {
      updatedModule.edit = false;
    }

    basePerms[module] = updatedModule;

    // Auto-propagation rules for usability:
    // 1. If 'finance' view is turned OFF: disable all finance sub-modules
    if (module === 'finance' && !nextVal && action === 'view') {
      basePerms.finance_report = { view: false, edit: false };
      basePerms.customs_report = { view: false, edit: false };
      basePerms.finance_kpi = { view: false, edit: false };
      basePerms.finance_advances = { view: false, edit: false };
      basePerms.finance_quotations = { view: false, edit: false };
      basePerms.finance_debt = { view: false, edit: false };
    }

    // 2. If any finance sub-module is turned ON: ensure parent 'finance' view is ON
    const financeSubKeys: (keyof UserPermissions)[] = [
      'finance_report',
      'customs_report',
      'finance_kpi',
      'finance_advances',
      'finance_quotations',
      'finance_debt'
    ];
    if (financeSubKeys.includes(module) && nextVal && action === 'view') {
      basePerms.finance = {
        view: true,
        edit: Boolean(basePerms.finance?.edit)
      };
    }

    onChangeUserPermissions(userId, basePerms);
  };

  const applyQuickPreset = (userId: string, presetType: 'accounting' | 'logistics' | 'manager' | 'customer' | 'clear' | 'all') => {
    if (!onChangeUserPermissions) return;
    let newPerms: UserPermissions;
    if (presetType === 'clear') {
      newPerms = getEmptyPermissions();
    } else if (presetType === 'all') {
      newPerms = getAllPermissions();
    } else if (presetType === 'accounting') {
      newPerms = {
        dashboard: { view: true, edit: false },
        shipments: { view: true, edit: false },
        customs: { view: true, edit: false },
        sea_freight: { view: true, edit: false },
        customs_report: { view: true, edit: true },
        finance: { view: true, edit: true },
        finance_report: { view: true, edit: true },
        finance_kpi: { view: true, edit: true },
        finance_advances: { view: true, edit: true },
        finance_quotations: { view: true, edit: true },
        finance_debt: { view: true, edit: true },
        catalog: { view: true, edit: false },
        utilities: { view: true, edit: true },
        gdrive: { view: false, edit: false },
      };
    } else if (presetType === 'logistics') {
      newPerms = {
        dashboard: { view: true, edit: true },
        shipments: { view: true, edit: true },
        customs: { view: true, edit: true },
        sea_freight: { view: true, edit: true },
        customs_report: { view: true, edit: false },
        finance: { view: false, edit: false },
        finance_report: { view: false, edit: false },
        finance_kpi: { view: false, edit: false },
        finance_advances: { view: false, edit: false },
        finance_quotations: { view: false, edit: false },
        finance_debt: { view: false, edit: false },
        catalog: { view: true, edit: false },
        utilities: { view: true, edit: true },
        gdrive: { view: false, edit: false },
      };
    } else if (presetType === 'manager') {
      newPerms = {
        dashboard: { view: true, edit: true },
        shipments: { view: true, edit: true },
        customs: { view: true, edit: true },
        sea_freight: { view: true, edit: true },
        customs_report: { view: true, edit: true },
        finance: { view: true, edit: true },
        finance_report: { view: true, edit: true },
        finance_kpi: { view: true, edit: true },
        finance_advances: { view: true, edit: true },
        finance_quotations: { view: true, edit: true },
        finance_debt: { view: true, edit: true },
        catalog: { view: true, edit: true },
        utilities: { view: true, edit: true },
        gdrive: { view: true, edit: true },
      };
    } else {
      newPerms = {
        dashboard: { view: true, edit: false },
        shipments: { view: true, edit: false },
        customs: { view: true, edit: false },
        sea_freight: { view: false, edit: false },
        customs_report: { view: false, edit: false },
        finance: { view: true, edit: false },
        finance_report: { view: false, edit: false },
        finance_kpi: { view: false, edit: false },
        finance_advances: { view: false, edit: false },
        finance_quotations: { view: true, edit: false },
        finance_debt: { view: true, edit: false },
        catalog: { view: false, edit: false },
        utilities: { view: false, edit: false },
        gdrive: { view: false, edit: false },
      };
    }
    onChangeUserPermissions(userId, newPerms);
  };

  const modalContent = (
    <div className={embedded ? "bg-white rounded-2xl w-full flex flex-col overflow-hidden" : "bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"}>
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-400/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base">Bảng Quản Lý Tài Khoản & Phân Quyền Nhân Viên</h3>
            <p className="text-xs text-slate-400">Duyệt tài khoản nhân viên mới & Cấu hình chi tiết quyền hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {embedded ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold">
                Tổng: {users.length} tài khoản
              </span>
              {pendingUsers.length > 0 && (
                <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{pendingUsers.length} Chờ duyệt</span>
                </span>
              )}
            </div>
          ) : (
            onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-white transition text-sm font-bold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                Đóng
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`p-6 space-y-4 ${embedded ? '' : 'overflow-y-auto max-h-[calc(90vh-80px)]'} flex-1`}>
          {/* 5-Tier Architecture Guide */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-slate-200 rounded-2xl p-4 border border-slate-700 shadow-md">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide text-white flex items-center gap-2">
                    <span>Hệ Thống Phân Cấp 5 Cấp Tài Khoản SPV Group</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold lowercase">
                      đang áp dụng
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Phân chia rành mạch 5 quyền hạn: Admin tối cao, Quản lý điều hành, Kế toán tài chính, Logistics vận hành & Khách hàng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHierarchyGuide(!showHierarchyGuide)}
                className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              >
                {showHierarchyGuide ? 'Thu gọn sơ đồ' : 'Xem sơ đồ 5 cấp'}
              </button>
            </div>

            {showHierarchyGuide && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-3">
                {ROLE_HIERARCHY_ORDER.map(r => {
                  const info = USER_ROLES_HIERARCHY[r];
                  return (
                    <div 
                      key={r}
                      onClick={() => setFilterTab(r)}
                      className={`cursor-pointer p-2.5 rounded-xl border transition group ${
                        filterTab === r 
                          ? 'bg-white/10 border-indigo-400 ring-1 ring-indigo-400' 
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${info.badgeClass}`}>
                          {info.levelBadge}
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">
                          {info.shortLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {info.description}
                      </p>
                      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400">
                        <span>Số tài khoản:</span>
                        <span className="font-extrabold text-white">
                          {users.filter(u => u.role === r && u.status !== 'pending').length}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Global Reset Banner for Permissions */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cấu hình & Phân quyền Chi tiết (Granular Permissions)</h4>
                <p className="text-[11px] text-slate-400">Tùy biến quyền Xem/Sửa cho từng nhân viên, hoặc khôi phục mặc định theo chuẩn 5 cấp.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {onResetAllPermissions && (
                <button
                  type="button"
                  onClick={() => setBulkActionConfirm('clear_all')}
                  className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/80 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  title="Bỏ tích toàn bộ quyền của tất cả tài khoản"
                >
                  <Eraser className="w-3.5 h-3.5 text-rose-400" />
                  <span>Xóa trắng tất cả quyền</span>
                </button>
              )}
              {onResetAllToRoleDefaults && (
                <button
                  type="button"
                  onClick={() => setBulkActionConfirm('defaults_all')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mặc định 5 cấp</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-tabs: 5 Tiers + All + Pending */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất Cả ({users.length})
            </button>

            <button
              onClick={() => setFilterTab('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'admin'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/60'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Cấp 1: Admin ({adminUsers.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('manager')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'manager'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cấp 2: Quản Lý ({managerUsers.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('employee_accounting')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'employee_accounting'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Cấp 3: Kế Toán ({accountingUsers.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('employee_logistics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'employee_logistics'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Cấp 4: Logistics ({logisticsUsers.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('customer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'customer'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cấp 5: Khách Hàng ({customerUsers.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ Duyệt</span>
              {pendingUsers.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase">
                    <th className="p-3">Họ & Tên</th>
                    <th className="p-3">Tài khoản / Nickname / Email</th>
                    <th className="p-3 text-center">Vai Trò</th>
                    <th className="p-3 text-center">Trạng Thái</th>
                    <th className="p-3 text-center">Google 2FA</th>
                    <th className="p-3 text-right">Thao Tác Duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {displayedUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  if (onChangeUserName && editingName.trim()) {
                                    onChangeUserName(user.id, editingName.trim());
                                  }
                                  setEditingUserId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingUserId(null);
                                }
                              }}
                              className="px-2 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full min-w-[130px]"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (onChangeUserName && editingName.trim()) {
                                  onChangeUserName(user.id, editingName.trim());
                                }
                                setEditingUserId(null);
                              }}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-xs"
                              title="Lưu họ tên"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 group">
                            <span className="truncate max-w-[150px]">{user.name}</span>
                            <button
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditingName(user.name);
                              }}
                              className="opacity-50 group-hover:opacity-100 p-1 text-indigo-600 hover:bg-indigo-50 rounded-md transition shrink-0"
                              title="Chỉnh sửa họ tên đăng ký"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-700 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {(() => {
                          const roleInfo = getRoleInfo(user.role);
                          return (
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${roleInfo.badgeClass}`}>
                                {roleInfo.levelBadge}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {roleInfo.shortLabel}
                              </span>
                            </div>
                          );
                        })()}
                        <select
                          value={user.role}
                          disabled={user.email.toLowerCase() === 'admin@spv.biz.vn'}
                          onChange={e => onChangeUserRole(user.id, e.target.value as UserRole)}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed w-full shadow-2xs"
                        >
                          <option value="admin">Cấp 1: Quản trị viên (Admin tối cao)</option>
                          <option value="manager">Cấp 2: Quản lý (Manager)</option>
                          <option value="employee_accounting">Cấp 3: Nhân viên Kế toán</option>
                          <option value="employee_logistics">Cấp 4: Nhân viên Logistics</option>
                          <option value="customer">Cấp 5: Khách hàng (Customer)</option>
                        </select>
                        {user.role === 'customer' && (
                          <div className="mt-1.5">
                            <select
                              value={user.customer_name || ''}
                              onChange={e => onChangeCustomerName?.(user.id, e.target.value)}
                              className="w-full px-2 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 focus:outline-none"
                            >
                              <option value="">-- Gắn Tên Khách Hàng --</option>
                              {customers.map(c => (
                                <option key={c.id} value={c.customer_name}>
                                  {c.customer_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {user.role !== 'admin' && (
                          <div className="mt-2 text-left space-y-1.5 border-t border-slate-200 pt-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                                <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Phân quyền chi tiết</span>
                                {user.permissions ? (
                                  (() => {
                                    const permsList = Object.values(user.permissions) as Array<{ view?: boolean; edit?: boolean } | undefined>;
                                    const totalActive = permsList.reduce(
                                      (acc: number, p) => acc + (p?.view ? 1 : 0) + (p?.edit ? 1 : 0),
                                      0
                                    );
                                    return totalActive > 0 ? (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300">
                                        Đã cấp {totalActive} quyền
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                                        Trống (Chưa tích)
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                                    Chưa thiết lập
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-wrap text-[9px]">
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'clear')}
                                  className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold border border-rose-200 transition"
                                  title="Xóa trắng toàn bộ quyền của tài khoản này (Bỏ tích tất cả)"
                                >
                                  Bỏ tích
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'all')}
                                  className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-bold border border-indigo-200 transition"
                                  title="Tích chọn tất cả các quyền Xem & Sửa"
                                >
                                  Toàn quyền
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'manager')}
                                  className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded font-bold border border-purple-200 transition"
                                  title="Gán quyền Quản lý Cấp 2"
                                >
                                  Cấp 2: Quản lý
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'accounting')}
                                  className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-200 transition"
                                  title="Gán quyền Kế toán Cấp 3 (Full tài chính & công nợ)"
                                >
                                  Cấp 3: Kế toán
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'logistics')}
                                  className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-bold border border-blue-200 transition"
                                  title="Gán quyền Logistics Cấp 4 (Vận hành & Hải quan & Cước biển)"
                                >
                                  Cấp 4: Logistics
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'customer')}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold border border-slate-300 transition"
                                  title="Gán quyền Khách hàng Cấp 5 (Tra cứu chuyến hàng của mình)"
                                >
                                  Cấp 5: Khách hàng
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                              {[
                                { key: 'dashboard', label: 'Tổng quan (Dashboard)' },
                                { key: 'shipments', label: 'Quản lý vận chuyển' },
                                { key: 'customs', label: 'Thủ tục hải quan' },
                                { key: 'sea_freight', label: 'Quản lý cước biển (USD)' },
                                { key: 'catalog', label: 'Danh mục chuẩn' },
                                { key: 'utilities', label: 'Tiện ích hỗ trợ' },
                                { key: 'finance', label: 'Tài chính (Chung)' },
                                { key: 'finance_report', label: '├─ Báo cáo cước vận chuyển', indent: true },
                                { key: 'customs_report', label: '├─ Báo cáo hải quan', indent: true },
                                { key: 'finance_kpi', label: '├─ Quản lý KPI & Đơn giá', indent: true },
                                { key: 'finance_advances', label: '├─ Tạm ứng nhân viên', indent: true },
                                { key: 'finance_quotations', label: '├─ Báo giá khách hàng', indent: true },
                                { key: 'finance_debt', label: '└─ Công nợ khách hàng', indent: true },
                                { key: 'gdrive', label: 'Lưu trữ & Sao lưu Google Drive' }
                              ].map((mod) => {
                                const moduleKey = mod.key as keyof UserPermissions;
                                const userModPerms = user.permissions?.[moduleKey];
                                const perms = {
                                  view: Boolean(userModPerms?.view),
                                  edit: Boolean(userModPerms?.edit),
                                };
                                return (
                                  <div
                                    key={mod.key}
                                    className={`flex items-center justify-between px-2 py-1 rounded border transition ${
                                      perms.view || perms.edit
                                        ? 'bg-indigo-50/40 border-indigo-200/60'
                                        : 'bg-slate-50 border-slate-100 opacity-85'
                                    } ${mod.indent ? 'ml-3 bg-amber-50/30 border-amber-100/60' : ''}`}
                                  >
                                    <span className={`text-[10px] ${mod.indent ? 'text-amber-950 font-medium' : 'font-semibold text-slate-800'}`}>
                                      {mod.label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <label className="flex items-center gap-1 text-[9px] cursor-pointer text-slate-700 font-semibold hover:text-indigo-600">
                                        <input
                                          type="checkbox"
                                          checked={perms.view}
                                          onChange={() => togglePermission(user.id, user.permissions, moduleKey, 'view')}
                                          className="w-3 h-3 accent-indigo-600 cursor-pointer rounded"
                                        />
                                        Xem
                                      </label>
                                      <label className="flex items-center gap-1 text-[9px] cursor-pointer text-amber-800 font-semibold hover:text-amber-600">
                                        <input
                                          type="checkbox"
                                          checked={perms.edit}
                                          onChange={() => togglePermission(user.id, user.permissions, moduleKey, 'edit')}
                                          className="w-3 h-3 accent-amber-600 cursor-pointer rounded"
                                        />
                                        Sửa
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {user.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            Chờ Duyệt
                          </span>
                        ) : user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Hoạt Động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                            Từ Chối
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {user.totpEnabled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                            <ShieldCheck className="w-4 h-4" /> Đã bật 2FA
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Chưa cài</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {user.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onApproveUser(user.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 inline-flex"
                              title="Duyệt tài khoản"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Duyệt</span>
                            </button>
                            <button
                              onClick={() => onRejectUser(user.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 inline-flex"
                              title="Từ chối"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {user.status !== 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && onResetUserPassword && (
                              <button
                                onClick={() => setResetConfirmUser(user)}
                                className="px-2.5 py-1 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-300 rounded-lg text-xs font-extrabold transition flex items-center gap-1 inline-flex"
                                title="Reset mật khẩu về mặc định (27072026)"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reset Pass</span>
                              </button>
                            )}
                            {(() => {
                              const delCheck = canDeleteUser(currentUser, user);
                              if (!delCheck.allowed) {
                                return (
                                  <button
                                    disabled
                                    className="p-1.5 text-slate-300 opacity-40 cursor-not-allowed rounded-lg inline-flex"
                                    title={delCheck.reason}
                                  >
                                    <Lock className="w-4 h-4 text-slate-400" />
                                  </button>
                                );
                              }
                              return (
                                <button
                                  onClick={() => onDeleteUser(user.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {displayedUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        Không có tài khoản nào trong danh mục này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Reset Password Confirmation Modal */}
        {resetConfirmUser && (
          <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Reset Mật Khẩu Về Mặc Định</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản <strong className="text-slate-900">{resetConfirmUser.name}</strong> (<span className="text-indigo-600 font-medium">{resetConfirmUser.email}</span>)?
                </p>
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-[11px] text-amber-800 font-medium">Mật khẩu mặc định sau khi reset:</p>
                  <p className="font-mono font-black text-amber-900 text-base tracking-widest mt-0.5">27072026</p>
                </div>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setResetConfirmUser(null)}
                  className="w-1/2 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    if (onResetUserPassword && resetConfirmUser) {
                      onResetUserPassword(resetConfirmUser.id);
                    }
                    setResetConfirmUser(null);
                  }}
                  className="w-1/2 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl shadow-sm transition"
                >
                  Reset Ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Confirmation Modal */}
        {bulkActionConfirm && (
          <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-xl ${
                bulkActionConfirm === 'clear_all' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {bulkActionConfirm === 'clear_all' ? <Eraser className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {bulkActionConfirm === 'clear_all' ? 'Xác Nhận Xóa Trắng Phân Quyền' : 'Xác Nhận Đặt Lại Chuẩn 5 Cấp'}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  {bulkActionConfirm === 'clear_all'
                    ? 'Bạn có chắc muốn xóa toàn bộ phân quyền của tất cả tài khoản về Trống (chưa tích) để cấu hình lại từng tài khoản từ đầu?'
                    : 'Bạn có chắc muốn áp dụng lại bộ phân quyền mặc định chuẩn 5 cấp (Admin, Quản lý, Kế toán, Logistics, Khách hàng) cho tất cả tài khoản?'}
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setBulkActionConfirm(null)}
                  className="w-1/2 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    if (bulkActionConfirm === 'clear_all' && onResetAllPermissions) {
                      onResetAllPermissions();
                    } else if (bulkActionConfirm === 'defaults_all' && onResetAllToRoleDefaults) {
                      onResetAllToRoleDefaults();
                    }
                    setBulkActionConfirm(null);
                  }}
                  className={`w-1/2 py-2 text-xs font-bold rounded-xl shadow-sm transition text-white ${
                    bulkActionConfirm === 'clear_all'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Xác Nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  if (embedded) {
    return <div className="w-full">{modalContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
      {modalContent}
    </div>
  );
};
