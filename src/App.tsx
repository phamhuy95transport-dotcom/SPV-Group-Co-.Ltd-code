import React, { useState, useEffect } from 'react';
import {
  UserAccount,
  UserRole,
  ShipmentRecord,
  WarehouseItem,
  TransporterItem,
  CustomerItem,
  RouteItem,
  ActiveTab,
  CatalogSubTab,
  WorkSubTab,
  FinanceSubTab,
  CustomsDeclarationRecord,
  KPIRateItem,
  CustomerQuotation,
  EmployeeAdvanceItem,
  canDeleteUser,
  hasPermission,
  UserPermissions,
  getDefaultPermissions
} from './types';
import {
  DEFAULT_USERS,
  DEFAULT_SHIPMENTS,
  DEFAULT_WAREHOUSES,
  DEFAULT_TRANSPORTERS,
  DEFAULT_CUSTOMERS,
  DEFAULT_ROUTES,
  DEFAULT_KPI_RATES,
  DEFAULT_CUSTOMS_DECLARATIONS,
  DEFAULT_CUSTOMER_QUOTATIONS,
  DEFAULT_EMPLOYEE_ADVANCES,
  saveRecordToCloud,
  deleteRecordFromCloud,
  subscribeToCloudCollection,
  LOCAL_STORAGE_KEY
} from './lib/firebase';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ShipmentTable } from './components/ShipmentTable';
import { ShipmentModal } from './components/ShipmentModal';
import { DeliveryReceiptModal } from './components/DeliveryReceiptModal';
import { CatalogManager } from './components/CatalogManager';
import { FinancialReport } from './components/FinancialReport';
import { CustomsProcedureManager } from './components/CustomsProcedureManager';
import { KPIManager } from './components/KPIManager';
import { CustomsReport } from './components/CustomsReport';
import { CustomerQuotationManager } from './components/CustomerQuotationManager';
import { EmployeeAdvanceManager } from './components/EmployeeAdvanceManager';
import { UtilitiesManager } from './components/UtilitiesManager';
import { GoogleDriveManager } from './components/GoogleDriveManager';
import { WelcomeModal } from './components/WelcomeModal';
import { Toast, ToastState } from './components/Toast';
import { Trash2, Briefcase, DollarSign, FileSpreadsheet, BarChart3, Award, Tag, Wallet } from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  "Mỗi ngày là một món quà. Hãy trân trọng và tận hưởng nó.",
  "Đừng đếm những gì bạn đã mất, hãy quý trọng những gì bạn đang có và lên kế hoạch cho những gì sẽ đạt được.",
  "Nụ cười là chiếc chìa khóa mở cửa trái tim.",
  "Có công mài sắt, có ngày nên kim.",
  "Hãy làm việc bằng sự tận tâm, thành công sẽ đến với bạn.",
  "Lao động hăng say, vận may sẽ đến.",
  "Không có áp lực, không có kim cương.",
  "Một nụ cười bằng mười thang thuốc bổ. Hãy làm việc thật vui vẻ nhé!",
  "Hành trình vạn dặm bắt đầu từ một bước chân.",
  "Người bi quan nhìn thấy khó khăn trong mỗi cơ hội. Người lạc quan nhìn thấy cơ hội trong mỗi khó khăn."
];

