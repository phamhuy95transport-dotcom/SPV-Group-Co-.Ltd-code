import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Users,
  Search,
  ShieldCheck,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  UserCheck
} from 'lucide-react';
import { EmployeeAdvanceItem, UserAccount } from '../types';

interface EmployeeAdvanceManagerProps {
  advances: EmployeeAdvanceItem[];
  users: UserAccount[];
  currentUser: UserAccount | null;
  onSaveAdvance: (item: EmployeeAdvanceItem) => void;
  onDeleteAdvance: (id: string) => void;
  onToggleApproval: (id: string, currentApproved: boolean) => void;
}

export const EmployeeAdvanceManager: React.FC<EmployeeAdvanceManagerProps> = ({
  advances,
  users,
  currentUser,
  onSaveAdvance,
  onDeleteAdvance,
  onToggleApproval
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    staff_id: users[0]?.id || '',
    description: '',
    advance_amount: 1000000,
    expense_amount: 0,
    approved: false
  });

  // Filtered List
  const filteredAdvances = useMemo(() => {
    return advances.filter(item => {
      if (selectedStaffId !== 'all' && item.staff_id !== selectedStaffId) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const descMatch = (item.description || '').toLowerCase().includes(query);
        const nameMatch = (item.staff_name || '').toLowerCase().includes(query);
        return descMatch || nameMatch;
      }
      return true;
    });
  }, [advances, selectedStaffId, searchTerm]);

  // Overall Totals
  const totalAdvanceSum = filteredAdvances.reduce((sum, item) => sum + (item.advance_amount || 0), 0);
  const totalExpenseSum = filteredAdvances.reduce((sum, item) => sum + (item.expense_amount || 0), 0);
  const balanceSum = totalAdvanceSum - totalExpenseSum;

  const handleOpenAddModal = (staffId?: string) => {
    setEditingId(null);
    setFormData({
      staff_id: staffId && staffId !== 'all' ? staffId : (currentUser?.id || users[0]?.id || ''),
      description: '',
      advance_amount: 1000000,
      expense_amount: 0,
      approved: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: EmployeeAdvanceItem) => {
    // Rule 7: If approved, non-admin users CANNOT edit or modify
    if (item.approved && !isAdmin) {
      alert('Khoản tạm ứng đã được Duyệt bởi Quản trị viên và đã bị khóa! Không thể chỉnh sửa.');
      return;
    }
    setEditingId(item.id);
    setFormData({
      staff_id: item.staff_id,
      description: item.description,
      advance_amount: item.advance_amount,
      expense_amount: item.expense_amount || 0,
      approved: item.approved
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('Vui lòng nhập Diễn giải tạm ứng!');
      return;
    }

    const staffObj = users.find(u => u.id === formData.staff_id);
    const itemToSave: EmployeeAdvanceItem = {
      id: editingId || `adv_${Date.now()}`,
      staff_id: formData.staff_id,
      staff_name: staffObj ? staffObj.name : currentUser?.name || 'Nhân viên',
      description: formData.description.trim(),
      advance_amount: Number(formData.advance_amount) || 0,
      expense_amount: Number(formData.expense_amount) || 0,
      approved: isAdmin ? formData.approved : (editingId ? advances.find(a => a.id === editingId)?.approved || false : false),
      createdAt: editingId ? (advances.find(a => a.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveAdvance(itemToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <span>Sổ Theo Dõi Tạm Ứng Nhân Viên</span>
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý khoản ứng tiền công tác, chi phí thực tế và trạng thái duyệt cho từng nhân viên
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal(selectedStaffId)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Tạm Ứng Mới</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Tổng Số Tiền Ứng</span>
          <div className="text-xl font-black text-indigo-900 mt-1 font-mono">
            {totalAdvanceSum.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Tổng Chi Phí Thực Tế</span>
          <div className="text-xl font-black text-amber-700 mt-1 font-mono">
            {totalExpenseSum.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-200 uppercase">Dư / Thiếu Tạm Ứng</span>
          <div className={`text-xl font-black mt-1 font-mono ${balanceSum >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
            {balanceSum.toLocaleString('vi-VN')} đ
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Staff Selector */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <label className="font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Chọn Nhân Viên:</span>
          </label>
          <select
            value={selectedStaffId}
            onChange={e => setSelectedStaffId(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">-- Tất cả Nhân viên ({users.length}) --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'employee_accounting' ? 'Kế toán' : 'Logistics'})
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo diễn giải tạm ứng..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table (Requirement 7: STT, Diễn giải, Số tiền ứng, Chi phí, Nút Duyệt - Admin only) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 text-center w-12 border-r border-slate-700">STT</th>
                <th className="p-3.5 border-r border-slate-700 min-w-[140px]">Nhân Viên</th>
                <th className="p-3.5 border-r border-slate-700">Diễn Giải Khoản Ứng</th>
                <th className="p-3.5 text-right border-r border-slate-700 min-w-[140px]">Số Tiền Ứng</th>
                <th className="p-3.5 text-right border-r border-slate-700 min-w-[140px]">Chi Phí</th>
                <th className="p-3.5 text-center border-r border-slate-700 w-32">Duyệt (Admin)</th>
                <th className="p-3.5 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Chưa có dữ liệu tạm ứng cho nhân viên này. Nhấn "Tạo Tạm Ứng Mới" để bắt đầu nhập liệu.
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((item, index) => {
                  const isLockedForCurrent = item.approved && !isAdmin;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition ${item.approved ? 'bg-amber-50/20' : ''}`}>
                      <td className="p-3.5 text-center font-bold text-slate-400 text-xs border-r border-slate-100">
                        {index + 1}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{item.staff_name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800 border-r border-slate-100">
                        {item.description}
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-indigo-900 border-r border-slate-100 whitespace-nowrap">
                        {(item.advance_amount || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-800 border-r border-slate-100 whitespace-nowrap">
                        {(item.expense_amount || 0).toLocaleString('vi-VN')} đ
                      </td>
                      {/* Nút Duyệt (Requirement 7: Admin only) */}
                      <td className="p-3.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (!isAdmin) {
                              alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền Duyệt khoản tạm ứng!');
                              return;
                            }
                            onToggleApproval(item.id, item.approved);
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
                            item.approved
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-xs'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          } ${!isAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                          title={
                            !isAdmin
                              ? 'Dữ liệu đã duyệt bị khóa đối với nhân viên'
                              : item.approved
                              ? 'Click để Hủy duyệt khoản tạm ứng này'
                              : 'Click để Duyệt khoản tạm ứng này'
                          }
                        >
                          {item.approved ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>Đã duyệt</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Chờ duyệt</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="p-3.5 text-center space-x-1 whitespace-nowrap">
                        {isLockedForCurrent ? (
                          <span
                            className="inline-flex items-center gap-1 text-slate-400 text-xs px-2 py-1 bg-slate-100 rounded"
                            title="Đã duyệt - không thể chỉnh sửa"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Đã khóa</span>
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Sửa tạm ứng"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc chắn muốn xóa khoản tạm ứng "${item.description}" của nhân viên ${item.staff_name}?`)) {
                                  onDeleteAdvance(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa tạm ứng"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
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
                <Wallet className="w-4 h-4 text-indigo-400" />
                <span>{editingId ? 'Sửa Khoản Tạm Ứng' : 'Tạo Khoản Tạm Ứng Nhân Viên'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nhân Viên Nhận Tạm Ứng *</label>
                <select
                  value={formData.staff_id}
                  onChange={e => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'employee_accounting' ? 'Kế toán' : 'Logistics'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diễn Giải Khoản Ứng *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Ứng tiền phí hạ vỏ cont, phí kiểm dịch cảng..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số Tiền Ứng (VND) *</label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    required
                    value={formData.advance_amount}
                    onChange={e => setFormData({ ...formData, advance_amount: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chi Phí Thực Tế (VND)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={formData.expense_amount}
                    onChange={e => setFormData({ ...formData, expense_amount: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-amber-800"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Trạng thái Duyệt (Admin)</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.approved}
                      onChange={e => setFormData({ ...formData, approved: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              )}

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
                  Lưu Tạm Ứng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
