import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, remove, onValue } from 'firebase/database';
import {
  UserAccount,
  ShipmentRecord,
  WarehouseItem,
  TransporterItem,
  CustomerItem,
  RouteItem,
  KPIRateItem,
  CustomsDeclarationRecord,
  CustomerQuotation,
  EmployeeAdvanceItem,
  SeaFreightRecord
} from '../types';

// Firebase Web App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5cIhbN-SNzjJZNKlVpwK_1EcPJnewaio",
  authDomain: "spv-logistics.firebaseapp.com",
  databaseURL: "https://spv-logistics-default-rtdb.firebaseio.com",
  projectId: "spv-logistics",
  storageBucket: "spv-logistics.firebasestorage.app",
  messagingSenderId: "120533276755",
  appId: "1:120533276755:web:41743c12578da754d94ea6",
  measurementId: "G-620PFTGV22"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
export const cloudAppId = '/dataspv';

export const LOCAL_STORAGE_KEY = 'spv-logistics-v4-data';

// Pre-configured users representing the 5-Tier Account Hierarchy (Cấp 1 - Cấp 5)
export const DEFAULT_USERS: (UserAccount & { password?: string })[] = [
  {
    id: 'u_admin_1',
    email: 'admin@spv.biz.vn',
    password: 'admin123',
    name: "SPV's Boss (Admin)",
    phone: '0922012395',
    role: 'admin',
    status: 'active',
    createdAt: '2026-08-01T08:00:00Z',
    totpEnabled: false,
    totpSecret: 'JBSWY3DPEHPK3PXP'
  },
  {
    id: 'u_manager_1',
    email: 'quanly@spv.biz.vn',
    password: '123456',
    name: 'Trần Minh (Quản Lý)',
    phone: '0772215199',
    role: 'manager',
    status: 'active',
    createdAt: '2026-08-02T08:00:00Z',
    totpEnabled: false
  },
  {
    id: 'u_accounting_1',
    email: 'ketoan@spv.biz.vn',
    password: '123456',
    name: 'Lê Thu (Kế Toán)',
    phone: '0912345678',
    role: 'employee_accounting',
    status: 'active',
    createdAt: '2026-08-03T08:00:00Z',
    totpEnabled: false
  },
  {
    id: 'u_logistics_1',
    email: 'logistics@spv.biz.vn',
    password: '123456',
    name: 'Phạm Huy (Logistics)',
    phone: '0987654321',
    role: 'employee_logistics',
    status: 'active',
    createdAt: '2026-08-04T08:00:00Z',
    totpEnabled: false
  },
  {
    id: 'u_customer_1',
    email: 'khachhang@spv.biz.vn',
    password: '123456',
    name: 'Samsung Electronics (KH)',
    phone: '0901234567',
    role: 'customer',
    customer_name: 'Samsung Electronics',
    status: 'active',
    createdAt: '2026-08-05T08:00:00Z',
    totpEnabled: false
  }
];

export const DEFAULT_SHIPMENTS: ShipmentRecord[] = [
  {
    id: 'rec_1',
    date_announced: '2026-07-28',
    delivery_date: '2026-07-29',
    route: 'Hải Phòng - Hà Nội',
    transporter: 'Vận Tải Á Châu',
    cont_number: 'TGHU1234567',
    customer: 'Samsung Electronics',
    batch_number: 'NK-2026-088',
    cont_quantity: 2,
    warehouse: 'Kho ICD Đình Vũ',
    contact_person: 'Nguyễn Văn Hùng',
    contact_phone: '0901234567',
    phoi_nang: true,
    phoi_ha: true,
    hd_ha_rong: true,
    hd_dich_vu: false,
    notes: 'Hàng điện tử dễ vỡ, hạ bãi gấp',
    base_price: 3200000,
    sale_price: 4500000,
    created_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    createdAt: '2026-07-28T08:30:00Z'
  },
  {
    id: 'rec_2',
    date_announced: '2026-08-01',
    delivery_date: '2026-08-02',
    route: 'Hải Phòng - Bắc Ninh',
    transporter: 'Vận Tải Hải Phòng Speed',
    cont_number: 'COSU9876543',
    customer: 'LG Display Vietnam',
    batch_number: 'XK-2026-102',
    cont_quantity: 3,
    warehouse: 'Kho Cảng Chùa Vẽ',
    contact_person: 'Trần Thị Mai',
    contact_phone: '0912345678',
    phoi_nang: true,
    phoi_ha: false,
    hd_ha_rong: true,
    hd_dich_vu: true,
    notes: 'Giao giờ hành chính',
    base_price: 2800000,
    sale_price: 3900000,
    created_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    createdAt: '2026-08-01T09:15:00Z'
  }
];

