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
  FolderOpen,
  FolderPlus,
  Settings,
  Folder,
  Check,
  Upload,
  X,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  UserCheck
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
import { DriveMediaStorage } from './gdrive/DriveMediaStorage';
import { DriveOAuthModal } from './gdrive/DriveOAuthModal';

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

interface DriveFolder {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
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
  // Subtab Navigation
  const [activeSubTab, setActiveSubTab] = useState<'media' | 'backup' | 'settings'>('media');

  // Status state
  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean;
    loading: boolean;
    error: string | null;
    authMode?: 'oauth2' | 'service_account';
    isCustomKey?: boolean;
    accountInfo?: {
      name: string;
      email: string;
      photoLink?: string | null;
      storageUsage: string;
      storageLimit: string;
      storagePercent?: number | null;
    };
    serviceAccount?: {
      email: string;
      projectId: string;
      clientId?: string;
    };
    folderId?: string;
    folderName?: string;
    backupFolder?: { folderId: string; folderName: string };
    mediaFolder?: { folderId: string; folderName: string };
    activeTargetFolderName?: string;
    activeTargetFolderId?: string | null;
    fileCount?: number;
    mediaFileCount?: number;
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

  // Preferences: Prompt location before upload toggle
  const [promptLocationBeforeUpload, setPromptLocationBeforeUpload] = useState<boolean>(() => {
    const saved = localStorage.getItem('spv_gdrive_prompt_location');
    return saved !== null ? saved === 'true' : true;
  });

  // Available Folders in Drive
  const [availableFolders, setAvailableFolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // 1. Modal: OAuth / Service Account Credentials Modal
  const [authConfigModalOpen, setAuthConfigModalOpen] = useState(false);

  // 2. Modal: Target Folder Configuration & Creation
  const [folderConfigModal, setFolderConfigModal] = useState<{
    isOpen: boolean;
    folderType: 'backup' | 'media';
    selectedFolderId: string;
    customFolderName: string;
    isCreatingNew: boolean;
    newFolderName: string;
    saving: boolean;
  }>({
    isOpen: false,
    folderType: 'backup',
    selectedFolderId: '',
    customFolderName: '',
    isCreatingNew: false,
    newFolderName: '',
    saving: false
  });

  // 3. Modal: Prompt Destination Location Before Upload
  const [uploadPromptModal, setUploadPromptModal] = useState<{
    isOpen: boolean;
    type: 'backup' | 'master';
    targetMode: 'current' | 'select' | 'create' | 'custom';
    targetFolderId?: string;
    targetFolderName?: string;
    newFolderName: string;
    backupName: string;
    description: string;
    setAsDefault: boolean;
    uploading: boolean;
  }>({
    isOpen: false,
    type: 'backup',
    targetMode: 'current',
    newFolderName: '',
    backupName: '',
    description: '',
    setAsDefault: false,
    uploading: false
  });

  // 4. Modal: Restore Modal State
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

  // 5. Modal: Delete Confirm Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    file: DriveFile | null;
    deleting: boolean;
  }>({
    isOpen: false,
    file: null,
    deleting: false
  });

  // Toggle Prompt Location preference
  const handleTogglePromptLocation = (enabled: boolean) => {
    setPromptLocationBeforeUpload(enabled);
    localStorage.setItem('spv_gdrive_prompt_location', String(enabled));
    onShowToast(
      enabled
        ? 'Đã BẬT: Hệ thống sẽ luôn hỏi thư mục lưu trữ trước khi tải lên.'
        : 'Đã TẮT: Hệ thống sẽ tự động tải lên thư mục mặc định.',
      'info'
    );
  };

