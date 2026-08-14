import React from 'react';
import {
  Truck,
  Database,
  PlusCircle,
  ListCheck,
  FolderTree,
  ChartPie,
  Briefcase,
  DollarSign,
  Users,
  LogOut,
  LogIn,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Pencil,
  Sparkles,
  HardDrive
} from 'lucide-react';
import { ActiveTab, UserAccount, hasPermission } from '../types';

interface HeaderProps {
  currentUser: UserAccount | null;
  activeTab: ActiveTab;
  switchTab: (tab: ActiveTab) => void;
  isConnected: boolean;
  totalRecordsCount: number;
  pendingUsersCount: number;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onOpen2FASetup: () => void;
  onOpenChangePassword?: () => void;
  onOpenEditProfile?: () => void;
  onOpenNewTripModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  switchTab,
  isConnected,
  totalRecordsCount,
  pendingUsersCount,
  onOpenLoginModal,
  onLogout,
  onOpen2FASetup,
  onOpenChangePassword,
  onOpenEditProfile,
  onOpenNewTripModal,
}) => {
  const isCustomer = currentUser?.role === 'customer';
  const isEmployee = currentUser?.role === 'employee_logistics' || currentUser?.role === 'employee_accounting' || currentUser?.role === ('employee' as any);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-[#1E293B] text-white shadow-md no-print sticky top-0 z-30 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white tracking-tight text-sm sm:text-base uppercase">
                  CÔNG TY TNHH SPV GROUP
                </h1>
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  {isConnected ? 'Firebase Realtime' : 'Local Backup'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Hệ thống quản lý
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-2.5">
            {/* User Account Info / Role Badge */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-lg p-1.5 pr-3 text-xs">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs border border-white/10 ${
                    isAdmin
                      ? 'bg-orange-500'
                      : isEmployee
                      ? 'bg-blue-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-white leading-tight truncate max-w-[140px] text-xs">
                      {currentUser.name}
                    </p>
                    {onOpenEditProfile && (
                      <button
                        onClick={onOpenEditProfile}
                        title="Đổi họ tên đăng ký của bạn"
                        className="p-0.5 text-slate-400 hover:text-indigo-300 transition rounded"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium capitalize flex items-center gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        isAdmin ? 'bg-orange-400' : isEmployee ? 'bg-blue-400' : 'bg-emerald-400'
                      }`}
                    ></span>
                    {isAdmin
                      ? 'Administrator (Full Access)'
                      : currentUser?.role === 'manager'
                      ? 'Quản lý (Manager)'
                      : currentUser?.role === 'employee_accounting'
                      ? 'NV Kế toán'
                      : currentUser?.role === 'employee_logistics' || currentUser?.role === ('employee' as any)
                      ? 'NV Logistics'
                      : 'Khách hàng (Customer)'}
                  </p>
                </div>

                {/* Change Password Button */}
                {onOpenChangePassword && (
                  <button
                    onClick={onOpenChangePassword}
                    title="Đổi mật khẩu tài khoản"
                    className="p-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 rounded-md transition"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 2FA Badge & Button */}
                <button
                  onClick={onOpen2FASetup}
                  title={currentUser.totpEnabled ? 'Google Authenticator 2FA Active' : 'Thiết lập 2FA Google Authenticator'}
                  className={`p-1 rounded-md border transition ${
                    currentUser.totpEnabled
                      ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                      : 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng Nhập</span>
              </button>
            )}

            {/* Admin/Manager Pending Staff Approvals Button */}
            {(isAdmin || currentUser?.role === 'manager') && (
              <button
                onClick={() => switchTab('users')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
                  activeTab === 'users'
                    ? 'bg-orange-500 text-white border-orange-400 font-bold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-orange-300" />
                <span className="hidden sm:inline">Duyệt Tài Khoản</span>
                {pendingUsersCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                    {pendingUsersCount}
                  </span>
                )}
              </button>
            )}

          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 pt-1 pb-1 overflow-x-auto no-scrollbar">
          {/* Tab 1: Công việc chung */}
          {(!currentUser || hasPermission(currentUser, 'customs', 'view')) && (
            <button
              onClick={() => switchTab('general_work')}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'general_work'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Công việc chung</span>
            </button>
          )}

          {/* Tab 2: Vận chuyển (Visible to All Roles or based on permissions) */}
          {(!currentUser || hasPermission(currentUser, 'shipments', 'view')) && (
            <button
              onClick={() => switchTab('entry')}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'entry'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ListCheck className="w-4 h-4" />
              <span>Vận chuyển</span>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                {totalRecordsCount}
              </span>
            </button>
          )}

          {/* Tab 3: Danh mục */}
          {currentUser && hasPermission(currentUser, 'catalog', 'view') && (
            <button
              onClick={() => switchTab('category')}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'category'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FolderTree className="w-4 h-4 text-emerald-400" />
              <span>Danh mục</span>
            </button>
          )}

          {/* Tab 3.5: Tiện ích hỗ trợ */}
          {currentUser && hasPermission(currentUser, 'utilities', 'view') && (
            <button
              onClick={() => switchTab('utilities')}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'utilities'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Tiện ích hỗ trợ</span>
            </button>
          )}

          {/* Tab 4: Tài chính */}
          {currentUser && hasPermission(currentUser, 'finance', 'view') && (
            <button
              onClick={() => switchTab('finance')}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'finance'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>Tài chính</span>
            </button>
          )}

          {/* Tab 5: Quản lý người dùng (Admin & Manager) */}
          {(isAdmin || currentUser?.role === 'manager') && (
            <button
              onClick={() => switchTab('users')}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'users'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Quản Lý Nhân Viên</span>
              {pendingUsersCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          )}

          {/* Tab 6: Lưu trữ & Sao lưu Google Drive */}
          {currentUser && hasPermission(currentUser, 'gdrive', 'view') && (
            <button
              onClick={() => switchTab('gdrive')}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'gdrive'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Lưu trữ Google Drive</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
