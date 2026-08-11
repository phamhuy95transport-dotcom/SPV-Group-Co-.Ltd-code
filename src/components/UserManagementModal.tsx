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
  Lock
} from 'lucide-react';
import { UserAccount, UserRole, UserStatus, canDeleteUser } from '../types';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount | null;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onChangeUserRole: (userId: string, newRole: UserRole) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onApproveUser,
  onRejectUser,
  onChangeUserRole,
  onDeleteUser
}) => {
  const [filterTab, setFilterTab] = useState<'pending' | 'all' | 'employee' | 'customer'>('pending');

  if (!isOpen) return null;

  const pendingUsers = users.filter(u => u.status === 'pending');
  
  const displayedUsers = users.filter(u => {
    if (filterTab === 'pending') return u.status === 'pending';
    if (filterTab === 'employee') return u.role === 'employee' && u.status !== 'pending';
    if (filterTab === 'customer') return u.role === 'customer' && u.status !== 'pending';
    return true; // all
  });

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
              <h3 className="font-extrabold text-base">Quản Lý & Duyệt Tài Khoản Nhân Viên</h3>
              <p className="text-xs text-slate-400">Duyệt yêu cầu đăng ký tài khoản nhân viên & Phân quyền hệ thống</p>
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
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="admin">Quản trị viên (Admin)</option>
                          <option value="employee_logistics">NV Logistics</option>
                          <option value="employee_accounting">NV Kế toán</option>
                          <option value="employee">Nhân viên chung (Employee)</option>
                          <option value="customer">Khách hàng (Customer)</option>
                        </select>
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
