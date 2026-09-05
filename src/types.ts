export type UserRole = 
  | 'admin'                // Cấp 1: Quản trị viên (Admin tối cao)
  | 'manager'              // Cấp 2: Cấp Quản lý (Manager)
  | 'employee_accounting' // Cấp 3: Nhân viên Kế toán (Accountant)
  | 'employee_logistics'  // Cấp 4: Nhân viên Logistics
  | 'customer';           // Cấp 5: Khách hàng (Customer)

export interface RoleHierarchyItem {
  level: number;
  role: UserRole;
  levelBadge: string;
  name: string;
  title: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
  scope: string;
}

export const USER_ROLES_HIERARCHY: Record<UserRole, RoleHierarchyItem> = {
  admin: {
    level: 1,
    role: 'admin',
    levelBadge: 'Cấp 1',
    name: 'Quản trị viên (Admin)',
    title: 'Cấp 1: Quản Trị Viên (Admin Tối Cao)',
    shortLabel: 'Admin Tối Cao',
    badgeClass: 'bg-orange-600 text-white border-orange-700',
    description: 'Toàn quyền điều hành, phân quyền nhân sự, duyệt tài khoản và quản trị toàn bộ hệ thống SPV Group.',
    scope: 'Toàn quyền (Full Access) — Dành riêng cho tài khoản Admin'
  },
  manager: {
    level: 2,
    role: 'manager',
    levelBadge: 'Cấp 2',
    name: 'Quản lý (Manager)',
    title: 'Cấp 2: Cấp Quản Lý (Manager)',
    shortLabel: 'Quản Lý',
    badgeClass: 'bg-purple-600 text-white border-purple-700',
    description: 'Giám sát điều hành logistics & tài chính, duyệt cước biển, duyệt tạm ứng nhân sự, cấu hình quyền nhân viên.',
    scope: 'Quản lý điều hành & Giám sát tổng thể'
  },
  employee_accounting: {
    level: 3,
    role: 'employee_accounting',
    levelBadge: 'Cấp 3',
    name: 'Nhân viên Kế toán',
    title: 'Cấp 3: Nhân Viên Kế Toán (Accountant)',
    shortLabel: 'Kế Toán',
    badgeClass: 'bg-emerald-600 text-white border-emerald-700',
    description: 'Chuyên trách Báo cáo tài chính, Báo giá khách hàng, Công nợ khách hàng, Tạm ứng chi phí, Doanh số & KPI.',
    scope: 'Tài chính, Báo giá, Tạm ứng, Công nợ & Báo cáo'
  },
  employee_logistics: {
    level: 4,
    role: 'employee_logistics',
    levelBadge: 'Cấp 4',
    name: 'Nhân viên Logistics',
    title: 'Cấp 4: Nhân Viên Logistics',
    shortLabel: 'Logistics',
    badgeClass: 'bg-blue-600 text-white border-blue-700',
    description: 'Chuyên trách Quản lý chuyến xe chạy hàng ngày, Mở tờ khai hải quan, Báo giá & Điều hành cước biển, Tra cứu cảng/hãng tàu.',
    scope: 'Vận chuyển hàng ngày, Hải quan & Cước biển'
  },
  customer: {
    level: 5,
    role: 'customer',
    levelBadge: 'Cấp 5',
    name: 'Khách hàng (Customer)',
    title: 'Cấp 5: Cấp Khách Hàng (Customer)',
    shortLabel: 'Khách Hàng',
    badgeClass: 'bg-slate-700 text-white border-slate-800',
    description: 'Tra cứu tiến độ chuyến xe vận chuyển, kiểm tra tình trạng tờ khai hải quan, xem bảng giá và công nợ của riêng mình.',
    scope: 'Tra cứu & Theo dõi lô hàng của riêng khách hàng'
  }
};

export const ROLE_HIERARCHY_ORDER: UserRole[] = [
  'admin',
  'manager',
  'employee_accounting',
  'employee_logistics',
  'customer'
];

export const getRoleInfo = (role?: string): RoleHierarchyItem => {
  if (role === 'employee' || role === 'employee_logistics') {
    return USER_ROLES_HIERARCHY['employee_logistics'];
  }
  if (role && role in USER_ROLES_HIERARCHY) {
    return USER_ROLES_HIERARCHY[role as UserRole];
  }
  return USER_ROLES_HIERARCHY['customer'];
};

export type UserStatus = 'active' | 'pending' | 'rejected';

