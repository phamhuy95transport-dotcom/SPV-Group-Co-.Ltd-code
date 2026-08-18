import React, { useState, useMemo } from 'react';
import {
  Truck,
  Ship,
  FileSpreadsheet,
  PackageCheck,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Clock,
  Search,
  Settings,
  PlusCircle,
  FolderTree,
  DollarSign,
  Users,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BarChart3,
  PhoneCall,
  Mail,
  Building2,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Eye,
  FileText,
  RotateCcw,
  Sliders,
  BellRing,
  HelpCircle,
  X
} from 'lucide-react';
import {
  ShipmentRecord,
  CustomsDeclarationRecord,
  CustomerItem,
  WarehouseItem,
  TransporterItem,
  RouteItem,
  UserAccount,
  ActiveTab,
  DashboardCustomSettings,
  DEFAULT_DASHBOARD_SETTINGS,
  hasPermission
} from '../types';

interface DashboardLandingPageProps {
  currentUser: UserAccount | null;
  records: ShipmentRecord[];
  declarations: CustomsDeclarationRecord[];
  customers: CustomerItem[];
  warehouses: WarehouseItem[];
  transporters: TransporterItem[];
  routes: RouteItem[];
  dashboardSettings: DashboardCustomSettings;
  onUpdateDashboardSettings: (newSettings: DashboardCustomSettings) => void;
  onSwitchTab: (tab: ActiveTab) => void;
  onOpenNewTripModal: () => void;
  onOpenReceiptModal: (record: ShipmentRecord) => void;
  onOpenLoginModal: () => void;
}

