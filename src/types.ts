export type UserRole = 'admin' | 'employee' | 'employee_logistics' | 'employee_accounting' | 'customer';

export type UserStatus = 'active' | 'pending' | 'rejected';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  totpSecret?: string; // Base32 secret for Google Authenticator 2FA
  totpEnabled?: boolean;
  password?: string;
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
  phoi_nang?: boolean;    // L. Phơi nâng
  phoi_ha?: boolean;      // M. Phơi hạ
  hd_ha_rong?: boolean;   // N. Hóa đơn hạ rỗng
  hd_dich_vu?: boolean;   // O. Hóa đơn cước vc
  notes?: string;         // P. Ghi chú
  base_price?: number;    // Q. Giá gốc/cont
  sale_price?: number;    // R. Giá bán/cont
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
  updatedAt?: string;
}

export interface EmployeeAdvanceItem {
  id: string;
  staff_id: string;
  staff_name: string;
  employee_id?: string;
  employee_name?: string;
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

export type ActiveTab = 'entry' | 'general_work' | 'category' | 'finance' | 'users';
export type WorkSubTab = 'customs';
export type CatalogSubTab = 'warehouse' | 'transporter' | 'customer' | 'route';
export type FinanceSubTab = 'report_shipment' | 'report_customs' | 'kpi' | 'quotation' | 'advance';

export type CustomsDeclarationType = 'Xuất khẩu' | 'Nhập khẩu' | 'XKTX' | 'NKTC' | 'XNKTC';

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

export const formatDateVN = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (!clean) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const [y, m, d] = clean.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  return clean;
};

export const formatMonthYearVN = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (!clean) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const [y, m] = clean.split('T')[0].split('-');
    return `${m}/${y}`;
  }
  if (/^\d{4}-\d{2}/.test(clean)) {
    const [y, m] = clean.split('-');
    return `${m}/${y}`;
  }
  return clean;
};
