import React, { useMemo, useState } from 'react';
import {
  FolderTree,
  Warehouse,
  Truck,
  Building,
  Route,
  PlusCircle,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  Search,
  X,
  Globe,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  Tags
} from 'lucide-react';
import {
  CatalogSubTab,
  WarehouseItem,
  TransporterItem,
  CustomerItem,
  RouteItem
} from '../types';
import { lookupTaxCode } from '../lib/taxLookup';
import {
  findDuplicateGroups,
  getMasterName,
  MasterDuplicateGroup,
  parseAliases,
} from '../lib/masterData';

interface CatalogManagerProps {
  activeSubTab: CatalogSubTab;
  setActiveSubTab: (tab: CatalogSubTab) => void;
  warehouses: WarehouseItem[];
  transporters: TransporterItem[];
  customers: CustomerItem[];
  routes: RouteItem[];
  onSaveCatalogItem: (subTab: CatalogSubTab, item: any) => Promise<void>;
  onDeleteCatalogItem: (subTab: CatalogSubTab, id: string, name: string) => void;
  onMergeCatalogItems?: (subTab: CatalogSubTab, primaryId: string, duplicateIds: string[]) => Promise<void>;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({
  activeSubTab,
  setActiveSubTab,
  warehouses,
  transporters,
  customers,
  routes,
  onSaveCatalogItem,
  onDeleteCatalogItem,
  onMergeCatalogItems,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editItem, setEditItem] = useState<any>(null);

  // Modal Form State
  const [formData, setFormData] = useState<any>({});
  const [isSearchingTax, setIsSearchingTax] = useState(false);
  const [taxSearchResult, setTaxSearchResult] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Parse Google Maps & location link (Extracts DkEaL class name, URLs, and labels)
  const parseGoogleMapsLocation = (raw?: string, fallbackWarehouseName?: string) => {
    if (!raw) return { isLink: false, isMaps: false, url: '', displayLabel: '' };
    const str = raw.trim();

    let extractedUrl = '';
    let extractedLabel = '';

    const hrefMatch = str.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      extractedUrl = hrefMatch[1];
    }

    const tagTextMatch = str.match(/>([^<]+)</);
    if (tagTextMatch) {
      extractedLabel = tagTextMatch[1].trim();
    }

    let urlMatch = str.match(/(https?:\/\/[^\s"']+)/i);
    if (!urlMatch) {
      const matchWww = str.match(/(www\.[^\s"']+)/i);
      if (matchWww) {
        urlMatch = [`https://${matchWww[1]}`, `https://${matchWww[1]}`];
      }
    }

    let finalUrl = extractedUrl || (urlMatch ? urlMatch[1] : str);

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.startsWith('www.') || finalUrl.includes('maps') || finalUrl.includes('goo.gl')) {
        finalUrl = 'https://' + finalUrl;
      }
    }

    const isDkEaL = str.includes('DkEaL');
    const isLink = finalUrl.startsWith('http://') || finalUrl.startsWith('https://') || isDkEaL;
    const isMaps = finalUrl.includes('maps') || finalUrl.includes('goo.gl') || finalUrl.includes('google.com') || isDkEaL;

    // Determine place name label (tên địa danh):
    let placeNameLabel = extractedLabel;

    if (!placeNameLabel) {
      // Check if there's custom text surrounding the URL in `str`, e.g. "Kho Đình Vũ https://..."
      const cleanedStr = str.replace(/(https?:\/\/[^\s"']+)/gi, '').replace(/<[^>]*>/g, '').trim();
      if (cleanedStr) {
        placeNameLabel = cleanedStr;
      }
    }

    if (!placeNameLabel && isMaps) {
      // Check if URL has place path e.g. /maps/place/Kho+ICD+Dinh+Vu/
      const placeMatch = finalUrl.match(/\/place\/([^\/@?]+)/i);
      if (placeMatch && placeMatch[1]) {
        try {
          placeNameLabel = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        } catch {
          placeNameLabel = placeMatch[1].replace(/\+/g, ' ');
        }
      }
    }

    if (!placeNameLabel) {
      placeNameLabel = fallbackWarehouseName || (isMaps ? 'Vị Trí Maps' : 'Liên Kết Web');
    }

    return {
      isLink,
      isMaps,
      url: finalUrl,
      displayLabel: placeNameLabel
    };
  };

  // Lookup company data from Masothue.com / Vietnam Tax Database
  const handleLookupTaxCode = async (explicitCode?: string) => {
    const codeToSearch = explicitCode || formData.tax_code || '';
    const cleanCode = codeToSearch.replace(/\s+/g, '').replace(/[^0-9-]/g, '');

    if (!cleanCode) {
      setTaxSearchResult({ type: 'error', message: 'Vui lòng nhập Mã Số Thuế để tra cứu dữ liệu masothue.com!' });
      return;
    }

    setIsSearchingTax(true);
    setTaxSearchResult({ type: 'info', message: 'Đang kết nối cơ sở dữ liệu Mã Số Thuế masothue.com...' });

    try {
      const result = await lookupTaxCode(cleanCode);

      if (result && result.found && (result.companyName || result.address)) {
        const fullCompanyName = result.companyName || '';
        const address = result.address || '';

        setFormData(prev => {
          let shortName = activeSubTab === 'transporter' ? prev.transporter_name : prev.customer_name;
          if (!shortName) {
            shortName = fullCompanyName.replace(/CÔNG TY (CỔ PHẦN|TNHH|TNHH MỘT THÀNH VIÊN|VẬN TẢI|TẬP ĐOÀN)\s*/gi, '').trim() || fullCompanyName;
          }

          return {
            ...prev,
            tax_code: result.taxCode || cleanCode,
            company_full_name: fullCompanyName,
            transporter_name: activeSubTab === 'transporter' ? shortName : prev.transporter_name,
            customer_name: activeSubTab === 'customer' ? shortName : prev.customer_name,
            address: address || prev.address
          };
        });

        setTaxSearchResult({
          type: 'success',
          message: `Đã tự động lấy Tên công ty & Địa chỉ từ ${result.source || 'masothue.com'}: ${fullCompanyName}`
        });
      } else {
        setTaxSearchResult({
          type: 'error',
          message: 'Không tìm thấy thông tin tự động. Bấm "Tra cứu trên masothue.com" bên trên để tìm trực tiếp.'
        });
      }
    } catch (err) {
      console.warn('Masothue lookup error:', err);
      setTaxSearchResult({
        type: 'error',
        message: 'Lỗi kết nối tra cứu. Bấm "Tra cứu trên masothue.com" để mở trang web chính thức.'
      });
    } finally {
      setIsSearchingTax(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditItem(null);
    setFormData({});
    setTaxSearchResult(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (item: any) => {
    setModalMode('edit');
    setEditItem(item);
    setFormData({ ...item });
    setTaxSearchResult(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveCatalogItem(activeSubTab, {
      ...formData,
      aliases: parseAliases(formData.aliases),
      id: editItem ? editItem.id : undefined,
    });
    setShowModal(false);
  };

  // Filtered Lists
  const q = searchQuery.toLowerCase().trim();

  const filteredWarehouses = warehouses.filter(
    w =>
      !q ||
      w.warehouse_name.toLowerCase().includes(q) ||
      w.contact_person.toLowerCase().includes(q) ||
      w.contact_phone.toLowerCase().includes(q) ||
      w.location.toLowerCase().includes(q)
  );

  const filteredTransporters = transporters.filter(
    t => !q ||
      t.transporter_name.toLowerCase().includes(q) ||
      t.tax_code.toLowerCase().includes(q) ||
      (t.address && t.address.toLowerCase().includes(q))
  );

  const filteredCustomers = customers.filter(
    c => !q ||
      c.customer_name.toLowerCase().includes(q) ||
      c.tax_code.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q))
  );

  const filteredRoutes = routes.filter(r => !q || r.route_name.toLowerCase().includes(q));

  const duplicateGroups = useMemo(() => {
    const groups: MasterDuplicateGroup[] = activeSubTab === 'warehouse'
      ? findDuplicateGroups(warehouses, 'warehouse')
      : activeSubTab === 'transporter'
      ? findDuplicateGroups(transporters, 'transporter')
      : activeSubTab === 'customer'
      ? findDuplicateGroups(customers, 'customer')
      : findDuplicateGroups(routes, 'route');
    const uniqueGroups = new Map<string, MasterDuplicateGroup>();
    groups.forEach(group => {
      const ids = group.items.map(item => item.id).sort().join('|');
      const existing = uniqueGroups.get(ids);
      if (!existing || group.reason === 'same_tax_code') uniqueGroups.set(ids, group);
    });
    return [...uniqueGroups.values()];
  }, [activeSubTab, warehouses, transporters, customers, routes]);

  const getSubTabTitle = (tab: CatalogSubTab) => {
    switch (tab) {
      case 'warehouse':
        return 'Thông Tin Kho';
      case 'transporter':
        return 'Nhà Xe';
      case 'customer':
        return 'Khách Hàng';
      case 'route':
        return 'Tuyến Đường';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center shrink-0">
            <FolderTree className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg">Danh Mục Quản Lý Chuẩn</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Dữ liệu ở đây được dùng để tự động gợi ý và điền nhanh khi nhập chuyến xe
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 transition flex items-center gap-2 whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Thêm {getSubTabTitle(activeSubTab)} Mới</span>
        </button>
      </div>

      {/* Subtabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubTab('warehouse')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 ${
              activeSubTab === 'warehouse'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>Thông Tin Kho</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSubTab === 'warehouse' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {warehouses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('transporter')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 ${
              activeSubTab === 'transporter'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Nhà Xe</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSubTab === 'transporter' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {transporters.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('customer')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 ${
              activeSubTab === 'customer'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Khách Hàng</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSubTab === 'customer' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('route')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 ${
              activeSubTab === 'route'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>Tuyến Đường</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSubTab === 'route' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {routes.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Tìm ${getSubTabTitle(activeSubTab)}...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Safe master-data cleanup: an administrator explicitly confirms every merge. */}
      {duplicateGroups.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">Phát hiện {duplicateGroups.length} nhóm dữ liệu có thể trùng</p>
              <p className="text-[11px] text-amber-800 mt-0.5">Gợi ý dựa trên tên chuẩn hoặc MST; hệ thống không tự xóa dữ liệu.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {duplicateGroups.slice(0, 3).map(group => {
              const primary = group.items[0];
              const duplicates = group.items.slice(1);
              return (
                <div key={`${group.reason}-${group.key}`} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white/70 border border-amber-100 rounded-xl px-3 py-2">
                  <span className="flex-1 font-semibold truncate" title={group.items.map(item => getMasterName(item, activeSubTab)).join(' · ')}>
                    {group.items.map(item => getMasterName(item, activeSubTab)).join(' · ')}
                  </span>
                  {onMergeCatalogItems && (
                    <button
                      type="button"
                      onClick={() => {
                        const label = getMasterName(primary, activeSubTab);
                        if (window.confirm(`Gộp ${duplicates.length} bản ghi vào "${label}"? Tên cũ sẽ được giữ thành alias.`)) {
                          void onMergeCatalogItems(activeSubTab, primary.id, duplicates.map(item => item.id));
                        }
                      }}
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition"
                    >
                      <GitMerge className="w-3.5 h-3.5" /> Gộp an toàn
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Catalog Table: Warehouses */}
      {activeSubTab === 'warehouse' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5">Tên kho/xưởng</th>
                  <th className="p-3.5">Tên người giao/nhận hàng</th>
                  <th className="p-3.5">Số điện thoại</th>
                  <th className="p-3.5">Vị trí (Địa danh & Google Maps)</th>
                  <th className="p-3.5 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredWarehouses.map((item, index) => {
                  const parsed = parseGoogleMapsLocation(item.location, item.warehouse_name);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                      <td className="p-3.5 text-indigo-900 font-bold">{item.warehouse_name || '—'}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{item.contact_person || '—'}</td>
                      <td className="p-3.5 text-indigo-600 font-medium font-mono">{item.contact_phone || '—'}</td>
                      <td className="p-3.5 text-slate-600">
                        {parsed.isLink ? (
                          <a
                            href={parsed.url}
                            target="_blank"
                            rel="noreferrer"
                            className="DkEaL inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 transition"
                            title={`Mở vị trí Google Maps: ${parsed.displayLabel}`}
                          >
                            {parsed.isMaps ? (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{parsed.displayLabel}</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                <span>{parsed.displayLabel}</span>
                              </>
                            )}
                          </a>
                        ) : (
                          item.location || '—'
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteCatalogItem('warehouse', item.id, item.warehouse_name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredWarehouses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Chưa có kho nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalog Table: Transporters */}
      {activeSubTab === 'transporter' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase">
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5">Tên nhà xe / ĐVVC</th>
                  <th className="p-3.5">Mã số thuế</th>
                  <th className="p-3.5 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredTransporters.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                    <td className="p-3.5 font-bold text-slate-800">{item.transporter_name || '—'}</td>
                    <td className="p-3.5 font-mono text-indigo-600 font-semibold">{item.tax_code || '—'}</td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteCatalogItem('transporter', item.id, item.transporter_name)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTransporters.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Chưa có nhà xe nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalog Table: Customers */}
      {activeSubTab === 'customer' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase">
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5">Tên khách hàng</th>
                  <th className="p-3.5">Mã số thuế</th>
                  <th className="p-3.5 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredCustomers.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                    <td className="p-3.5 font-bold text-slate-800">{item.customer_name || '—'}</td>
                    <td className="p-3.5 font-mono text-indigo-600 font-semibold">{item.tax_code || '—'}</td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteCatalogItem('customer', item.id, item.customer_name)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Chưa có khách hàng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalog Table: Routes */}
      {activeSubTab === 'route' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase">
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5">Tuyến đường</th>
                  <th className="p-3.5 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredRoutes.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                    <td className="p-3.5 font-bold text-slate-800">{item.route_name || '—'}</td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteCatalogItem('route', item.id, item.route_name)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRoutes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400">
                      Chưa có tuyến đường nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Catalog Item */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm sm:text-base">
                {modalMode === 'add' ? 'Thêm Mới' : 'Cập Nhật'} {getSubTabTitle(activeSubTab)}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {activeSubTab === 'warehouse' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên kho/xưởng</label>
                    <input
                      type="text"
                      required
                      value={formData.warehouse_name || ''}
                      onChange={e => setFormData({ ...formData, warehouse_name: e.target.value })}
                      placeholder="Kho ICD Đình Vũ"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên người giao/nhận hàng</label>
                    <input
                      type="text"
                      required
                      value={formData.contact_person || ''}
                      onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="Nguyễn Văn Hùng"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      required
                      value={formData.contact_phone || ''}
                      onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="0901234567"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Vị trí (Link Google Maps, DkEaL hoặc địa chỉ)</label>
                    <input
                      type="text"
                      required
                      value={formData.location || ''}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="https://maps.app.goo.gl/... hoặc dán đoạn link maps"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tự động nhận diện link Google Maps & định dạng thẻ link class <code>DkEaL</code>.
                    </p>
                  </div>
                </>
              )}

              {(activeSubTab === 'transporter' || activeSubTab === 'customer') && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {activeSubTab === 'transporter' ? 'Tên nhà xe / ĐVVC' : 'Tên khách hàng'}
                    </label>
                    <input
                      type="text"
                      required
                      value={activeSubTab === 'transporter' ? (formData.transporter_name || '') : (formData.customer_name || '')}
                      onChange={e => setFormData({
                        ...formData,
                        [activeSubTab === 'transporter' ? 'transporter_name' : 'customer_name']: e.target.value
                      })}
                      placeholder={activeSubTab === 'transporter' ? 'Vận Tải Á Châu' : 'Samsung Electronics'}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mã số thuế</label>
                    <input
                      type="text"
                      value={formData.tax_code || ''}
                      onChange={e => setFormData({ ...formData, tax_code: e.target.value })}
                      placeholder="VD: 0101234567"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-semibold"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Tags className="w-3.5 h-3.5 text-indigo-600" /> Tên gọi khác / Alias OCR
                </label>
                <input
                  type="text"
                  value={Array.isArray(formData.aliases) ? formData.aliases.join(', ') : (formData.aliases || '')}
                  onChange={e => setFormData({ ...formData, aliases: e.target.value })}
                  placeholder="Ví dụ: MADIN CHEM, Madin Chemical (phân cách bằng dấu phẩy)"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">OCR sẽ map tên này về bản ghi chuẩn, không tự tạo danh mục trùng.</p>
              </div>

              {activeSubTab === 'route' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tuyến đường</label>
                  <input
                    type="text"
                    required
                    value={formData.route_name || ''}
                    onChange={e => setFormData({ ...formData, route_name: e.target.value })}
                    placeholder="Hải Phòng - Hà Nội"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow"
                >
                  Lưu Dữ Liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