export interface UserPermissions {
  dashboard: { view: boolean, edit: boolean };
  shipments: { view: boolean, edit: boolean };
  customs: { view: boolean, edit: boolean };
  sea_freight: { view: boolean, edit: boolean };
  customs_report: { view: boolean, edit: boolean };
  finance: { view: boolean, edit: boolean };
  finance_report: { view: boolean, edit: boolean };
  finance_kpi: { view: boolean, edit: boolean };
  finance_advances: { view: boolean, edit: boolean };
  finance_quotations: { view: boolean, edit: boolean };
  finance_debt: { view: boolean, edit: boolean };
  catalog: { view: boolean, edit: boolean };
  utilities: { view: boolean, edit: boolean };
  gdrive: { view: boolean, edit: boolean };
}

export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'admin':
    case 'manager':
      return {
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
    case 'employee_logistics':
      return {
        dashboard: { view: true, edit: false },
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
    case 'employee_accounting':
      return {
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
    case 'customer':
      return {
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
    default:
      return {
        dashboard: { view: false, edit: false },
        shipments: { view: false, edit: false },
        customs: { view: false, edit: false },
        sea_freight: { view: false, edit: false },
        customs_report: { view: false, edit: false },
        finance: { view: false, edit: false },
        finance_report: { view: false, edit: false },
        finance_kpi: { view: false, edit: false },
        finance_advances: { view: false, edit: false },
        finance_quotations: { view: false, edit: false },
        finance_debt: { view: false, edit: false },
        catalog: { view: false, edit: false },
        utilities: { view: false, edit: false },
        gdrive: { view: false, edit: false },
      };
  }
};

export const getEmptyPermissions = (): UserPermissions => ({
  dashboard: { view: false, edit: false },
  shipments: { view: false, edit: false },
  customs: { view: false, edit: false },
  sea_freight: { view: false, edit: false },
  customs_report: { view: false, edit: false },
  finance: { view: false, edit: false },
  finance_report: { view: false, edit: false },
  finance_kpi: { view: false, edit: false },
  finance_advances: { view: false, edit: false },
  finance_quotations: { view: false, edit: false },
  finance_debt: { view: false, edit: false },
  catalog: { view: false, edit: false },
  utilities: { view: false, edit: false },
  gdrive: { view: false, edit: false },
});

export const hasPermission = (user: any, module: keyof UserPermissions, action: 'view' | 'edit'): boolean => {
  if (!user) return false;
  // Admin role retains full access
  if (user.role === 'admin') return true;
  
  // If user has custom permissions object configured
  if (user.permissions) {
    const userMod = user.permissions[module];
    if (userMod && userMod[action] !== undefined) {
      return Boolean(userMod[action]);
    }

    // If checking finance view tab, allow if any finance sub-item is ticked
    if (module === 'finance' && action === 'view') {
      if (user.permissions.finance?.view) return true;
      const subModules: (keyof UserPermissions)[] = [
        'finance_report',
        'customs_report',
        'finance_kpi',
        'finance_advances',
        'finance_quotations',
        'finance_debt',
        'sea_freight'
      ];
      for (const sm of subModules) {
        if (user.permissions[sm]?.view) return true;
      }
      return false;
    }

    return Boolean(userMod?.[action]);
  }

  // If no custom permissions object yet, fallback to default permissions for role
  const defaultPerms = getDefaultPermissions(user.role as UserRole);
  const defaultModulePerms = defaultPerms?.[module] || { view: false, edit: false };

  if (module === 'finance' && action === 'view') {
    if (defaultModulePerms.view) return true;
    const subModules: (keyof UserPermissions)[] = [
      'finance_report',
      'customs_report',
      'finance_kpi',
      'finance_advances',
      'finance_quotations',
      'finance_debt',
      'sea_freight'
    ];
    for (const sm of subModules) {
      if (defaultPerms?.[sm]?.view) return true;
    }
  }

  return Boolean(defaultModulePerms[action]);
};

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  customer_name?: string; // Tên khách hàng gắn liên kết cho tài khoản role 'customer'
  status: UserStatus;
  createdAt: string;
  totpSecret?: string; // Base32 secret for Google Authenticator 2FA
  totpEnabled?: boolean;
  password?: string;
  permissions?: UserPermissions; // Phân quyền tùy chỉnh cho Quản lý (manager)
}

export interface CreatorInfo {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ShipmentRecord {
  id: string;
  date_announced: string; // A. Ngày báo xe
  delivery_date: string;  // B. Ngày đóng/trả hàng
  route: string;          // C. Tuyến đường
  transporter: string;    // D. Đơn vị vận chuyển
  cont_number: string;    // E. Số cont
  customer: string;       // F. Khách hàng
  batch_number?: string;  // G. Số lô nhập/xuất
  cont_quantity: number;  // H. Số lượng cont
  warehouse?: string;     // I. Kho/xưởng
  contact_person?: string;// J. Tên người giao/nhận hàng
  contact_phone?: string; // K. SĐT người nhận hàng
  phoi_nang?: boolean;    // Phơi nâng
  phoi_ha?: boolean;      // Phơi hạ
  hd_ha_rong?: boolean;   // Hóa đơn hạ rỗng
  hd_dich_vu?: boolean;   // Hóa đơn cước VC / HĐ đầu vào
  hd_dau_vao?: boolean;   // HĐ đầu vào
  hd_dau_ra?: boolean;    // HĐ đầu ra
  notes?: string;         // Ghi chú
  base_price?: number;    // Q. Giá gốc/cont
  sale_price?: number;    // R. Giá bán/cont
  admin_edited_price?: boolean; // Ẩn giá đối với nhân viên nếu Admin đã sửa giá
  return_invoice_type?: 'customer' | 'other';
  return_invoice_tax_code?: string;
  return_invoice_company_name?: string;
  return_invoice_address?: string;
  created_by?: CreatorInfo; // Người nhập liệu
  createdAt?: string;
}

export interface WarehouseItem {
  id: string;
  warehouse_name: string;
  contact_person: string;
  contact_phone: string;
  location: string;
}

export interface TransporterItem {
  id: string;
  transporter_name: string;
  company_full_name?: string;
  tax_code: string;
  address?: string;
}

export interface CustomerItem {
  id: string;
  customer_name: string;
  company_full_name?: string;
  tax_code: string;
  address?: string;
}

export interface RouteItem {
  id: string;
  route_name: string;
}

export interface CustomerQuotation {
  id: string;
  customer_name: string;
  unit_price: number; // Đơn giá thủ tục hải quan cont/lô
  notes?: string;
  date?: string; // Ngày áp dụng/báo giá (YYYY-MM-DD)
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeAdvanceItem {
  id: string;
  staff_id: string;
  staff_name: string;
  employee_id?: string;
  employee_name?: string;
  date?: string;         // Ngày tạm ứng / phát sinh chi phí (YYYY-MM-DD)
  description: string;   // Diễn giải
  advance_amount: number;// Số tiền ứng
  expense_amount: number;// Chi phí
  approved: boolean;     // Nút Duyệt (chỉ admin thao tác)
  createdAt?: string;
  updatedAt?: string;
}

export const findCustomerByName = (customerName?: string, customersList: CustomerItem[] = []): CustomerItem | undefined => {
  if (!customerName || !customerName.trim()) return undefined;
  const target = customerName.trim().toLowerCase();

  // 1. Exact match on customer_name
  let found = customersList.find(c => c.customer_name.trim().toLowerCase() === target);
  if (found) return found;

  // 2. Exact match on company_full_name
  found = customersList.find(c => c.company_full_name?.trim().toLowerCase() === target);
  if (found) return found;

  // 3. Exact match on tax_code
  found = customersList.find(c => c.tax_code?.trim().toLowerCase() === target);
  if (found) return found;

  // 4. Partial / Includes match
  found = customersList.find(c => {
    const cName = c.customer_name.trim().toLowerCase();
    const compName = c.company_full_name?.trim().toLowerCase() || '';
    return (
      (cName && (cName.includes(target) || target.includes(cName))) ||
      (compName && (compName.includes(target) || target.includes(compName)))
    );
  });

  return found;
};

export const canDeleteUser = (operator: UserAccount | null, targetUser: UserAccount): { allowed: boolean; reason?: string } => {
  const targetEmailClean = (targetUser.email || '').trim().toLowerCase();
  const operatorEmailClean = (operator?.email || '').trim().toLowerCase();

  // Rule 1: Master admin account admin@spv.biz.vn can NEVER be deleted
  if (targetEmailClean === 'admin@spv.biz.vn') {
    return {
      allowed: false,
      reason: 'Tài khoản quản trị tối cao admin@spv.biz.vn là tài khoản hệ thống cố định, không thể xóa!'
    };
  }

  // Rule 2: Cannot delete currently logged in account
  if (operator && operator.id === targetUser.id) {
    return {
      allowed: false,
      reason: 'Bạn không thể xóa tài khoản đang đăng nhập của chính mình!'
    };
  }

  // Rule 3: Only admin@spv.biz.vn can delete other admin accounts
  if (targetUser.role === 'admin') {
    if (!operator || operatorEmailClean !== 'admin@spv.biz.vn') {
      return {
        allowed: false,
        reason: 'Chỉ tài khoản admin@spv.biz.vn mới có quyền xóa tài khoản Quản trị viên khác!'
      };
    }
  }

  return { allowed: true };
};

export type ActiveTab = 'dashboard' | 'entry' | 'general_work' | 'category' | 'utilities' | 'finance' | 'users' | 'gdrive';
export type WorkSubTab = 'customs' | 'sea_freight';
export type CatalogSubTab = 'warehouse' | 'transporter' | 'customer' | 'route';
export type FinanceSubTab = 'report_shipment' | 'report_customs' | 'report_sea_freight' | 'kpi' | 'customer_quotation' | 'employee_advance' | 'quotation' | 'advance';

export interface DashboardWidgetConfig {
  heroBanner: boolean;
  quickStats: boolean;
  quickTracking: boolean;
  quickActions: boolean;
  servicesShowcase: boolean;
  recentShipments: boolean;
  recentCustoms: boolean;
  companyStrengths: boolean;
  announcements: boolean;
  warehouseMap: boolean;
  hotlineSupport: boolean;
}

export interface DashboardCustomSettings {
  themeStyle: 'blue_ocean' | 'teal_modern' | 'dark_slate' | 'amber_energy';
  heroTitle: string;
  heroSubtitle: string;
  announcementText: string;
  widgets: DashboardWidgetConfig;
  customShortcutsTitle?: string;
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardCustomSettings = {
  themeStyle: 'blue_ocean',
  heroTitle: 'SPV GROUP LOGISTICS & SUPPLY CHAIN',
  heroSubtitle: 'Giải pháp Vận tải đường bộ, Kéo cont cảng biển & Thủ tục Hải quan trọn gói hàng đầu',
  announcementText: 'Chào mừng bạn đến với Cổng điều hành SPV Logistics. Hệ thống đang đồng bộ dữ liệu Realtime 24/7.',
  widgets: {
    heroBanner: true,
    quickStats: true,
    quickTracking: true,
    quickActions: true,
    servicesShowcase: true,
    recentShipments: true,
    recentCustoms: true,
    companyStrengths: true,
    announcements: true,
    warehouseMap: true,
    hotlineSupport: true,
  }
};

export type CustomsDeclarationType = 'Xuất khẩu' | 'Nhập khẩu' | 'XKTC' | 'NKTC' | 'XNKTC';

export interface KPIRateItem {
  id: string;
  type_name: CustomsDeclarationType;
  reward_amount: number;
}

export interface SupportTransferInfo {
  ratio: number; // 0, 1/3 (0.333333), 1/2 (0.5), 2/3 (0.666667), 1 (1.0)
  ratio_label: '1' | '2/3' | '1/2' | '1/3' | '0' | string;
  staff_id?: string;
  staff_name?: string;
}

export interface CustomsDeclarationRecord {
  id: string;
  stt?: number;
  execution_date: string;       // Ngày thực hiện (YYYY-MM-DD)
  completed_date?: string;      // Ngày thực tế hoàn thành (YYYY-MM-DD)
  approved_date?: string;       // Ngày thực tế duyệt (YYYY-MM-DD)
  declaration_number: string;   // Số tờ khai
  type: CustomsDeclarationType; // Loại (Xuất khẩu, Nhập khẩu, XKTX, NKTC, XNKTC)
  customer: string;             // Khách hàng (Tên khách hàng từ danh mục)
  cont_quantity?: number;       // Số lượng cont/lô (mặc định 1)
  support_transfer: SupportTransferInfo; // Chuyển hỗ trợ: { ratio, ratio_label, staff_id, staff_name }
  completed: boolean;           // Hoàn thành: true = "đã", false = "chưa"
  kpi_amount: number;           // Thành tiền KPI
  extra_bonus?: number;         // Thưởng khác
  approved: boolean;            // Duyệt: true = "có", false = "chưa" (Chỉ Admin)
  has_damage?: boolean;         // Phát sinh gây thiệt hại: true = "có", false = "không" (Chỉ Admin thao tác)
  notes?: string;               // Ghi chú (Chỉ Admin thao tác nhập)
  created_by?: CreatorInfo;     // Người nhập liệu tự động theo tài khoản
  createdAt?: string;
}

export function calculateCustomsKPI(
  record: {
    type?: CustomsDeclarationType;
    cont_quantity?: number;
    support_transfer?: { ratio?: number; ratio_label?: string };
    completed?: boolean;
    approved?: boolean;
    extra_bonus?: number;
    kpi_amount?: number;
  },
  kpiRates?: KPIRateItem[]
): number {
  // If not completed AND not approved, KPI reward is 0
  const isEligible = Boolean(record.completed || record.approved);
  if (!isEligible) return 0;
  
  const type = record.type || 'Xuất khẩu';
  const rateObj = kpiRates?.find(r => r.type_name === type);
  const baseReward = rateObj ? rateObj.reward_amount : (type === 'Xuất khẩu' || type === 'Nhập khẩu' ? 30000 : 25000);
  
  let ratio = 0;
  if (typeof record.support_transfer?.ratio === 'number') {
    ratio = record.support_transfer.ratio;
  }
  if (record.support_transfer?.ratio_label) {
    const lbl = String(record.support_transfer.ratio_label).trim();
    if (lbl === '2/3') ratio = 2 / 3;
    else if (lbl === '1/2') ratio = 0.5;
    else if (lbl === '1/3') ratio = 1 / 3;
    else if (lbl === '0' || lbl === '0%') ratio = 0;
    else if (lbl === '1' || lbl === '100%') ratio = 1;
    else if (!isNaN(Number(lbl))) ratio = Number(lbl);
  }
  
  const qty = (record.cont_quantity && record.cont_quantity > 0) ? record.cont_quantity : 1;
  const extra = Number(record.extra_bonus) || 0;
  
  // Công thức: Thành tiền KPI = (Số lượng x mức thưởng KPI) - (Số lượng x tỷ lệ x mức thưởng KPI) + Thưởng khác
  const baseTotal = qty * baseReward;
  const deduction = qty * ratio * baseReward;
  const total = Math.round(baseTotal - deduction) + extra;
  return Math.max(0, total);
}

export interface SeaFreightRecord {
  id: string;
  stt?: number;
  booking_date: string;       // Ngày đặt (YYYY-MM-DD)
  route: string;              // Tuyến đường
  mbl_hbl: string;            // Số MBL/HBL
  volume_info: string;        // Số cont/số Kg/số CBM (VD: 2x40HC, 5000 Kgs, 20 CBM)
  agent: string;              // Đại lý
  customer: string;           // Khách hàng
  buy_price: number;          // Giá mua (USD)
  sell_price: number;         // Giá bán (USD)
  profit: number;             // Lợi nhuận (USD) = Giá bán - Giá mua
  notes?: string;             // Ghi chú
  created_by?: CreatorInfo;   // Nhân viên nhập
  createdAt?: string;
  approved: boolean;          // Duyệt: true = Đã duyệt, false = Chưa duyệt (Chỉ Quản lý hoặc Quản trị viên)
  approved_date?: string;     // Ngày duyệt (YYYY-MM-DD) - hiển thị bên dưới nút duyệt
  approved_by?: CreatorInfo;  // Người duyệt
}

export function excelSerialToISO(serial: number): string {
  if (typeof serial !== 'number' || isNaN(serial) || serial <= 0) return '';
  const utcDays = serial - 25569;
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);
  if (isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const normalizeDateToISO = (dateInput: any): string => {
  if (!dateInput && dateInput !== 0) return '';
  if (typeof dateInput === 'number') {
    return excelSerialToISO(dateInput);
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const clean = String(dateInput).trim();
  if (!clean) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // YYYY-MM-DDTHH:mm:ss...
  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) {
    return clean.split('T')[0];
  }

  // DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or D-M-YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[\/-]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(clean)) {
    const parts = clean.split('/');
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Try parsing numeric timestamp or date string
  const num = Number(clean);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    return excelSerialToISO(num);
  }

  return clean;
};

export const formatDateVN = (dateInput?: any): string => {
  if (!dateInput && dateInput !== 0) return '';
  
  const iso = normalizeDateToISO(dateInput);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  const clean = String(dateInput).trim();
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[\/-]/);
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }

  return clean;
};

export const formatMonthYearVN = (dateInput?: any): string => {
  if (!dateInput && dateInput !== 0) return '';
  const iso = normalizeDateToISO(dateInput);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m] = iso.split('-');
    return `${m}/${y}`;
  }
  const clean = String(dateInput).trim();
  if (/^\d{4}-\d{2}$/.test(clean)) {
    const [y, m] = clean.split('-');
    return `${m}/${y}`;
  }
  return clean;
};

export const formatUSD = (amount?: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
};

