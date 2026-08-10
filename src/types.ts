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

export type ActiveTab = 'entry' | 'category' | 'report' | 'users';
export type CatalogSubTab = 'warehouse' | 'transporter' | 'customer' | 'route';
