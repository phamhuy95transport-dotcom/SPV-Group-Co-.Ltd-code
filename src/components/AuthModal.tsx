import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  QrCode,
  KeyRound,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { generateTOTPSecret, verifyTOTPToken } from '../lib/totp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onRegisterEmployee: (user: Omit<UserAccount, 'id' | 'createdAt'> & { password?: string }) => void;
  onUpdateUser2FA: (userId: string, secret: string, enabled: boolean) => void;
  onUpdatePassword?: (userId: string, newPassword: string) => Promise<void> | void;
  initialMode?: 'login' | 'register' | '2fa_setup' | 'change_password' | 'forgot_password';
  currentUser?: UserAccount | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  onRegisterEmployee,
  onUpdateUser2FA,
  onUpdatePassword,
  initialMode = 'login',
  currentUser
}) => {
  const [mode, setMode] = useState<'login' | 'register' | '2fa_verify' | '2fa_setup' | 'change_password' | 'forgot_password'>(initialMode);
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('employee_logistics');

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [confirmChangePassword, setConfirmChangePassword] = useState('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState('');
  const [inputRecoveryCode, setInputRecoveryCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // 2FA Verification State
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 2FA Setup State
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [setupCode, setSetupCode] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setErrorMsg('');
    setSuccessMsg('');
    setForgotStep(1);
    setOldPassword('');
    setChangeNewPassword('');
    setConfirmChangePassword('');
    setForgotEmail('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setInputRecoveryCode('');

    if (initialMode === '2fa_setup' && currentUser) {
      load2FASetup(currentUser.email, currentUser.totpSecret);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const load2FASetup = async (email: string, existingSecret?: string) => {
    try {
      const res = await generateTOTPSecret(email, existingSecret);
      setSecretKey(res.secret);
      setQrCodeUrl(res.qrCodeUrl);
    } catch (err) {
      console.error('Error loading 2FA setup:', err);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const inputClean = loginEmail.trim().toLowerCase();
    const foundUser = users.find(u => 
      (u.email && u.email.trim().toLowerCase() === inputClean) ||
      (u.name && u.name.trim().toLowerCase() === inputClean) ||
      (u.id && u.id.trim().toLowerCase() === inputClean)
    );

    if (!foundUser) {
      setErrorMsg('Tài khoản / Nickname không tồn tại trong hệ thống!');
      return;
    }

    if ((foundUser as any).password && (foundUser as any).password !== loginPassword) {
      setErrorMsg('Mật khẩu không chính xác!');
      return;
    }

    if (foundUser.status === 'pending') {
      setErrorMsg('Tài khoản nhân viên của bạn đang CHỜ DUYỆT từ Quản trị viên!');
      return;
    }

    if (foundUser.status === 'rejected') {
      setErrorMsg('Tài khoản của bạn đã bị từ chối truy cập!');
      return;
    }

    // Check if user has 2FA enabled
    if (foundUser.totpEnabled && foundUser.totpSecret) {
      setPendingUser(foundUser);
      setMode('2fa_verify');
      setTotpCode('');
    } else {
      // Login directly or offer 2FA setup
      onLoginSuccess(foundUser);
      setSuccessMsg(`Đăng nhập thành công với vai trò ${foundUser.role.toUpperCase()}!`);
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pendingUser || !pendingUser.totpSecret) {
      setErrorMsg('Không tìm thấy dữ liệu xác thực 2FA!');
      return;
    }

    const isValid = verifyTOTPToken(totpCode, pendingUser.totpSecret, pendingUser.email || pendingUser.name);
    if (isValid) {
      onLoginSuccess(pendingUser);
      setSuccessMsg('Xác thực 2FA Google Authenticator thành công!');
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setErrorMsg('Mã 6 chữ số Google Authenticator không chính xác hoặc đã hết hạn!');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = regEmail.trim();
    if (!regName.trim() || !cleanUsername || !regPassword.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      return;
    }

    const exists = users.some(u => 
      (u.email && u.email.trim().toLowerCase() === cleanUsername.toLowerCase()) ||
      (u.id && u.id.trim().toLowerCase() === cleanUsername.toLowerCase())
    );
    if (exists) {
      setErrorMsg('Tên đăng nhập / Nickname / Email này đã được sử dụng!');
      return;
    }

    // Submit registration with selected role (Cấp 3, Cấp 4 hoặc Cấp 5)
    onRegisterEmployee({
      name: regName.trim(),
      email: cleanUsername,
      phone: regPhone.trim(),
      role: regRole,
      status: 'pending',
      totpEnabled: false,
      password: regPassword
    });

    setSuccessMsg('Gửi yêu cầu đăng ký tài khoản thành công! Quản trị viên sẽ phê duyệt và cấp quyền theo phân cấp 5 cấp.');
    setTimeout(() => {
      setMode('login');
      setLoginEmail(cleanUsername);
      setLoginPassword('');
    }, 2000);
  };

  const handleVerify2FASetup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!setupCode || setupCode.trim().length !== 6) {
      setErrorMsg('Mã xác thực phải đúng 6 chữ số!');
      return;
    }

    const isValid = verifyTOTPToken(setupCode, secretKey, currentUser?.email || 'user');
    if (isValid) {
      if (currentUser) {
        onUpdateUser2FA(currentUser.id, secretKey, true);
      }
      setSuccessMsg('Đã kích hoạt Google Authenticator 2FA thành công!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setErrorMsg('Mã xác thực không chính xác! Vui lòng kiểm tra lại ứng dụng Google Authenticator.');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser) {
      setErrorMsg('Vui lòng đăng nhập trước khi đổi mật khẩu!');
      return;
    }

    if (currentUser.password && currentUser.password !== oldPassword) {
      setErrorMsg('Mật khẩu hiện tại không chính xác!');
      return;
    }

    if (!changeNewPassword || changeNewPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    if (changeNewPassword !== confirmChangePassword) {
      setErrorMsg('Mật khẩu mới và Nhập lại mật khẩu không trùng khớp!');
      return;
    }

    if (onUpdatePassword) {
      await onUpdatePassword(currentUser.id, changeNewPassword);
    }

    setSuccessMsg('Đã thay đổi mật khẩu thành công!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSendForgotCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailClean = forgotEmail.trim().toLowerCase();
    const targetUser = users.find(u => u.email.trim().toLowerCase() === emailClean);

    if (!targetUser) {
      setErrorMsg('Email này chưa được đăng ký trong hệ thống!');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedRecoveryCode(code);
    setForgotStep(2);
    setSuccessMsg(`Mã phục hồi 6 chữ số [ ${code} ] đã được gửi tới email ${emailClean}. Vui lòng nhập mã để tạo mật khẩu mới.`);
  };

  const handleVerifyForgotCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (inputRecoveryCode.trim() !== generatedRecoveryCode) {
      setErrorMsg('Mã phục hồi 6 chữ số không chính xác!');
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải từ 6 ký tự trở lên!');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    const emailClean = forgotEmail.trim().toLowerCase();
    const targetUser = users.find(u => u.email.trim().toLowerCase() === emailClean);

    if (targetUser && onUpdatePassword) {
      await onUpdatePassword(targetUser.id, forgotNewPassword);
    }

    setSuccessMsg('Đã đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.');
    setTimeout(() => {
      setMode('login');
      setLoginEmail(emailClean);
      setLoginPassword('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transform transition-all my-8">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-sm sm:text-base">
              {mode === 'login' && 'Đăng Nhập Hệ Thống Phân Cấp 5 Cấp'}
              {mode === 'register' && 'Đăng Ký Tài Khoản (Hệ Thống 5 Cấp)'}
              {mode === '2fa_verify' && 'Xác Thực Google Authenticator 2FA'}
              {mode === '2fa_setup' && 'Thiết Lập 2FA Google Authenticator'}
              {mode === 'change_password' && 'Đổi Mật Khẩu Tài Khoản'}
              {mode === 'forgot_password' && 'Tìm Lại Mật Khẩu Qua Email'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Quick 5-Tier Demo Account Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Chọn nhanh tài khoản thử nghiệm 5 cấp:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@spv.biz.vn');
                      setLoginPassword('admin123');
                    }}
                    className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold rounded-lg border border-orange-200 text-left transition"
                  >
                    <p className="font-extrabold text-[9px] uppercase text-orange-600">Cấp 1 • Admin</p>
                    <p className="truncate text-slate-600 font-medium">admin@spv.biz.vn</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('quanly@spv.biz.vn');
                      setLoginPassword('123456');
                    }}
                    className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg border border-purple-200 text-left transition"
                  >
                    <p className="font-extrabold text-[9px] uppercase text-purple-600">Cấp 2 • Quản lý</p>
                    <p className="truncate text-slate-600 font-medium">quanly@spv.biz.vn</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('ketoan@spv.biz.vn');
                      setLoginPassword('123456');
                    }}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-left transition"
                  >
                    <p className="font-extrabold text-[9px] uppercase text-emerald-600">Cấp 3 • Kế toán</p>
                    <p className="truncate text-slate-600 font-medium">ketoan@spv.biz.vn</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('logistics@spv.biz.vn');
                      setLoginPassword('123456');
                    }}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-200 text-left transition"
                  >
                    <p className="font-extrabold text-[9px] uppercase text-blue-600">Cấp 4 • Logistics</p>
                    <p className="truncate text-slate-600 font-medium">logistics@spv.biz.vn</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('khachhang@spv.biz.vn');
                      setLoginPassword('123456');
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-300 text-left transition col-span-2 sm:col-span-1"
                  >
                    <p className="font-extrabold text-[9px] uppercase text-slate-600">Cấp 5 • Khách hàng</p>
                    <p className="truncate text-slate-600 font-medium">khachhang@spv.biz.vn</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tài khoản / Nickname / Email</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="Ví dụ: admin, quanly, ketoan, logistics hoặc email..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setErrorMsg(''); setSuccessMsg(''); setForgotStep(1); }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập</span>
              </button>

              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">Chưa có tài khoản?</p>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Đăng ký tài khoản mới (Hệ thống 5 cấp - Gửi Admin duyệt)
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER EMPLOYEE */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên nhân viên <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập / Nickname / Email <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="Ví dụ: huypq, namnv, nv_logistics hoặc email..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cấp bậc / Vai trò đăng ký <span className="text-rose-500">*</span></label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                >
                  <option value="employee_accounting">Cấp 3: Nhân viên Kế toán (Tài chính, Báo cáo & Công nợ)</option>
                  <option value="employee_logistics">Cấp 4: Nhân viên Logistics (Điều hành xe & Thủ tục Hải quan)</option>
                  <option value="customer">Cấp 5: Khách hàng (Tra cứu lô hàng của công ty mình)</option>
                </select>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 font-medium">
                Tài khoản sau khi đăng ký sẽ ở trạng thái <strong className="text-amber-600">Chờ duyệt (Pending)</strong>. Quản trị viên Cấp 1 sẽ kiểm tra và kích hoạt trước khi bạn đăng nhập.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Gửi Yêu Cầu Đăng Ký Tài Khoản</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Quay lại Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: 2FA VERIFY */}
          {mode === '2fa_verify' && (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Xác Thực Lớp 2 (Google Authenticator)</h4>
                <p className="text-xs text-slate-500">Mở ứng dụng Google Authenticator trên điện thoại hoặc nhập mã demo <strong className="text-indigo-600 font-bold">123456</strong>.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-center">Mã xác thực 6 chữ số</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full py-2.5 text-center text-2xl tracking-[0.3em] font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Xác Nhận & Đăng Nhập</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Hủy & Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: 2FA SETUP */}
          {mode === '2fa_setup' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-extrabold text-slate-900 text-sm">Quét QR Mã Bằng Google Authenticator</h4>
                <p className="text-xs text-slate-500">Sử dụng ứng dụng Google Authenticator / Authy quét mã QR bên dưới.</p>
              </div>

              {qrCodeUrl && (
                <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40 rounded-xl shadow-xs" />
                  <p className="text-[11px] font-mono bg-white px-2 py-1 rounded border text-slate-600 select-all font-bold">
                    Khóa bí mật: {secretKey}
                  </p>
                </div>
              )}

              <form onSubmit={handleVerify2FASetup} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    Nhập mã 6 chữ số từ ứng dụng để kích hoạt:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={setupCode}
                    onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full py-2 text-center text-xl tracking-[0.2em] font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Kích Hoạt Google Authenticator 2FA</span>
                </button>
              </form>
            </div>
          )}

          {/* MODE 5: CHANGE PASSWORD */}
          {mode === 'change_password' && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={changeNewPassword}
                    onChange={e => setChangeNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmChangePassword}
                    onChange={e => setConfirmChangePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Lưu Mật Khẩu Mới</span>
              </button>
            </form>
          )}

          {/* MODE 6: FORGOT PASSWORD */}
          {mode === 'forgot_password' && (
            <div>
              {forgotStep === 1 && (
                <form onSubmit={handleSendForgotCode} className="space-y-4">
                  <div className="text-xs text-slate-600 bg-indigo-50/80 p-3 rounded-xl border border-indigo-100">
                    Nhập địa chỉ email đăng ký tài khoản của bạn để nhận mã khôi phục mật khẩu.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email đăng ký hệ thống</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="Ví dụ: nhanvien@spv.biz.vn"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Gửi Mã Khôi Phục</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                    >
                      Quay lại Đăng nhập
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleVerifyForgotCodeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                      Nhập mã khôi phục 6 chữ số:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={inputRecoveryCode}
                      onChange={e => setInputRecoveryCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full py-2 text-center text-2xl tracking-[0.2em] font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đặt Lai Mật Khẩu</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                    >
                      Nhập lại Email khác
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
