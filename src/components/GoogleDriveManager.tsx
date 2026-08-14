import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  FileText,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Clock,
  ArrowDownToLine,
  Search,
  KeyRound,
  FileJson,
  Layers,
  FolderOpen
} from 'lucide-react';
import {
  UserAccount,
  ShipmentRecord,
  WarehouseItem,
  TransporterItem,
  CustomerItem,
  RouteItem,
  CustomsDeclarationRecord,
  KPIRateItem,
  CustomerQuotation,
  EmployeeAdvanceItem
} from '../types';

interface GoogleDriveManagerProps {
  currentUser: UserAccount | null;
  records: ShipmentRecord[];
  declarations: CustomsDeclarationRecord[];
  warehouses: WarehouseItem[];
  transporters: TransporterItem[];
  customers: CustomerItem[];
  routes: RouteItem[];
  users: UserAccount[];
  kpiRates: KPIRateItem[];
  quotations: CustomerQuotation[];
  advances: EmployeeAdvanceItem[];
  onRestoreData: (data: {
    records?: ShipmentRecord[];
    declarations?: CustomsDeclarationRecord[];
    warehouses?: WarehouseItem[];
    transporters?: TransporterItem[];
    customers?: CustomerItem[];
    routes?: RouteItem[];
    users?: UserAccount[];
    kpiRates?: KPIRateItem[];
    quotations?: CustomerQuotation[];
    advances?: EmployeeAdvanceItem[];
  }) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  mimeType?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  description?: string;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({
  currentUser,
  records,
  declarations,
  warehouses,
  transporters,
  customers,
  routes,
  users,
  kpiRates,
  quotations,
  advances,
  onRestoreData,
  onShowToast
}) => {
  // Status state
  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean;
    loading: boolean;
    error: string | null;
    serviceAccount?: {
      email: string;
      projectId: string;
      clientId: string;
    };
    folderId?: string;
    folderName?: string;
    fileCount?: number;
  }>({
    connected: false,
    loading: true,
    error: null
  });

  // Backup files list
  const [backupFiles, setBackupFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Actions state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSyncingMaster, setIsSyncingMaster] = useState(false);
  const [backupDescription, setBackupDescription] = useState('');
  const [backupCustomName, setBackupCustomName] = useState('');
  const [lastMasterSync, setLastMasterSync] = useState<string | null>(() => {
    return localStorage.getItem('spv_gdrive_last_master_sync');
  });

  // Restore Modal State
  const [restoreModal, setRestoreModal] = useState<{
    isOpen: boolean;
    file: DriveFile | null;
    loading: boolean;
    previewData: any | null;
    backupInfo: any | null;
  }>({
    isOpen: false,
    file: null,
    loading: false,
    previewData: null,
    backupInfo: null
  });