export const DashboardLandingPage: React.FC<DashboardLandingPageProps> = ({
  currentUser,
  records,
  declarations,
  customers,
  warehouses,
  transporters,
  routes,
  dashboardSettings,
  onUpdateDashboardSettings,
  onSwitchTab,
  onOpenNewTripModal,
  onOpenReceiptModal,
  onOpenLoginModal
}) => {
  // Customization modal state
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<DashboardCustomSettings>(dashboardSettings);

  // Quick tracking search query
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchResult, setSelectedSearchResult] = useState<ShipmentRecord | null>(null);

  // Role permissions
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isAccounting = currentUser?.role === 'employee_accounting';
  const isLogistics = currentUser?.role === 'employee_logistics' || currentUser?.role === ('employee' as any);
  const canCustomize = isAdmin || isManager || isAccounting || isLogistics;

  // Filter records based on role
  const visibleRecords = useMemo(() => {
    if (!currentUser) return records.slice(0, 10);
    if (currentUser.role === 'customer') {
      const custName = (currentUser.customer_name || currentUser.name || '').trim().toLowerCase();
      return records.filter(r => r.customer?.trim().toLowerCase() === custName);
    }
    return records;
  }, [records, currentUser]);

  const visibleDeclarations = useMemo(() => {
    if (!currentUser) return declarations.slice(0, 10);
    if (currentUser.role === 'customer') {
      const custName = (currentUser.customer_name || currentUser.name || '').trim().toLowerCase();
      return declarations.filter(d => d.customer?.trim().toLowerCase() === custName);
    }
    return declarations;
  }, [declarations, currentUser]);

  // Real-time Statistics
  const stats = useMemo(() => {
    const totalTrips = visibleRecords.length;
    const totalConts = visibleRecords.reduce((sum, r) => sum + (Number(r.cont_quantity) || 1), 0);
    const completedCustoms = visibleDeclarations.filter(d => d.completed).length;
    const totalCustoms = visibleDeclarations.length;
    const approvedCustoms = visibleDeclarations.filter(d => d.approved).length;

    const completedInvoices = visibleRecords.filter(r => r.hd_dau_ra && (r.hd_dich_vu || r.hd_dau_vao)).length;
    const invoiceCompletionRate = totalTrips > 0 ? Math.round((completedInvoices / totalTrips) * 100) : 100;

    return {
      totalTrips,
      totalConts,
      totalCustoms,
      completedCustoms,
      approvedCustoms,
      invoiceCompletionRate,
      activeCustomers: customers.length,
      activeTransporters: transporters.length,
      activeWarehouses: warehouses.length,
      activeRoutes: routes.length
    };
  }, [visibleRecords, visibleDeclarations, customers, transporters, warehouses, routes]);

  // Quick Tracking Search Filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return visibleRecords.filter(r =>
      (r.cont_number && r.cont_number.toLowerCase().includes(q)) ||
      (r.customer && r.customer.toLowerCase().includes(q)) ||
      (r.route && r.route.toLowerCase().includes(q)) ||
      (r.batch_number && r.batch_number.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery, visibleRecords]);

  // Theme Gradients
  const themeStyles = {
    blue_ocean: {
      heroBg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white',
      accentColor: 'text-blue-400',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30',
      cardBorder: 'border-blue-900/40',
      headerGlow: 'from-blue-600/20 to-indigo-600/10',
      pillColor: 'bg-blue-600'
    },
    teal_modern: {
      heroBg: 'bg-gradient-to-br from-slate-900 via-teal-950 to-slate-950 text-white',
      accentColor: 'text-teal-400',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-900/30',
      cardBorder: 'border-teal-900/40',
      headerGlow: 'from-teal-600/20 to-emerald-600/10',
      pillColor: 'bg-teal-600'
    },
    dark_slate: {
      heroBg: 'bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-900 text-white',
      accentColor: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/30',
      cardBorder: 'border-slate-800',
      headerGlow: 'from-indigo-600/20 to-purple-600/10',
      pillColor: 'bg-indigo-600'
    },
    amber_energy: {
      heroBg: 'bg-gradient-to-br from-slate-950 via-amber-950/60 to-slate-900 text-white',
      accentColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/30',
      cardBorder: 'border-amber-900/40',
      headerGlow: 'from-amber-600/20 to-orange-600/10',
      pillColor: 'bg-amber-600'
    }
  };

  const currentTheme = themeStyles[dashboardSettings.themeStyle] || themeStyles.blue_ocean;
  const w = dashboardSettings.widgets;

  // Handle Save Customization
  const handleSaveCustomization = () => {
    onUpdateDashboardSettings(tempSettings);
    setIsCustomizeModalOpen(false);
  };

  const handleResetDefaults = () => {
    setTempSettings(DEFAULT_DASHBOARD_SETTINGS);
    onUpdateDashboardSettings(DEFAULT_DASHBOARD_SETTINGS);
    setIsCustomizeModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Action Bar & Announcement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
            <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[11px] border border-indigo-100 uppercase shrink-0">
              SPV Live
            </span>
            <span className="truncate text-slate-600">{dashboardSettings.announcementText}</span>
          </div>
        </div>

        {/* Customization Button for Admin, Manager & Staff */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {canCustomize && (
            <button
              onClick={() => {
                setTempSettings(dashboardSettings);
                setIsCustomizeModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300 shadow-2xs"
              title="Tùy biến các khối hiển thị và giao diện Dashboard"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tùy biến Dashboard</span>
            </button>
          )}

          {!currentUser && (
            <button
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <span>Đăng nhập điều hành</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. HERO BANNER SECTION (Customizable) */}
      {w.heroBanner && (
        <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-lg border ${currentTheme.cardBorder} ${currentTheme.heroBg}`}>
          {/* Background Decorative Rings */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gradient-to-b from-blue-500/10 to-transparent blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-gradient-to-t from-indigo-500/10 to-transparent blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-white/10 text-white/90">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hệ thống Quản lý Vận hành Chuẩn Hóa SPV Logistics</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {dashboardSettings.heroTitle}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                {dashboardSettings.heroSubtitle}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onSwitchTab('entry')}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition ${currentTheme.btnPrimary}`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Bảng Điều Hành Vận Chuyển</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {(!currentUser || hasPermission(currentUser, 'customs', 'view')) && (
                  <button
                    onClick={() => onSwitchTab('general_work')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Thủ Tục Hải Quan</span>
                  </button>
                )}

                {hasPermission(currentUser, 'shipments', 'edit') && (
                  <button
                    onClick={onOpenNewTripModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Tạo Chuyến Hàng Mới</span>
                  </button>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10 text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Tra cứu MST masothue.com tức thì
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  Đồng bộ Google Drive & Firebase
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  Bảo mật 2FA Authenticator
                </span>
              </div>
            </div>

            {/* Quick Search & Tracking Box */}
            {w.quickTracking && (
              <div className="lg:col-span-5 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-slate-100 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-white uppercase tracking-wider">
                    <Search className="w-4 h-4 text-amber-400" />
                    <span>Tra cứu nhanh vận đơn / Container</span>
                  </div>
                  <span className="text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                    Realtime Look-up
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Nhập số Cont, tên Khách hàng, Tuyến..."
                    className="w-full pl-9 pr-8 py-2.5 bg-white text-slate-900 placeholder-slate-400 text-xs rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-inner"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Live Search Results */}
                {searchQuery.trim() && (
                  <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100 text-slate-800 text-xs">
                    {searchResults.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-[11px]">
                        Không tìm thấy chuyến hàng phù hợp với từ khóa "{searchQuery}"
                      </div>
                    ) : (
                      searchResults.map(rec => (
                        <div
                          key={rec.id}
                          onClick={() => onOpenReceiptModal(rec)}
                          className="p-2.5 hover:bg-indigo-50 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono font-bold text-indigo-700 flex items-center gap-1.5">
                              <span>Cont: {rec.cont_number}</span>
                              <span className="text-[10px] text-slate-500 font-sans font-normal">({rec.delivery_date})</span>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate max-w-[240px]">
                              {rec.customer} • {rec.route}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rec.hd_dau_ra ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {rec.hd_dau_ra ? 'Đã có HĐ' : 'Chưa HĐ'}
                            </span>
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                  <span>Tổng cont hệ thống: <b>{stats.totalConts}</b> cont</span>
                  <button
                    onClick={() => onSwitchTab('entry')}
                    className="hover:underline text-blue-300 flex items-center gap-0.5 font-semibold"
                  >
                    Xem tất cả <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. REAL-TIME KPI STATS SECTION (Customizable) */}
      {w.quickStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onSwitchTab('entry')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Tổng Chuyến Vận Chuyển</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalTrips}</span>
              <span className="text-xs text-slate-500 font-medium">({stats.totalConts} conts)</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <span>Xem chi tiết vận chuyển</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onSwitchTab('general_work')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Tờ Khai Hải Quan</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalCustoms}</span>
              <span className="text-xs text-emerald-600 font-semibold">({stats.completedCustoms} hoàn thành)</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <span>Đã duyệt: {stats.approvedCustoms} tờ khai</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onSwitchTab('category')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Đối Tác & Mạng Lưới</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.activeCustomers}</span>
              <span className="text-xs text-slate-500 font-medium">khách hàng</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-700 font-medium flex items-center gap-1">
              <span>{stats.activeTransporters} nhà xe • {stats.activeWarehouses} kho xưởng</span>
            </div>
          </div>

          <div
            onClick={() => {
              if (currentUser && hasPermission(currentUser, 'finance', 'view')) onSwitchTab('finance');
              else onSwitchTab('entry');
            }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Tỷ Lệ Hoàn Thành HĐ</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700 font-mono">{stats.invoiceCompletionRate}%</span>
              <span className="text-xs text-slate-500 font-medium">đầy đủ hóa đơn</span>
            </div>
            <div className="mt-2 text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              <span>Đồng bộ chứng từ tức thì</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. QUICK ACTIONS SHORTCUTS (Customizable) */}
      {w.quickActions && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{dashboardSettings.customShortcutsTitle || 'Lối tắt tác vụ nhanh (Quick Shortcuts)'}</span>
            </h3>
            <span className="text-[11px] text-slate-400">Dành cho Admin, Quản lý & Nhân viên</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <button
              onClick={onOpenNewTripModal}
              className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition text-left flex flex-col justify-between space-y-2 group shadow-2xs"
            >
              <PlusCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
              <div>
                <div className="font-bold text-xs">Thêm Chuyến Hàng</div>
                <div className="text-[10px] text-blue-600/80">Nhập cont mới</div>
              </div>
            </button>

            <button
              onClick={() => onSwitchTab('general_work')}
              className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition text-left flex flex-col justify-between space-y-2 group shadow-2xs"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
              <div>
                <div className="font-bold text-xs">Khai Báo Hải Quan</div>
                <div className="text-[10px] text-emerald-600/80">Quản lý tờ khai</div>
              </div>
            </button>

            <button
              onClick={() => onSwitchTab('utilities')}
              className="p-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition text-left flex flex-col justify-between space-y-2 group shadow-2xs"
            >
              <Search className="w-5 h-5 text-cyan-600 group-hover:scale-110 transition" />
              <div>
                <div className="font-bold text-xs">Tra Cứu MST Online</div>
                <div className="text-[10px] text-cyan-600/80">masothue.com API</div>
              </div>
            </button>

            <button
              onClick={() => onSwitchTab('category')}
              className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition text-left flex flex-col justify-between space-y-2 group shadow-2xs"
            >
              <FolderTree className="w-5 h-5 text-amber-600 group-hover:scale-110 transition" />
              <div>
                <div className="font-bold text-xs">Danh Mục Chuẩn</div>
                <div className="text-[10px] text-amber-600/80">Kho, nhà xe, tuyến</div>
              </div>
            </button>

            {currentUser && hasPermission(currentUser, 'finance', 'view') && (
              <button
                onClick={() => onSwitchTab('finance')}
                className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition text-left flex flex-col justify-between space-y-2 group shadow-2xs"
              >
                <DollarSign className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition" />
                <div>
                  <div className="font-bold text-xs">Báo Cáo Tài Chính</div>
                  <div className="text-[10px] text-indigo-600/80">Cước & Tạm ứng</div>
                </div>
              </button>
            )}

            {currentUser && hasPermission(currentUser, 'gdrive', 'view') && (
              <button
                onClick={() => onSwitchTab('gdrive')}
                className="p-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition text-left flex flex-col justify-between space-y-2 group shadow-2xs"
              >
                <ShieldCheck className="w-5 h-5 text-teal-600 group-hover:scale-110 transition" />
                <div>
                  <div className="font-bold text-xs">Sao Lưu Google Drive</div>
                  <div className="text-[10px] text-teal-600/80">Đồng bộ Cloud</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. RECENT ACTIVITIES: SHIPMENTS & CUSTOMS (Customizable) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {w.recentShipments && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-900">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Chuyến Vận Chuyển Gần Đây</span>
              </div>
              <button
                onClick={() => onSwitchTab('entry')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-0.5"
              >
                Xem tất cả ({records.length}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {visibleRecords.slice(0, 5).map(rec => (
                <div key={rec.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-900">{rec.cont_number}</span>
                      <span className="text-[11px] text-slate-400">({rec.delivery_date})</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium truncate max-w-[260px]">
                      {rec.customer} • <span className="text-slate-500">{rec.route}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenReceiptModal(rec)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Xem Biên bản giao hàng & hóa đơn hạ vỏ"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rec.hd_dau_ra ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {rec.hd_dau_ra ? 'Đã HĐ' : 'Chưa HĐ'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {w.recentCustoms && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-900">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Tờ Khai Hải Quan Mới Nhất</span>
              </div>
              <button
                onClick={() => onSwitchTab('general_work')}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-0.5"
              >
                Xem tất cả ({declarations.length}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {visibleDeclarations.slice(0, 5).map(d => (
                <div key={d.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-900">TK: {d.declaration_number}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.2 rounded border border-emerald-200">
                        {d.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium truncate max-w-[260px]">
                      {d.customer} • <span className="text-slate-500">{d.cont_quantity || 1} cont/lô</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.approved ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {d.approved ? 'Đã duyệt' : 'Chờ duyệt'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {d.completed ? 'Hoàn thành' : 'Đang xử lý'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. SERVICES SHOWCASE SECTION (SPV Logistics Services) */}
      {w.servicesShowcase && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Dịch Vụ Nòng Cốt SPV Logistics
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Giải Pháp Logistics & Hải Quan Toàn Diện
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Đồng hành cùng sự phát triển của doanh nghiệp với quy trình vận hành khép kín và công nghệ số hóa hiện đại.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200 hover:border-blue-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Vận Tải Container Đường Bộ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Đội ngũ xe đầu kéo hiện đại, vận chuyển container từ cảng Hải Phòng, Cái Mép, Cát Lái đến các nhà máy, KCN trên toàn quốc an toàn và đúng hẹn.
              </p>
              <ul className="text-[11px] text-slate-500 space-y-1 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Kéo cont hàng, cont rỗng, hàng quá khổ
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Theo dõi hành trình và cập nhật phơi nâng hạ
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200 hover:border-emerald-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Thủ Tục Hải Quan & Thông Quan</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dịch vụ khai báo hải quan điện tử VNACCS/VCIS chuyên nghiệp cho hàng xuất nhập khẩu kinh doanh, gia công, sản xuất xuất khẩu và tại chỗ.
              </p>
              <ul className="text-[11px] text-slate-500 space-y-1 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Xử lý thông quan luồng xanh, vàng, đỏ nhanh gọn
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Tư vấn mã HS Code và biểu thuế tối ưu
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200 hover:border-amber-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Kho Bãi & Dịch Vụ Cước Trọn Gói</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hệ thống kho bãi lưu trữ tiêu chuẩn, dịch vụ đóng gói, nâng hạ và giải pháp quản lý cước, hóa đơn vận tải tự động minh bạch cho đối tác.
              </p>
              <ul className="text-[11px] text-slate-500 space-y-1 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Tích hợp tra cứu MST masothue.com tự động
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Xuất biên bản giao nhận & HĐ hạ vỏ nhanh chóng
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 6. COMPANY STRENGTHS & WAREHOUSE NETWORK (Customizable) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {w.companyStrengths && (
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Năng Lực Vận Hành & Cam Kết SPV</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Đúng Giờ & An Toàn 100%</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cam kết tiến độ giao hàng và bảo toàn nguyên vẹn hàng hóa niêm phong chì seal.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Mạng Lưới Tuyến Đường Phủ Rộng</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kết nối thông suốt các tuyến Hải Phòng, Hà Nội, Bắc Ninh, Hưng Yên, Vĩnh Phúc, Hải Dương.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Chi Phí Tối Ưu & Minh Bạch</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Báo giá cạnh tranh, không phát sinh chi phí ẩn, quản lý công nợ và tạm ứng rõ ràng.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Đội Ngũ Điều Hành Hỗ Trợ 24/7</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Nhân sự giàu kinh nghiệm xử lý nhanh các tình huống phát sinh tại cảng và kho bãi.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Support & Hotline */}
        {w.hotlineSupport && (
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-indigo-800/50 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                <PhoneCall className="w-3 h-3" />
                <span>Trung Tâm Điều Hành SPV</span>
              </div>
              <h3 className="font-bold text-base text-white">Hỗ Trợ Khách Hàng & Đối Tác</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Liên hệ ngay phòng điều vận và chăm sóc khách hàng để được báo giá và hỗ trợ thủ tục nhanh nhất.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono font-bold text-white">Hotline: 0988.xxx.xxx / 0912.xxx.xxx</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>ops@spv.biz.vn / logistics@spv.biz.vn</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>CÔNG TY TNHH SPV GROUP</span>
              </div>
            </div>

            <button
              onClick={() => onSwitchTab('entry')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition text-center shadow-xs"
            >
              Vào Hệ Thống Điều Hành
            </button>
          </div>
        )}
      </div>

      {/* 7. CUSTOMIZATION MODAL (TÙY BIẾN GIAO DIỆN DASHBOARD) */}
      {isCustomizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Tùy Biến Giao Diện Dashboard</h3>
                  <p className="text-[11px] text-slate-400">Tùy chỉnh khối hiển thị, chủ đề màu và khẩu hiệu công ty</p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                  Chủ Đề Màu Sắc (Theme Style)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'blue_ocean', name: 'SPV Navy Blue', color: 'bg-blue-600', border: 'border-blue-500' },
                    { id: 'teal_modern', name: 'Logistics Teal', color: 'bg-teal-600', border: 'border-teal-500' },
                    { id: 'dark_slate', name: 'Dark Slate Tech', color: 'bg-slate-900', border: 'border-slate-700' },
                    { id: 'amber_energy', name: 'Sunrise Amber', color: 'bg-amber-600', border: 'border-amber-500' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTempSettings(prev => ({ ...prev, themeStyle: t.id as any }))}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
                        tempSettings.themeStyle === t.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-full h-6 rounded-lg ${t.color}`} />
                      <span className="font-bold text-[11px] text-slate-900">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Slogan Customization */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <label className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                  Nội Dung Banner & Khẩu Hiệu
                </label>
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Tiêu đề Banner chính:</span>
                  <input
                    type="text"
                    value={tempSettings.heroTitle}
                    onChange={e => setTempSettings(prev => ({ ...prev, heroTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Mô tả / Slogan phụ:</span>
                  <textarea
                    rows={2}
                    value={tempSettings.heroSubtitle}
                    onChange={e => setTempSettings(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Dòng thông báo chạy đầu trang:</span>
                  <input
                    type="text"
                    value={tempSettings.announcementText}
                    onChange={e => setTempSettings(prev => ({ ...prev, announcementText: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Widget Toggle Checklist */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <label className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                  Bật / Tắt Các Khối Hiển Thị (Widgets)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'heroBanner', label: 'Khối Banner Hero & Giới thiệu' },
                    { key: 'quickTracking', label: 'Hộp Tra Cứu Vận Đơn Nhanh' },
                    { key: 'quickStats', label: 'Thống Kê KPI Thời Gian Thực' },
                    { key: 'quickActions', label: 'Lối Tắt Tác Vụ Nhanh (Shortcuts)' },
                    { key: 'recentShipments', label: 'Bảng Chuyến Hàng Gần Đây' },
                    { key: 'recentCustoms', label: 'Bảng Tờ Khai Hải Quan Mới' },
                    { key: 'servicesShowcase', label: 'Khu Vực Dịch Vụ Nòng Cốt SPV' },
                    { key: 'companyStrengths', label: 'Năng Lực & Cam Kết Vận Hành' },
                    { key: 'hotlineSupport', label: 'Khối Hotline & Hỗ Trợ 24/7' },
                  ].map(item => {
                    const isChecked = tempSettings.widgets[item.key as keyof typeof tempSettings.widgets];
                    return (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e =>
                            setTempSettings(prev => ({
                              ...prev,
                              widgets: {
                                ...prev.widgets,
                                [item.key]: e.target.checked
                              }
                            }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800 text-xs">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl border border-slate-300 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveCustomization}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Áp dụng cấu hình</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
