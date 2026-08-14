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
  ArrowRight
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
  // Status state
  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean;
    loading: boolean;
    error: string | null;
    isCustomKey?: boolean;
    serviceAccount?: {
      email: string;
      projectId: string;
      clientId?: string;
    };
    folderId?: string;
    folderName?: string;
    activeTargetFolderName?: string;
    activeTargetFolderId?: string | null;
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

  // Preferences: Prompt location before upload toggle
  const [promptLocationBeforeUpload, setPromptLocationBeforeUpload] = useState<boolean>(() => {
    const saved = localStorage.getItem('spv_gdrive_prompt_location');
    return saved !== null ? saved === 'true' : true;
  });

  // Available Folders in Drive
  const [availableFolders, setAvailableFolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // 1. Modal: API Credentials Configuration (Change Google Drive API Key)
  const [apiConfigModal, setApiConfigModal] = useState<{
    isOpen: boolean;
    jsonKeyInput: string;
    testing: boolean;
    testResult: { success: boolean; message: string; email?: string; projectId?: string } | null;
    saving: boolean;
  }>({
    isOpen: false,
    jsonKeyInput: '',
    testing: false,
    testResult: null,
    saving: false
  });

  // 2. Modal: Target Folder Configuration & Creation
  const [folderConfigModal, setFolderConfigModal] = useState<{
    isOpen: boolean;
    selectedFolderId: string;
    customFolderName: string;
    isCreatingNew: boolean;
    newFolderName: string;
    saving: boolean;
  }>({
    isOpen: false,
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
          isCustomKey: data.isCustomKey,
          serviceAccount: data.serviceAccount,
          folderId: data.folderId,
          folderName: data.folderName,
          activeTargetFolderName: data.activeTargetFolderName,
          activeTargetFolderId: data.activeTargetFolderId,
          fileCount: data.fileCount
        });
      } else {
        setDriveStatus({
          connected: false,
          loading: false,
          error: data.error || 'Không thể kết nối đến Google Drive API.',
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

  // Test custom Service Account Key
  const handleTestServiceAccount = async () => {
    if (!apiConfigModal.jsonKeyInput.trim()) {
      onShowToast('Vui lòng dán nội dung JSON Service Account!', 'error');
      return;
    }
    setApiConfigModal(prev => ({ ...prev, testing: true, testResult: null }));
    try {
      const res = await fetch('/api/gdrive/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountKey: apiConfigModal.jsonKeyInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApiConfigModal(prev => ({
          ...prev,
          testing: false,
          testResult: {
            success: true,
            message: `Xác thực thành công! Tài khoản: ${data.serviceAccount?.email}`,
            email: data.serviceAccount?.email,
            projectId: data.serviceAccount?.projectId
          }
        }));
      } else {
        setApiConfigModal(prev => ({
          ...prev,
          testing: false,
          testResult: {
            success: false,
            message: data.error || 'Xác thực thất bại với Google Drive API.'
          }
        }));
      }
    } catch (err: any) {
      setApiConfigModal(prev => ({
        ...prev,
        testing: false,
        testResult: { success: false, message: `Lỗi kết nối: ${err.message}` }
      }));
    }
  };

  // Save new Service Account Key or Reset to Default
  const handleSaveServiceAccount = async (resetToDefault = false) => {
    setApiConfigModal(prev => ({ ...prev, saving: true }));
    try {
      const res = await fetch('/api/gdrive/config/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccountKey: resetToDefault ? null : apiConfigModal.jsonKeyInput.trim(),
          resetToDefault
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(data.message, 'success');
        setApiConfigModal({
          isOpen: false,
          jsonKeyInput: '',
          testing: false,
          testResult: null,
          saving: false
        });
        checkDriveStatus();
        fetchBackupFiles();
        fetchAvailableFolders();
      } else {
        onShowToast(`Lỗi: ${data.error}`, 'error');
        setApiConfigModal(prev => ({ ...prev, saving: false }));
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
      setApiConfigModal(prev => ({ ...prev, saving: false }));
    }
  };

  // File Upload Helper for JSON Key
  const handleFileUploadKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setApiConfigModal(prev => ({
        ...prev,
        jsonKeyInput: content,
        testResult: null
      }));
    };
    reader.readAsText(file);
  };

  // Save Default Folder Configuration
  const handleSaveFolderConfig = async () => {
    setFolderConfigModal(prev => ({ ...prev, saving: true }));
    try {
      let folderName = folderConfigModal.customFolderName.trim();
      let folderId = folderConfigModal.selectedFolderId;

      if (folderConfigModal.isCreatingNew && folderConfigModal.newFolderName.trim()) {
        // Create new folder first
        const createRes = await fetch('/api/gdrive/folders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName: folderConfigModal.newFolderName.trim() })
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.success) {
          throw new Error(createData.error || 'Lỗi khi tạo thư mục mới trên Google Drive');
        }
        folderId = createData.folder.id;
        folderName = createData.folder.name;
      }

      const res = await fetch('/api/gdrive/config/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, folderId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(`Đã thiết lập thư mục mặc định: ${data.folderName}`, 'success');
        setFolderConfigModal({
          isOpen: false,
          selectedFolderId: '',
          customFolderName: '',
          isCreatingNew: false,
          newFolderName: '',
          saving: false
        });
        checkDriveStatus();
        fetchBackupFiles(data.folderId);
        fetchAvailableFolders();
      } else {
        onShowToast(`Lỗi: ${data.error}`, 'error');
        setFolderConfigModal(prev => ({ ...prev, saving: false }));
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
      setFolderConfigModal(prev => ({ ...prev, saving: false }));
    }
  };

  // Execute Direct Backup with target destination
  const executeBackup = async (targetFolderId?: string, targetFolderName?: string, customName?: string, desc?: string) => {
    setIsBackingUp(true);
    try {
      const snapshot = getDatabaseSnapshot();
      const res = await fetch('/api/gdrive/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: snapshot,
          backupName: customName?.trim() || backupCustomName.trim() || 'SPV_Logistics_Backup',
          description: desc?.trim() || backupDescription.trim() || 'Sao lưu từ giao diện Quản trị SPV',
          createdBy: currentUser?.name || currentUser?.email || 'Quản trị viên',
          targetFolderId,
          targetFolderName
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        onShowToast(`Sao lưu thành công: ${result.file.name} tại [${result.folder?.folderName || 'Google Drive'}]`, 'success');
        setBackupCustomName('');
        setBackupDescription('');
        fetchBackupFiles(targetFolderId || driveStatus.folderId);
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

  // Execute Direct Master Sync with target destination
  const executeMasterSync = async (targetFolderId?: string, targetFolderName?: string) => {
    setIsSyncingMaster(true);
    try {
      const snapshot = getDatabaseSnapshot();
      const res = await fetch('/api/gdrive/sync-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: snapshot,
          updatedBy: currentUser?.name || currentUser?.email || 'SPV Admin',
          targetFolderId,
          targetFolderName
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        const timeFormatted = new Date().toLocaleString('vi-VN');
        setLastMasterSync(timeFormatted);
        localStorage.setItem('spv_gdrive_last_master_sync', timeFormatted);
        onShowToast(`Đồng bộ Master Database thành công tại [${result.folder?.folderName || 'Google Drive'}]!`, 'success');
        fetchBackupFiles(targetFolderId || driveStatus.folderId);
      } else {
        onShowToast(`Lỗi đồng bộ Master: ${result.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsSyncingMaster(false);
    }
  };

  // Handle Trigger Backup (checks if prompt is enabled)
  const handleInitiateBackup = () => {
    if (promptLocationBeforeUpload) {
      setUploadPromptModal({
        isOpen: true,
        type: 'backup',
        targetMode: 'current',
        newFolderName: '',
        backupName: backupCustomName.trim() || 'SPV_Logistics_Backup',
        description: backupDescription.trim() || 'Sao lưu từ Quản trị SPV',
        setAsDefault: false,
        uploading: false
      });
    } else {
      executeBackup();
    }
  };

  // Handle Trigger Master Sync (checks if prompt is enabled)
  const handleInitiateMasterSync = () => {
    if (promptLocationBeforeUpload) {
      setUploadPromptModal({
        isOpen: true,
        type: 'master',
        targetMode: 'current',
        newFolderName: '',
        backupName: 'SPV_Database_Master_Sync',
        description: 'Đồng bộ Master thời gian thực',
        setAsDefault: false,
        uploading: false
      });
    } else {
      executeMasterSync();
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
                  Lưu Trữ & Sao Lưu Dữ Liệu Google Drive
                </h2>
                {driveStatus.loading ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đang kiểm tra kết nối...
                  </span>
                ) : driveStatus.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Drive API Đã Kết Nối {driveStatus.isCustomKey ? '(Khóa Tùy Biến)' : '(SPV Default)'}
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
            {/* Connection API Adjustment Button */}
            <button
              onClick={() => {
                setApiConfigModal({
                  isOpen: true,
                  jsonKeyInput: '',
                  testing: false,
                  testResult: null,
                  saving: false
                });
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Đổi Kết Nối API Google Drive</span>
            </button>

            {/* Folder Customization Button */}
            <button
              onClick={() => {
                fetchAvailableFolders();
                setFolderConfigModal({
                  isOpen: true,
                  selectedFolderId: driveStatus.folderId || '',
                  customFolderName: driveStatus.folderName || '',
                  isCreatingNew: false,
                  newFolderName: '',
                  saving: false
                });
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Điều Chỉnh Nơi Lưu Trữ</span>
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
            <span className="font-mono font-bold text-slate-800 break-all truncate block" title={driveStatus.serviceAccount?.email || 'Chưa thiết lập'}>
              {driveStatus.serviceAccount?.email || 'spv-group-database-gdrive@spv-management-contract.iam.gserviceaccount.com'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Thư mục hiện thời trên Drive</span>
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                {driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}
              </span>
            </div>
            {driveStatus.folderId && (
              <a
                href={`https://drive.google.com/drive/folders/${driveStatus.folderId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-0.5 ml-2 shrink-0"
              >
                <span>Xem</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-500 font-medium block mb-0.5">Tổng số bản sao lưu</span>
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <FileJson className="w-3.5 h-3.5 text-teal-600" />
              {backupFiles.length} bản ({formatBytes(backupFiles.reduce((acc, f) => acc + (parseInt(f.size || '0', 10) || 0), 0))})
            </span>
          </div>
        </div>

        {/* Upload Preference Bar: Prompt before upload toggle */}
        <div className="mt-3 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Tùy chọn tải lên:</strong> Bạn có thể bật tính năng tự động hiển thị hộp thoại hỏi nơi lưu trữ trước khi đẩy dữ liệu lên Google Drive.
            </span>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-indigo-950 select-none shrink-0">
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
              Thư mục đích: <strong className="text-indigo-700">{driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}</strong>
            </span>
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
                onClick={handleInitiateBackup}
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
                    <span>
                      {promptLocationBeforeUpload ? 'Sao Lưu Lên Google Drive (Hỏi nơi lưu...)' : 'Sao Lưu Lên Google Drive Ngay'}
                    </span>
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
                <span className="text-slate-500">Thư mục:</span>
                <span className="font-bold text-indigo-700 truncate max-w-[150px]">{driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}</span>
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
              onClick={handleInitiateMasterSync}
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
                  <span>
                    {promptLocationBeforeUpload ? 'Đồng Bộ Master (Hỏi nơi lưu...)' : 'Đồng Bộ Master File Ngay'}
                  </span>
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
                Danh Sách Bản Sao Lưu Trên Thư Mục [{driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}] ({backupFiles.length})
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
              onClick={() => fetchBackupFiles(driveStatus.folderId)}
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
            <span>Chưa có bản sao lưu nào trong thư mục này. Hãy bấm nút "Sao Lưu Lên Google Drive" ở trên.</span>
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

      {/* 1. Modal: API Credentials Configuration */}
      {apiConfigModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Điều Chỉnh Kết Nối API Google Drive</h4>
                  <p className="text-xs text-slate-500">Cấu hình hoặc chuyển đổi Google Cloud Service Account JSON Key</p>
                </div>
              </div>
              <button
                onClick={() => setApiConfigModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Credentials Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 mb-1">Tài khoản đang kết nối hiện tại:</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email Service Account:</span>
                <span className="font-mono font-bold text-slate-800">{driveStatus.serviceAccount?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">GCP Project ID:</span>
                <span className="font-mono font-bold text-indigo-700">{driveStatus.serviceAccount?.projectId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Loại khóa:</span>
                <span className="font-semibold text-slate-700">
                  {driveStatus.isCustomKey ? 'Khóa tùy biến của người dùng' : 'Khóa mặc định hệ thống SPV'}
                </span>
              </div>
            </div>

            {/* Input New Service Account JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Nội dung JSON Service Account Mới
                </label>
                <label className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn tệp .json từ máy tính</span>
                  <input type="file" accept=".json" onChange={handleFileUploadKey} className="hidden" />
                </label>
              </div>

              <textarea
                rows={6}
                value={apiConfigModal.jsonKeyInput}
                onChange={e => setApiConfigModal(prev => ({ ...prev, jsonKeyInput: e.target.value, testResult: null }))}
                placeholder='Dán nội dung JSON Service Account vào đây (vd: { "type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..." })'
                className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                * Lưu ý: Hãy đảm bảo tài khoản dịch vụ đã được kích hoạt <strong>Google Drive API</strong> trên Google Cloud Console và được chia sẻ quyền truy cập thư mục.
              </p>
            </div>

            {/* Test Result Message */}
            {apiConfigModal.testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                apiConfigModal.testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {apiConfigModal.testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{apiConfigModal.testResult.message}</div>
                  {apiConfigModal.testResult.projectId && (
                    <div className="text-[11px] mt-0.5">Project ID: {apiConfigModal.testResult.projectId}</div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSaveServiceAccount(true)}
                disabled={apiConfigModal.saving}
                className="text-xs font-bold text-slate-600 hover:text-rose-600 transition"
              >
                Khôi phục về Service Account mặc định (SPV)
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={apiConfigModal.testing || !apiConfigModal.jsonKeyInput.trim()}
                  onClick={handleTestServiceAccount}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {apiConfigModal.testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>Kiểm tra kết nối</span>
                </button>

                <button
                  type="button"
                  disabled={apiConfigModal.saving || !apiConfigModal.jsonKeyInput.trim()}
                  onClick={() => handleSaveServiceAccount(false)}
                  className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {apiConfigModal.saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Lưu & Kích Hoạt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Target Folder Configuration & Creation */}
      {folderConfigModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Điều Chỉnh Nơi Lưu Trữ Trên Google Drive</h4>
                  <p className="text-xs text-slate-500">Tùy biến thư mục đích lưu trữ sao lưu dữ liệu SPV</p>
                </div>
              </div>
              <button
                onClick={() => setFolderConfigModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Folder Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="text-slate-500 mb-0.5">Thư mục hiện tại:</div>
              <div className="font-bold text-indigo-700 text-sm flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-indigo-500" />
                {driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}
              </div>
            </div>

            {/* Option 1: Select from existing folders in Drive */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                1. Chọn từ các thư mục có sẵn trên Drive
              </label>
              {loadingFolders ? (
                <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Đang quét thư mục trên Google Drive...</span>
                </div>
              ) : (
                <select
                  value={folderConfigModal.selectedFolderId}
                  onChange={e => {
                    const id = e.target.value;
                    const found = availableFolders.find(f => f.id === id);
                    setFolderConfigModal(prev => ({
                      ...prev,
                      selectedFolderId: id,
                      customFolderName: found ? found.name : prev.customFolderName,
                      isCreatingNew: false
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn một thư mục trên Google Drive --</option>
                  {availableFolders.map(f => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name} (ID: {f.id.substring(0, 10)}...)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Option 2: Enter Custom Folder Name */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                2. Hoặc nhập tên thư mục tùy biến (Hệ thống sẽ tự tìm hoặc tạo mới)
              </label>
              <input
                type="text"
                value={folderConfigModal.customFolderName}
                onChange={e => setFolderConfigModal(prev => ({
                  ...prev,
                  customFolderName: e.target.value,
                  isCreatingNew: false
                }))}
                placeholder="Ví dụ: SPV_SAO_LUU_2026"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Option 3: Create New Folder Immediately */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs select-none">
                <input
                  type="checkbox"
                  checked={folderConfigModal.isCreatingNew}
                  onChange={e => setFolderConfigModal(prev => ({ ...prev, isCreatingNew: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span>Tạo thư mục mới ngay lập tức trên Google Drive</span>
              </label>

              {folderConfigModal.isCreatingNew && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={folderConfigModal.newFolderName}
                    onChange={e => setFolderConfigModal(prev => ({ ...prev, newFolderName: e.target.value }))}
                    placeholder="Nhập tên thư mục mới (VD: SPV_Logistics_Backup_V2)"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFolderConfigModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={folderConfigModal.saving}
                onClick={handleSaveFolderConfig}
                className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {folderConfigModal.saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Áp Dụng Thư Mục Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Prompt Destination Location Before Upload */}
      {uploadPromptModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CloudUpload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">
                  {uploadPromptModal.type === 'backup' ? 'Xác Nhận Nơi Lưu Trữ & Sao Lưu' : 'Xác Nhận Nơi Đồng Bộ Master File'}
                </h4>
                <p className="text-xs text-slate-500">Lựa chọn thư mục đích trên Google Drive trước khi tải lên</p>
              </div>
            </div>

            {/* Folder Selection Mode */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Thư mục lưu trữ đích trên Google Drive:
              </label>

              <div className="space-y-2 text-xs">
                {/* Mode 1: Current Default Folder */}
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  uploadPromptModal.targetMode === 'current' ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="targetMode"
                    checked={uploadPromptModal.targetMode === 'current'}
                    onChange={() => setUploadPromptModal(prev => ({ ...prev, targetMode: 'current' }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <span>Thư mục mặc định hiện tại: <strong>{driveStatus.folderName || 'SPV_DATABASE_BACKUPS'}</strong></span>
                  </div>
                </label>

                {/* Mode 2: Select other existing folder */}
                <label className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition ${
                  uploadPromptModal.targetMode === 'select' ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="targetMode"
                      checked={uploadPromptModal.targetMode === 'select'}
                      onChange={() => setUploadPromptModal(prev => ({ ...prev, targetMode: 'select' }))}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span>Chọn từ danh sách thư mục khác trên Drive</span>
                  </div>
                  {uploadPromptModal.targetMode === 'select' && (
                    <select
                      value={uploadPromptModal.targetFolderId || ''}
                      onChange={e => setUploadPromptModal(prev => ({ ...prev, targetFolderId: e.target.value }))}
                      className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
                    >
                      <option value="">-- Chọn thư mục đích --</option>
                      {availableFolders.map(f => (
                        <option key={f.id} value={f.id}>📁 {f.name}</option>
                      ))}
                    </select>
                  )}
                </label>

                {/* Mode 3: Create New Folder for this upload */}
                <label className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition ${
                  uploadPromptModal.targetMode === 'create' ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="targetMode"
                      checked={uploadPromptModal.targetMode === 'create'}
                      onChange={() => setUploadPromptModal(prev => ({ ...prev, targetMode: 'create' }))}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span>Tạo một thư mục mới riêng trên Drive</span>
                  </div>
                  {uploadPromptModal.targetMode === 'create' && (
                    <input
                      type="text"
                      value={uploadPromptModal.newFolderName}
                      onChange={e => setUploadPromptModal(prev => ({ ...prev, newFolderName: e.target.value }))}
                      placeholder="Nhập tên thư mục mới (VD: Sao_Luu_Thang_08_2026)"
                      className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
                    />
                  )}
                </label>
              </div>
            </div>

            {/* Backup Info */}
            {uploadPromptModal.type === 'backup' && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên bản sao lưu</label>
                  <input
                    type="text"
                    value={uploadPromptModal.backupName}
                    onChange={e => setUploadPromptModal(prev => ({ ...prev, backupName: e.target.value }))}
                    placeholder="Tên bản sao lưu"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Set as default checkbox */}
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs select-none">
                <input
                  type="checkbox"
                  checked={uploadPromptModal.setAsDefault}
                  onChange={e => setUploadPromptModal(prev => ({ ...prev, setAsDefault: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Ghi nhớ và đặt thư mục này làm mặc định cho các lần sau</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUploadPromptModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={uploadPromptModal.uploading}
                onClick={handleConfirmPromptUpload}
                className="px-5 py-2 text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploadPromptModal.uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                <span>Tiến Hành Tải Lên Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Restore Data Preview & Confirmation */}
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

      {/* 5. Modal: Confirm Delete Backup */}
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
