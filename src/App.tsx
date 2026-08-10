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
  canDeleteUser
} from './types';
import {
  DEFAULT_USERS,
  DEFAULT_SHIPMENTS,
  DEFAULT_WAREHOUSES,
  DEFAULT_TRANSPORTERS,
  DEFAULT_CUSTOMERS,
  DEFAULT_ROUTES,
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
import { Toast, ToastState } from './components/Toast';
import { Trash2 } from 'lucide-react';

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

  // App UI & Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('entry');
  const [activeSubTab, setActiveSubTab] = useState<CatalogSubTab>('warehouse');
  const [isConnected, setIsConnected] = useState(true);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | '2fa_setup' | 'change_password' | 'forgot_password'>('login');
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [shipmentModalMode, setShipmentModalMode] = useState<'add' | 'edit'>('add');
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<ShipmentRecord | null>(null);

  // Confirm Delete Dialog
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'shipment' | 'catalog';
    id: string;
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
      unsubUsers();
    };
  }, []);

  // Filter out pending users count for header badge
  const pendingUsersCount = users.filter(u => u.status === 'pending').length;

  // Handlers for User Authentication & Registration
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    showToast(`Đăng nhập thành công với vai trò ${user.role.toUpperCase()}!`);
    // Redirect if customer lands on forbidden tab
    if (user.role === 'customer' && (activeTab === 'category' || activeTab === 'report' || activeTab === 'users')) {
      setActiveTab('entry');
    }
    if (user.role === 'employee' && (activeTab === 'report' || activeTab === 'users')) {
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

    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
    );
    if (targetUser) {
      const roleUpdatedUser = { ...targetUser, role: newRole };
      await saveRecordToCloud('users', userId, roleUpdatedUser);
      if (currentUser?.id === userId) {
        setCurrentUser(roleUpdatedUser);
      }
      showToast(`Đã cập nhật vai trò thành ${newRole.toUpperCase()}`);
    }
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
    if (currentUser.role === 'customer') {
      showToast('Tài khoản Khách hàng không có quyền nhập chuyến mới.', 'error');
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
    if (currentUser.role === 'customer') {
      showToast('Tài khoản Khách hàng không có quyền lưu chuyến hàng.', 'error');
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

  const handleToggleCheckbox = async (record: ShipmentRecord, field: keyof ShipmentRecord) => {
    const updated = { ...record, [field]: !record[field] };
    setRecords(prev => prev.map(r => (r.id === record.id ? updated : r)));
    await saveRecordToCloud('shipments', record.id, updated);
    showToast(`Đã cập nhật ${String(field)}: ${updated[field] ? 'Có' : 'Không'}`);
  };

  const handleDuplicateRecord = (record: ShipmentRecord) => {
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

  // Execute Confirmed Delete
  const executeConfirmedDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'shipment') {
      setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
      await deleteRecordFromCloud('shipments', deleteTarget.id);
      showToast('Đã xóa thành công chuyến hàng!');
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
          if (tab === 'users' && currentUser?.role !== 'admin') {
            showToast('Chỉ Quản trị viên mới được quản lý tài khoản.', 'error');
            return;
          }
          if (tab === 'report' && currentUser?.role !== 'admin') {
            showToast('Báo cáo tài chính bị ẩn đối với tài khoản của bạn.', 'error');
            return;
          }
          if (tab === 'category' && currentUser?.role === 'customer') {
            showToast('Danh mục chuẩn bị ẩn đối với tài khoản Khách hàng.', 'error');
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
        onOpenNewTripModal={handleOpenNewTripModal}
      />

      {/* Main Body Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Nhập Liệu & Tra Cứu Vận Hành */}
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
              setDeleteTarget({
                type: 'shipment',
                id: rec.id,
                name: `Chuyến Cont ${rec.cont_number} (KH: ${rec.customer})`
              });
              setIsConfirmDeleteOpen(true);
            }}
            onToggleCheckbox={handleToggleCheckbox}
            onOpenNewTripModal={handleOpenNewTripModal}
            onOpenLoginModal={() => {
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {/* Tab 2: Quản Lý Danh Mục Chuẩn (Hidden for Customer & Guest) */}
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

        {/* Tab 3: Báo Cáo Tài Chính & Lợi Nhuận (Visible ONLY for Admin) */}
        {activeTab === 'report' && currentUser?.role === 'admin' && (
          <FinancialReport
            records={records}
            onImportExcel={handleImportExcel}
            onShowToast={showToast}
          />
        )}

        {/* Tab 4: Admin User Management Panel */}
        {activeTab === 'users' && currentUser?.role === 'admin' && (
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

      {/* Admin User Management Modal */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
        users={users}
        currentUser={currentUser}
        onApproveUser={handleApproveUser}
        onRejectUser={handleRejectUser}
        onChangeUserRole={handleChangeUserRole}
        onDeleteUser={handleDeleteUser}
      />

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
      />

      {/* Delivery Receipt Printable Modal */}
      <DeliveryReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        record={receiptRecord}
        customers={customers}
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
