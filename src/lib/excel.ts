import * as xlsx from 'xlsx';
import { ShipmentRecord, formatDateVN, normalizeDateToISO } from '../types';

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
  { label: 'Giá gốc', key: 'base_price' },
  { label: 'Giá bán', key: 'sale_price' },
];

export function exportShipmentsToExcel(records: ShipmentRecord[], filename = 'danh-sach-chuyen-hang.xlsx') {
  // Format data for export (Dates formatted as dd/mm/yyyy)
  const data = records.map(record => {
    const row: any = {};
    SHIPMENT_EXCEL_COLUMNS.forEach(col => {
      let val = record[col.key];
      if (col.key === 'date_announced' || col.key === 'delivery_date') {
        val = formatDateVN(val);
      }
      row[col.label] = val !== undefined && val !== null ? val : '';
    });
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
        const workbook = xlsx.read(data, { type: 'binary', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);
        
        const parsedRecords = jsonData.map((row: any) => {
          const record: Partial<ShipmentRecord> = {};
          
          SHIPMENT_EXCEL_COLUMNS.forEach(col => {
            if (row[col.label] !== undefined && row[col.label] !== null) {
              if (col.key === 'cont_quantity' || col.key === 'base_price' || col.key === 'sale_price') {
                 record[col.key] = Number(row[col.label]) || (col.key === 'cont_quantity' ? 1 : 0);
              } else if (col.key === 'date_announced' || col.key === 'delivery_date') {
                 record[col.key] = normalizeDateToISO(row[col.label]);
              } else {
                 (record as any)[col.key] = String(row[col.label] || '').trim();
              }
            }
          });

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
