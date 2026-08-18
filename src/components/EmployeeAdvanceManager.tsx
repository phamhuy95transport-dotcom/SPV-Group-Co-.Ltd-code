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
  Copy,
  CheckCircle2,
  Clock,
  X,
  BookOpen
} from 'lucide-react';
import { EmployeeAdvanceItem, UserAccount } from '../types';

interface EmployeeAdvanceManagerProps {
  advances: EmployeeAdvanceItem[];
  users: UserAccount[];
  currentUser: UserAccount | null;
  onSaveAdvance: (item: EmployeeAdvanceItem) => void;
  onDeleteAdvance: (id: string, name: string) => void;
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
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  // State for explicit ledgers added in current session
  const [explicitLedgers, setExplicitLedgers] = useState<string[]>([]);
  
  // Active Ledger (Selected Staff ID)
  const [activeLedgerStaffId, setActiveLedgerStaffId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceModalMode, setAdvanceModalMode] = useState<'add' | 'edit' | 'duplicate'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State for Ledger
  const [newLedgerStaffId, setNewLedgerStaffId] = useState<string>('');

  // Form State for Advance
  const [formData, setFormData] = useState({
    description: '',
    advance_amount: 0,
    expense_amount: 0,
    approved: false
  });

  // Calculate Ledgers list
  const ledgers = useMemo(() => {
    const staffIdsWithAdvances = new Set(advances.map(a => a.staff_id));
    explicitLedgers.forEach(id => staffIdsWithAdvances.add(id));
    
    // For normal employees, if they shouldn't see others, we could filter here, 
    // but typically if they have 'finance_advances' view permission they might be accounting staff.
    // If not admin/manager, we can just show their own or let them see all if they have permission. 
    // To be safe and meet "1 sổ là 1 nhân viên", we show them their own by default if they are normal employee.
    let allowedStaffIds = Array.from(staffIdsWithAdvances);
    if (!isAdminOrManager) {
      // Normal employee only sees their own ledger unless they were granted permission, 
      // but let's restrict to their own to ensure "nhân viên sẽ nhập liệu vào sổ" means THEIR sổ.
      allowedStaffIds = [currentUser?.id || ''];
    }

    return allowedStaffIds.map(id => {
      const user = users.find(u => u.id === id);
      const staffAdvances = advances.filter(a => a.staff_id === id);
      const totalAdvance = staffAdvances.reduce((sum, a) => sum + (a.advance_amount || 0), 0);
      const totalExpense = staffAdvances.reduce((sum, a) => sum + (a.expense_amount || 0), 0);
      
      return {
        staff_id: id,
        staff_name: user?.name || 'Chưa gán',
        totalAdvance,
        totalExpense,
        count: staffAdvances.length
      };
    }).filter(l => l.staff_id);
  }, [advances, explicitLedgers, users, isAdminOrManager, currentUser?.id]);

  // Set default active ledger if none selected
  React.useEffect(() => {
    if (!activeLedgerStaffId && ledgers.length > 0) {
      setActiveLedgerStaffId(ledgers[0].staff_id);
    }
  }, [ledgers, activeLedgerStaffId]);

  const activeLedgerData = ledgers.find(l => l.staff_id === activeLedgerStaffId);
  
