import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  HardDrive,
  UserCheck,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DriveOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAuthMode: 'oauth2' | 'service_account';
  accountInfo?: {
    name?: string;
    email?: string;
    storageUsage?: string;
    storageLimit?: string;
  };
  onSuccess: (msg: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DriveOAuthModal: React.FC<DriveOAuthModalProps> = ({
  isOpen,
  onClose,
  currentAuthMode,
  accountInfo,
  onSuccess,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'oauth2' | 'service_account'>(
    currentAuthMode === 'oauth2' ? 'oauth2' : 'oauth2'
  );

  // OAuth2 Inputs
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [testingOAuth, setTestingOAuth] = useState(false);
  const [testOAuthResult, setTestOAuthResult] = useState<{
    success: boolean;
    message: string;
    user?: {
      displayName: string;
      emailAddress: string;
      photoLink?: string | null;
      storageUsage: string;
      storageLimit: string;
    };
  } | null>(null);
  const [savingOAuth, setSavingOAuth] = useState(false);

  // Service Account Inputs
  const [jsonKeyInput, setJsonKeyInput] = useState('');
  const [testingSA, setTestingSA] = useState(false);
  const [testSAResult, setTestSAResult] = useState<{
    success: boolean;
    message: string;
    email?: string;
  } | null>(null);
  const [savingSA, setSavingSA] = useState(false);

  // Guide Toggle
  const [showGuide, setShowGuide] = useState(false);
  const [copiedScope, setCopiedScope] = useState(false);

  if (!isOpen) return null;

  // Test OAuth2 Refresh Token
  const handleTestOAuth2 = async () => {
    if (!refreshToken.trim()) {
      onShowToast('Vui lòng dán Refresh Token Google Drive của bạn trước khi kiểm tra!', 'error');
      return;
    }

    setTestingOAuth(true);
    setTestOAuthResult(null);

    try {
      const res = await fetch('/api/gdrive/test-oauth2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: refreshToken.trim(),
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestOAuthResult({
          success: true,
          message: data.message,
          user: data.user
        });
        onShowToast(data.message, 'success');
      } else {
        setTestOAuthResult({
          success: false,
          message: data.error || 'Xác thực Refresh Token không thành công. Hãy kiểm tra lại token!'
        });
        onShowToast(`Lỗi: ${data.error}`, 'error');
      }
    } catch (err: any) {
      setTestOAuthResult({
        success: false,
        message: err.message || 'Lỗi mạng khi kết nối máy chủ xác thực.'
      });
      onShowToast(`Lỗi kết nối: ${err.message}`, 'error');
    } finally {
      setTestingOAuth(false);
    }
  };

  // Save OAuth2
  const handleSaveOAuth2 = async () => {
    if (!refreshToken.trim()) {
      onShowToast('Refresh Token không được để trống!', 'error');
      return;
    }

    setSavingOAuth(true);
    try {
      const res = await fetch('/api/gdrive/config/oauth2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: refreshToken.trim(),
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.message || 'Đã kết nối thành công tài khoản Google Drive cá nhân!');
        onClose();
      } else {
        onShowToast(`Lỗi kích hoạt: ${data.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setSavingOAuth(false);
    }
  };

  // Test Service Account
  const handleTestSA = async () => {
    if (!jsonKeyInput.trim()) {
      onShowToast('Vui lòng dán nội dung JSON Service Account!', 'error');
      return;
    }

    setTestingSA(true);
    setTestSAResult(null);

    try {
      const res = await fetch('/api/gdrive/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountKey: jsonKeyInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestSAResult({
          success: true,
          message: data.message,
          email: data.serviceAccount?.email
        });
        onShowToast(data.message, 'success');
      } else {
        setTestSAResult({
          success: false,
          message: data.error || 'Khóa Service Account không hợp lệ!'
        });
        onShowToast(`Lỗi: ${data.error}`, 'error');
      }
    } catch (err: any) {
      setTestSAResult({
        success: false,
        message: err.message || 'Lỗi mạng khi kiểm tra Service Account.'
      });
      onShowToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setTestingSA(false);
    }
  };

  // Save Service Account
  const handleSaveSA = async (resetToDefault: boolean = false) => {
    if (!resetToDefault && !jsonKeyInput.trim()) {
      onShowToast('Vui lòng dán nội dung khóa Service Account!', 'error');
      return;
    }

    setSavingSA(true);
    try {
      const res = await fetch('/api/gdrive/config/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccountKey: resetToDefault ? null : jsonKeyInput.trim(),
          resetToDefault
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.message || 'Đã cấu hình Service Account thành công!');
        onClose();
      } else {
        onShowToast(`Lỗi: ${data.error}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setSavingSA(false);
    }
  };

  const copyScope = () => {
    navigator.clipboard.writeText('https://www.googleapis.com/auth/drive');
    setCopiedScope(true);
    onShowToast('Đã sao chép Google Drive Scope vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedScope(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <KeyRound className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Cấu Hình Nơi Lưu Trữ Google Drive
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Kết nối với tài khoản Google Drive cá nhân của bạn để lưu trữ tệp, ảnh và sao lưu dữ liệu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('oauth2')}
            className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'oauth2'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Tài Khoản Cá Nhân (Refresh Token)</span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px]">Khuyên dùng</span>
          </button>

          <button
            onClick={() => setActiveTab('service_account')}
            className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'service_account'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Service Account JSON (GCP)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'oauth2' ? (
            <div className="space-y-4">
              {/* Introduction Banner */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-900">
                    Sử dụng Refresh Token tài khoản Google Drive cá nhân của bạn
                  </p>
                  <p className="text-emerald-800">
                    Toàn bộ hình ảnh, tài liệu hóa đơn, chứng từ và bản sao lưu sẽ được tải trực tiếp vào Google Drive cá nhân của bạn, không lo giới hạn chia sẻ hay phân quyền phức tạp.
                  </p>
                </div>
              </div>

              {/* Refresh Token Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Google Drive Refresh Token <span className="text-rose-500">*</span></span>
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showGuide ? 'Ẩn hướng dẫn' : 'Cách lấy Refresh Token?'}</span>
                  </button>
                </label>
                <textarea
                  value={refreshToken}
                  onChange={e => setRefreshToken(e.target.value)}
                  placeholder="Dán Refresh Token tài khoản Google Drive cá nhân của bạn vào đây (Bắt đầu bằng 1//0...)"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Optional Client ID & Secret */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client ID <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="Để trống nếu dùng mặc định"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client Secret <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    placeholder="Để trống nếu dùng mặc định"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Step-by-step Guide */}
              {showGuide && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2.5 animate-fadeIn">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    3 Bước Lấy Refresh Token Qua Google OAuth Playground:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                    <li>
                      Truy cập{' '}
                      <a
                        href="https://developers.google.com/oauthplayground"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5"
                      >
                        Google OAuth 2.0 Playground <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Tại ô <span className="font-semibold text-slate-800">"Input your own scopes"</span>, nhập:
                      <div className="mt-1 flex items-center gap-2">
                        <code className="bg-slate-200/80 px-2 py-1 rounded text-indigo-900 font-mono text-[11px]">
                          https://www.googleapis.com/auth/drive
                        </code>
                        <button
                          onClick={copyScope}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold text-[11px] flex items-center gap-1"
                        >
                          {copiedScope ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedScope ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>
                    </li>
                    <li>
                      Bấm <span className="font-semibold text-slate-800">"Authorize APIs"</span> → Đăng nhập tài khoản Google Drive của bạn → Cho phép truy cập.
                    </li>
                    <li>
                      Tại Step 2, bấm <span className="font-semibold text-slate-800">"Exchange authorization code for tokens"</span> → Sao chép trường <strong className="text-indigo-700">"Refresh token"</strong> và dán vào ô trên!
                    </li>
                  </ol>
                </div>
              )}

              {/* Test Result Display */}
              {testOAuthResult && (
                <div
                  className={`p-4 rounded-xl border text-xs ${
                    testOAuthResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {testOAuthResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testOAuthResult.success ? 'Kết Nối Thành Công!' : 'Xác Thực Thất Bại'}</span>
                  </div>
                  <p>{testOAuthResult.message}</p>
                  {testOAuthResult.user && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-200/60 grid grid-cols-2 gap-2 font-medium">
                      <div>
                        <span className="text-emerald-700 block text-[11px]">Chủ tài khoản:</span>
                        <strong className="text-emerald-950">{testOAuthResult.user.displayName}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 block text-[11px]">Email:</span>
                        <strong className="text-emerald-950">{testOAuthResult.user.emailAddress}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 block text-[11px]">Dung lượng đã dùng:</span>
                        <strong className="text-emerald-950">{testOAuthResult.user.storageUsage}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 block text-[11px]">Tổng giới hạn:</span>
                        <strong className="text-emerald-950">{testOAuthResult.user.storageLimit}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestOAuth2}
                  disabled={testingOAuth || !refreshToken.trim()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingOAuth ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang kiểm tra kết nối...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Kiểm Tra Kết Nối Refresh Token</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOAuth2}
                    disabled={savingOAuth || !refreshToken.trim()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingOAuth ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lưu & Kích Hoạt Tài Khoản Cá Nhân</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Service Account Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  Sử dụng khóa JSON của Google Service Account (Tài khoản dịch vụ doanh nghiệp GCP). Hãy đảm bảo bạn đã chia sẻ quyền truy cập thư mục Google Drive cho email của Service Account.
                </p>
              </div>

              {/* JSON Key Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Nội dung JSON Service Account Key <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={jsonKeyInput}
                  onChange={e => setJsonKeyInput(e.target.value)}
                  placeholder={`{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----...",\n  "client_email": "..."\n}`}
                  rows={6}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Test SA Result */}
              {testSAResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    testSAResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <p className="font-bold">{testSAResult.message}</p>
                  {testSAResult.email && (
                    <p className="text-[11px] mt-1 font-mono text-emerald-800">Email: {testSAResult.email}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSA}
                    disabled={testingSA || !jsonKeyInput.trim()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testingSA ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>Kiểm tra khóa JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveSA(true)}
                    disabled={savingSA}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition"
                    title="Khôi phục về Service Account mặc định của hệ thống"
                  >
                    Dùng Service Account mặc định
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSA(false)}
                    disabled={savingSA || !jsonKeyInput.trim()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {savingSA ? 'Đang lưu...' : 'Áp dụng khóa JSON'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