  // Fetch Google Drive Connection Status
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
          authMode: data.authMode,
          isCustomKey: data.isCustomKey,
          accountInfo: data.accountInfo,
          serviceAccount: data.serviceAccount,
          folderId: data.folderId,
          folderName: data.folderName,
          backupFolder: data.backupFolder,
          mediaFolder: data.mediaFolder,
          activeTargetFolderName: data.activeTargetFolderName,
          activeTargetFolderId: data.activeTargetFolderId,
          fileCount: data.fileCount,
          mediaFileCount: data.mediaFileCount
        });
      } else {
        setDriveStatus({
          connected: false,
          loading: false,
          error: data.error || 'Không thể kết nối đến Google Drive API.',
          authMode: data.authMode,
          isCustomKey: data.isCustomKey,
          serviceAccount: data.serviceAccount
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

  // Fetch Files List from Google Drive
  const fetchBackupFiles = async (targetFolderId?: string) => {
    setLoadingFiles(true);
    try {
      const url = targetFolderId ? `/api/gdrive/files?folderId=${encodeURIComponent(targetFolderId)}` : '/api/gdrive/files';
      const res = await fetch(url);
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

  // Fetch available folders in Drive
  const fetchAvailableFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await fetch('/api/gdrive/folders');
      const data = await res.json();
      if (res.ok && data.success) {
        setAvailableFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách thư mục:', err);
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => {
    checkDriveStatus();
    fetchBackupFiles();
    fetchAvailableFolders();
  }, []);

  // Construct current database snapshot
  const getDatabaseSnapshot = () => {
    return {
      shipments: records,
      declarations,
      warehouses,
      transporters,
      customers,
      routes,
      users,
      kpiRates,
      quotations,
      advances
    };
  };

  // Trigger Backup
  const handleInitiateBackup = () => {
    if (promptLocationBeforeUpload) {
      setUploadPromptModal({
        isOpen: true,
        type: 'backup',
        targetMode: 'current',
        newFolderName: '',
        backupName: backupCustomName.trim() || `SPV_Backup_${new Date().toISOString().slice(0, 10)}`,
        description: backupDescription.trim(),
        setAsDefault: false,
        uploading: false
      });
    } else {
      executeBackup(undefined, undefined, backupCustomName.trim(), backupDescription.trim());
    }
  };

  // Trigger Master Sync
  const handleInitiateMasterSync = () => {
    if (promptLocationBeforeUpload) {
      setUploadPromptModal({
        isOpen: true,
        type: 'master',
        targetMode: 'current',
        newFolderName: '',
        backupName: 'SPV_Database_Master_Sync',
        description: 'Bản đồng bộ tự động cơ sở dữ liệu SPV',
        setAsDefault: false,
        uploading: false
      });
    } else {
      executeMasterSync();
    }
  };

  // Execute Backup
  const executeBackup = async (
    targetFolderId?: string,
    targetFolderName?: string,
    customName?: string,
    customDesc?: string
  ) => {
    setIsBackingUp(true);
    try {
      const snapshot = getDatabaseSnapshot();
      const res = await fetch('/api/gdrive/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: snapshot,
          backupName: customName || backupCustomName || undefined,
          description: customDesc || backupDescription || undefined,
          createdBy: currentUser?.fullName || currentUser?.username || 'User',
          targetFolderId,
          targetFolderName
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        onShowToast(result.message || 'Đã sao lưu lên Google Drive thành công!', 'success');
        setBackupDescription('');
        setBackupCustomName('');
        fetchBackupFiles(targetFolderId || driveStatus.folderId);
        checkDriveStatus();
      } else {
        onShowToast(`Lỗi sao lưu: ${result.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi kết nối sao lưu: ${err.message}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Execute Master Sync
  const executeMasterSync = async (targetFolderId?: string, targetFolderName?: string) => {
    setIsSyncingMaster(true);
    try {
      const snapshot = getDatabaseSnapshot();
      const res = await fetch('/api/gdrive/sync-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: snapshot,
          updatedBy: currentUser?.fullName || currentUser?.username || 'User',
          targetFolderId,
          targetFolderName
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        const timeNow = new Date().toLocaleString('vi-VN');
        setLastMasterSync(timeNow);
        localStorage.setItem('spv_gdrive_last_master_sync', timeNow);
        onShowToast(result.message || 'Đồng bộ Master Database thành công!', 'success');
        fetchBackupFiles(targetFolderId || driveStatus.folderId);
      } else {
        onShowToast(`Lỗi đồng bộ Master: ${result.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi kết nối đồng bộ: ${err.message}`, 'error');
    } finally {
      setIsSyncingMaster(false);
    }
  };

  // Save Folder Selection / Creation
  const handleSaveFolderConfig = async () => {
    setFolderConfigModal(prev => ({ ...prev, saving: true }));
    try {
      let destFolderName = folderConfigModal.customFolderName.trim();
      let destFolderId: string | null = folderConfigModal.selectedFolderId;

      if (folderConfigModal.isCreatingNew) {
        if (!folderConfigModal.newFolderName.trim()) {
          throw new Error('Vui lòng nhập tên thư mục mới!');
        }
        const createRes = await fetch('/api/gdrive/folders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName: folderConfigModal.newFolderName.trim() })
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.success) {
          throw new Error(createData.error || 'Lỗi tạo thư mục mới');
        }
        destFolderName = createData.folder.name;
        destFolderId = createData.folder.id;
      }

      const endpoint = folderConfigModal.folderType === 'media' ? '/api/gdrive/config/media-folder' : '/api/gdrive/config/folder';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: destFolderName,
          folderId: destFolderId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(data.message || 'Đã cập nhật thư mục lưu trữ thành công!', 'success');
        setFolderConfigModal(prev => ({ ...prev, isOpen: false, saving: false }));
        checkDriveStatus();
        fetchBackupFiles(data.folderId);
        fetchAvailableFolders();
      } else {
        throw new Error(data.error || 'Lỗi cập nhật thư mục');
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
      setFolderConfigModal(prev => ({ ...prev, saving: false }));
    }
  };

  // Confirm and Execute from Prompt Modal
  const handleConfirmPromptUpload = async () => {
    setUploadPromptModal(prev => ({ ...prev, uploading: true }));
    try {
      let destFolderId: string | undefined = undefined;
      let destFolderName: string | undefined = undefined;

      if (uploadPromptModal.targetMode === 'current') {
        destFolderId = driveStatus.folderId;
        destFolderName = driveStatus.folderName;
      } else if (uploadPromptModal.targetMode === 'select') {
        destFolderId = uploadPromptModal.targetFolderId;
        const found = availableFolders.find(f => f.id === destFolderId);
        destFolderName = found?.name;
      } else if (uploadPromptModal.targetMode === 'create' && uploadPromptModal.newFolderName.trim()) {
        const createRes = await fetch('/api/gdrive/folders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName: uploadPromptModal.newFolderName.trim() })
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.success) {
          throw new Error(createData.error || 'Lỗi khi tạo thư mục mới trên Google Drive');
        }
        destFolderId = createData.folder.id;
        destFolderName = createData.folder.name;
      } else if (uploadPromptModal.targetMode === 'custom' && uploadPromptModal.targetFolderName?.trim()) {
        destFolderName = uploadPromptModal.targetFolderName.trim();
      }

      // If user checked "Set as default"
      if (uploadPromptModal.setAsDefault && (destFolderId || destFolderName)) {
        await fetch('/api/gdrive/config/folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName: destFolderName, folderId: destFolderId })
        });
      }

      if (uploadPromptModal.type === 'backup') {
        await executeBackup(destFolderId, destFolderName, uploadPromptModal.backupName, uploadPromptModal.description);
      } else {
        await executeMasterSync(destFolderId, destFolderName);
      }

      setUploadPromptModal(prev => ({ ...prev, isOpen: false, uploading: false }));
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
      setUploadPromptModal(prev => ({ ...prev, uploading: false }));
    }
  };

  // Open Restore Preview
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

  // Confirm and execute restore
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

  // Delete backup from Google Drive
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
        fetchBackupFiles(driveStatus.folderId);
      } else {
        onShowToast(`Lỗi khi xóa file: ${result.error}`, 'error');
        setDeleteConfirmModal(prev => ({ ...prev, deleting: false }));
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
      setDeleteConfirmModal(prev => ({ ...prev, deleting: false }));
    }
  };

  // Download Local JSON file
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
                  Lưu Trữ Tệp & Sao Lưu Dữ Liệu Google Drive
                </h2>
                {driveStatus.loading ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đang kiểm tra kết nối...
                  </span>
                ) : driveStatus.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {driveStatus.authMode === 'oauth2'
                      ? '⭐ Tài Khoản Google Drive Cá Nhân (Refresh Token)'
                      : `Google Service Account ${driveStatus.isCustomKey ? '(Tùy biến)' : '(Mặc định)'}`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="w-3 h-3" />
                    Chưa kết nối: {driveStatus.error}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Lưu trữ trực tiếp hình ảnh, chứng từ, tờ khai hải quan và sao lưu dữ liệu SPV Logistics vào Google Drive cá nhân của bạn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Connection API Adjustment Button */}
            <button
              onClick={() => setAuthConfigModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-300" />
              <span>Cấu Hình Refresh Token / Khóa Drive</span>
            </button>

            <button
              onClick={() => {
                checkDriveStatus();
                fetchBackupFiles();
                fetchAvailableFolders();
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
              title="Làm mới trạng thái"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Credentials & Drive Storage Quota Info Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center gap-3">
            {driveStatus.accountInfo?.photoLink ? (
              <img
                src={driveStatus.accountInfo.photoLink}
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover border border-indigo-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-slate-500 font-medium block text-[11px]">Chủ sở hữu Google Drive</span>
              <span className="font-bold text-slate-900 truncate block text-xs" title={driveStatus.accountInfo?.email || 'N/A'}>
                {driveStatus.accountInfo?.name || (driveStatus.authMode === 'oauth2' ? 'Tài khoản cá nhân' : 'Service Account')}
              </span>
              <span className="text-[10px] text-slate-500 truncate block">{driveStatus.accountInfo?.email || driveStatus.serviceAccount?.email}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between text-slate-500 font-medium mb-1">
              <span>Dung lượng Google Drive</span>
              <span className="text-slate-800 font-bold">{driveStatus.accountInfo?.storageUsage || '—'} / {driveStatus.accountInfo?.storageLimit || '15 GB'}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1.5">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${driveStatus.accountInfo?.storagePercent || 15}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Thư mục Hình ảnh & Tệp</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                {driveStatus.mediaFolder?.folderName || 'SPV_UPLOADS_MEDIA'}
              </span>
            </div>
            {driveStatus.mediaFolder?.folderId && (
              <a
                href={`https://drive.google.com/drive/folders/${driveStatus.mediaFolder.folderId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-0.5 ml-2 shrink-0"
              >
                <span>Xem</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Thư mục Sao lưu Database</span>
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                {driveStatus.backupFolder?.folderName || driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}
              </span>
            </div>
            {driveStatus.backupFolder?.folderId && (
              <a
                href={`https://drive.google.com/drive/folders/${driveStatus.backupFolder.folderId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-0.5 ml-2 shrink-0"
              >
                <span>Xem</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('media')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                activeSubTab === 'media'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>📁 Kho Tệp & Hình Ảnh Tải Lên</span>
              {driveStatus.mediaFileCount !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  {driveStatus.mediaFileCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('backup')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                activeSubTab === 'backup'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-600" />
              <span>💾 Sao Lưu Cơ Sở Dữ Liệu</span>
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                {backupFiles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                activeSubTab === 'settings'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>⚙️ Cài Đặt Kết Nối & Thư Mục</span>
            </button>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-indigo-950 select-none text-xs">
            <input
              type="checkbox"
              checked={promptLocationBeforeUpload}
              onChange={e => handleTogglePromptLocation(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <span>Hỏi nơi lưu trữ trước khi tải lên</span>
          </label>
        </div>
      </div>

      {/* Tab 1: Media & Document Storage */}
      {activeSubTab === 'media' && (
        <DriveMediaStorage
          currentUser={currentUser}
          activeMediaFolder={driveStatus.mediaFolder || { folderId: driveStatus.folderId, folderName: 'SPV_UPLOADS_MEDIA' }}
          onShowToast={onShowToast}
          onRefreshStatus={() => {
            checkDriveStatus();
          }}
        />
      )}

      {/* Tab 2: Database Backups & Master Sync */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
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
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {records.length} lô hàng • {declarations.length} tờ khai • {users.length} tài khoản
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên bản sao lưu <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={backupCustomName}
                    onChange={e => setBackupCustomName(e.target.value)}
                    placeholder={`Ví dụ: SPV_Backup_CuoiThang_${new Date().getMonth() + 1}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú / Mô tả <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={backupDescription}
                    onChange={e => setBackupDescription(e.target.value)}
                    placeholder="Ví dụ: Chốt số liệu doanh thu và KPI tháng này..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  onClick={handleDownloadLocalJSON}
                  type="button"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ArrowDownToLine className="w-4 h-4 text-slate-600" />
                  <span>Xuất File Dự Phòng Về Máy (.json)</span>
                </button>

                <button
                  onClick={handleInitiateBackup}
                  disabled={isBackingUp}
                  type="button"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {isBackingUp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang sao lưu lên Drive...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>Sao Lưu Ngay Lên Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right 1 Col: Master Sync Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Cloud className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                      Master Sync (Tệp Đồng Bộ Gốc)
                    </h3>
                    <p className="text-[11px] text-indigo-200">Ghi đè tệp SPV_Database_Master_Sync.json duy nhất</p>
                  </div>
                </div>

                <p className="text-xs text-indigo-100/90 leading-relaxed mt-2">
                  Dành cho trường hợp muốn duy trì một bản dữ liệu duy nhất trên Google Drive để các máy tính hoặc chi nhánh khác có thể khôi phục nhanh.
                </p>

                {lastMasterSync && (
                  <div className="mt-3 p-2.5 bg-white/10 rounded-xl flex items-center gap-2 text-xs text-indigo-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lần đồng bộ gần nhất: <strong>{lastMasterSync}</strong></span>
                  </div>
                )}
              </div>

              <button
                onClick={handleInitiateMasterSync}
                disabled={isSyncingMaster}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isSyncingMaster ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Đang đồng bộ Master...</span>
                  </>
                ) : (
                  <>
                    <CloudCheck className="w-4 h-4 text-slate-950" />
                    <span>Đồng Bộ Master Sync Lên Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backup Files List & Restore Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Danh Sách Bản Sao Lưu Database Trên Google Drive
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn bản sao lưu để xem trước hoặc khôi phục dữ liệu về hệ thống
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Tìm theo tên file hoặc mô tả..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-60"
                  />
                </div>

                <button
                  onClick={() => fetchBackupFiles(driveStatus.folderId)}
                  disabled={loadingFiles}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                  title="Làm mới danh sách sao lưu"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Backups Table */}
            {loadingFiles ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-xs font-semibold">Đang tải danh sách bản sao lưu từ Google Drive...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <FileJson className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">Không tìm thấy bản sao lưu nào</p>
                <p className="text-xs text-slate-500 mt-1">Bấm "Sao Lưu Ngay Lên Google Drive" ở trên để tạo bản lưu trữ đầu tiên.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                      <th className="py-2.5 px-3 rounded-l-lg">Tên Bản Sao Lưu</th>
                      <th className="py-2.5 px-3">Kích Thước</th>
                      <th className="py-2.5 px-3">Thời Gian Tạo</th>
                      <th className="py-2.5 px-3">Mô Tả / Ghi Chú</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFiles.map(file => {
                      const isMaster = file.name.includes('Master_Sync');
                      return (
                        <tr key={file.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <FileJson className={`w-4 h-4 ${isMaster ? 'text-indigo-600' : 'text-teal-600'}`} />
                              <span className="truncate max-w-xs">{file.name}</span>
                              {isMaster && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold">
                                  Master
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono">
                            {formatBytes(file.size)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {file.createdTime ? new Date(file.createdTime).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-500 truncate max-w-xs" title={file.description || ''}>
                            {file.description || '—'}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Xem trên Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => handleOpenRestore(file)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition shadow-2xs"
                            >
                              <CloudDownload className="w-3.5 h-3.5" />
                              <span>Khôi Phục</span>
                            </button>

                            <button
                              onClick={() => setDeleteConfirmModal({ isOpen: true, file, deleting: false })}
                              className="inline-flex items-center p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa bản sao lưu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Settings & Folders */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Account & Credentials */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Cấu Hình Xác Thực Google Drive
                  </h3>
                  <p className="text-xs text-slate-500">Quản lý Refresh Token hoặc Service Account</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Chế độ xác thực hiện tại:</span>
                <span className="font-bold text-slate-900">
                  {driveStatus.authMode === 'oauth2'
                    ? '⭐ OAuth 2.0 Refresh Token (Cá Nhân)'
                    : 'Google Service Account (GCP)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email kết nối:</span>
                <span className="font-mono font-bold text-indigo-900 truncate max-w-xs">
                  {driveStatus.accountInfo?.email || driveStatus.serviceAccount?.email || 'Chưa thiết lập'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dung lượng:</span>
                <span className="font-bold text-emerald-700">
                  {driveStatus.accountInfo?.storageUsage || '0 GB'} / {driveStatus.accountInfo?.storageLimit || '15 GB'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAuthConfigModalOpen(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-emerald-300" />
              <span>Cập Nhật / Đổi Refresh Token Google Drive</span>
            </button>
          </div>

          {/* Card 2: Folder Locations */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Cấu Hình Thư Mục Lưu Trữ
                  </h3>
                  <p className="text-xs text-slate-500">Chọn hoặc tạo thư mục trên Google Drive</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block mb-0.5">Thư mục Hình ảnh & Tệp Media:</span>
                  <strong className="text-emerald-800 text-sm">{driveStatus.mediaFolder?.folderName || 'SPV_UPLOADS_MEDIA'}</strong>
                </div>
                <button
                  onClick={() => {
                    fetchAvailableFolders();
                    setFolderConfigModal({
                      isOpen: true,
                      folderType: 'media',
                      selectedFolderId: driveStatus.mediaFolder?.folderId || '',
                      customFolderName: driveStatus.mediaFolder?.folderName || '',
                      isCreatingNew: false,
                      newFolderName: '',
                      saving: false
                    });
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition"
                >
                  Đổi
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block mb-0.5">Thư mục Sao lưu Database:</span>
                  <strong className="text-indigo-900 text-sm">{driveStatus.backupFolder?.folderName || driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}</strong>
                </div>
                <button
                  onClick={() => {
                    fetchAvailableFolders();
                    setFolderConfigModal({
                      isOpen: true,
                      folderType: 'backup',
                      selectedFolderId: driveStatus.backupFolder?.folderId || driveStatus.folderId || '',
                      customFolderName: driveStatus.backupFolder?.folderName || driveStatus.folderName || '',
                      isCreatingNew: false,
                      newFolderName: '',
                      saving: false
                    });
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-lg transition"
                >
                  Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: OAuth2 / Service Account Config Modal */}
      <DriveOAuthModal
        isOpen={authConfigModalOpen}
        onClose={() => setAuthConfigModalOpen(false)}
        currentAuthMode={driveStatus.authMode || 'service_account'}
        accountInfo={driveStatus.accountInfo}
        onSuccess={msg => {
          onShowToast(msg, 'success');
          checkDriveStatus();
          fetchBackupFiles();
        }}
        onShowToast={onShowToast}
      />

      {/* Modal: Folder Configuration */}
      {folderConfigModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <span>
                  Đổi Thư Mục {folderConfigModal.folderType === 'media' ? 'Hình Ảnh & Tệp' : 'Sao Lưu Database'}
                </span>
              </h3>
              <button
                onClick={() => setFolderConfigModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFolderConfigModal(prev => ({ ...prev, isCreatingNew: false }))}
                  className={`flex-1 py-2 rounded-xl font-bold transition ${
                    !folderConfigModal.isCreatingNew
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Chọn Thư Mục Có Sẵn
                </button>
                <button
                  type="button"
                  onClick={() => setFolderConfigModal(prev => ({ ...prev, isCreatingNew: true }))}
                  className={`flex-1 py-2 rounded-xl font-bold transition ${
                    folderConfigModal.isCreatingNew
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + Tạo Thư Mục Mới
                </button>
              </div>

              {!folderConfigModal.isCreatingNew ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Danh sách thư mục trên Google Drive ({availableFolders.length})
                  </label>
                  {loadingFolders ? (
                    <div className="py-6 text-center text-slate-500 text-xs">Đang tải danh sách thư mục...</div>
                  ) : availableFolders.length === 0 ? (
                    <div className="py-4 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                      Chưa tìm thấy thư mục nào. Bạn có thể chọn "+ Tạo Thư Mục Mới".
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {availableFolders.map(f => (
                        <div
                          key={f.id}
                          onClick={() => setFolderConfigModal(prev => ({
                            ...prev,
                            selectedFolderId: f.id,
                            customFolderName: f.name
                          }))}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                            folderConfigModal.selectedFolderId === f.id
                              ? 'bg-indigo-50/80 font-bold text-indigo-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                            {f.name}
                          </span>
                          {folderConfigModal.selectedFolderId === f.id && (
                            <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên thư mục mới <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={folderConfigModal.newFolderName}
                    onChange={e => setFolderConfigModal(prev => ({ ...prev, newFolderName: e.target.value }))}
                    placeholder="Ví dụ: SPV_CHUNG_TU_VA_HINH_ANH"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setFolderConfigModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveFolderConfig}
                disabled={folderConfigModal.saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition"
              >
                {folderConfigModal.saving ? 'Đang lưu...' : 'Lưu Thư Mục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Prompt Location Modal */}
      {uploadPromptModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <span>Chọn Nơi Lưu Trữ Bản Sao Lưu</span>
              </h3>
              <button
                onClick={() => setUploadPromptModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Thư mục hiện tại:</span>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-indigo-900 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-600" />
                  <span>{driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}</span>
                </div>
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={uploadPromptModal.setAsDefault}
                    onChange={e => setUploadPromptModal(prev => ({ ...prev, setAsDefault: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Đặt làm thư mục lưu trữ mặc định</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setUploadPromptModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmPromptUpload}
                disabled={uploadPromptModal.uploading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
              >
                {uploadPromptModal.uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải lên...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Xác Nhận Tải Lên Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Restore Preview & Confirm */}
      {restoreModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CloudDownload className="w-5 h-5 text-indigo-600" />
                <span>Xem Trước & Khôi Phục Dữ Liệu Từ Google Drive</span>
              </h3>
              <button
                onClick={() => setRestoreModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {restoreModal.loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" />
                <span>Đang đọc và xác thực dữ liệu từ Google Drive...</span>
              </div>
            ) : restoreModal.previewData ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Cảnh báo ghi đè dữ liệu:</p>
                    <p className="text-amber-800 mt-0.5">
                      Thao tác khôi phục sẽ cập nhật toàn bộ cơ sở dữ liệu hiện thời của hệ thống theo bản sao lưu này.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-medium text-slate-700">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Vận chuyển / Lô hàng:</span>
                    <strong className="text-indigo-900 text-sm">
                      {Array.isArray(restoreModal.previewData.shipments || restoreModal.previewData.records)
                        ? (restoreModal.previewData.shipments || restoreModal.previewData.records).length
                        : 0}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Thủ tục hải quan:</span>
                    <strong className="text-indigo-900 text-sm">
                      {Array.isArray(restoreModal.previewData.declarations) ? restoreModal.previewData.declarations.length : 0}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Khách hàng & Đối tác:</span>
                    <strong className="text-indigo-900 text-sm">
                      {Array.isArray(restoreModal.previewData.customers) ? restoreModal.previewData.customers.length : 0}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Tài khoản nhân viên:</span>
                    <strong className="text-indigo-900 text-sm">
                      {Array.isArray(restoreModal.previewData.users) ? restoreModal.previewData.users.length : 0}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Tạm ứng nhân viên:</span>
                    <strong className="text-indigo-900 text-sm">
                      {Array.isArray(restoreModal.previewData.advances) ? restoreModal.previewData.advances.length : 0}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Bảng báo giá:</span>
                    <strong className="text-indigo-900 text-sm">
                      {Array.isArray(restoreModal.previewData.quotations) ? restoreModal.previewData.quotations.length : 0}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setRestoreModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleExecuteRestore}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Xác Nhận Khôi Phục Dữ Liệu</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal: Delete Backup File Confirm */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Xác Nhận Xóa Bản Sao Lưu</span>
              </h3>
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, file: null, deleting: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa bản sao lưu <strong className="text-slate-900">{deleteConfirmModal.file?.name}</strong> trên Google Drive không? Thao tác này không thể hoàn tác.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, file: null, deleting: false })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteBackup}
                disabled={deleteConfirmModal.deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition"
              >
                {deleteConfirmModal.deleting ? 'Đang xóa...' : 'Xóa Bản Sao Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
