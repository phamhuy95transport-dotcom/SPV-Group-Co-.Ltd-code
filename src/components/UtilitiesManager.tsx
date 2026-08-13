import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Copy,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Plus,
  Settings,
  Link as LinkIcon,
  Check,
  Shield,
  Trash2,
  Pencil,
  Sparkles,
  Globe
} from 'lucide-react';
import { UserAccount } from '../types';

export interface UtilityItem {
  id: string;
  title: string;
  description: string;
  url: string;
  iconName?: string;
  integrateAccount: boolean;
  isSystem?: boolean;
}

const DEFAULT_UTILITIES: UtilityItem[] = [
  {
    id: 'contract_mgmt',
    title: 'Quản lý hợp đồng',
    description: 'Hệ thống quản lý hợp đồng SPV & Theo dõi hợp đồng liên kết',
    url: 'https://spvmanegementcontract.vercel.app?_vercel_share=4UslUxUYjpxQYniy2feVxvZX6bA5lZmN',
    integrateAccount: true,
    isSystem: true
  }
];

interface UtilitiesManagerProps {
  currentUser: UserAccount | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UtilitiesManager: React.FC<UtilitiesManagerProps> = ({
  currentUser,
  onShowToast
}) => {
  const [utilities, setUtilities] = useState<UtilityItem[]>(() => {
    try {
      const saved = localStorage.getItem('spv_utility_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure system item exists
          if (!parsed.some(item => item.id === 'contract_mgmt')) {
            return [...DEFAULT_UTILITIES, ...parsed];
          }
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_UTILITIES;
  });

  const [activeUtilId, setActiveUtilId] = useState<string>('contract_mgmt');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);

  // Custom Modal for adding/editing utility link
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<UtilityItem | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    url: string;
    integrateAccount: boolean;
  }>({
    title: '',
    description: '',
    url: '',
    integrateAccount: true
  });

  useEffect(() => {
    try {
      localStorage.setItem('spv_utility_items', JSON.stringify(utilities));
    } catch {
      // ignore
    }
  }, [utilities]);

  const activeUtility = utilities.find(u => u.id === activeUtilId) || utilities[0] || DEFAULT_UTILITIES[0];

  // Build final URL with integrated account details
  const getIntegratedUrl = (item: UtilityItem) => {
    let finalUrl = item.url.trim();
    if (item.integrateAccount && currentUser) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      const userParams = new URLSearchParams({
        user_email: currentUser.email || '',
        user_name: currentUser.name || '',
        user_role: currentUser.role || '',
        user_id: currentUser.id || ''
      }).toString();
      finalUrl = `${finalUrl}${separator}${userParams}`;
    }
    return finalUrl;
  };