export const DEFAULT_WAREHOUSES: WarehouseItem[] = [
  { id: 'w_1', warehouse_name: 'Kho ICD Đình Vũ', contact_person: 'Nguyễn Văn Hùng', contact_phone: '0901234567', location: 'https://maps.app.goo.gl/example' },
  { id: 'w_2', warehouse_name: 'Kho Cảng Chùa Vẽ', contact_person: 'Trần Thị Mai', contact_phone: '0912345678', location: 'Cảng Chùa Vẽ, Ngô Quyền, Hải Phòng' }
];

export const DEFAULT_TRANSPORTERS: TransporterItem[] = [
  { id: 't_1', transporter_name: 'Vận Tải Á Châu', company_full_name: 'CÔNG TY CỔ PHẦN VẬN TẢI VÀ DỊCH VỤ Á CHÂU', tax_code: '0201234567', address: 'Số 123 Đường Lê Thánh Tông, P. Máy Chai, Q. Ngô Quyền, TP. Hải Phòng' },
  { id: 't_2', transporter_name: 'Vận Tải Hải Phòng Speed', company_full_name: 'CÔNG TY TNHH VẬN TẢI HẢI PHÒNG SPEED', tax_code: '0209876543', address: 'BH01-12A Vinhomes Imperia, P. Thượng Lý, Q. Hồng Bàng, TP. Hải Phòng' }
];

export const DEFAULT_CUSTOMERS: CustomerItem[] = [
  { id: 'c_1', customer_name: 'Samsung Electronics', company_full_name: 'CÔNG TY TNHH SAMSUNG ELECTRONICS VIỆT NAM', tax_code: '0102345678', address: 'Khu công nghiệp Yên Phong, Xã Yên Trung, Huyện Yên Phong, Tỉnh Bắc Ninh' },
  { id: 'c_2', customer_name: 'LG Display Vietnam', company_full_name: 'CÔNG TY TNHH LG DISPLAY VIỆT NAM HẢI PHÒNG', tax_code: '0205554433', address: 'Khu công nghiệp Tràng Duệ, Xã Hồng Phong, Huyện An Dương, TP. Hải Phòng' }
];

export const DEFAULT_ROUTES: RouteItem[] = [
  { id: 'r_1', route_name: 'Hải Phòng - Hà Nội' },
  { id: 'r_2', route_name: 'Hải Phòng - Bắc Ninh' },
  { id: 'r_3', route_name: 'Hải Phòng - Thái Nguyên' }
];

export const DEFAULT_KPI_RATES: KPIRateItem[] = [
  { id: 'kpi_1', type_name: 'Xuất khẩu', reward_amount: 30000 },
  { id: 'kpi_2', type_name: 'Nhập khẩu', reward_amount: 30000 },
  { id: 'kpi_3', type_name: 'XKTC', reward_amount: 25000 },
  { id: 'kpi_4', type_name: 'NKTC', reward_amount: 25000 },
  { id: 'kpi_5', type_name: 'XNKTC', reward_amount: 40000 }
];

export const DEFAULT_CUSTOMS_DECLARATIONS: CustomsDeclarationRecord[] = [
  {
    id: 'cd_1',
    stt: 1,
    execution_date: '2026-08-05',
    completed_date: '2026-08-05',
    declaration_number: '105289341020',
    type: 'Xuất khẩu',
    customer: 'Samsung Electronics',
    cont_quantity: 1,
    support_transfer: {
      ratio: 1,
      ratio_label: '1',
      staff_id: 'u_admin_1',
      staff_name: "SPV's Boss"
    },
    completed: true,
    kpi_amount: 30000,
    approved: true,
    has_damage: false,
    notes: 'Tờ khai xuất khẩu hoàn tất đúng hạn.',
    created_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    createdAt: '2026-08-05T09:00:00Z'
  },
  {
    id: 'cd_2',
    stt: 2,
    execution_date: '2026-08-08',
    completed_date: '2026-08-08',
    declaration_number: '105289341021',
    type: 'XKTC',
    customer: 'LG Display Vietnam',
    cont_quantity: 1,
    support_transfer: {
      ratio: 0.5,
      ratio_label: '1/2',
      staff_id: 'u_admin_1',
      staff_name: "SPV's Boss"
    },
    completed: true,
    kpi_amount: 12500,
    approved: false,
    has_damage: false,
    notes: 'Chuyển 50% KPI hỗ trợ xử lý luồng đỏ.',
    created_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    createdAt: '2026-08-08T10:30:00Z'
  }
];

