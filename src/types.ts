export type UserRole = 'admin' | 'employee' | 'customer';

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

export type ActiveTab = 'entry' | 'category' | 'report' | 'users';
export type CatalogSubTab = 'warehouse' | 'transporter' | 'customer' | 'route';