  // Delete Confirm Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    file: DriveFile | null;
    deleting: boolean;
  }>({
    isOpen: false,
    file: null,
    deleting: false
  });

  // 1. Fetch Google Drive Connection Status
  const checkDriveStatus = async () => {
    setDriveStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/gdrive/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setDriveStatus({
          connected: true,
          loading: false,
          error: null,
          serviceAccount: data.serviceAccount,
          folderId: data.folderId,
          folderName: data.folderName,
          fileCount: data.fileCount
        });
      } else {
        setDriveStatus({
          connected: false,
          loading: false,
          error: data.error || 'Không thể kết nối đến Google Drive API.'
        });
      }
    } catch (err: any) {
      setDriveStatus({
        connected: false,
        loading: false,
        error: err.message || 'Lỗi mạng khi kết nối máy chủ Google Drive.'
      });
    }
  };

  // 2. Fetch Files List from Google Drive
  const fetchBackupFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/gdrive/files');
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupFiles(data.files || []);
      } else {
        console.warn('Lỗi lấy danh sách file:', data.error);
      }
    } catch (err) {
      console.error('Lỗi khi tải file Google Drive:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    checkDriveStatus();
    fetchBackupFiles();
  }, []);

  // Build current database snapshot object
  const getDatabaseSnapshot = () => {
    return {
      shipments: records,
      declarations: declarations,
      warehouses: warehouses,
      transporters: transporters,
      customers: customers,
      routes: routes,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        customer_name: u.customer_name,
        status: u.status,
        createdAt: u.createdAt,
        permissions: u.permissions
      })),
      kpiRates: kpiRates,
      quotations: quotations,
      advances: advances,
      exportedAt: new Date().toISOString()
    };
  };

  // 3. Create Backup to Google Drive
  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const snapshot = getDatabaseSnapshot();
      const res = await fetch('/api/gdrive/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: snapshot,
          backupName: backupCustomName.trim() || 'SPV_Logistics_Backup',
          description: backupDescription.trim() || 'Sao lưu thủ công từ giao diện Quản trị SPV',
          createdBy: currentUser?.name || currentUser?.email || 'Quản trị viên'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        onShowToast(`Sao lưu thành công lên Google Drive: ${result.file.name}`, 'success');
        setBackupCustomName('');
        setBackupDescription('');
        fetchBackupFiles();
        checkDriveStatus();
      } else {
        onShowToast(`Lỗi sao lưu: ${result.error || 'Thất bại'}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // 4. Live Master Sync to Google Drive
  const handleSyncMaster = async () => {
    setIsSyncingMaster(true);
    try {
      const snapshot = getDatabaseSnapshot();
      const res = await fetch('/api/gdrive/sync-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: snapshot,
          updatedBy: currentUser?.name || currentUser?.email || 'SPV Admin'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        const timeFormatted = new Date().toLocaleString('vi-VN');
        setLastMasterSync(timeFormatted);
        localStorage.setItem('spv_gdrive_last_master_sync', timeFormatted);
        onShowToast('Đã đồng bộ Master Database lên Google Drive thành công!', 'success');
        fetchBackupFiles();
      } else {
        onShowToast(`Lỗi đồng bộ Master: ${result.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsSyncingMaster(false);
    }
  };

  // 5. Open Restore Preview
  const handleOpenRestore = async (file: DriveFile) => {
    setRestoreModal({
      isOpen: true,
      file,
      loading: true,
      previewData: null,
      backupInfo: null
    });

    try {
      const res = await fetch('/api/gdrive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setRestoreModal({
          isOpen: true,
          file,
          loading: false,
          previewData: result.data,
          backupInfo: result.backupInfo
        });
      } else {
        onShowToast(`Không thể đọc file sao lưu: ${result.error}`, 'error');
        setRestoreModal(prev => ({ ...prev, isOpen: false, loading: false }));
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
      setRestoreModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  // 6. Confirm and execute restore
  const handleExecuteRestore = async () => {
    if (!restoreModal.previewData) return;

    try {
      const data = restoreModal.previewData;
      await onRestoreData({
        records: data.shipments || data.records,
        declarations: data.declarations,
        warehouses: data.warehouses,
        transporters: data.transporters,
        customers: data.customers,
        routes: data.routes,
        users: data.users,
        kpiRates: data.kpiRates,
        quotations: data.quotations,
        advances: data.advances
      });

      onShowToast('Đã khôi phục toàn bộ dữ liệu từ Google Drive thành công!', 'success');
      setRestoreModal({
        isOpen: false,
        file: null,
        loading: false,
        previewData: null,
        backupInfo: null
      });
    } catch (err: any) {
      onShowToast(`Lỗi khôi phục: ${err.message}`, 'error');
    }
  };

  // 7. Delete backup from Google Drive
  const handleDeleteBackup = async () => {
    if (!deleteConfirmModal.file) return;
    setDeleteConfirmModal(prev => ({ ...prev, deleting: true }));

    try {
      const res = await fetch(`/api/gdrive/files/${deleteConfirmModal.file.id}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (res.ok && result.success) {
        onShowToast('Đã xóa bản sao lưu trên Google Drive thành công', 'success');
        setDeleteConfirmModal({ isOpen: false, file: null, deleting: false });
        fetchBackupFiles();
      } else {
        onShowToast(`Lỗi khi xóa file: ${result.error}`, 'error');
        setDeleteConfirmModal(prev => ({ ...prev, deleting: false }));
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
      setDeleteConfirmModal(prev => ({ ...prev, deleting: false }));
    }
  };

  // 8. Download Local JSON file
  const handleDownloadLocalJSON = () => {
    const snapshot = getDatabaseSnapshot();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const filename = `SPV_Local_Backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast(`Đã xuất file dự phòng về máy: ${filename}`, 'success');
  };

  // Filtered files
  const filteredFiles = backupFiles.filter(f => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return f.name.toLowerCase().includes(term) || (f.description && f.description.toLowerCase().includes(term));
  });

  const formatBytes = (bytes?: string | number) => {
    if (!bytes) return '0 B';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num)) return '0 B';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl shadow-md shadow-emerald-500/20 shrink-0">
              <HardDrive className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Lưu Trữ & Sao Lưu Dữ Liệu Google Drive
                </h2>
                {driveStatus.loading ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đang kết nối...
                  </span>
                ) : driveStatus.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Drive API Đã Kết Nối
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="w-3 h-3" />
                    Chưa kết nối: {driveStatus.error}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Tự động đồng bộ hóa và lưu trữ an toàn cơ sở dữ liệu SPV Logistics, Thủ tục Hải quan, Báo cáo & Danh mục vào đám mây Google Drive doanh nghiệp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => {
                checkDriveStatus();
                fetchBackupFiles();
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới trạng thái</span>
            </button>
            {driveStatus.folderId && (
              <a
                href={`https://drive.google.com/drive/folders/${driveStatus.folderId}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Mở thư mục trên Google Drive</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
          </div>
        </div>

        {/* Credentials & System Info Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-500 font-medium block mb-0.5">Project ID (GCP)</span>
            <span className="font-mono font-bold text-slate-800 break-all">
              {driveStatus.serviceAccount?.projectId || 'spv-management-contract'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-500 font-medium block mb-0.5">Tài khoản dịch vụ (Service Account)</span>
            <span className="font-mono font-bold text-slate-800 break-all truncate block" title={driveStatus.serviceAccount?.email || 'spv-group-database-gdrive@spv-management-contract.iam.gserviceaccount.com'}>
              {driveStatus.serviceAccount?.email || 'spv-group-database-gdrive@spv-management-contract.iam.gserviceaccount.com'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-500 font-medium block mb-0.5">Thư mục lưu trữ trên Drive</span>
            <span className="font-bold text-indigo-700 flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
              SPV_DATABASE_BACKUPS
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-500 font-medium block mb-0.5">Số bản sao lưu hiện tại</span>
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <FileJson className="w-3.5 h-3.5 text-teal-600" />
              {backupFiles.length} bản sao lưu ({formatBytes(backupFiles.reduce((acc, f) => acc + (parseInt(f.size || '0', 10) || 0), 0))})
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Backup Actions & Master Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Create Instant Backup Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Tạo Bản Sao Lưu Đám Mây Mới (Backup Now)
                </h3>
                <p className="text-xs text-slate-500">Đóng gói toàn bộ cơ sở dữ liệu hiện thời và tải trực tiếp lên Google Drive</p>
              </div>
            </div>
          </div>

          {/* Current Snapshot Metrics */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              Tổng quan dữ liệu sẽ được sao lưu:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Đơn vận chuyển</span>
                <span className="font-extrabold text-indigo-700 text-sm">{records.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Tờ khai hải quan</span>
                <span className="font-extrabold text-teal-700 text-sm">{declarations.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Khách hàng & Kho</span>
                <span className="font-extrabold text-amber-700 text-sm">{customers.length + warehouses.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Nhà xe & Tuyến</span>
                <span className="font-extrabold text-slate-700 text-sm">{transporters.length + routes.length}</span>
              </div>
            </div>
          </div>

          {/* Backup Inputs Form */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên gợi nhớ bản sao lưu (Tùy chọn)
              </label>
              <input
                type="text"
                value={backupCustomName}
                onChange={e => setBackupCustomName(e.target.value)}
                placeholder="Ví dụ: SPV_Logistics_Backup_Cuoi_Ngay"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú nội dung sao lưu
              </label>
              <textarea
                rows={2}
                value={backupDescription}
                onChange={e => setBackupDescription(e.target.value)}
                placeholder="Nhập ghi chú mục đích sao lưu (VD: Sao lưu định kỳ trước khi chốt số liệu tháng)..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isBackingUp || !driveStatus.connected}
                onClick={handleCreateBackup}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang đóng gói và đẩy lên Google Drive...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    <span>Sao Lưu Lên Google Drive Ngay</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadLocalJSON}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                title="Tải về máy tính định dạng JSON"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Tải về máy (.json)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Master Database Sync Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Live Master Sync
                </h3>
                <p className="text-xs text-slate-500">File đồng bộ tổng thể duy nhất</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tên Master File:</span>
                <span className="font-mono font-bold text-slate-800">SPV_Database_Master_Sync.json</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lần đồng bộ gần nhất:</span>
                <span className="font-bold text-teal-700">{lastMasterSync || 'Chưa thực hiện'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cơ chế:</span>
                <span className="text-slate-700 font-semibold">Ghi đè liên tục</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tính năng Live Master Sync giúp bạn duy trì một bản dữ liệu duy nhất, chuẩn xác và mới nhất trên Google Drive. Bất kỳ lúc nào cần khôi phục lại máy chủ, chỉ cần chọn file Master này.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isSyncingMaster || !driveStatus.connected}
              onClick={handleSyncMaster}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSyncingMaster ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang đồng bộ...</span>
                </>
              ) : (
                <>
                  <CloudCheck className="w-4 h-4" />
                  <span>Đồng Bộ Master File Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Google Drive Backup Explorer Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Danh Sách Bản Sao Lưu Trên Google Drive ({backupFiles.length})
              </h3>
              <p className="text-xs text-slate-500">Xem, tải xuống, kiểm tra và khôi phục trực tiếp dữ liệu từ đám mây</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm file sao lưu..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
              />
            </div>
            <button
              onClick={fetchBackupFiles}
              disabled={loadingFiles}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Files Table */}
        {loadingFiles ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Đang tải danh sách file từ Google Drive API...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <FolderOpen className="w-8 h-8 text-slate-300" />
            <span>Chưa có bản sao lưu nào trên thư mục Google Drive này. Hãy bấm "Sao Lưu Lên Google Drive Ngay" ở trên.</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tên File Sao Lưu</th>
                  <th className="px-4 py-3">Kích Thước</th>
                  <th className="px-4 py-3">Thời Gian Tạo</th>
                  <th className="px-4 py-3">Mô Tả / Ghi Chú</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file) => {
                  const isMaster = file.name.includes('Master');
                  const createdDate = file.createdTime ? new Date(file.createdTime).toLocaleString('vi-VN') : '--';
                  return (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileJson className={`w-4 h-4 shrink-0 ${isMaster ? 'text-teal-600' : 'text-indigo-600'}`} />
                          <div>
                            <span className="font-bold text-slate-900 block break-all">{file.name}</span>
                            {isMaster && (
                              <span className="inline-block px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[9px] font-extrabold rounded mt-0.5">
                                Master Live Sync
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {formatBytes(file.size)}
                      </td>

                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{createdDate}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={file.description || ''}>
                        {file.description || '--'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Restore Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenRestore(file)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition flex items-center gap-1 text-[11px]"
                            title="Khôi phục dữ liệu từ bản này"
                          >
                            <CloudDownload className="w-3.5 h-3.5" />
                            <span>Khôi phục</span>
                          </button>

                          {/* View on Google Drive */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                              title="Mở trên Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmModal({ isOpen: true, file, deleting: false })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa file khỏi Google Drive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Restore Data Preview & Confirmation */}
      {restoreModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <CloudDownload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Khôi Phục Dữ Liệu Từ Google Drive</h4>
                <p className="text-xs text-slate-500">{restoreModal.file?.name}</p>
              </div>
            </div>

            {restoreModal.loading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Đang tải và giải nén dữ liệu từ Google Drive...</span>
              </div>
            ) : restoreModal.previewData ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cảnh báo:</strong> Thao tác này sẽ ghi đè hoặc khôi phục dữ liệu hiện tại bằng dữ liệu từ bản sao lưu này. Hãy chắc chắn trước khi xác nhận.
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800 mb-1">Chi tiết bản sao lưu:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>• Đơn vận chuyển: <strong className="text-indigo-700">{restoreModal.previewData.shipments?.length || 0}</strong></div>
                    <div>• Tờ khai hải quan: <strong className="text-teal-700">{restoreModal.previewData.declarations?.length || 0}</strong></div>
                    <div>• Khách hàng: <strong className="text-slate-800">{restoreModal.previewData.customers?.length || 0}</strong></div>
                    <div>• Kho bãi: <strong className="text-slate-800">{restoreModal.previewData.warehouses?.length || 0}</strong></div>
                    <div>• Nhà xe: <strong className="text-slate-800">{restoreModal.previewData.transporters?.length || 0}</strong></div>
                    <div>• Tuyến đường: <strong className="text-slate-800">{restoreModal.previewData.routes?.length || 0}</strong></div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestoreModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận Khôi Phục Dữ Liệu</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Backup */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.file && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Xóa Bản Sao Lưu Trên Google Drive</h4>
                <p className="text-xs text-slate-500 break-all">{deleteConfirmModal.file.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa bản sao lưu này vĩnh viễn khỏi Google Drive? Thao tác này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, file: null, deleting: false })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteConfirmModal.deleting}
                onClick={handleDeleteBackup}
                className="px-5 py-2 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteConfirmModal.deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Xóa Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
