import * as xlsx from 'xlsx';
import { ShipmentRecord } from '../types';

// Map between Excel Column Names and ShipmentRecord keys
export const SHIPMENT_EXCEL_COLUMNS: { label: string; key: keyof ShipmentRecord }[] = [
  { label: 'Ngày báo xe', key: 'date_announced' },
  { label: 'Ngày đóng/trả hàng', key: 'delivery_date' },
  { label: 'Tuyến đường', key: 'route' },
  { label: 'Đơn vị vận chuyển', key: 'transporter' },
  { label: 'Số cont', key: 'cont_number' },
  { label: 'Khách hàng', key: 'customer' },
  { label: 'Số lô nhập/xuất', key: 'batch_number' },
  { label: 'Số lượng cont', key: 'cont_quantity' },
  { label: 'Kho/xưởng', key: 'warehouse' },
  { label: 'Tên người giao/nhận', key: 'contact_person' },
  { label: 'SĐT người nhận', key: 'contact_phone' },
  { label: 'Ghi chú', key: 'notes' },
];

export function exportShipmentsToExcel(records: ShipmentRecord[], filename = 'danh-sach-chuyen-hang.xlsx') {
  // Format data for export
  const data = records.map(record => {
    const row: any = {};
    SHIPMENT_EXCEL_COLUMNS.forEach(col => {
      row[col.label] = record[col.key] || '';
    });
    // Additional boolean toggles
    row['Phơi nâng'] = record.phoi_nang ? 'Có' : 'Không';
    row['Phơi hạ'] = record.phoi_ha ? 'Có' : 'Không';
    row['HĐ hạ rỗng'] = record.hd_ha_rong ? 'Có' : 'Không';
    row['HĐ cước VC/Đầu vào'] = record.hd_dich_vu ? 'Có' : 'Không';
    row['HĐ đầu ra'] = record.hd_dau_ra ? 'Có' : 'Không';

    return row;
  });

  const worksheet = xlsx.utils.json_to_sheet(data);
  
  // Create workbook
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Chuyến hàng');
  
  // Download
  xlsx.writeFile(workbook, filename);
}

export function parseShipmentsFromExcel(file: File): Promise<Partial<ShipmentRecord>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);
        
        const parsedRecords = jsonData.map((row: any) => {
          const record: Partial<ShipmentRecord> = {};
          
          SHIPMENT_EXCEL_COLUMNS.forEach(col => {
            if (row[col.label] !== undefined) {
              if (col.key === 'cont_quantity') {
                 record[col.key] = Number(row[col.label]) || 1;
              } else {
                 (record as any)[col.key] = String(row[col.label] || '');
              }
            }
          });
          
          record.phoi_nang = row['Phơi nâng'] === 'Có';
          record.phoi_ha = row['Phơi hạ'] === 'Có';
          record.hd_ha_rong = row['HĐ hạ rỗng'] === 'Có';
          record.hd_dich_vu = row['HĐ cước VC/Đầu vào'] === 'Có';
          record.hd_dau_ra = row['HĐ đầu ra'] === 'Có';

          return record;
        });
        
        resolve(parsedRecords);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
