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
  RotateCcw
} from 'lucide-react';
import { UserAccount, UserRole, UserStatus, CustomerItem, canDeleteUser, UserPermissions, getDefaultPermissions } from '../types';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
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
  onDeleteUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementProps> = ({
  isOpen,
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
  onDeleteUser
}) => {
  const [filterTab, setFilterTab] = useState<'pending' | 'all' | 'employee' | 'customer' | 'manager'>('pending');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [resetConfirmUser, setResetConfirmUser] = useState<UserAccount | null>(null);

  if (!isOpen) return null;

  const pendingUsers = users.filter(u => u.status === 'pending');
  
  const displayedUsers = users.filter(u => {
    if (filterTab === 'pending') return u.status === 'pending';
    if (filterTab === 'employee') return (u.role === 'employee_logistics' || u.role === 'employee_accounting' || (u.role as any) === 'employee') && u.status !== 'pending';
    if (filterTab === 'manager') return u.role === 'manager' && u.status !== 'pending';
    if (filterTab === 'customer') return u.role === 'customer' && u.status !== 'pending';
    return true; // all
  });

  const togglePermission = (userId: string, currentPerms: UserPermissions | undefined, userRole: UserRole, module: keyof UserPermissions, action: 'view' | 'edit') => {
    if (!onChangeUserPermissions) return;
    const defaultPerms = getDefaultPermissions(userRole);
    // Deep clone to prevent mutating default object
    const newPerms: UserPermissions = JSON.parse(JSON.stringify({ ...defaultPerms, ...(currentPerms || {}) }));
    
    const defaultMod = defaultPerms[module] || { view: false, edit: false };
    const currentModulePerms = newPerms[module] || { ...defaultMod };
    const isCurrentlyChecked = Boolean(currentModulePerms[action]);
    
    const updatedModulePerms = {
      view: Boolean(currentModulePerms.view),
      edit: Boolean(currentModulePerms.edit),
      [action]: !isCurrentlyChecked
    };
    
    // If edit is true, view must be true
    if (action === 'edit' && updatedModulePerms.edit) {
      updatedModulePerms.view = true;
    }
    // If view is false, edit must be false
    if (action === 'view' && !updatedModulePerms.view) {
      updatedModulePerms.edit = false;
    }

    newPerms[module] = updatedModulePerms;

    // Auto-propagation rules:
    // 1. If 'finance' view is turned ON: enable shipment report and standard sub-modules
    if (module === 'finance' && updatedModulePerms.view) {
      if (!newPerms.finance_report?.view) newPerms.finance_report = { view: true, edit: false };
      if (!newPerms.customs_report?.view) newPerms.customs_report = { view: true, edit: false };
      if (!newPerms.finance_kpi?.view) newPerms.finance_kpi = { view: true, edit: false };
      if (!newPerms.finance_advances?.view) newPerms.finance_advances = { view: true, edit: false };
      if (!newPerms.finance_quotations?.view) newPerms.finance_quotations = { view: true, edit: false };
      if (!newPerms.finance_debt?.view) newPerms.finance_debt = { view: true, edit: false };
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
    if (financeSubKeys.includes(module) && updatedModulePerms.view) {
      newPerms.finance = {
        view: true,
        edit: Boolean(newPerms.finance?.edit)
      };
    }

    // 3. If 'customs_report' is enabled, ensure 'customs' view is enabled
    if (module === 'customs_report' && updatedModulePerms.view) {
      if (!newPerms.customs?.view) newPerms.customs = { view: true, edit: false };
    }

    // 4. If 'sea_freight' is enabled, ensure 'finance' view is enabled for the report
    if (module === 'sea_freight' && updatedModulePerms.view) {
      if (!newPerms.finance?.view) newPerms.finance = { view: true, edit: false };
    }

    onChangeUserPermissions(userId, newPerms);
  };

  const applyQuickPreset = (userId: string, presetType: 'accounting' | 'logistics' | 'manager' | 'view_all') => {
    if (!onChangeUserPermissions) return;
    let newPerms: UserPermissions;
    if (presetType === 'accounting') {
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
        sea_freight: { view: true, edit: false },
        customs_report: { view: true, edit: false },
        finance: { view: true, edit: false },
        finance_report: { view: true, edit: false },
        finance_kpi: { view: true, edit: false },
        finance_advances: { view: true, edit: false },
        finance_quotations: { view: true, edit: false },
        finance_debt: { view: true, edit: false },
        catalog: { view: true, edit: false },
        utilities: { view: true, edit: false },
        gdrive: { view: false, edit: false },
      };
    }
    onChangeUserPermissions(userId, newPerms);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-400/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Quản Lý Tài Khoản Nhân Viên</h3>
              <p className="text-xs text-slate-400">Duyệt tài khoản nhân viên & Phân quyền hệ thống</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition text-sm font-bold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            Đóng
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ Duyệt Registration</span>
              {pendingUsers.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {pendingUsers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('employee')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'employee'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tài Khoản Nhân Viên</span>
            </button>

            <button
              onClick={() => setFilterTab('manager')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'manager'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quản Lý (Manager)</span>
            </button>

            <button
              onClick={() => setFilterTab('customer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === 'customer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Khách Hàng</span>
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất Cả ({users.length})
            </button>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase">
                    <th className="p-3">Họ & Tên</th>
                    <th className="p-3">Email & SĐT</th>
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
                        <select
                          value={user.role}
                          disabled={user.email.toLowerCase() === 'admin@spv.biz.vn'}
                          onChange={e => onChangeUserRole(user.id, e.target.value as UserRole)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed w-full"
                        >
                          <option value="admin">Quản trị viên (Admin)</option>
                          <option value="manager">Quản lý (Manager)</option>
                          <option value="employee_logistics">NV Logistics</option>
                          <option value="employee_accounting">NV Kế toán</option>
                          <option value="customer">Khách hàng (Customer)</option>
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
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <Settings2 className="w-3 h-3 text-indigo-500" /> Phân quyền chi tiết
                              </div>
                              <div className="flex items-center gap-1 text-[9px]">
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'accounting')}
                                  className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-bold border border-amber-200 transition"
                                  title="Gán quyền Kế toán (Full tài chính)"
                                >
                                  Kế toán
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'logistics')}
                                  className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-bold border border-blue-200 transition"
                                  title="Gán quyền Logistics (Vận hành & Hải quan & Cước biển)"
                                >
                                  Logistics
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyQuickPreset(user.id, 'manager')}
                                  className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-200 transition"
                                  title="Gán quyền Quản lý (Full xem & sửa)"
                                >
                                  Quản lý
                                </button>
                              </div>
                            </div>
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
                              const defaultModPerms = getDefaultPermissions(user.role)?.[moduleKey] || { view: false, edit: false };
                              const userModPerms = user.permissions?.[moduleKey];
                              const perms = {
                                view: Boolean(userModPerms?.view ?? defaultModPerms.view),
                                edit: Boolean(userModPerms?.edit ?? defaultModPerms.edit),
                              };
                              return (
                                <div key={mod.key} className={`flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100 ${mod.indent ? 'ml-3 bg-amber-50/40 border-amber-100/60' : ''}`}>
                                  <span className={`text-[10px] ${mod.indent ? 'text-amber-950 font-medium' : 'font-semibold text-slate-700'}`}>{mod.label}</span>
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-0.5 text-[9px] cursor-pointer text-slate-700 font-medium">
                                      <input type="checkbox" checked={perms.view} onChange={() => togglePermission(user.id, user.permissions, user.role, moduleKey, 'view')} className="w-2.5 h-2.5 accent-indigo-600 cursor-pointer" />
                                      Xem
                                    </label>
                                    <label className="flex items-center gap-0.5 text-[9px] cursor-pointer text-amber-700 font-medium">
                                      <input type="checkbox" checked={perms.edit} onChange={() => togglePermission(user.id, user.permissions, user.role, moduleKey, 'edit')} className="w-2.5 h-2.5 accent-amber-600 cursor-pointer" />
                                      Sửa
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
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
      </div>
    </div>
  );
};
