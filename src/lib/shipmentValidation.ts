import type {
  CustomerItem,
  RouteItem,
  ShipmentRecord,
  TransporterItem,
  WarehouseItem,
} from '../types';
import { resolveMasterValue, type MasterResolution } from './masterData';

export type ShipmentValidationSeverity = 'error' | 'warning';

export interface ShipmentValidationIssue {
  code: string;
  severity: ShipmentValidationSeverity;
  field?: keyof ShipmentRecord;
  message: string;
}

export interface ShipmentMasterData {
  warehouses: WarehouseItem[];
  transporters: TransporterItem[];
  customers: CustomerItem[];
  routes: RouteItem[];
}

export interface ShipmentMasterMatch {
  field: 'warehouse' | 'transporter' | 'customer' | 'route';
  resolution: MasterResolution;
  canonicalValue?: string;
}

export interface ShipmentValidationResult {
  issues: ShipmentValidationIssue[];
  masterMatches: ShipmentMasterMatch[];
  containerNumbers: string[];
}

const ISO_6346_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

const REQUIRED_FIELDS: Array<[keyof ShipmentRecord, string]> = [
  ['date_announced', 'Ngày báo xe'],
  ['delivery_date', 'Ngày đóng/trả hàng'],
  ['route', 'Tuyến đường'],
  ['transporter', 'Đơn vị vận chuyển'],
  ['cont_number', 'Số cont'],
  ['customer', 'Khách hàng'],
];

export const parseContainerNumbers = (value?: string): string[] => [...new Set(
  (value || '')
    .toUpperCase()
    .split(/[\n,;\s]+/)
    .map(item => item.trim())
    .filter(Boolean),
)];

export const validateIso6346Container = (value: string): { isValid: boolean; reason?: string } => {
  const container = value.trim().toUpperCase();
  if (!/^[A-Z]{4}\d{7}$/.test(container)) {
    return { isValid: false, reason: 'Cần 4 chữ cái và 7 chữ số, ví dụ ABCU1234567.' };
  }
  const category = container[3];
  if (!['U', 'J', 'Z'].includes(category)) {
    return { isValid: false, reason: 'Ký tự thứ 4 thường là U, J hoặc Z theo ISO 6346.' };
  }

  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const character = container[index];
    const valueAtPosition = /\d/.test(character) ? Number(character) : ISO_6346_VALUES[character];
    if (valueAtPosition === undefined) return { isValid: false, reason: 'Mã cont có ký tự không hợp lệ.' };
    sum += valueAtPosition * (2 ** index);
  }
  const expectedCheckDigit = (sum % 11) % 10;
  const suppliedCheckDigit = Number(container[10]);
  return expectedCheckDigit === suppliedCheckDigit
    ? { isValid: true }
    : { isValid: false, reason: `Số kiểm tra ISO 6346 không khớp (dự kiến ${expectedCheckDigit}).` };
};

const isValidDate = (value?: string): boolean => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));

const fieldMasterMatches = (record: Partial<ShipmentRecord>, masterData: ShipmentMasterData): ShipmentMasterMatch[] => {
  const matches: ShipmentMasterMatch[] = [];
  const candidates: Array<ShipmentMasterMatch> = [
    {
      field: 'route',
      resolution: resolveMasterValue(record.route, masterData.routes, 'route'),
      canonicalValue: undefined,
    },
    {
      field: 'transporter',
      resolution: resolveMasterValue(record.transporter, masterData.transporters, 'transporter'),
      canonicalValue: undefined,
    },
    {
      field: 'customer',
      resolution: resolveMasterValue(record.customer, masterData.customers, 'customer'),
      canonicalValue: undefined,
    },
  ];
  if (record.warehouse?.trim()) {
    candidates.push({
      field: 'warehouse',
      resolution: resolveMasterValue(record.warehouse, masterData.warehouses, 'warehouse'),
      canonicalValue: undefined,
    });
  }

  candidates.forEach(match => {
    const item = match.resolution.item;
    if (!item) {
      matches.push(match);
      return;
    }
    const canonicalValue = match.field === 'route'
      ? (item as RouteItem).route_name
      : match.field === 'transporter'
      ? (item as TransporterItem).transporter_name
      : match.field === 'customer'
      ? (item as CustomerItem).customer_name
      : (item as WarehouseItem).warehouse_name;
    matches.push({ ...match, canonicalValue });
  });
  return matches;
};

