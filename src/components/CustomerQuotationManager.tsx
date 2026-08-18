import React, { useState } from 'react';
import {
  Plus,
  Search,
  Tag,
  Edit2,
  Trash2,
  Copy,
  Building2,
  DollarSign,
  Save,
  X
} from 'lucide-react';
import { CustomerQuotation, CustomerItem, UserAccount } from '../types';

interface CustomerQuotationManagerProps {
  quotations: CustomerQuotation[];
  customers: CustomerItem[];
  currentUser: UserAccount | null;
  onSaveQuotation: (quotation: CustomerQuotation) => void;
  onDeleteQuotation: (id: string, name: string) => void;
}

export const CustomerQuotationManager: React.FC<CustomerQuotationManagerProps> = ({
  quotations,
  customers,
  currentUser,
  onSaveQuotation,
  onDeleteQuotation
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'duplicate'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    unit_price: 800000,
    notes: ''
  });

  const filteredQuotations = quotations.filter(q => {
    if (currentUser?.role === 'customer') {
      if (currentUser.customer_name) {
        if (q.customer_name !== currentUser.customer_name) return false;
      } else if (currentUser.name) {
        if (!q.customer_name || !q.customer_name.toLowerCase().includes(currentUser.name.toLowerCase())) return false;
      }
    }
    return (
      (q.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (q.notes || '').toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  });

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      customer_name: customers[0]?.customer_name || '',
      unit_price: 800000,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CustomerQuotation) => {
    setModalMode('edit');
    setEditingId(item.id);
    setFormData({
      customer_name: item.customer_name,
      unit_price: item.unit_price,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDuplicateQuotation = (item: CustomerQuotation) => {
    setModalMode('duplicate');
    setEditingId(null);
    setFormData({
      customer_name: item.customer_name ? `${item.customer_name} (Bản sao)` : '',
      unit_price: item.unit_price,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      alert('Vui lòng chọn hoặc nhập tên Khách hàng!');
      return;
    }

    const itemToSave: CustomerQuotation = {
      id: editingId || `quot_${Date.now()}`,
      customer_name: formData.customer_name.trim(),
      unit_price: Number(formData.unit_price) || 0,
      notes: formData.notes.trim(),
      updatedAt: new Date().toISOString()
    };

    onSaveQuotation(itemToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            <span>Bảng Báo Giá Thủ Tục Hải Quan Cho Khách Hàng</span>
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý bảng đơn giá dịch vụ thủ tục hải quan theo cont/lô quy định cho từng khách hàng
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Báo Giá Mới</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên Khách hàng hoặc ghi chú..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Table (Requirement 6) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 text-center w-14 border-r border-slate-700">STT</th>
                <th className="p-3.5 border-r border-slate-700">Tên Khách Hàng</th>
                <th className="p-3.5 text-right border-r border-slate-700 min-w-[200px]">Đơn giá thủ tục hải quan (cont/lô)</th>
                <th className="p-3.5 border-r border-slate-700">Ghi chú</th>
                <th className="p-3.5 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Chưa có báo giá nào. Nhấn "Thêm Báo Giá Mới" để tạo báo giá cho khách hàng.
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400 text-xs border-r border-slate-100">
                      {index + 1}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{item.customer_name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-emerald-700 text-sm border-r border-slate-100">
                      {(item.unit_price || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-3.5 text-slate-600 text-xs border-r border-slate-100">
                      {item.notes || '—'}
                    </td>
                    <td className="p-3.5 text-center space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuotation(item)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Nhân bản báo giá (Tạo bản sao mới)"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Sửa báo giá"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteQuotation(item.id, `Báo giá của ${item.customer_name}`)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Xóa báo giá"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                {modalMode === 'duplicate' ? (
                  <Copy className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Tag className="w-4 h-4 text-indigo-400" />
                )}
                <span>
                  {modalMode === 'edit'
                    ? 'Chỉnh Sửa Báo Giá'
                    : modalMode === 'duplicate'
                    ? 'Nhân Bản Báo Giá (Tạo bản sao mới)'
                    : 'Thêm Báo Giá Khách Hàng'}
                </span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Khách Hàng *</label>
                <div className="space-y-2">
                  <select
                    value={formData.customer_name}
                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  >
                    <option value="">-- Chọn Khách Hàng từ Danh Mục --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.customer_name}>
                        {c.customer_name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Hoặc nhập tên Khách hàng mới..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đơn giá thủ tục hải quan cont/lô (VND) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    required
                    value={formData.unit_price}
                    onChange={e => setFormData({ ...formData, unit_price: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="800000"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-emerald-800 text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Bằng chữ: {(formData.unit_price || 0).toLocaleString('vi-VN')} VNĐ / cont/lô
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú áp dụng đơn giá..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-xs"
                >
                  Lưu Báo Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
