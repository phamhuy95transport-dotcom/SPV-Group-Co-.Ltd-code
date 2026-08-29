import React, { useState } from 'react';
import {
  Award,
  Edit3,
  Save,
  CheckCircle2,
  FileText,
  HelpCircle,
  Ship,
  Layers,
  GitFork,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  DollarSign,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { KPIRateItem, UserAccount, hasPermission } from '../types';

interface KPIManagerProps {
  kpiRates: KPIRateItem[];
  currentUser: UserAccount | null;
  onUpdateKPIRates: (rates: KPIRateItem[]) => void;
}

type KPISubTab = 'customs' | 'ocean' | 'handling';

// Default rates for Ocean Freight KPI
const DEFAULT_OCEAN_KPI_RATES = [
  { id: 'ocean-1', service: 'Cước Container FCL 20ft', rate: 150000, unit: 'Container', note: 'Áp dụng cho booking xuất/nhập FCL 20ft hoàn tất' },
  { id: 'ocean-2', service: 'Cước Container FCL 40ft/45ft', rate: 250000, unit: 'Container', note: 'Áp dụng cho booking xuất/nhập FCL 40ft/45ft hoàn tất' },
  { id: 'ocean-3', service: 'Cước hàng lẻ LCL', rate: 100000, unit: 'Lô hàng (CBM/Tấn)', note: 'Áp dụng cho đơn hàng lẻ ghép container' },
  { id: 'ocean-4', service: 'Vận chuyển hàng không Air Freight', rate: 200000, unit: 'Lô hàng', note: 'Áp dụng cho lô hàng vận chuyển qua đường hàng không' },
];

// Default rates for Handling KPI
const DEFAULT_HANDLING_KPI_RATES = [
  { id: 'hnd-1', service: 'Thực hiện Kiểm hóa Hải quan', rate: 100000, unit: 'Tờ khai / Lô', note: 'Trực tiếp phối hợp công chức kiểm hóa tại cảng/ICD' },
  { id: 'hnd-2', service: 'Lấy D/O & Nộp tiền THC / Lệnh cảng', rate: 50000, unit: 'Lô hàng', note: 'Rút lệnh giao hàng, đóng phí local charges đúng hạn' },
  { id: 'hnd-3', service: 'Xin Chứng nhận xuất xứ (C/O)', rate: 150000, unit: 'Bộ C/O', note: 'Nộp hồ sơ VCCI / Bộ Công Thương cấp C/O hoàn tất' },
  { id: 'hnd-4', service: 'Thủ tục Kiểm tra chuyên ngành / Hun trùng', rate: 100000, unit: 'Lô hàng', note: 'Đăng ký & kiểm tra dịch tễ, kiểm dịch thực vật/động vật' },
];

export const KPIManager: React.FC<KPIManagerProps> = ({
  kpiRates,
  currentUser,
  onUpdateKPIRates
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager' || hasPermission(currentUser, 'finance_kpi', 'edit');
  const [activeSubTab, setActiveSubTab] = useState<KPISubTab>('customs');
  
  // Custom declaration KPI state
  const [editingRates, setEditingRates] = useState<KPIRateItem[]>(kpiRates);
  const [isEditing, setIsEditing] = useState(false);

  // Ocean Freight KPI state
  const [oceanRates, setOceanRates] = useState(DEFAULT_OCEAN_KPI_RATES);
  const [isEditingOcean, setIsEditingOcean] = useState(false);

  // Handling KPI state
  const [handlingRates, setHandlingRates] = useState(DEFAULT_HANDLING_KPI_RATES);
  const [isEditingHandling, setIsEditingHandling] = useState(false);

  const handleSaveRates = () => {
    onUpdateKPIRates(editingRates);
    setIsEditing(false);
  };

  const handleRateChange = (id: string, newAmount: number) => {
    setEditingRates(prev =>
      prev.map(r => (r.id === id ? { ...r, reward_amount: newAmount } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Định Mức KPI & Thưởng Năng Suất Nghệ Nghiệp</span>
            </h2>
            <p className="text-xs text-slate-300">
              Quy định chi tiết định mức thưởng KPI cho Thủ tục Hải quan, Cước biển & Dịch vụ Handling
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('customs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'customs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>KPI Tờ Khai</span>
          <span className="bg-indigo-500/30 text-indigo-100 text-[10px] px-2 py-0.5 rounded-full">
            {kpiRates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ocean')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'ocean'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>KPI Cước Biển</span>
          <span className="bg-indigo-500/30 text-indigo-100 text-[10px] px-2 py-0.5 rounded-full">
            {oceanRates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('handling')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'handling'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>KPI Handling</span>
          <span className="bg-indigo-500/30 text-indigo-100 text-[10px] px-2 py-0.5 rounded-full">
            {handlingRates.length}
          </span>
        </button>
      </div>

      {/* ==================== MỤC 1: KPI TỜ KHAI HẢI QUAN ==================== */}
      {activeSubTab === 'customs' && (
        <div className="space-y-6">
          {/* Main Table: Định Mức Tờ Khai */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Bảng Định Mức Thưởng KPI Theo Tờ Khai
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Đơn vị tính: VNĐ / Tờ khai
                </span>
                {isAdmin && (
                  <div>
                    {isEditing ? (
                      <button
                        onClick={handleSaveRates}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Định Mức</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingRates(kpiRates);
                          setIsEditing(true);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa Định Mức</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-3 text-center w-14 border-r border-slate-700">STT</th>
                    <th className="p-3 border-r border-slate-700">Loại Tờ Khai</th>
                    <th className="p-3 text-right border-r border-slate-700">Mức Thưởng KPI (VNĐ)</th>
                    <th className="p-3">Ghi Chú & Quy Tắc Áp Dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(isEditing ? editingRates : kpiRates).map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center font-bold text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-950 border-r border-slate-100">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold">
                          {item.type_name}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-100 text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            step={1000}
                            value={item.reward_amount}
                            onChange={e => handleRateChange(item.id, Number(e.target.value) || 0)}
                            className="w-32 px-2 py-1 text-right font-mono text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <span>{item.reward_amount.toLocaleString('vi-VN')} đ</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {item.type_name === 'Xuất khẩu' && 'Áp dụng cho tờ khai hàng hóa xuất khẩu thông thường.'}
                        {item.type_name === 'Nhập khẩu' && 'Áp dụng cho tờ khai hàng hóa nhập khẩu thông thường.'}
                        {item.type_name === 'XKTC' && 'Áp dụng cho tờ khai xuất khẩu tại chỗ.'}
                        {item.type_name === 'NKTC' && 'Áp dụng cho tờ khai nhập khẩu tại chỗ.'}
                        {item.type_name === 'XNKTC' && 'Áp dụng cho tờ khai xuất nhập khẩu tại chỗ / loại hình khác.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sơ Đồ Tư Duy & Quy Tắc Tính Thưởng KPI Tờ Khai */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <GitFork className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Nguyên Tắc Tính Thưởng KPI Tờ Khai
              </h3>
            </div>

            {/* Visual Mindmap / Flowchart Rendering */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-6 shadow-inner">
              {/* Root Node */}
              <div className="flex justify-center">
                <div className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-lg border border-indigo-300/30 text-center">
                  <span className="text-xs uppercase tracking-widest text-indigo-200 font-semibold block">Quy Trình Chuẩn</span>
                  <h4 className="text-base font-black text-white flex items-center justify-center gap-2 mt-0.5">
                    <Award className="w-5 h-5 text-amber-300" />
                    <span>NGUYÊN TẮC THƯỞNG KPI TỜ KHAI HẢI QUAN</span>
                  </h4>
                </div>
              </div>

              <div className="w-0.5 h-6 bg-indigo-500/50 mx-auto"></div>

              {/* Branch Level 1: Điều kiện không thiệt hại */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                <div className="bg-slate-800/90 p-4 rounded-xl border border-emerald-500/40 relative">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Điều Kiện Cần (Bắt Buộc)</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    Công việc hoàn thành & <strong>Không phát sinh gây thiệt hại tài chính</strong> cho doanh nghiệp hoặc khách hàng. <span className="text-amber-300 font-semibold">(thuê ops ngoài được coi là phát sinh gây thiệt hại tài chính)</span>.
                  </p>
                </div>

                <div className="bg-slate-800/90 p-4 rounded-xl border border-amber-500/40 relative">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Trường Hợp Sự Cố (Không Thiệt Hại Tài Chính)</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    Xử lý tình huống phát sinh trong quá trình làm thủ tục hải quan mà không gây ra tổn thất tiền mặt.
                  </p>
                </div>
              </div>

              {/* Sub-Branch Level 2: 2 Trường hợp xử lý sự cố */}
              <div className="relative pt-2">
                <div className="text-center text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-3">
                  ⬇ Phân Nhánh Xử Lý Khi Có Sự Cố ⬇
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {/* Trường hợp 1 */}
                  <div className="bg-gradient-to-b from-slate-800 to-indigo-950/80 p-4 rounded-xl border border-indigo-500/50 shadow-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold">
                        Trường Hợp 1
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">100% KPI</span>
                    </div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Nhân viên tự xử lý xong</span>
                    </h5>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Nhân viên phụ trách tự chủ động khắc phục & giải quyết dứt điểm sự cố vướng mắc.
                    </p>
                    <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Hưởng NGUYÊN 100% Thưởng KPI</span>
                    </div>
                  </div>

                  {/* Trường hợp 2 */}
                  <div className="bg-gradient-to-b from-slate-800 to-purple-950/80 p-4 rounded-xl border border-purple-500/50 shadow-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[11px] font-bold">
                        Trường Hợp 2
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300">Chuyển % Thỏa Thuận</span>
                    </div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <GitFork className="w-4 h-4 text-purple-400" />
                      <span>Không tự xử lý xong - Nhờ hỗ trợ</span>
                    </h5>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Nhân viên không tự giải quyết được và thỏa thuận chuyển tỷ lệ thưởng để nhờ người khác hỗ trợ.
                    </p>
                    <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-xs font-bold text-purple-300">
                      <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Người hỗ trợ xử lý nhận % tỷ lệ thỏa thuận</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula Footer Node */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">Khóa Cố Định Dữ Liệu:</span>
                  <span>Khi Admin Duyệt = "Có", toàn bộ thông tin KPI tờ khai sẽ được khóa bảo mật.</span>
                </div>
                <div className="font-mono text-emerald-300 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-emerald-500/30">
                  KPI = (Số lượng × Mức thưởng) - (Số lượng × Tỷ lệ × Mức thưởng)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MỤC 2: KPI CƯỚC BIỂN ==================== */}
      {activeSubTab === 'ocean' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Bảng Định Mức Thưởng KPI Cước Vận Chuyển Biển (Ocean Freight)
                </h3>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setIsEditingOcean(!isEditingOcean)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingOcean ? 'Đóng Chỉnh Sửa' : 'Sửa Định Mức Cước'}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-3 text-center w-14 border-r border-slate-700">STT</th>
                    <th className="p-3 border-r border-slate-700">Hạng Mục Dịch Vụ Cước</th>
                    <th className="p-3 text-center border-r border-slate-700">Đơn Vị Tính</th>
                    <th className="p-3 text-right border-r border-slate-700">Mức Thưởng KPI (VNĐ)</th>
                    <th className="p-3">Ghi Chú Áp Dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {oceanRates.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center font-bold text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-950 border-r border-slate-100">
                        {item.service}
                      </td>
                      <td className="p-3.5 text-center font-semibold text-slate-600 border-r border-slate-100">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-medium text-[11px]">
                          {item.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-100 text-sm">
                        {isEditingOcean ? (
                          <input
                            type="number"
                            step={10000}
                            value={item.rate}
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
                              setOceanRates(prev => prev.map(r => r.id === item.id ? { ...r, rate: val } : r));
                            }}
                            className="w-32 px-2 py-1 text-right font-mono text-xs border border-indigo-300 rounded-lg"
                          />
                        ) : (
                          <span>{item.rate.toLocaleString('vi-VN')} đ</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {item.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-100 text-xs text-sky-900 space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2 text-sky-950">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Quy Tắc Xét Thưởng KPI Cước Biển:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700 font-medium">
              <li>Thưởng KPI Cước biển ghi nhận khi booking xuất/nhập thành công, không phát sinh nợ xấu quá 30 ngày.</li>
              <li>Đối với lô hàng vận chuyển container tròn chuyến (Khứ hồi / Hai chiều), thưởng KPI được tính theo số lượng container thực tế giao nhận.</li>
              <li>Tài khoản Admin có quyền điều chỉnh định mức thưởng định kỳ theo tình hình thị trường cước biển.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ==================== MỤC 3: KPI HANDLING ==================== */}
      {activeSubTab === 'handling' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Bảng Định Mức Thưởng KPI Dịch Vụ Handling & Thủ Tục Tại Cảng
                </h3>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setIsEditingHandling(!isEditingHandling)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingHandling ? 'Đóng Chỉnh Sửa' : 'Sửa Định Mức Handling'}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-3 text-center w-14 border-r border-slate-700">STT</th>
                    <th className="p-3 border-r border-slate-700">Tên Nghiệp Vụ Handling</th>
                    <th className="p-3 text-center border-r border-slate-700">Đơn Vị Tính</th>
                    <th className="p-3 text-right border-r border-slate-700">Mức Thưởng KPI (VNĐ)</th>
                    <th className="p-3">Ghi Chú Nghiệp Vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {handlingRates.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center font-bold text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-950 border-r border-slate-100">
                        {item.service}
                      </td>
                      <td className="p-3.5 text-center font-semibold text-slate-600 border-r border-slate-100">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-medium text-[11px]">
                          {item.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-100 text-sm">
                        {isEditingHandling ? (
                          <input
                            type="number"
                            step={10000}
                            value={item.rate}
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
                              setHandlingRates(prev => prev.map(r => r.id === item.id ? { ...r, rate: val } : r));
                            }}
                            className="w-32 px-2 py-1 text-right font-mono text-xs border border-indigo-300 rounded-lg"
                          />
                        ) : (
                          <span>{item.rate.toLocaleString('vi-VN')} đ</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {item.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-100 text-xs text-amber-900 space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2 text-amber-950">
              <Boxes className="w-4 h-4 text-amber-600" />
              <span>Quy Định Thực Hiện Handling Hiện Trường:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700 font-medium">
              <li>Mức thưởng Handling áp dụng khi công việc giao nhận, rút lệnh, kiểm hóa diễn ra an toàn, đúng thời gian yêu cầu.</li>
              <li>Trường hợp làm chứng nhận C/O hoặc kiểm tra chuyên ngành phát sinh bổ sung tài liệu, nhân viên hiện trường phối hợp bộ phận chứng từ để xử lý kịp thời.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

