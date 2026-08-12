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
  Settings2
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
  onDeleteUser
}) => {
  const [filterTab, setFilterTab] = useState<'pending' | 'all' | 'employee' | 'customer' | 'manager'>('pending');

  if (!isOpen) return null;

  const pendingUsers = users.filter(u => u.status === 'pending');
  
  const displayedUsers = users.filter(u => {
    if (filterTab === 'pending') return u.status === 'pending';
    if (filterTab === 'employee') return (u.role === 'employee_logistics' || u.role === 'employee_accounting' || u.role === 'admin' || (u.role as any) === 'employee') && u.status !== 'pending';
    if (filterTab === 'manager') return u.role === 'manager' && u.status !== 'pending';
    if (filterTab === 'customer') return u.role === 'customer' && u.status !== 'pending';
    return true; // all
  });

  const togglePermission = (userId: string, currentPerms: UserPermissions | undefined, userRole: UserRole, module: keyof UserPermissions, action: 'view' | 'edit') => {
    if (!onChangeUserPermissions) return;
    const defaultPerms = getDefaultPermissions(userRole);
    const newPerms = { ...(currentPerms || defaultPerms) };
    newPerms[module] = { ...newPerms[module], [action]: !newPerms[module][action] };
    
    // If edit is true, view must be true
    if (action === 'edit' && newPerms[module].edit) {
      newPerms[module].view = true;
    }
    // If view is false, edit must be false
    if (action === 'view' && !newPerms[module].view) {
      newPerms[module].edit = false;
    }

    onChangeUserPermissions(userId, newPerms);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
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
        <div className="p-6 space-y-4">
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
                        {user.name}
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
                          <div className="mt-2 text-left space-y-1 border-t border-slate-200 pt-2">
                            <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                              <Settings2 className="w-3 h-3" /> Phân quyền chi tiết
                            </div>
                            {[
                              { key: 'dashboard', label: 'Tổng quan (Dashboard)' },
                              { key: 'shipments', label: 'Quản lý vận chuyển' },
                              { key: 'customs', label: 'Thủ tục hải quan' },
                              { key: 'finance', label: 'Tài chính & Báo cáo' },
                              { key: 'catalog', label: 'Danh mục chuẩn' }
                            ].map((mod) => {
                              const moduleKey = mod.key as keyof UserPermissions;
                              const perms = user.permissions?.[moduleKey] || getDefaultPermissions(user.role)[moduleKey];
                              return (
                                <div key={mod.key} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                  <span className="text-[10px] font-semibold text-slate-700">{mod.label}</span>
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-0.5 text-[9px] cursor-pointer">
                                      <input type="checkbox" checked={perms.view} onChange={() => togglePermission(user.id, user.permissions, user.role, moduleKey, 'view')} className="w-2.5 h-2.5" />
                                      Xem
                                    </label>
                                    <label className="flex items-center gap-0.5 text-[9px] cursor-pointer text-amber-700">
                                      <input type="checkbox" checked={perms.edit} onChange={() => togglePermission(user.id, user.permissions, user.role, moduleKey, 'edit')} className="w-2.5 h-2.5 accent-amber-600" />
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
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {user.status === 'pending' && (
                          <>
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
                          </>
                        )}
                        {user.status !== 'pending' && (() => {
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
      </div>
    </div>
  );
};
