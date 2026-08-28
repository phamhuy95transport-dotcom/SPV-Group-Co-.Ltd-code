import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  File,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Download,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Sparkles,
  Filter,
  Plus
} from 'lucide-react';
import { UserAccount } from '../../types';

export interface MediaDriveFile {
  id: string;
  name: string;
  size?: string | number;
  mimeType?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  description?: string;
  properties?: {
    category?: string;
    uploadedBy?: string;
    system?: string;
  };
}

interface DriveMediaStorageProps {
  currentUser: UserAccount | null;
  activeMediaFolder: { folderId?: string; folderName?: string };
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshStatus?: () => void;
}

export const DriveMediaStorage: React.FC<DriveMediaStorageProps> = ({
  currentUser,
  activeMediaFolder,
  onShowToast,
  onRefreshStatus
}) => {
  const [files, setFiles] = useState<MediaDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<{
    file: File;
    previewUrl?: string;
    category: string;
    description: string;
  }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<MediaDriveFile | null>(null);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Fetch files
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gdrive/media-files?folderId=${encodeURIComponent(activeMediaFolder.folderId || '')}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setFiles(data.files || []);
      } else {
        console.warn('Lỗi tải danh sách tệp media:', data.error);
      }
    } catch (err: any) {
      console.error('Lỗi kết nối media files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [activeMediaFolder.folderId, activeMediaFolder.folderName]);

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files) as File[];
      const newSelected = fileList.map((file: File) => {
        let previewUrl: string | undefined = undefined;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }
        let autoCategory = 'general';
        if (file.type.startsWith('image/')) autoCategory = 'images';
        else if (file.name.endsWith('.pdf')) autoCategory = 'documents';
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) autoCategory = 'spreadsheets';

        return {
          file,
          previewUrl,
          category: autoCategory,
          description: ''
        };
      });

      setSelectedFiles(prev => [...prev, ...newSelected]);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files) as File[];
      const newSelected = fileList.map((file: File) => {
        let previewUrl: string | undefined = undefined;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }
        let autoCategory = 'general';
        if (file.type.startsWith('image/')) autoCategory = 'images';
        else if (file.name.endsWith('.pdf')) autoCategory = 'documents';
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) autoCategory = 'spreadsheets';

        return {
          file,
          previewUrl,
          category: autoCategory,
          description: ''
        };
      });

      setSelectedFiles(prev => [...prev, ...newSelected]);
    }
  };

  // Remove selected file before uploading
  const handleRemoveSelected = (index: number) => {
    setSelectedFiles(prev => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Perform Upload to Google Drive
  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      setUploadProgress(`Đang tải lên tệp ${i + 1}/${selectedFiles.length}: ${item.file.name}...`);

      try {
        const base64Data = await fileToBase64(item.file);
        const res = await fetch('/api/gdrive/upload-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: item.file.name,
            fileData: base64Data,
            mimeType: item.file.type || 'application/octet-stream',
            category: item.category,
            description: item.description || `Tải lên bởi ${currentUser?.fullName || currentUser?.username || 'User'}`,
            uploadedBy: currentUser?.fullName || currentUser?.username || 'User',
            targetFolderId: activeMediaFolder.folderId,
            targetFolderName: activeMediaFolder.folderName,
            makePublic: true
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        } else {
          failCount++;
          console.error(`Lỗi tải lên ${item.file.name}:`, data.error);
        }
      } catch (err: any) {
        failCount++;
        console.error(`Lỗi khi tải ${item.file.name}:`, err);
      }
    }

    setIsUploading(false);
    setUploadProgress('');
    setSelectedFiles([]);

    if (successCount > 0) {
      onShowToast(`Đã tải thành công ${successCount} tệp lên Google Drive cá nhân!`, 'success');
      fetchFiles();
      if (onRefreshStatus) onRefreshStatus();
    }
    if (failCount > 0) {
      onShowToast(`Có ${failCount} tệp không thể tải lên. Vui lòng kiểm tra dung lượng Google Drive.`, 'error');
    }
  };

  // Copy Google Drive Link
  const handleCopyLink = (link?: string, id?: string) => {
    if (!link) {
      onShowToast('Không tìm thấy liên kết Google Drive của tệp', 'error');
      return;
    }
    navigator.clipboard.writeText(link);
    setCopiedId(id || link);
    onShowToast('Đã sao chép liên kết Google Drive vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete file
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tệp [${fileName}] trên Google Drive không?`)) {
      return;
    }

    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/gdrive/files/${fileId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(`Đã xóa tệp [${fileName}] trên Google Drive thành công`, 'success');
        setFiles(prev => prev.filter(f => f.id !== fileId));
        if (previewFile?.id === fileId) setPreviewFile(null);
        if (onRefreshStatus) onRefreshStatus();
      } else {
        onShowToast(`Lỗi khi xóa tệp: ${data.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi xóa tệp: ${err.message}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      onShowToast('Vui lòng nhập tên thư mục mới', 'error');
      return;
    }

    setCreatingFolder(true);
    try {
      const res = await fetch('/api/gdrive/folders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: newFolderName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Set as active media folder
        await fetch('/api/gdrive/config/media-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName: data.folder.name, folderId: data.folder.id })
        });

        onShowToast(`Đã tạo và chuyển sang thư mục [${data.folder.name}] trên Google Drive!`, 'success');
        setFolderModalOpen(false);
        setNewFolderName('');
        if (onRefreshStatus) onRefreshStatus();
      } else {
        onShowToast(`Lỗi tạo thư mục: ${data.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Format File Size
  const formatFileSize = (bytes?: string | number) => {
    if (!bytes) return '—';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format Date VN
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return dateStr;
    }
  };

  // Helper Icon
  const getFileIcon = (mime?: string, name?: string) => {
    if (mime?.startsWith('image/') || name?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    }
    if (mime?.includes('pdf') || name?.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (mime?.includes('spreadsheet') || mime?.includes('excel') || name?.match(/\.(xlsx|xls|csv)$/i)) {
      return <FileSpreadsheet className="w-5 h-5 text-teal-600" />;
    }
    return <File className="w-5 h-5 text-indigo-600" />;
  };

  // Filter Files
  const filteredFiles = files.filter(file => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = file.name.toLowerCase().includes(q);
      const matchDesc = file.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    // Category filter
    if (selectedCategory === 'images') {
      return file.mimeType?.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
    }
    if (selectedCategory === 'documents') {
      return file.mimeType?.includes('pdf') || file.name.match(/\.(pdf|doc|docx|txt)$/i);
    }
    if (selectedCategory === 'spreadsheets') {
      return file.mimeType?.includes('sheet') || file.mimeType?.includes('excel') || file.name.match(/\.(xlsx|xls|csv)$/i);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Upload Zone & Actions Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Tải Lên Tệp & Hình Ảnh Vào Google Drive Cá Nhân
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lưu trữ tài liệu chứng từ, ảnh hàng hóa, phiếu giao nhận, tờ khai hải quan trực tiếp vào Google Drive của bạn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-slate-700">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span>Thư mục:</span>
              <strong className="text-indigo-900">{activeMediaFolder.folderName || 'SPV_UPLOADS_MEDIA'}</strong>
            </div>

            <button
              onClick={() => setFolderModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
              title="Tạo thư mục lưu trữ mới"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tạo thư mục</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Box */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"
          />

          <div className="p-3.5 bg-white rounded-2xl shadow-xs text-indigo-600 mb-3 border border-slate-100">
            <Upload className="w-7 h-7" />
          </div>

          <p className="text-sm font-bold text-slate-800">
            Kéo và thả hình ảnh hoặc tài liệu vào đây, hoặc <span className="text-indigo-600 underline">chọn từ thiết bị</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Hỗ trợ hình ảnh (PNG, JPG, WebP), Tài liệu PDF, Hóa đơn Excel, Word... (Tối đa 50MB mỗi tệp)
          </p>
        </div>

        {/* Selected Files Queue */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Danh sách tệp chuẩn bị tải lên ({selectedFiles.length} tệp)
              </span>
              <button
                onClick={() => setSelectedFiles([])}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
              >
                Hủy tất cả
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {selectedFiles.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3 relative group"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {getFileIcon(item.file.type, item.file.name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs font-bold text-slate-800 truncate" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatFileSize(item.file.size)}
                    </p>
                    <select
                      value={item.category}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedFiles(prev =>
                          prev.map((f, i) => (i === idx ? { ...f, category: val } : f))
                        );
                      }}
                      className="mt-1 text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="images">Ảnh chụp / Media</option>
                      <option value="delivery_receipt">Chứng từ giao hàng</option>
                      <option value="customs_doc">Tờ khai hải quan</option>
                      <option value="advance_invoice">Hóa đơn tạm ứng</option>
                      <option value="general">Tài liệu chung</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleRemoveSelected(idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                    title="Xóa tệp này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-indigo-700 font-medium">
                {isUploading ? uploadProgress : 'Sẵn sàng tải lên Google Drive cá nhân của bạn.'}
              </span>
              <button
                onClick={handleUploadAll}
                disabled={isUploading}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition flex items-center gap-2 shrink-0"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tải lên...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Bắt Đầu Tải Lên ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Explorer / Gallery of Uploaded Files */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Kho Tệp & Hình Ảnh Đã Tải Lên ({filteredFiles.length} tệp)
              </h3>
              <p className="text-xs text-slate-500">
                Dữ liệu được lưu trữ trên Google Drive tại thư mục <span className="font-semibold text-slate-700">{activeMediaFolder.folderName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tệp..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedCategory === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedCategory('images')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedCategory === 'images' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hình ảnh
              </button>
              <button
                onClick={() => setSelectedCategory('documents')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedCategory === 'documents' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tài liệu PDF
              </button>
              <button
                onClick={() => setSelectedCategory('spreadsheets')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedCategory === 'spreadsheets' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Excel/Sheets
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Files View */}
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs font-semibold">Đang tải danh sách tệp từ Google Drive...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Chưa có tệp hoặc hình ảnh nào trong thư mục này</p>
            <p className="text-xs text-slate-500 mt-1">Hãy kéo thả hoặc chọn tệp bên trên để tải lên Google Drive của bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.map(file => {
              const isImg = file.mimeType?.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);

              return (
                <div
                  key={file.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
                >
                  {/* Thumbnail / Header */}
                  <div
                    onClick={() => setPreviewFile(file)}
                    className="h-36 bg-slate-100 relative overflow-hidden cursor-pointer flex items-center justify-center border-b border-slate-100"
                  >
                    {isImg ? (
                      file.thumbnailLink ? (
                        <img
                          src={file.thumbnailLink.replace('=s220', '=s400')}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-emerald-600">
                          <ImageIcon className="w-10 h-10 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-500">Hình ảnh</span>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        {getFileIcon(file.mimeType, file.name)}
                        <span className="text-[10px] font-semibold text-slate-500 mt-1 uppercase">
                          {file.name.split('.').pop() || 'Tài liệu'}
                        </span>
                      </div>
                    )}

                    {/* Quick Preview Badge */}
                    <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-xs text-indigo-900 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        Xem trước
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4
                        className="text-xs font-bold text-slate-900 truncate"
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.createdTime)}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        {/* Copy Link Button */}
                        <button
                          onClick={() => handleCopyLink(file.webViewLink, file.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Sao chép liên kết Google Drive"
                        >
                          {copiedId === file.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Open in Drive */}
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Mở trên Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Download direct */}
                        {file.webContentLink && (
                          <a
                            href={file.webContentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Tải về máy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        disabled={deletingId === file.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Xóa tệp khỏi Google Drive"
                      >
                        {deletingId === file.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Lightbox Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                {getFileIcon(previewFile.mimeType, previewFile.name)}
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate" title={previewFile.name}>
                    {previewFile.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {formatFileSize(previewFile.size)} • Tải lên ngày {formatDate(previewFile.createdTime)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyLink(previewFile.webViewLink, previewFile.id)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép Link</span>
                </button>

                {previewFile.webViewLink && (
                  <a
                    href={previewFile.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở trên Drive</span>
                  </a>
                )}

                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 bg-slate-900/90 flex items-center justify-center p-4 overflow-auto min-h-[300px] max-h-[60vh]">
              {previewFile.mimeType?.startsWith('image/') || previewFile.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                previewFile.thumbnailLink ? (
                  <img
                    src={previewFile.thumbnailLink.replace(/=s\d+/, '=s1200')}
                    alt={previewFile.name}
                    className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="text-white text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Xem trực tiếp hình ảnh trên Google Drive</p>
                  </div>
                )
              ) : (
                <div className="text-white text-center max-w-md p-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                    {getFileIcon(previewFile.mimeType, previewFile.name)}
                  </div>
                  <p className="text-sm font-bold">{previewFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Tệp tài liệu này có thể được xem và chỉnh sửa trực tiếp trên Google Drive.
                  </p>
                  {previewFile.webViewLink && (
                    <a
                      href={previewFile.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Mở xem trên Google Drive</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Folder */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                Tạo Thư Mục Lưu Trữ Mới Trên Google Drive
              </h3>
              <button
                onClick={() => setFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên thư mục mới <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Ví dụ: SPV_CHUNG_TU_HAI_QUAN_2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Thư mục này sẽ được tạo trực tiếp trên tài khoản Google Drive cá nhân của bạn.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setFolderModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {creatingFolder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Tạo Thư Mục</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