  const currentFullUrl = getIntegratedUrl(activeUtility);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentFullUrl);
    setCopied(true);
    onShowToast('Đã sao chép đường dẫn liên kết vào bộ nhớ tạm!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenNewTab = () => {
    window.open(currentFullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveUtility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) {
      onShowToast('Vui lòng nhập đầy đủ Tiêu đề và Link trang web!', 'error');
      return;
    }

    let formattedUrl = formData.url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (editingItem) {
      setUtilities(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                title: formData.title.trim(),
                description: formData.description.trim(),
                url: formattedUrl,
                integrateAccount: formData.integrateAccount
              }
            : item
        )
      );
      onShowToast('Đã cập nhật thông tin tiện ích!');
    } else {
      const newItem: UtilityItem = {
        id: `util_${Date.now()}`,
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formattedUrl,
        integrateAccount: formData.integrateAccount,
        isSystem: false
      };
      setUtilities(prev => [...prev, newItem]);
      setActiveUtilId(newItem.id);
      onShowToast('Đã thêm tiện ích trang web mới!');
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteUtility = (id: string) => {
    const item = utilities.find(u => u.id === id);
    if (item?.isSystem) {
      onShowToast('Không thể xóa tiện ích mặc định của hệ thống!', 'error');
      return;
    }
    if (confirm(`Bạn có chắc muốn xóa tiện ích "${item?.title}" không?`)) {
      setUtilities(prev => prev.filter(u => u.id !== id));
      if (activeUtilId === id) {
        setActiveUtilId('contract_mgmt');
      }
      onShowToast('Đã xóa tiện ích khỏi danh sách!');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      url: '',
      integrateAccount: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: UtilityItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      url: item.url,
      integrateAccount: item.integrateAccount
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Sub-Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Tiện Ích Hỗ Trợ & Liên Kết Web
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tích hợp các trang web điều hành bên ngoài & Quản lý hợp đồng liên thông tài khoản
              </p>
            </div>
          </div>

          {/* Account Integration Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
              <Shield className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] text-emerald-700 font-bold block leading-none">
                  TÀI KHOẢN KẾT NỐI HỆ THỐNG
                </span>
                <span className="font-extrabold text-emerald-950 text-xs">
                  {currentUser.name} ({currentUser.email})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Utility Sub-Tabs & Add Link Button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {utilities.map(item => {
              const isActive = item.id === activeUtilId;
              return (
                <div key={item.id} className="flex items-center group">
                  <button
                    onClick={() => {
                      setActiveUtilId(item.id);
                      setIframeKey(k => k + 1);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                    <span>{item.title}</span>
                  </button>

                  {/* Actions for editable item */}
                  {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && !item.isSystem && (
                    <div className="flex items-center ml-1 opacity-60 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditModal(item)}
                        title="Sửa tiện ích"
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteUtility(item.id)}
                        title="Xóa tiện ích"
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
            <button
              onClick={openAddModal}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Trang Web Liên Kết</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Utility Workspace Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">{activeUtility.title}</h3>
                {activeUtility.integrateAccount && (
                  <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-bold rounded-md border border-indigo-400/30">
                    Auto SSO Integrated
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                {activeUtility.description || activeUtility.url}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIframeKey(k => k + 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
              title="Làm mới trang web"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Làm Mới</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
              title="Sao chép link liên kết đã mã hóa tài khoản"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Đã Chép Link' : 'Chép Link'}</span>
            </button>

            <button
              onClick={handleOpenNewTab}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Mở trang web trong tab mới"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Tab Mới</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
              title={isExpanded ? 'Thu nhỏ khung' : 'Phóng to khung hiển thị'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Info Banner showing URL params */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-mono text-slate-500 truncate max-w-xl">{currentFullUrl}</span>
          </div>
          <span className="text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-md shrink-0">
            Trạng thái: Đã đồng bộ tài khoản web
          </span>
        </div>

        {/* Embedded Web View (Iframe) */}
        <div className={`relative bg-slate-100 transition-all duration-300 ${isExpanded ? 'h-[85vh]' : 'h-[700px]'}`}>
          <iframe
            key={iframeKey}
            src={currentFullUrl}
            title={activeUtility.title}
            className="w-full h-full border-0"
            allow="geolocation; microphone; camera; encrypted-media; midi; accelerometer; gyroscope"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
          />
        </div>
      </div>

      {/* Modal Add / Edit Utility Link */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUtility}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingItem ? 'Chỉnh Sửa Trang Web Liên Kết' : 'Thêm Trang Web Tiện Ích Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Tiện Ích / Tên Trang Web <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Quản lý hợp đồng, Tra cứu mã HS..."
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đường Dẫn Trang Web (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://spvmanegementcontract.vercel.app..."
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô Tả Ngắn (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Mô tả chức năng hoặc mục đích liên kết..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <input
                    type="checkbox"
                    checked={formData.integrateAccount}
                    onChange={e => setFormData({ ...formData, integrateAccount: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-indigo-950 block">
                      Tự động truyền thông tin tài khoản đăng nhập (SSO URL Params)
                    </span>
                    <span className="text-[10px] text-indigo-700 block">
                      Tự động gửi email, họ tên, vai trò người dùng vào link URL để hệ thống web nhận diện.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
              >
                {editingItem ? 'Cập Nhật' : 'Tạo Tiện Ích'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