  const currentLedgerAdvances = useMemo(() => {
    if (!activeLedgerStaffId) return [];
    let filtered = advances.filter(a => a.staff_id === activeLedgerStaffId);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.description.toLowerCase().includes(lower));
    }
    // Sort by created at or date (latest first)
    return filtered.reverse();
  }, [advances, activeLedgerStaffId, searchTerm]);

  // Handlers
  const handleAddLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLedgerStaffId && !explicitLedgers.includes(newLedgerStaffId)) {
      setExplicitLedgers([...explicitLedgers, newLedgerStaffId]);
      setActiveLedgerStaffId(newLedgerStaffId);
    }
    setIsLedgerModalOpen(false);
    setNewLedgerStaffId('');
  };

  const handleOpenAddAdvance = () => {
    setAdvanceModalMode('add');
    setEditingId(null);
    setFormData({
      description: '',
      advance_amount: 0,
      expense_amount: 0,
      approved: false
    });
    setIsAdvanceModalOpen(true);
  };

  const handleOpenEditAdvance = (item: EmployeeAdvanceItem) => {
    setAdvanceModalMode('edit');
    setEditingId(item.id);
    setFormData({
      description: item.description || '',
      advance_amount: item.advance_amount || 0,
      expense_amount: item.expense_amount || 0,
      approved: item.approved || false
    });
    setIsAdvanceModalOpen(true);
  };

  const handleDuplicateAdvance = (item: EmployeeAdvanceItem) => {
    setAdvanceModalMode('duplicate');
    setEditingId(null);
    setFormData({
      description: item.description ? `${item.description} (Bản sao)` : '',
      advance_amount: item.advance_amount || 0,
      expense_amount: item.expense_amount || 0,
      approved: false // Bản sao mới tạo chưa duyệt
    });
    setIsAdvanceModalOpen(true);
  };

  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLedgerStaffId) return;
    
    const staffUser = users.find(u => u.id === activeLedgerStaffId);
    if (!staffUser) return;

    const itemToSave: EmployeeAdvanceItem = {
      id: editingId || `adv-${Date.now()}`,
      staff_id: staffUser.id,
      staff_name: staffUser.name,
      description: formData.description,
      advance_amount: formData.advance_amount,
      expense_amount: formData.expense_amount,
      approved: formData.approved,
      createdAt: new Date().toISOString()
    };

    onSaveAdvance(itemToSave);
    setIsAdvanceModalOpen(false);
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-140px)] min-h-[600px]">
      {/* LEFT SIDEBAR: List of Ledgers */}
      <div className="w-full lg:w-80 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Sổ Theo Dõi Tạm Ứng</span>
          </h3>
          {isAdminOrManager && (
            <button
              onClick={() => {
                setNewLedgerStaffId(users[0]?.id || '');
                setIsLedgerModalOpen(true);
              }}
              className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition"
              title="Thêm sổ mới"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {ledgers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Chưa có sổ theo dõi nào.
            </div>
          ) : (
            ledgers.map(ledger => (
              <button
                key={ledger.staff_id}
                onClick={() => setActiveLedgerStaffId(ledger.staff_id)}
                className={`w-full text-left p-3 rounded-xl transition flex flex-col gap-2 ${
                  activeLedgerStaffId === ledger.staff_id 
                    ? 'bg-indigo-50 border-indigo-100 border' 
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    activeLedgerStaffId === ledger.staff_id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${
                      activeLedgerStaffId === ledger.staff_id ? 'text-indigo-900' : 'text-slate-700'
                    }`}>{ledger.staff_name}</p>
                    <p className="text-[10px] text-slate-500">{ledger.count} khoản tạm ứng</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Ledger Details */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {activeLedgerData ? (
          <>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  Sổ Tạm Ứng: <span className="text-indigo-700">{activeLedgerData.staff_name}</span>
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs font-semibold text-slate-600">
                    Tổng ứng: <span className="text-indigo-600 font-mono font-bold">{formatCurrency(activeLedgerData.totalAdvance)}</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    Tổng chi: <span className="text-amber-600 font-mono font-bold">{formatCurrency(activeLedgerData.totalExpense)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm diễn giải..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                  />
                </div>
                <button
                  onClick={handleOpenAddAdvance}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm khoản</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="bg-slate-100/50 text-slate-700 text-[11px] font-bold uppercase">
                    <th className="p-4 border-b border-slate-200">Diễn giải</th>
                    <th className="p-4 text-right border-b border-slate-200">Tiền ứng</th>
                    <th className="p-4 text-right border-b border-slate-200">Tiền chi</th>
                    <th className="p-4 text-center border-b border-slate-200">Trạng thái</th>
                    <th className="p-4 text-center border-b border-slate-200">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentLedgerAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Sổ chưa có khoản tạm ứng nào.
                      </td>
                    </tr>
                  ) : (
                    currentLedgerAdvances.map(item => {
                      const isLocked = item.approved && !isAdminOrManager;
                      
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50 transition ${item.approved ? 'bg-emerald-50/30' : ''}`}>
                          <td className="p-4 font-bold text-slate-800">
                            {item.description}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-indigo-700">
                            {formatCurrency(item.advance_amount)}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-amber-700">
                            {formatCurrency(item.expense_amount)}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              disabled={!isAdminOrManager}
                              onClick={() => isAdminOrManager && onToggleApproval(item.id, !!item.approved)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                                item.approved
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : isAdminOrManager
                                    ? 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                                    : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                              }`}
                              title={isAdminOrManager ? 'Click để Đổi trạng thái Duyệt' : 'Chỉ quản lý được duyệt'}
                            >
                              {item.approved ? (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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
                          <td className="p-4 text-center whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateAdvance(item)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Nhân bản tạm ứng (Tạo bản sao mới)"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {isLocked ? (
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
                                  onClick={() => handleOpenEditAdvance(item)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Sửa tạm ứng"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteAdvance(item.id, `Tạm ứng: ${item.description}`)}
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <BookOpen className="w-12 h-12 mb-3 text-slate-200" />
            <p className="text-sm font-medium">Vui lòng chọn hoặc tạo mới một sổ theo dõi</p>
          </div>
        )}
      </div>

      {/* Modal: Tạo Sổ Mới (Add Ledger) */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Tạo Sổ Theo Dõi Mới</span>
              </h3>
              <button onClick={() => setIsLedgerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddLedger} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chọn Nhân Viên *</label>
                <select
                  value={newLedgerStaffId}
                  onChange={e => setNewLedgerStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                >
                  <option value="" disabled>-- Chọn một nhân viên --</option>
                  {users.filter(u => !ledgers.find(l => l.staff_id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-2">Chỉ hiển thị các nhân viên chưa có sổ tạm ứng.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLedgerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newLedgerStaffId}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  Tạo Sổ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Advance */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                {advanceModalMode === 'duplicate' ? (
                  <Copy className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Wallet className="w-4 h-4 text-indigo-400" />
                )}
                <span>
                  {advanceModalMode === 'edit'
                    ? 'Sửa Khoản Tạm Ứng'
                    : advanceModalMode === 'duplicate'
                    ? 'Nhân Bản Khoản Tạm Ứng (Tạo bản sao mới)'
                    : 'Thêm Khoản Tạm Ứng'}
                </span>
              </h3>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAdvance} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diễn Giải Khoản Ứng *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Ứng tiền phí hạ vỏ cont..."
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
              {isAdminOrManager && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Trạng thái Duyệt (Quản lý)</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.approved}
                      onChange={e => setFormData({ ...formData, approved: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-xs"
                >
                  {editingId ? 'Cập Nhật' : 'Thêm Vào Sổ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