export const validateShipmentDraft = (
  record: Partial<ShipmentRecord>,
  masterData: ShipmentMasterData,
  existingRecords: ShipmentRecord[] = [],
): ShipmentValidationResult => {
  const issues: ShipmentValidationIssue[] = [];
  REQUIRED_FIELDS.forEach(([field, label]) => {
    const value = record[field];
    if ((typeof value === 'string' && !value.trim()) || value === undefined || value === null) {
      issues.push({ code: 'required', severity: 'error', field, message: `${label} là bắt buộc.` });
    }
  });

  if (record.date_announced && !isValidDate(record.date_announced)) {
    issues.push({ code: 'date_format', severity: 'error', field: 'date_announced', message: 'Ngày báo xe phải theo định dạng YYYY-MM-DD.' });
  }
  if (record.delivery_date && !isValidDate(record.delivery_date)) {
    issues.push({ code: 'date_format', severity: 'error', field: 'delivery_date', message: 'Ngày đóng/trả hàng phải theo định dạng YYYY-MM-DD.' });
  }
  if (isValidDate(record.date_announced) && isValidDate(record.delivery_date)
    && record.delivery_date! < record.date_announced!) {
    issues.push({ code: 'delivery_before_announced', severity: 'error', field: 'delivery_date', message: 'Ngày đóng/trả hàng không thể trước ngày báo xe.' });
  }

  const containerNumbers = parseContainerNumbers(record.cont_number);
  if (record.cont_number?.trim() && containerNumbers.length === 0) {
    issues.push({ code: 'container_missing', severity: 'error', field: 'cont_number', message: 'Không đọc được số cont hợp lệ từ trường này.' });
  }
  containerNumbers.forEach(container => {
    const result = validateIso6346Container(container);
    if (!result.isValid) {
      issues.push({
        code: 'invalid_iso6346',
        severity: 'warning',
        field: 'cont_number',
        message: `${container}: ${result.reason}`,
      });
    }
  });
  if (!Number.isInteger(Number(record.cont_quantity)) || Number(record.cont_quantity) < 1) {
    issues.push({ code: 'container_quantity', severity: 'error', field: 'cont_quantity', message: 'Số lượng cont phải là số nguyên lớn hơn 0.' });
  } else if (containerNumbers.length > 0 && Number(record.cont_quantity) !== containerNumbers.length) {
    issues.push({
      code: 'container_quantity_mismatch',
      severity: 'warning',
      field: 'cont_quantity',
      message: `Số lượng cont (${record.cont_quantity}) khác số cont đã nhập (${containerNumbers.length}).`,
    });
  }

  if (record.contact_phone?.trim() && !/^(?:\+84|0)\d{9,10}$/.test(record.contact_phone.replace(/[.\s-]/g, ''))) {
    issues.push({ code: 'phone_format', severity: 'warning', field: 'contact_phone', message: 'Số điện thoại cần kiểm tra lại định dạng.' });
  }

  const masterMatches = fieldMasterMatches(record, masterData);
  masterMatches.forEach(match => {
    const currentValue = String(record[match.field] || '').trim();
    if (!currentValue) return;
    if (!match.resolution.item) {
      issues.push({
        code: 'unmatched_master_data',
        severity: 'warning',
        field: match.field,
        message: `${currentValue} chưa khớp duy nhất với danh mục chuẩn; hãy kiểm tra trước khi lưu.`,
      });
    } else if (match.canonicalValue && currentValue !== match.canonicalValue) {
      issues.push({
        code: 'canonical_suggestion',
        severity: 'warning',
        field: match.field,
        message: `Có thể chuẩn hóa "${currentValue}" thành "${match.canonicalValue}" (${match.resolution.matchedBy}).`,
      });
    }
  });

  if (containerNumbers.length > 0) {
    const ownId = record.id;
    const duplicates = existingRecords.filter(existing => existing.id !== ownId).filter(existing => {
      const existingContainers = parseContainerNumbers(existing.cont_number);
      return existingContainers.some(container => containerNumbers.includes(container));
    });
    if (duplicates.length > 0) {
      issues.push({
        code: 'duplicate_container',
        severity: 'warning',
        field: 'cont_number',
        message: `Số cont có thể đã tồn tại ở ${duplicates.length} chuyến khác; kiểm tra để tránh nhập trùng.`,
      });
    }
  }

  return { issues, masterMatches, containerNumbers };
};
