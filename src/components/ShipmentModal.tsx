import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Edit2, Lock, Save, User, AlertCircle } from 'lucide-react';
import { ShipmentRecord, WarehouseItem, TransporterItem, CustomerItem, RouteItem, UserAccount } from '../types';

export const formatNumberWithDots = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const cleanDigits = String(val).replace(/\D/g, '');
  if (!cleanDigits) return '';
  return cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseFormattedNumber = (formattedStr: string): number => {
  const cleanDigits = formattedStr.replace(/\D/g, '');
  return cleanDigits ? Number(cleanDigits) : 0;
};

export const validateISO6346 = (_contStr: string): { isValid: boolean; reason?: string } => {
  return { isValid: true };
};

interface ShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<ShipmentRecord>) => Promise<void>;
  modalMode: 'add' | 'edit';
  initialData?: ShipmentRecord | null;
  warehouses: WarehouseItem[];
  transporters: TransporterItem[];
  customers: CustomerItem[];
  routes: RouteItem[];
  currentUser: UserAccount | null;
}

export const ShipmentModal: React.FC<ShipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  modalMode,
  initialData,
  warehouses,
  transporters,
  customers,
  routes,
  currentUser,
}) => {
  const [formData, setFormData] = useState<Partial<ShipmentRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [contErrorMsg, setContErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setContErrorMsg(null);
    if (modalMode === 'edit' && initialData) {
      setFormData({ ...initialData });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        date_announced: today,
        delivery_date: today,
        route: '',
        transporter: '',
        cont_number: '',
        customer: '',
        batch_number: '',
        cont_quantity: 1,
        warehouse: '',
        contact_person: '',
        contact_phone: '',
        phoi_nang: false,
        phoi_ha: false,
        hd_ha_rong: false,
        hd_dich_vu: false,
        notes: '',
        base_price: 0,
        sale_price: 0,
      });
    }
  }, [modalMode, initialData, isOpen]);

  if (!isOpen) return null;

  // Handle Multi-Cont Input
  const rawContText = formData.cont_number || '';
  const parsedContList = rawContText
    .split(/[\n,;\s]+/)
    .map(c => c.trim())
    .filter(Boolean);

  const handleContNumberChange = (text: string) => {
    const upper = text.toUpperCase();
    const list = upper
      .split(/[\n,;\s]+/)
      .map(c => c.trim())
      .filter(Boolean);

    setFormData(prev => ({
      ...prev,
      cont_number: upper,
      cont_quantity: list.length > 0 ? list.length : (prev.cont_quantity || 1)
    }));
    setContErrorMsg(null);
  };

  const handleWarehouseChange = (val: string) => {
    const found = warehouses.find(
      w => w.warehouse_name.toLowerCase() === val.trim().toLowerCase()
    );
    setFormData(prev => ({
      ...prev,
      warehouse: val,
      contact_person: found ? found.contact_person : prev.contact_person,
      contact_phone: found ? found.contact_phone : prev.contact_phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const creatorInfo = initialData?.created_by || (currentUser ? {
        uid: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role
      } : undefined);

      await onSave({
        ...formData,
        cont_number: formData.cont_number?.trim() || '',
        cont_quantity: formData.cont_quantity !== undefined ? formData.cont_quantity : 1,
        created_by: creatorInfo
      });
      onClose();
    } catch (err) {
      console.error('Error saving shipment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 transform transition-all my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {modalMode === 'add' ? (
              <PlusCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Edit2 className="w-5 h-5 text-indigo-400" />
            )}
            <h3 className="font-extrabold text-slate-100 text-sm sm:text-base">
              {modalMode === 'add' ? 'Thêm Mới Chuyến Hàng (Cột A đến R)' : 'Chỉnh Sửa Thông Tin Chuyến Hàng'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Creator Tag (Requirement 5) */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-indigo-950">
              <User className="w-4 h-4 text-indigo-600" />
              <span>
                Tự động ghi nhận Người Nhập Liệu:{' '}
                <strong className="text-indigo-700">
                  {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Hệ thống'}
                </strong>
              </span>
            </div>
            <span className="bg-indigo-200 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
              {currentUser?.role || 'User'}
            </span>
          </div>

          {/* Error message banner if any */}
          {contErrorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{contErrorMsg}</span>
            </div>
          )}

          {/* Section 1: Thông tin chuyến xe */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block mb-3">
              1. Thông Tin Chuyến & Thời Gian (Cột A - H)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">A. Ngày báo xe <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.date_announced || ''}
                  onChange={e => setFormData({ ...formData, date_announced: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">B. Ngày đóng/trả hàng <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.delivery_date || ''}
                  onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">C. Tuyến đường</label>
                <input
                  type="text"
                  list="route-list"
                  placeholder="Ví dụ: Hải Phòng - Hà Nội"
                  value={formData.route || ''}
                  onChange={e => setFormData({ ...formData, route: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="route-list">
                  {routes.map(r => (
                    <option key={r.id} value={r.route_name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">D. Đơn vị vận chuyển <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  list="transporter-list"
                  required
                  placeholder="Tên nhà xe"
                  value={formData.transporter || ''}
                  onChange={e => setFormData({ ...formData, transporter: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="transporter-list">
                  {transporters.map(t => (
                    <option key={t.id} value={t.transporter_name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">F. Khách hàng <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  list="customer-list"
                  required
                  placeholder="Tên khách hàng"
                  value={formData.customer || ''}
                  onChange={e => setFormData({ ...formData, customer: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="customer-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.customer_name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">G. Số lô nhập/xuất</label>
                <input
                  type="text"
                  placeholder="Ví dụ: NK-2026-088"
                  value={formData.batch_number || ''}
                  onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">H. Số lượng cont</label>
                <input
                  type="number"
                  min={1}
                  value={formData.cont_quantity || 1}
                  onChange={e => setFormData({ ...formData, cont_quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-indigo-50/50 border border-indigo-200 text-indigo-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Multi-Cont Input Field */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E. Số cont (Có thể nhập nhiều số cont, phân cách bằng phẩy hoặc xuống dòng)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: TGHU1234567, MSKU9876543 (nhập nhiều cont phân cách bằng phẩy hoặc xuống dòng)"
                  value={formData.cont_number || ''}
                  onChange={e => handleContNumberChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {/* Display parsed container tags */}
                {parsedContList.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {parsedContList.map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1"
                      >
                        <span>{code}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Kho & Tự động điền */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block mb-3">
              2. Thông Tin Kho / Xưởng & Người Giao Nhận (Cột I - K)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">I. Chọn hoặc nhập Kho / Xưởng (Gợi ý SĐT)</label>
                <input
                  type="text"
                  list="warehouse-list"
                  placeholder="Nhập tên kho/xưởng hoặc chọn..."
                  value={formData.warehouse || ''}
                  onChange={e => handleWarehouseChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="warehouse-list">
                  {warehouses.map(w => (
                    <option key={w.id} value={w.warehouse_name}>
                      {w.warehouse_name} {w.location ? `(${w.location})` : ''}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">J. Tên người giao/nhận hàng</label>
                <input
                  type="text"
                  placeholder="Người liên hệ"
                  value={formData.contact_person || ''}
                  onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">K. SĐT người nhận hàng</label>
                <input
                  type="text"
                  placeholder="Số điện thoại"
                  value={formData.contact_phone || ''}
                  onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Chứng từ & Phơi */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block mb-3">
              3. Trạng Thái Chứng Từ & Phơi (Cột L - P)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.phoi_nang || false}
                  onChange={e => setFormData({ ...formData, phoi_nang: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">L. Phơi nâng</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.phoi_ha || false}
                  onChange={e => setFormData({ ...formData, phoi_ha: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">M. Phơi hạ</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.hd_ha_rong || false}
                  onChange={e => setFormData({ ...formData, hd_ha_rong: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">N. Hóa đơn hạ rỗng</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.hd_dich_vu || false}
                  onChange={e => setFormData({ ...formData, hd_dich_vu: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">O. Hóa đơn cước vc</span>
              </label>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">P. Ghi chú chuyến hàng</label>
              <textarea
                rows={2}
                placeholder="Ghi chú chi tiết giao nhận, lưu ý đặc biệt..."
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 4: Doanh thu & Giá gốc (Admin/Staff) */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 mb-3">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>4. Quản Lý Giá & Doanh Thu Nội Bộ (Cột Q - R)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Q. Giá gốc / cont (VNĐ)</label>
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Chi phí đầu vào (VD: 3.500.000)"
                    value={formData.base_price ? formatNumberWithDots(formData.base_price) : ''}
                    onChange={e => {
                      const num = parseFormattedNumber(e.target.value);
                      setFormData({ ...formData, base_price: num });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                  {formData.base_price ? (
                    <span className="text-[11px] text-amber-800 font-semibold block mt-1">
                      = {formatNumberWithDots(formData.base_price)} VNĐ
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">R. Giá bán / cont (VNĐ)</label>
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Giá thu từ khách hàng (VD: 4.500.000)"
                    value={formData.sale_price ? formatNumberWithDots(formData.sale_price) : ''}
                    onChange={e => {
                      const num = parseFormattedNumber(e.target.value);
                      setFormData({ ...formData, sale_price: num });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold text-emerald-800 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {formData.sale_price ? (
                    <span className="text-[11px] text-emerald-800 font-semibold block mt-1">
                      = {formatNumberWithDots(formData.sale_price)} VNĐ
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang Lưu Cloud DB...' : 'Lưu Dữ Liệu Chuyến'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