export const DEFAULT_CUSTOMER_QUOTATIONS: CustomerQuotation[] = [
  {
    id: 'quot_1',
    customer_name: 'Samsung Electronics',
    unit_price: 800000,
    notes: 'Đơn giá áp dụng cho lô container xuất/nhập khẩu chính ngạch.',
    updatedAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'quot_2',
    customer_name: 'LG Display Vietnam',
    unit_price: 850000,
    notes: 'Bao gồm chi phí kiểm tra thực tế hàng hóa luồng vàng/đỏ.',
    updatedAt: '2026-08-02T09:00:00Z'
  }
];

export const DEFAULT_EMPLOYEE_ADVANCES: EmployeeAdvanceItem[] = [
  {
    id: 'adv_1',
    staff_id: 'u_admin_1',
    staff_name: "SPV's Boss",
    description: 'Tạm ứng chi phí hạ vỏ container cảng Đình Vũ',
    advance_amount: 2000000,
    expense_amount: 1850000,
    approved: true,
    createdAt: '2026-08-03T10:00:00Z',
    updatedAt: '2026-08-03T10:00:00Z'
  }
];

export const DEFAULT_SEA_FREIGHTS: SeaFreightRecord[] = [
  {
    id: 'sf_1',
    booking_date: '2026-08-10',
    route: 'Hải Phòng - Los Angeles (USLAX)',
    mbl_hbl: 'ONE260810HP / HBL-SPV01',
    volume_info: '2x40HC',
    agent: 'Ocean Network Express (ONE)',
    customer: 'Samsung Electronics',
    buy_price: 1950,
    sell_price: 2300,
    profit: 350,
    notes: 'Hàng điện tử đóng ghép cont 40HC, hạ bãi trước 15/08',
    created_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    approved: true,
    approved_date: '2026-08-11',
    approved_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    createdAt: '2026-08-10T09:00:00Z'
  },
  {
    id: 'sf_2',
    booking_date: '2026-08-14',
    route: 'Hải Phòng - Singapore (SGSIN)',
    mbl_hbl: 'COSU882190 / HBL-SPV02',
    volume_info: '1x20GP',
    agent: 'Cosco Shipping Lines',
    customer: 'LG Display Vietnam',
    buy_price: 750,
    sell_price: 950,
    profit: 200,
    notes: 'Miễn phí lưu bãi lưu cont 14 ngày tại cảng đến',
    created_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    approved: false,
    createdAt: '2026-08-14T14:20:00Z'
  },
  {
    id: 'sf_3',
    booking_date: '2026-08-16',
    route: 'Hải Phòng - Hamburg (DEHAM)',
    mbl_hbl: 'HLCU260816 / HBL-SPV03',
    volume_info: '18 CBM (LCL)',
    agent: 'Hapag-Lloyd Logistics',
    customer: 'VinFast Auto',
    buy_price: 1100,
    sell_price: 1350,
    profit: 250,
    notes: 'Hàng linh kiện mẫu, bốc dỡ nhẹ tay',
    created_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    approved: true,
    approved_date: '2026-08-16',
    approved_by: {
      uid: 'u_admin_1',
      email: 'admin@spv.biz.vn',
      name: "SPV's Boss",
      role: 'admin'
    },
    createdAt: '2026-08-16T11:15:00Z'
  }
];

// Helper functions for Realtime DB sync
export async function saveRecordToCloud(collection: string, id: string, data: any): Promise<boolean> {
  try {
    // Sanitize payload to strip undefined values which Firebase Realtime Database strictly forbids
    const cleanData = JSON.parse(JSON.stringify(data));
    const itemRef = ref(db, `${cloudAppId}/${collection}/${id}`);
    await set(itemRef, cleanData);
    return true;
  } catch (err) {
    console.warn(`Cloud save error on ${collection}/${id}:`, err);
    return false;
  }
}

export async function deleteRecordFromCloud(collection: string, id: string): Promise<boolean> {
  try {
    const itemRef = ref(db, `${cloudAppId}/${collection}/${id}`);
    await remove(itemRef);
    return true;
  } catch (err) {
    console.warn(`Cloud remove error on ${collection}/${id}:`, err);
    return false;
  }
}

export function subscribeToCloudCollection(collection: string, callback: (data: any[]) => void) {
  try {
    const colRef = ref(db, `${cloudAppId}/${collection}`);
    return onValue(colRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        // Map entries to ensure each record retains its unique key as id if not present in item
        const list = Object.entries(val).map(([key, item]: [string, any]) => {
          if (item && typeof item === 'object') {
            return { id: item.id || key, ...item };
          }
          return item;
        });
        callback(list);
      } else {
        callback([]);
      }
    }, (error) => {
      console.warn(`Cloud subscription error on ${collection}:`, error);
    });
  } catch (e) {
    console.warn(`Subscription failed on ${collection}:`, e);
    return () => {};
  }
}
