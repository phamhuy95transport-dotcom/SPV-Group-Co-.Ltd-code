import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, remove, onValue } from 'firebase/database';
import { UserAccount, ShipmentRecord, WarehouseItem, TransporterItem, CustomerItem, RouteItem } from '../types';

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

// Initial pre-configured seed users (Only Admin default account)
export const DEFAULT_USERS: (UserAccount & { password?: string })[] = [
  {
    id: 'u_admin_1',
    email: 'admin@spv.biz.vn',
    password: 'admin123',
    name: 'Quản Trị Viên High-Level',
    phone: '0922012395',
    role: 'admin',
    status: 'active',
    createdAt: '2026-08-01T08:00:00Z',
    totpEnabled: false,
    totpSecret: 'JBSWY3DPEHPK3PXP' // Demo TOTP secret available for optional 2FA setup
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
      name: 'Quản Trị Viên High-Level',
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
      name: 'Quản Trị Viên High-Level',
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

// Helper functions for Realtime DB sync
export async function saveRecordToCloud(collection: string, id: string, data: any) {
  try {
    const itemRef = ref(db, `${cloudAppId}/${collection}/${id}`);
    await set(itemRef, data);
  } catch (err) {
    console.warn(`Cloud save error on ${collection}/${id}:`, err);
  }
}

export async function deleteRecordFromCloud(collection: string, id: string) {
  try {
    const itemRef = ref(db, `${cloudAppId}/${collection}/${id}`);
    await remove(itemRef);
  } catch (err) {
    console.warn(`Cloud remove error on ${collection}/${id}:`, err);
  }
}

export function subscribeToCloudCollection(collection: string, callback: (data: any[]) => void) {
  try {
    const colRef = ref(db, `${cloudAppId}/${collection}`);
    return onValue(colRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        callback(Object.values(val));
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
