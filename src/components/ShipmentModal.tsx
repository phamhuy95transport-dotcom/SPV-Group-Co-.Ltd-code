import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Edit2, Lock, Save, User } from 'lucide-react';
import { ShipmentRecord, WarehouseItem, TransporterItem, CustomerItem, RouteItem, UserAccount } from '../types';

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

  useEffect(() => {
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

  const onWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    const found = warehouses.find(w => w.warehouse_name === selected);
    setFormData(prev => ({
      ...prev,
      warehouse: selected,
      contact_person: found ? found.contact_person : prev.contact_person,
      contact_phone: found ? found.contact_phone : prev.contact_phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Requirement 5: Automatically set created_by info
      const creatorInfo = initialData?.created_by || (currentUser ? {
        uid: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role
      } : undefined);

      await onSave({
        ...formData,
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
                <label className="block text-xs font-bold text-slate-700 mb-1">C. Tuyến đường <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  list="route-list"
                  required
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
                <label className="block text-xs font-bold text-slate-700 mb-1">E. Số cont <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: TGHU1234567"
                  value={formData.cont_number || ''}
                  onChange={e => setFormData({ ...formData, cont_number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                <label className="block text-xs font-bold text-slate-700 mb-1">H. Số lượng cont <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.cont_quantity || 1}
                  onChange={e => setFormData({ ...formData, cont_quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                <label className="block text-xs font-bold text-slate-700 mb-1">I. Chọn Kho / Xưởng (Tự điền SĐT)</label>
                <select
                  value={formData.warehouse || ''}
                  onChange={onWarehouseChange}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn kho hoặc tự nhập --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.warehouse_name}>
                      {w.warehouse_name} ({w.location})
                    </option>
                  ))}
                </select>
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
                <span className="text-xs font-semibold text-slate-700">O. Hóa đơn dịch vụ</span>
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
                <input
                  type="number"
                  step="1000"
                  placeholder="Chi phí đầu vào"
                  value={formData.base_price || 0}
                  onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">R. Giá bán / cont (VNĐ)</label>
                <input
                  type="number"
                  step="1000"
                  placeholder="Giá thu từ khách hàng"
                  value={formData.sale_price || 0}
                  onChange={e => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-emerald-800 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
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