export default function App() {
  // Current logged in user (Defaults to null - logged out)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Main Data States
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);
  const [records, setRecords] = useState<ShipmentRecord[]>(DEFAULT_SHIPMENTS);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>(DEFAULT_WAREHOUSES);
  const [transporters, setTransporters] = useState<TransporterItem[]>(DEFAULT_TRANSPORTERS);
  const [customers, setCustomers] = useState<CustomerItem[]>(DEFAULT_CUSTOMERS);
  const [routes, setRoutes] = useState<RouteItem[]>(DEFAULT_ROUTES);
  const [declarations, setDeclarations] = useState<CustomsDeclarationRecord[]>(DEFAULT_CUSTOMS_DECLARATIONS);
  const [kpiRates, setKpiRates] = useState<KPIRateItem[]>(DEFAULT_KPI_RATES);
  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({});
  const [quotations, setQuotations] = useState<CustomerQuotation[]>(DEFAULT_CUSTOMER_QUOTATIONS);
  const [advances, setAdvances] = useState<EmployeeAdvanceItem[]>(DEFAULT_EMPLOYEE_ADVANCES);

  // App UI & Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('entry');
  const [activeSubTab, setActiveSubTab] = useState<CatalogSubTab>('warehouse');
  const [workSubTab, setWorkSubTab] = useState<WorkSubTab>('customs');
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>('report_shipment');
  const [isConnected, setIsConnected] = useState(true);


  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | '2fa_setup' | 'change_password' | 'forgot_password'>('login');
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [randomQuote, setRandomQuote] = useState('');
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editProfileNameInput, setEditProfileNameInput] = useState('');
  
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [shipmentModalMode, setShipmentModalMode] = useState<'add' | 'edit'>('add');
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<ShipmentRecord | null>(null);

  // Confirm Delete Dialog
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'shipment' | 'catalog' | 'customs' | 'advance' | 'quotation';
    id: string;
    ids?: string[];
    subTab?: CatalogSubTab;
    name: string;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Setup Firebase / LocalStorage Sync
  useEffect(() => {
    // 1. Subscribe to Firebase Realtime DB collections
    const unsubShipments = subscribeToCloudCollection('shipments', (data) => {
      if (data && data.length > 0) {
        setRecords(data as ShipmentRecord[]);
      }
    });

    const unsubWarehouses = subscribeToCloudCollection('warehouses', (data) => {
      if (data && data.length > 0) setWarehouses(data as WarehouseItem[]);
    });

    const unsubTransporters = subscribeToCloudCollection('transporters', (data) => {
      if (data && data.length > 0) setTransporters(data as TransporterItem[]);
    });

    const unsubCustomers = subscribeToCloudCollection('customers', (data) => {
      if (data && data.length > 0) setCustomers(data as CustomerItem[]);
    });

    const unsubRoutes = subscribeToCloudCollection('routes', (data) => {
      if (data && data.length > 0) setRoutes(data as RouteItem[]);
    });

    const unsubDeclarations = subscribeToCloudCollection('customs', (data) => {
      if (data && data.length > 0) setDeclarations(data as CustomsDeclarationRecord[]);
    });

    const unsubKpiRates = subscribeToCloudCollection('kpi_rates', (data) => {
      if (data && data.length > 0) setKpiRates(data as KPIRateItem[]);
    });

    const unsubPaid = subscribeToCloudCollection('customs_paid', (data) => {
      if (data && Array.isArray(data)) {
        const map: Record<string, number> = {};
        data.forEach((item: any) => {
          if (item && item.id && typeof item.amount === 'number') {
            map[item.id] = item.amount;
          }
        });
        setPaidAmounts(map);
      }
    });

    const unsubQuotations = subscribeToCloudCollection('quotations', (data) => {
      if (data && data.length > 0) setQuotations(data as CustomerQuotation[]);
    });

    const unsubAdvances = subscribeToCloudCollection('advances', (data) => {
      if (data && data.length > 0) setAdvances(data as EmployeeAdvanceItem[]);
    });

    const unsubUsers = subscribeToCloudCollection('users', (data) => {
      const userMap = new Map<string, UserAccount & { password?: string }>();
      DEFAULT_USERS.forEach(u => userMap.set(u.email.toLowerCase(), { ...u }));
      if (data && Array.isArray(data) && data.length > 0) {
        data.forEach((u: any) => {
          if (u && u.email) {
            const emailKey = u.email.toLowerCase();
            const existing = userMap.get(emailKey);
            userMap.set(emailKey, {
              ...existing,
              ...u,
              password: u.password || existing?.password || (u.role === 'admin' ? 'admin123' : '')
            });
          }
        });
      }
      setUsers(Array.from(userMap.values()));
    });

    return () => {
      unsubShipments();
      unsubWarehouses();
      unsubTransporters();
      unsubCustomers();
      unsubRoutes();
      unsubDeclarations();
      unsubKpiRates();
      unsubPaid();
      unsubQuotations();
      unsubAdvances();
      unsubUsers();
    };
  }, []);

  const handleUpdatePaidAmount = async (key: string, amount: number) => {
    setPaidAmounts(prev => ({ ...prev, [key]: amount }));
    await saveRecordToCloud('customs_paid', key, { id: key, amount });
  };

  // Handlers for Quotations
  const handleSaveQuotation = async (item: CustomerQuotation) => {
    if (!hasPermission(currentUser, 'finance_quotations', 'edit')) {
      showToast('Bạn chưa được cấp quyền chỉnh sửa Báo giá.', 'error');
      return;
    }
    setQuotations(prev => {
      const idx = prev.findIndex(q => q.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
    await saveRecordToCloud('quotations', item.id, item);
    showToast('Lưu báo giá khách hàng thành công!');
  };

  const handleDeleteQuotation = (id: string, name: string) => {
    if (!hasPermission(currentUser, 'finance_quotations', 'edit')) {
      showToast('Bạn chưa được cấp quyền chỉnh sửa Báo giá.', 'error');
      return;
    }
    setDeleteTarget({
      type: 'quotation',
      id,
      name
    });
    setIsConfirmDeleteOpen(true);
  };

  // Handlers for Employee Advances
  const handleSaveAdvance = async (item: EmployeeAdvanceItem) => {
    if (!hasPermission(currentUser, 'finance_advances', 'edit')) {
      showToast('Bạn chưa được cấp quyền chỉnh sửa Tạm ứng.', 'error');
      return;
    }
    setAdvances(prev => {
      const idx = prev.findIndex(a => a.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
    await saveRecordToCloud('advances', item.id, item);
    showToast('Lưu khoản tạm ứng nhân viên thành công!');
  };

  const handleDeleteAdvance = (id: string, name: string) => {
    if (!hasPermission(currentUser, 'finance_advances', 'edit')) {
      showToast('Bạn chưa được cấp quyền chỉnh sửa Tạm ứng.', 'error');
      return;
    }
    setDeleteTarget({
      type: 'advance',
      id,
      name
    });
    setIsConfirmDeleteOpen(true);
  };

  const handleToggleAdvanceApproval = async (id: string, currentApproved: boolean) => {
    if (currentUser?.role !== 'admin') {
      showToast('Chỉ Quản trị viên mới có quyền Duyệt khoản tạm ứng.', 'error');
      return;
    }
    const newApproved = !currentApproved;
    setAdvances(prev => prev.map(a => a.id === id ? { ...a, approved: newApproved } : a));
    const target = advances.find(a => a.id === id);
    if (target) {
      const updated = { ...target, approved: newApproved };
      await saveRecordToCloud('advances', id, updated);
      showToast(newApproved ? 'Đã duyệt khoản tạm ứng!' : 'Đã hủy duyệt khoản tạm ứng.');
    }
  };

  const totalPaidAmount = Object.values(paidAmounts).reduce((sum: number, val: number) => sum + (val || 0), 0);

  // Filter out pending users count for header badge
  const pendingUsersCount = users.filter(u => u.status === 'pending').length;

  // Handlers for User Authentication & Registration
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    showToast(`Đăng nhập thành công với vai trò ${user.role.toUpperCase()}!`);
    
    // Show Welcome Modal with a random quote
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setRandomQuote(quote);
    setIsWelcomeModalOpen(true);

    // Redirect if customer lands on forbidden tab
    if (user.role === 'customer' && (activeTab === 'category' || activeTab === 'report' || activeTab === 'users')) {
      setActiveTab('entry');
    }
    if ((user.role === 'employee_logistics' || user.role === 'employee_accounting' || user.role === ('employee' as any)) && (activeTab === 'report' || activeTab === 'users')) {
      setActiveTab('entry');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('entry');
    showToast('Đã đăng xuất khỏi hệ thống.', 'info');
  };

  const handleRegisterEmployee = async (newUserData: Omit<UserAccount, 'id' | 'createdAt'> & { password?: string }) => {
    const newId = 'u_' + Date.now();
    const newUser: UserAccount = {
      ...newUserData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [newUser, ...prev]);
    await saveRecordToCloud('users', newId, newUser);
    showToast('Yêu cầu đăng ký tài khoản đã được gửi đến Quản trị viên!');
  };

  const handleApproveUser = async (userId: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, status: 'active' as const } : u))
    );
    const updated = users.find(u => u.id === userId);
    if (updated) {
      const activeUser = { ...updated, status: 'active' as const };
      await saveRecordToCloud('users', userId, activeUser);
      showToast(`Đã duyệt tài khoản cho ${activeUser.name}!`);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, status: 'rejected' as const } : u))
    );
    const updated = users.find(u => u.id === userId);
    if (updated) {
      const rejectedUser = { ...updated, status: 'rejected' as const };
      await saveRecordToCloud('users', userId, rejectedUser);
      showToast(`Đã từ chối tài khoản ${rejectedUser.name}!`, 'info');
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.email.trim().toLowerCase() === 'admin@spv.biz.vn') {
      showToast('Không thể thay đổi vai trò của tài khoản tối cao admin@spv.biz.vn.', 'error');
      return;
    }
    if (targetUser?.role === 'admin' && currentUser?.email.trim().toLowerCase() !== 'admin@spv.biz.vn') {
      showToast('Chỉ tài khoản admin@spv.biz.vn mới có quyền thay đổi vai trò của Quản trị viên.', 'error');
      return;
    }

    const defaultPerms = getDefaultPermissions(newRole);
    const updatedRoleUser: UserAccount = {
      ...(targetUser || {}),
      id: userId,
      name: targetUser?.name || 'Người dùng',
      email: targetUser?.email || '',
      role: newRole,
      status: targetUser?.status || 'active',
      customer_name: newRole === 'customer' ? targetUser?.customer_name : undefined,
      permissions: (newRole === 'manager' || newRole === 'admin') ? defaultPerms : (targetUser?.permissions || defaultPerms),
      createdAt: targetUser?.createdAt || new Date().toISOString()
    };

    setUsers(prev =>
      prev.map(u => (u.id === userId ? updatedRoleUser : u))
    );
    if (targetUser) {
      await saveRecordToCloud('users', userId, updatedRoleUser);
      if (currentUser?.id === userId) {
        setCurrentUser(updatedRoleUser);
      }
      const roleName = newRole === 'manager' ? 'QUẢN LÝ (MANAGER)' : newRole === 'admin' ? 'QUẢN TRỊ VIÊN (ADMIN)' : newRole.toUpperCase();
      showToast(`Đã cập nhật vai trò thành ${roleName}`);
    }
  };

  const handleChangeUserCustomerName = async (userId: string, customerName: string) => {
    const targetUser = users.find(u => u.id === userId);
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, customer_name: customerName } : u))
    );
    if (targetUser) {
      const updatedUser = { ...targetUser, customer_name: customerName };
      await saveRecordToCloud('users', userId, updatedUser);
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }
      showToast(`Đã gắn tài khoản với khách hàng: ${customerName || 'Chưa chọn'}`);
    }
  };

  const handleChangeUserPermissions = async (userId: string, permissions: UserPermissions) => {
    const targetUser = users.find(u => u.id === userId);
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, permissions } : u))
    );
    if (targetUser) {
      const updatedUser = { ...targetUser, permissions };
      await saveRecordToCloud('users', userId, updatedUser);
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }
      showToast(`Đã cập nhật phân quyền quản lý cho tài khoản.`);
    }
  };

  const handleChangeUserName = async (userId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showToast('Họ và tên đăng ký không được để trống.', 'error');
      return;
    }
    let updatedUser: UserAccount | null = null;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          updatedUser = { ...u, name: trimmedName };
          return updatedUser;
        }
        return u;
      })
    );

    if (currentUser?.id === userId) {
      setCurrentUser(prev => (prev ? { ...prev, name: trimmedName } : null));
    }

    const userToSave = updatedUser || (currentUser?.id === userId ? { ...currentUser, name: trimmedName } : users.find(u => u.id === userId));
    if (userToSave) {
      await saveRecordToCloud('users', userId, userToSave);
    }

    showToast(`Đã cập nhật họ tên đăng ký thành: ${trimmedName}`);
  };

  const handleResetUserPassword = async (userId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Chỉ Quản trị viên hoặc Quản lý mới có quyền reset mật khẩu.', 'error');
      return;
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const DEFAULT_RESET_PASSWORD = '27072026';
    const updatedUser: UserAccount = { ...targetUser, password: DEFAULT_RESET_PASSWORD };

    setUsers(prev =>
      prev.map(u => (u.id === userId ? updatedUser : u))
    );

    if (currentUser?.id === userId) {
      setCurrentUser(prev => (prev ? { ...prev, password: DEFAULT_RESET_PASSWORD } : null));
    }

    await saveRecordToCloud('users', userId, updatedUser);
    showToast(`Đã reset mật khẩu của ${targetUser.name} về mặc định: ${DEFAULT_RESET_PASSWORD}`);
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      const check = canDeleteUser(currentUser, targetUser);
      if (!check.allowed) {
        showToast(check.reason || 'Bạn không có quyền xóa tài khoản này.', 'error');
        return;
      }
    }

    setUsers(prev => prev.filter(u => u.id !== userId));
    await deleteRecordFromCloud('users', userId);
    showToast('Đã xóa tài khoản khỏi hệ thống.');
  };

  const handleUpdateUserPassword = async (userId: string, newPassword: string) => {
    let updatedUser: UserAccount | null = null;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          updatedUser = { ...u, password: newPassword };
          return updatedUser;
        }
        return u;
      })
    );

    if (currentUser?.id === userId) {
      setCurrentUser(prev => (prev ? { ...prev, password: newPassword } : null));
    }

    const userToSave = updatedUser || (currentUser?.id === userId ? { ...currentUser, password: newPassword } : users.find(u => u.id === userId));
    if (userToSave) {
      const recordToSave = { ...userToSave, password: newPassword };
      await saveRecordToCloud('users', userId, recordToSave);
    }

    showToast('Đã cập nhật mật khẩu tài khoản thành công!');
  };

  // Customs Declaration Handlers
  const handleSaveDeclaration = async (record: CustomsDeclarationRecord) => {
    if (!hasPermission(currentUser, 'customs', 'edit')) {
      showToast('Tài khoản của bạn chưa được cấp quyền chỉnh sửa thủ tục hải quan.', 'error');
      return;
    }
    setDeclarations(prev => {
      const exists = prev.some(d => d.id === record.id);
      if (exists) return prev.map(d => (d.id === record.id ? record : d));
      return [record, ...prev];
    });
    await saveRecordToCloud('customs', record.id, record);
    showToast('Đã lưu thông tin tờ khai hải quan!');
  };

  const handleDeleteDeclaration = (id: string, name: string) => {
    if (!hasPermission(currentUser, 'customs', 'edit')) {
      showToast('Tài khoản của bạn chưa được cấp quyền chỉnh sửa thủ tục hải quan.', 'error');
      return;
    }
    setDeleteTarget({
      type: 'customs',
      id,
      name
    });
    setIsConfirmDeleteOpen(true);
  };

  const handleToggleDeclarationApproved = async (id: string, currentApproved: boolean) => {
    if (currentUser?.role !== 'admin') {
      showToast('Chỉ Quản trị viên mới có quyền Duyệt tờ khai.', 'error');
      return;
    }
    let updated: CustomsDeclarationRecord | null = null;
    const todayStr = new Date().toISOString().split('T')[0];
    setDeclarations(prev =>
      prev.map(d => {
        if (d.id === id) {
          const nextApproved = !currentApproved;
          const nextApprovedDate = nextApproved ? (d.approved_date || d.completed_date || d.execution_date || todayStr) : undefined;
          updated = { ...d, approved: nextApproved, approved_date: nextApprovedDate };
          return updated;
        }
        return d;
      })
    );
    if (updated) {
      await saveRecordToCloud('customs', id, updated);
      showToast((updated as CustomsDeclarationRecord).approved ? 'Đã duyệt tờ khai!' : 'Đã hủy duyệt tờ khai.');
    }
  };

  const handleToggleDeclarationCompleted = async (id: string, currentCompleted: boolean) => {
    if (!hasPermission(currentUser, 'customs', 'edit')) {
      showToast('Tài khoản của bạn chưa được cấp quyền chỉnh sửa thủ tục hải quan.', 'error');
      return;
    }
    let updated: CustomsDeclarationRecord | null = null;
    setDeclarations(prev =>
      prev.map(d => {
        if (d.id === id) {
          const nextCompleted = !currentCompleted;
          const rateObj = kpiRates.find(r => r.type_name === d.type);
          const baseReward = rateObj ? rateObj.reward_amount : (d.type === 'Xuất khẩu' || d.type === 'Nhập khẩu' ? 30000 : 25000);
          const ratioNum = d.support_transfer?.ratio || 1;
          const qty = (d.cont_quantity && d.cont_quantity > 0) ? d.cont_quantity : 1;
          const roundedRatio = Math.round(ratioNum * 1000) / 1000;
          const extraBonus = d.extra_bonus || 0;
          const newKpi = nextCompleted ? Math.max(0, Math.round((baseReward * qty) - (baseReward * roundedRatio) + Number(extraBonus))) : 0;
          const todayStr = new Date().toISOString().split('T')[0];
          const nextCompletedDate = nextCompleted ? (d.completed_date || d.execution_date || todayStr) : undefined;

          updated = { ...d, completed: nextCompleted, kpi_amount: newKpi, completed_date: nextCompletedDate };
          return updated;
        }
        return d;
      })
    );
    if (updated) {
      await saveRecordToCloud('customs', id, updated);
      showToast((updated as CustomsDeclarationRecord).completed ? 'Đã hoàn thành tờ khai!' : 'Đã chuyển trạng thái chưa hoàn thành.');
    }
  };

  const handleToggleDeclarationDamage = async (id: string, currentHasDamage: boolean) => {
    if (currentUser?.role !== 'admin') {
      showToast('Chỉ Quản trị viên mới có quyền chuyển trạng thái Phát sinh gây thiệt hại.', 'error');
      return;
    }
    let updated: CustomsDeclarationRecord | null = null;
    setDeclarations(prev =>
      prev.map(d => {
        if (d.id === id) {
          updated = { ...d, has_damage: !currentHasDamage };
          return updated;
        }
        return d;
      })
    );
    if (updated) {
      await saveRecordToCloud('customs', id, updated);
      showToast((updated as CustomsDeclarationRecord).has_damage ? 'Đã ghi nhận: Có phát sinh gây thiệt hại!' : 'Đã chuyển trạng thái: Không phát sinh gây thiệt hại.');
    }
  };

  const handleUpdateKPIRates = async (newRates: KPIRateItem[]) => {
    if (!hasPermission(currentUser, 'finance_kpi', 'edit')) {
      showToast('Bạn chưa được cấp quyền chỉnh sửa KPI.', 'error');
      return;
    }
    setKpiRates(newRates);
    for (const rate of newRates) {
      await saveRecordToCloud('kpi_rates', rate.id, rate);
    }
    showToast('Đã cập nhật định mức thưởng KPI!');
  };

  const handleUpdateUser2FA = async (userId: string, secret: string, enabled: boolean) => {
    let updatedUser: UserAccount | null = null;

    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          updatedUser = { ...u, totpSecret: secret, totpEnabled: enabled };
          return updatedUser;
        }
        return u;
      })
    );

    if (currentUser?.id === userId) {
      setCurrentUser(prev => (prev ? { ...prev, totpSecret: secret, totpEnabled: enabled } : null));
    }

    const userToSave = updatedUser || (currentUser?.id === userId ? { ...currentUser, totpSecret: secret, totpEnabled: enabled } : users.find(u => u.id === userId));
    if (userToSave) {
      const recordToSave = { ...userToSave, totpSecret: secret, totpEnabled: enabled };
      await saveRecordToCloud('users', userId, recordToSave);
    }

    showToast('Đã kích hoạt Google Authenticator 2FA thành công!');
  };

  // Shipment CRUD Operations
  const handleOpenNewTripModal = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để nhập dữ liệu chuyến mới.', 'error');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    if (!hasPermission(currentUser, 'shipments', 'edit')) {
      showToast('Tài khoản của bạn không có quyền nhập chuyến mới.', 'error');
      return;
    }
    setSelectedShipment(null);
    setShipmentModalMode('add');
    setIsShipmentModalOpen(true);
  };

  const handleSaveShipment = async (shipmentData: Partial<ShipmentRecord>) => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để thực hiện thao tác này.', 'error');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const isAccountingUser = currentUser?.role === 'employee_accounting' || hasPermission(currentUser, 'finance', 'edit');
    if (!hasPermission(currentUser, 'shipments', 'edit') && !isAccountingUser) {
      showToast('Tài khoản của bạn chưa được cấp quyền thêm/sửa chuyến hàng.', 'error');
      return;
    }

    const recordId = shipmentData.id || 'rec_' + Date.now();
    const recordToSave: ShipmentRecord = {
      ...shipmentData,
      id: recordId,
      date_announced: shipmentData.date_announced || new Date().toISOString().split('T')[0],
      delivery_date: shipmentData.delivery_date || new Date().toISOString().split('T')[0],
      route: shipmentData.route || '',
      transporter: shipmentData.transporter || '',
      cont_number: shipmentData.cont_number || '',
      customer: shipmentData.customer || '',
      cont_quantity: Number(shipmentData.cont_quantity) || 1,
      base_price: Number(shipmentData.base_price) || 0,
      sale_price: Number(shipmentData.sale_price) || 0,
      return_invoice_type: shipmentData.return_invoice_type || 'customer',
      return_invoice_tax_code: shipmentData.return_invoice_tax_code || '',
      return_invoice_company_name: shipmentData.return_invoice_company_name || '',
      return_invoice_address: shipmentData.return_invoice_address || '',
      created_by: shipmentData.created_by || (currentUser ? {
        uid: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role
      } : undefined),
      createdAt: shipmentData.createdAt || new Date().toISOString()
    };

    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === recordId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = recordToSave;
        return copy;
      }
      return [recordToSave, ...prev];
    });

    await saveRecordToCloud('shipments', recordId, recordToSave);
    showToast(shipmentModalMode === 'add' ? 'Thêm mới chuyến hàng thành công!' : 'Cập nhật chuyến hàng thành công!');
  };

  const handleImportShipments = async (importedRecords: Partial<ShipmentRecord>[]) => {
    if (!hasPermission(currentUser, 'shipments', 'edit')) {
      showToast('Bạn không có quyền nhập dữ liệu từ Excel.', 'error');
      return;
    }

    const newRecords = importedRecords.map(data => {
      const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      return {
        ...data,
        id: recordId,
        date_announced: data.date_announced || new Date().toISOString().split('T')[0],
        delivery_date: data.delivery_date || new Date().toISOString().split('T')[0],
        route: data.route || '',
        transporter: data.transporter || '',
        cont_number: data.cont_number || '',
        customer: data.customer || '',
        cont_quantity: Number(data.cont_quantity) || 1,
        base_price: Number(data.base_price) || 0,
        sale_price: Number(data.sale_price) || 0,
        return_invoice_type: data.return_invoice_type || 'customer',
        return_invoice_tax_code: data.return_invoice_tax_code || '',
        return_invoice_company_name: data.return_invoice_company_name || '',
        return_invoice_address: data.return_invoice_address || '',
        created_by: {
          uid: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role
        },
        createdAt: new Date().toISOString()
      } as ShipmentRecord;
    });

    setRecords(prev => [...newRecords, ...prev]);
    
    // Save to Firebase concurrently
    await Promise.all(newRecords.map(record => saveRecordToCloud('shipments', record.id, record)));
    
    showToast(`Đã nhập thành công ${newRecords.length} chuyến hàng từ Excel!`);
  };

  const handleToggleCheckbox = async (record: ShipmentRecord, field: keyof ShipmentRecord) => {
    const isInvoiceField = field === 'hd_dich_vu' || field === 'hd_dau_ra' || field === 'hd_dau_vao';
    const isAccountingUser = currentUser?.role === 'employee_accounting' || hasPermission(currentUser, 'finance', 'edit') || currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const hasGeneralShipmentEdit = hasPermission(currentUser, 'shipments', 'edit');

    if (!isInvoiceField && !hasGeneralShipmentEdit) {
      showToast('Tài khoản của bạn chưa được cấp quyền chỉnh sửa chuyến hàng.', 'error');
      return;
    }
    if (isInvoiceField && !isAccountingUser && !hasGeneralShipmentEdit) {
      showToast('Bạn không có quyền chỉnh sửa trạng thái hóa đơn.', 'error');
      return;
    }

    const updated = { ...record, [field]: !record[field] };
    setRecords(prev => prev.map(r => (r.id === record.id ? updated : r)));
    await saveRecordToCloud('shipments', record.id, updated);
    
    let fieldLabel = String(field);
    if (field === 'hd_dich_vu' || field === 'hd_dau_vao') fieldLabel = 'HĐ đầu vào';
    else if (field === 'hd_dau_ra') fieldLabel = 'HĐ đầu ra';
    else if (field === 'phoi_nang') fieldLabel = 'Phơi nâng';
    else if (field === 'phoi_ha') fieldLabel = 'Phơi hạ';
    else if (field === 'hd_ha_rong') fieldLabel = 'HĐ hạ rỗng';

    showToast(`Đã cập nhật ${fieldLabel}: ${updated[field] ? 'Có' : 'Không'}`);
  };

  const handleDuplicateRecord = (record: ShipmentRecord) => {
    if (!hasPermission(currentUser, 'shipments', 'edit')) {
      showToast('Tài khoản của bạn chưa được cấp quyền thêm/sửa chuyến hàng.', 'error');
      return;
    }
    const cloned: ShipmentRecord = {
      ...record,
      id: 'rec_' + Date.now(),
      cont_number: record.cont_number + '-COPY',
      createdAt: new Date().toISOString()
    };
    setSelectedShipment(cloned);
    setShipmentModalMode('add');
    setIsShipmentModalOpen(true);
  };

  // Catalog CRUD Operations
  const handleSaveCatalogItem = async (subTab: CatalogSubTab, itemData: any) => {
    if (!hasPermission(currentUser, 'catalog', 'edit')) {
      showToast('Tài khoản của bạn chưa được cấp quyền chỉnh sửa danh mục.', 'error');
      return;
    }
    const id = itemData.id || subTab[0] + '_' + Date.now();
    const itemToSave = { ...itemData, id };

    const collectionMap: { [key in CatalogSubTab]: string } = {
      warehouse: 'warehouses',
      transporter: 'transporters',
      customer: 'customers',
      route: 'routes'
    };

    if (subTab === 'warehouse') {
      setWarehouses(prev => {
        const idx = prev.findIndex(x => x.id === id);
        return idx >= 0 ? prev.map(x => (x.id === id ? itemToSave : x)) : [itemToSave, ...prev];
      });
    } else if (subTab === 'transporter') {
      setTransporters(prev => {
        const idx = prev.findIndex(x => x.id === id);
        return idx >= 0 ? prev.map(x => (x.id === id ? itemToSave : x)) : [itemToSave, ...prev];
      });
    } else if (subTab === 'customer') {
      setCustomers(prev => {
        const idx = prev.findIndex(x => x.id === id);
        return idx >= 0 ? prev.map(x => (x.id === id ? itemToSave : x)) : [itemToSave, ...prev];
      });
    } else if (subTab === 'route') {
      setRoutes(prev => {
        const idx = prev.findIndex(x => x.id === id);
        return idx >= 0 ? prev.map(x => (x.id === id ? itemToSave : x)) : [itemToSave, ...prev];
      });
    }

    await saveRecordToCloud(collectionMap[subTab], id, itemToSave);
    showToast(`Đã lưu dữ liệu danh mục thành công!`);
  };

  const handleDeleteCatalogItem = (subTab: CatalogSubTab, id: string, name: string) => {
    if (!hasPermission(currentUser, 'catalog', 'edit')) {
      showToast('Tài khoản của bạn chưa được cấp quyền chỉnh sửa danh mục.', 'error');
      return;
    }
    setDeleteTarget({
      type: 'catalog',
      id,
      subTab,
      name
    });
    setIsConfirmDeleteOpen(true);
  };

  // Excel Import Handler
  const handleImportExcel = async (importedRecords: Partial<ShipmentRecord>[]) => {
    for (const item of importedRecords) {
      const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const newRec: ShipmentRecord = {
        id: recordId,
        date_announced: item.date_announced || new Date().toISOString().split('T')[0],
        delivery_date: item.delivery_date || new Date().toISOString().split('T')[0],
        route: item.route || '',
        transporter: item.transporter || '',
        cont_number: item.cont_number || '',
        customer: item.customer || '',
        batch_number: item.batch_number || '',
        cont_quantity: item.cont_quantity || 1,
        warehouse: item.warehouse || '',
        contact_person: item.contact_person || '',
        contact_phone: item.contact_phone || '',
        phoi_nang: item.phoi_nang || false,
        phoi_ha: item.phoi_ha || false,
        hd_ha_rong: item.hd_ha_rong || false,
        hd_dich_vu: item.hd_dich_vu || false,
        notes: item.notes || '',
        base_price: item.base_price || 0,
        sale_price: item.sale_price || 0,
        created_by: currentUser ? {
          uid: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role
        } : undefined,
        createdAt: new Date().toISOString()
      };

      setRecords(prev => [newRec, ...prev]);
      await saveRecordToCloud('shipments', recordId, newRec);
    }
  };

  // Google Drive / Cloud Full Database Restore Handler
  const handleRestoreDatabase = async (restoredData: {
    records?: ShipmentRecord[];
    declarations?: CustomsDeclarationRecord[];
    warehouses?: WarehouseItem[];
    transporters?: TransporterItem[];
    customers?: CustomerItem[];
    routes?: RouteItem[];
    users?: UserAccount[];
    kpiRates?: KPIRateItem[];
    quotations?: CustomerQuotation[];
    advances?: EmployeeAdvanceItem[];
  }) => {
    if (restoredData.records && Array.isArray(restoredData.records)) {
      setRecords(restoredData.records);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_shipments`, JSON.stringify(restoredData.records));
      for (const item of restoredData.records) {
        await saveRecordToCloud('shipments', item.id, item);
      }
    }
    if (restoredData.declarations && Array.isArray(restoredData.declarations)) {
      setDeclarations(restoredData.declarations);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_customs`, JSON.stringify(restoredData.declarations));
      for (const item of restoredData.declarations) {
        await saveRecordToCloud('customs', item.id, item);
      }
    }
    if (restoredData.warehouses && Array.isArray(restoredData.warehouses)) {
      setWarehouses(restoredData.warehouses);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_warehouses`, JSON.stringify(restoredData.warehouses));
      for (const item of restoredData.warehouses) {
        await saveRecordToCloud('warehouses', item.id, item);
      }
    }
    if (restoredData.transporters && Array.isArray(restoredData.transporters)) {
      setTransporters(restoredData.transporters);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_transporters`, JSON.stringify(restoredData.transporters));
      for (const item of restoredData.transporters) {
        await saveRecordToCloud('transporters', item.id, item);
      }
    }
    if (restoredData.customers && Array.isArray(restoredData.customers)) {
      setCustomers(restoredData.customers);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_customers`, JSON.stringify(restoredData.customers));
      for (const item of restoredData.customers) {
        await saveRecordToCloud('customers', item.id, item);
      }
    }
    if (restoredData.routes && Array.isArray(restoredData.routes)) {
      setRoutes(restoredData.routes);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_routes`, JSON.stringify(restoredData.routes));
      for (const item of restoredData.routes) {
        await saveRecordToCloud('routes', item.id, item);
      }
    }
    if (restoredData.kpiRates && Array.isArray(restoredData.kpiRates)) {
      setKpiRates(restoredData.kpiRates);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_kpi_rates`, JSON.stringify(restoredData.kpiRates));
      for (const item of restoredData.kpiRates) {
        await saveRecordToCloud('kpi_rates', item.id, item);
      }
    }
    if (restoredData.quotations && Array.isArray(restoredData.quotations)) {
      setQuotations(restoredData.quotations);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_quotations`, JSON.stringify(restoredData.quotations));
      for (const item of restoredData.quotations) {
        await saveRecordToCloud('quotations', item.id, item);
      }
    }
    if (restoredData.advances && Array.isArray(restoredData.advances)) {
      setAdvances(restoredData.advances);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_advances`, JSON.stringify(restoredData.advances));
      for (const item of restoredData.advances) {
        await saveRecordToCloud('advances', item.id, item);
      }
    }
    if (restoredData.users && Array.isArray(restoredData.users)) {
      setUsers(restoredData.users);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_users`, JSON.stringify(restoredData.users));
    }
    showToast('Đã đồng bộ và khôi phục toàn bộ cơ sở dữ liệu thành công!');
  };

  // Execute Confirmed Delete
  const executeConfirmedDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'shipment') {
      if (deleteTarget.ids && deleteTarget.ids.length > 0) {
        const idsToDelete = deleteTarget.ids;
        setRecords(prev => prev.filter(r => !idsToDelete.includes(r.id)));
        await Promise.all(idsToDelete.map(id => deleteRecordFromCloud('shipments', id)));
        showToast(`Đã xóa thành công ${idsToDelete.length} chuyến hàng!`);
      } else {
        setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        await deleteRecordFromCloud('shipments', deleteTarget.id);
        showToast('Đã xóa thành công chuyến hàng!');
      }
    } else if (deleteTarget.type === 'customs') {
      setDeclarations(prev => prev.filter(d => d.id !== deleteTarget.id));
      await deleteRecordFromCloud('customs', deleteTarget.id);
      showToast('Đã xóa tờ khai hải quan!');
    } else if (deleteTarget.type === 'advance') {
      setAdvances(prev => prev.filter(a => a.id !== deleteTarget.id));
      await deleteRecordFromCloud('advances', deleteTarget.id);
      showToast('Đã xóa khoản tạm ứng!');
    } else if (deleteTarget.type === 'quotation') {
      setQuotations(prev => prev.filter(q => q.id !== deleteTarget.id));
      await deleteRecordFromCloud('quotations', deleteTarget.id);
      showToast('Đã xóa báo giá!');
    } else if (deleteTarget.type === 'catalog' && deleteTarget.subTab) {
      const { subTab, id } = deleteTarget;
      if (subTab === 'warehouse') setWarehouses(prev => prev.filter(x => x.id !== id));
      if (subTab === 'transporter') setTransporters(prev => prev.filter(x => x.id !== id));
      if (subTab === 'customer') setCustomers(prev => prev.filter(x => x.id !== id));
      if (subTab === 'route') setRoutes(prev => prev.filter(x => x.id !== id));

      const collectionMap: { [key in CatalogSubTab]: string } = {
        warehouse: 'warehouses',
        transporter: 'transporters',
        customer: 'customers',
        route: 'routes'
      };
      await deleteRecordFromCloud(collectionMap[subTab], id);
      showToast('Đã xóa danh mục thành công!');
    }

    setIsConfirmDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="bg-slate-100 text-slate-800 min-h-screen flex flex-col font-sans">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />

      {/* Main App Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        switchTab={tab => {
          if (tab === 'users' && currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
            showToast('Chỉ Quản trị viên hoặc Quản lý mới được quản lý tài khoản.', 'error');
            return;
          }
          if (tab === 'category' && !hasPermission(currentUser, 'catalog', 'view')) {
            showToast('Tài khoản của bạn không có quyền xem Danh mục.', 'error');
            return;
          }
          if (tab === 'general_work' && !hasPermission(currentUser, 'customs', 'view')) {
            showToast('Tài khoản của bạn không có quyền xem Thủ tục hải quan.', 'error');
            return;
          }
          if (tab === 'entry' && !hasPermission(currentUser, 'shipments', 'view')) {
            showToast('Tài khoản của bạn không có quyền xem Vận chuyển.', 'error');
            return;
          }
          if (tab === 'finance' && !hasPermission(currentUser, 'finance', 'view')) {
            showToast('Tài khoản của bạn không có quyền xem Tài chính.', 'error');
            return;
          }
          if (tab === 'dashboard' && !hasPermission(currentUser, 'dashboard', 'view')) {
            showToast('Tài khoản của bạn không có quyền xem Tổng quan.', 'error');
            return;
          }
          setActiveTab(tab);
        }}
        isConnected={isConnected}
        totalRecordsCount={records.length}
        pendingUsersCount={pendingUsersCount}
        onOpenLoginModal={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpen2FASetup={() => {
          setAuthModalMode('2fa_setup');
          setIsAuthModalOpen(true);
        }}
        onOpenChangePassword={() => {
          setAuthModalMode('change_password');
          setIsAuthModalOpen(true);
        }}
        onOpenEditProfile={() => {
          if (currentUser) {
            setEditProfileNameInput(currentUser.name || '');
            setIsEditProfileModalOpen(true);
          }
        }}
        onOpenNewTripModal={handleOpenNewTripModal}
      />

      {/* Main Body Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Vận Chuyển (Shipment Table) */}
        {activeTab === 'entry' && (
          <ShipmentTable
            records={records}
            currentUser={currentUser}
            onOpenReceiptModal={rec => {
              setReceiptRecord(rec);
              setIsReceiptModalOpen(true);
            }}
            onDuplicateRecord={handleDuplicateRecord}
            onOpenEditModal={rec => {
              setSelectedShipment(rec);
              setShipmentModalMode('edit');
              setIsShipmentModalOpen(true);
            }}
            onConfirmDeleteTrip={rec => {
              if (!hasPermission(currentUser, 'shipments', 'edit')) {
                showToast('Bạn chưa được cấp quyền chỉnh sửa chuyến hàng.', 'error');
                return;
              }
              setDeleteTarget({
                type: 'shipment',
                id: rec.id,
                name: `Chuyến Cont ${rec.cont_number} (KH: ${rec.customer})`
              });
              setIsConfirmDeleteOpen(true);
            }}
            onBatchDeleteTrips={selectedRecords => {
              if (!hasPermission(currentUser, 'shipments', 'edit')) {
                showToast('Bạn chưa được cấp quyền chỉnh sửa chuyến hàng.', 'error');
                return;
              }
              const ids = selectedRecords.map(r => r.id);
              setDeleteTarget({
                type: 'shipment',
                id: ids[0] || '',
                ids: ids,
                name: `${ids.length} chuyến hàng đã chọn`
              });
              setIsConfirmDeleteOpen(true);
            }}
            onToggleCheckbox={handleToggleCheckbox}
            onOpenNewTripModal={handleOpenNewTripModal}
            onImportShipments={handleImportShipments}
            onOpenLoginModal={() => {
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {/* Tab 2: Công Việc Chung */}
        {activeTab === 'general_work' && (!currentUser || currentUser.role !== 'customer') && (
          <div className="space-y-5">
            {/* Sub-Navigation Bar for Công Việc Chung */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex gap-2">
              <button
                onClick={() => setWorkSubTab('customs')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  workSubTab === 'customs'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Thủ tục hải quan</span>
              </button>
            </div>

            {/* Subtab View */}
            {workSubTab === 'customs' && (
              <CustomsProcedureManager
                declarations={declarations}
                customers={customers}
                users={users}
                kpiRates={kpiRates}
                currentUser={currentUser}
                totalPaidAmount={totalPaidAmount}
                onOpenLoginModal={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                onSaveDeclaration={handleSaveDeclaration}
                onDeleteDeclaration={handleDeleteDeclaration}
                onToggleApproval={handleToggleDeclarationApproved}
                onToggleCompleted={handleToggleDeclarationCompleted}
                onToggleDamage={handleToggleDeclarationDamage}
                onSaveCatalogItem={handleSaveCatalogItem}
              />
            )}
          </div>
        )}

        {/* Tab 3: Quản Lý Danh Mục Chuẩn (Hidden for Customer & Guest) */}
        {activeTab === 'category' && currentUser && currentUser.role !== 'customer' && (
          <CatalogManager
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
            warehouses={warehouses}
            transporters={transporters}
            customers={customers}
            routes={routes}
            onSaveCatalogItem={handleSaveCatalogItem}
            onDeleteCatalogItem={handleDeleteCatalogItem}
          />
        )}

        {/* Tab 3.5: Tiện Ích Hỗ Trợ */}
        {activeTab === 'utilities' && currentUser && hasPermission(currentUser, 'utilities', 'view') && (
          <UtilitiesManager
            currentUser={currentUser}
            onShowToast={showToast}
          />
        )}

        {/* Tab 4: Tài Chính */}
        {activeTab === 'finance' && currentUser && currentUser.role !== 'customer' && (
          <div className="space-y-5">
            {/* Sub-Navigation Bar for Tài Chính */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
              {hasPermission(currentUser, 'finance_report', 'view') && (
                <button
                  onClick={() => setFinanceSubTab('report_shipment')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    financeSubTab === 'report_shipment'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Báo cáo vận chuyển</span>
                </button>
              )}

              {hasPermission(currentUser, 'customs_report', 'view') && (
                <button
                  onClick={() => setFinanceSubTab('report_customs')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    financeSubTab === 'report_customs'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Báo cáo hải quan</span>
                </button>
              )}

              {hasPermission(currentUser, 'finance_kpi', 'view') && (
                <button
                  onClick={() => setFinanceSubTab('kpi')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    financeSubTab === 'kpi'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>KPI</span>
                </button>
              )}

              {hasPermission(currentUser, 'finance_quotations', 'view') && (
                <button
                  onClick={() => setFinanceSubTab('customer_quotation')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    financeSubTab === 'customer_quotation'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>Báo giá khách hàng</span>
                </button>
              )}

              {hasPermission(currentUser, 'finance_advances', 'view') && (
                <button
                  onClick={() => setFinanceSubTab('employee_advance')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    financeSubTab === 'employee_advance'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Tạm ứng nhân viên</span>
                </button>
              )}
            </div>

            {/* Subtab Views */}
            {financeSubTab === 'report_shipment' && (
              <FinancialReport
                records={records}
                currentUser={currentUser}
                onImportExcel={handleImportExcel}
                onShowToast={showToast}
              />
            )}

            {financeSubTab === 'report_customs' && (
              <CustomsReport
                declarations={declarations}
                customers={customers}
                users={users}
                currentUser={currentUser}
                paidAmounts={paidAmounts}
                onUpdatePaidAmount={handleUpdatePaidAmount}
              />
            )}

            {financeSubTab === 'kpi' && (
              <KPIManager
                kpiRates={kpiRates}
                currentUser={currentUser}
                onUpdateKPIRates={handleUpdateKPIRates}
              />
            )}

            {financeSubTab === 'customer_quotation' && (
              <CustomerQuotationManager
                quotations={quotations}
                customers={customers}
                currentUser={currentUser}
                onSaveQuotation={handleSaveQuotation}
                onDeleteQuotation={handleDeleteQuotation}
              />
            )}

            {financeSubTab === 'employee_advance' && (
              <EmployeeAdvanceManager
                advances={advances}
                users={users}
                currentUser={currentUser}
                onSaveAdvance={handleSaveAdvance}
                onDeleteAdvance={handleDeleteAdvance}
                onToggleApproval={handleToggleAdvanceApproval}
              />
            )}
          </div>
        )}

        {/* Tab 5: Admin & Manager User Management Panel */}
        {activeTab === 'users' && (currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Quản Lý Nhân Viên & Phân Quyền</h3>
            <p className="text-xs text-slate-500 mb-4">Duyệt tài khoản nhân viên mới đăng ký và quản lý vai trò trong hệ thống.</p>
            <button
              onClick={() => setIsUserMgmtOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition"
            >
              Mở Bảng Duyệt Tài Khoản Nhân Viên
            </button>
          </div>
        )}

        {/* Tab 6: Google Drive Cloud Storage & Backup Manager */}
        {activeTab === 'gdrive' && hasPermission(currentUser, 'gdrive', 'view') && (
          <GoogleDriveManager
            currentUser={currentUser}
            records={records}
            declarations={declarations}
            warehouses={warehouses}
            transporters={transporters}
            customers={customers}
            routes={routes}
            users={users}
            kpiRates={kpiRates}
            quotations={quotations}
            advances={advances}
            onRestoreData={handleRestoreDatabase}
            onShowToast={showToast}
          />
        )}
      </main>


      {/* Auth Modal (Login / Register / 2FA / Password Management) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={users}
        currentUser={currentUser}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
        onRegisterEmployee={handleRegisterEmployee}
        onUpdateUser2FA={handleUpdateUser2FA}
        onUpdatePassword={handleUpdateUserPassword}
      />

      {/* Welcome Modal */}
      {currentUser && (
        <WelcomeModal
          isOpen={isWelcomeModalOpen}
          onClose={() => setIsWelcomeModalOpen(false)}
          quote={randomQuote}
          userName={currentUser.name}
        />
      )}

      {/* Admin User Management Modal */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
        users={users}
        customers={customers}
        currentUser={currentUser}
        onApproveUser={handleApproveUser}
        onRejectUser={handleRejectUser}
        onChangeUserRole={handleChangeUserRole}
        onChangeCustomerName={handleChangeUserCustomerName}
        onChangeUserPermissions={handleChangeUserPermissions}
        onChangeUserName={handleChangeUserName}
        onResetUserPassword={handleResetUserPassword}
        onDeleteUser={handleDeleteUser}
      />

      {/* Edit Self Profile Name Modal */}
      {isEditProfileModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-base">Đổi Họ và Tên Đăng Ký</h4>
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và Tên mới
              </label>
              <input
                type="text"
                value={editProfileNameInput}
                onChange={e => setEditProfileNameInput(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && editProfileNameInput.trim()) {
                    handleChangeUserName(currentUser.id, editProfileNameInput.trim());
                    setIsEditProfileModalOpen(false);
                  }
                }}
              />
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="w-1/2 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (currentUser && editProfileNameInput.trim()) {
                    handleChangeUserName(currentUser.id, editProfileNameInput.trim());
                    setIsEditProfileModalOpen(false);
                  }
                }}
                className="w-1/2 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Add/Edit Modal */}
      <ShipmentModal
        isOpen={isShipmentModalOpen}
        onClose={() => setIsShipmentModalOpen(false)}
        onSave={handleSaveShipment}
        modalMode={shipmentModalMode}
        initialData={selectedShipment}
        warehouses={warehouses}
        transporters={transporters}
        customers={customers}
        routes={routes}
        currentUser={currentUser}
        onSaveCatalogItem={handleSaveCatalogItem}
      />

      {/* Delivery Receipt Printable Modal */}
      <DeliveryReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        record={receiptRecord}
        customers={customers}
        warehouses={warehouses}
      />

      {/* Confirm Delete Dialog Modal */}
      {isConfirmDeleteOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-100">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">Xác nhận xóa bản ghi?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa: <strong className="text-slate-800">{deleteTarget.name}</strong>?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="w-1/2 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={executeConfirmedDelete}
                className="w-1/2 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
