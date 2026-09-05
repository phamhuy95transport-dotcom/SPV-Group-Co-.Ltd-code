import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Edit2, Copy, Lock, Save, User, AlertCircle, FileText, Globe, Search, Loader2, CheckCircle2, FileSearch } from 'lucide-react';
import { ShipmentRecord, WarehouseItem, TransporterItem, CustomerItem, RouteItem, UserAccount, findCustomerByName, CatalogSubTab } from '../types';
import { lookupTaxCode } from '../lib/taxLookup';
import { ShipmentOcrModal } from './ShipmentOcrModal';
import { validateIso6346Container, validateShipmentDraft } from '../lib/shipmentValidation';

export const formatNumberWithDots = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const cleanDigits = String(val).replace(/\D/g, '');
  if (!cleanDigits) return '';
  return cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseFormattedNumber = (formattedStr: string): number => {
  const cleanDigits = formattedStr.replace(/\D/g, '');
  return cleanDigits ? Number(cleanDigits) : 0;
};

export const validateISO6346 = validateIso6346Container;

interface ShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<ShipmentRecord>) => Promise<void>;
  modalMode: 'add' | 'edit';
  initialData?: ShipmentRecord | null;
  warehouses: WarehouseItem[];
  transporters: TransporterItem[];
  customers: CustomerItem[];
  routes: RouteItem[];
  existingRecords: ShipmentRecord[];
  currentUser: UserAccount | null;
  onSaveCatalogItem?: (subTab: CatalogSubTab, itemData: any) => Promise<void>;
}

export const ShipmentModal: React.FC<ShipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  modalMode,
  initialData,
  warehouses,
  transporters,
  customers,
  routes,
  existingRecords,
  currentUser,
  onSaveCatalogItem,
}) => {
  const [formData, setFormData] = useState<Partial<ShipmentRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [contErrorMsg, setContErrorMsg] = useState<string | null>(null);
  const [isSearchingTax, setIsSearchingTax] = useState(false);
  const [taxSearchResult, setTaxSearchResult] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  // Catalog item creation sub-modal state with strict validation
  const [catalogModal, setCatalogModal] = useState<{
    isOpen: boolean;
    subTab: CatalogSubTab;
    title: string;
    data: {
      name?: string;
      customer_name?: string;
      transporter_name?: string;
      warehouse_name?: string;
      route_name?: string;
      company_full_name?: string;
      tax_code?: string;
      address?: string;
      location?: string;
      contact_person?: string;
      contact_phone?: string;
    };
    errors: Record<string, string>;
    isSearchingTax?: boolean;
  }>({
    isOpen: false,
    subTab: 'customer',
    title: '',
    data: {},
    errors: {}
  });

  const handleLookupCatalogTaxCode = async (taxCode: string) => {
    if (!taxCode || !taxCode.trim()) {
      setCatalogModal(prev => ({
        ...prev,
        errors: { ...prev.errors, tax_code: 'Vui lòng nhập Mã số thuế trước khi tra cứu!' }
      }));
      return;
    }
    const cleanCode = taxCode.replace(/\D/g, '');
    setCatalogModal(prev => ({
      ...prev,
      isSearchingTax: true,
      errors: { ...prev.errors, tax_code: '' }
    }));

    try {
      const result = await lookupTaxCode(cleanCode);

      if (result && result.found && (result.companyName || result.address)) {
        setCatalogModal(prev => ({
          ...prev,
          isSearchingTax: false,
          data: {
            ...prev.data,
            company_full_name: result.companyName || prev.data.company_full_name || '',
            address: result.address || prev.data.address || ''
          },
          errors: {
            ...prev.errors,
            company_full_name: '',
            address: ''
          }
        }));
      } else {
        setCatalogModal(prev => ({
          ...prev,
          isSearchingTax: false,
          errors: {
            ...prev.errors,
            tax_code: 'Không tìm thấy thông tin tự động. Vui lòng tự nhập tên công ty và địa chỉ.'
          }
        }));
      }
    } catch (err) {
      setCatalogModal(prev => ({
        ...prev,
        isSearchingTax: false,
        errors: { ...prev.errors, tax_code: 'Lỗi tra cứu MST.' }
      }));
    }
  };

  const handleSaveCatalogModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveCatalogItem) return;

    const { subTab, data } = catalogModal;
    const errors: Record<string, string> = {};

    if (subTab === 'route') {
      if (!data.route_name?.trim()) errors.route_name = 'Vui lòng nhập tên tuyến đường (*)!';
    } else if (subTab === 'customer') {
      if (!data.customer_name?.trim()) errors.customer_name = 'Vui lòng nhập Tên viết tắt / Tên khách hàng (*)!';
      if (!data.company_full_name?.trim()) errors.company_full_name = 'Vui lòng nhập Tên đầy đủ công ty (*)!';
      if (!data.tax_code?.trim()) errors.tax_code = 'Vui lòng nhập Mã số thuế (*)!';
      if (!data.address?.trim()) errors.address = 'Vui lòng nhập Địa chỉ xuất hóa đơn (*)!';
    } else if (subTab === 'transporter') {
      if (!data.transporter_name?.trim()) errors.transporter_name = 'Vui lòng nhập Tên nhà xe (*)!';
      if (!data.company_full_name?.trim()) errors.company_full_name = 'Vui lòng nhập Tên đầy đủ công ty (*)!';
      if (!data.tax_code?.trim()) errors.tax_code = 'Vui lòng nhập Mã số thuế (*)!';
      if (!data.address?.trim()) errors.address = 'Vui lòng nhập Địa chỉ công ty (*)!';
    } else if (subTab === 'warehouse') {
      if (!data.warehouse_name?.trim()) errors.warehouse_name = 'Vui lòng nhập Tên kho / xưởng (*)!';
      if (!data.location?.trim()) errors.location = 'Vui lòng nhập Vị trí / Địa chỉ kho xưởng (*)!';
      if (!data.contact_person?.trim()) errors.contact_person = 'Vui lòng nhập Người liên hệ (*)!';
      if (!data.contact_phone?.trim()) errors.contact_phone = 'Vui lòng nhập Số điện thoại liên hệ (*)!';
    }

    if (Object.keys(errors).length > 0) {
      setCatalogModal(prev => ({ ...prev, errors }));
      return;
    }

    try {
      if (subTab === 'route') {
        await onSaveCatalogItem('route', { route_name: data.route_name!.trim() });
        setFormData(prev => ({ ...prev, route: data.route_name!.trim() }));
      } else if (subTab === 'customer') {
        await onSaveCatalogItem('customer', {
          customer_name: data.customer_name!.trim(),
          company_full_name: data.company_full_name!.trim(),
          tax_code: data.tax_code!.trim(),
          address: data.address!.trim(),
        });
        setFormData(prev => ({
          ...prev,
          customer: data.customer_name!.trim(),
          return_invoice_tax_code: data.tax_code!.trim(),
          return_invoice_company_name: data.company_full_name!.trim(),
          return_invoice_address: data.address!.trim()
        }));
      } else if (subTab === 'transporter') {
        await onSaveCatalogItem('transporter', {
          transporter_name: data.transporter_name!.trim(),
          company_full_name: data.company_full_name!.trim(),
          tax_code: data.tax_code!.trim(),
          address: data.address!.trim(),
        });
        setFormData(prev => ({ ...prev, transporter: data.transporter_name!.trim() }));
      } else if (subTab === 'warehouse') {
        await onSaveCatalogItem('warehouse', {
          warehouse_name: data.warehouse_name!.trim(),
          location: data.location!.trim(),
          contact_person: data.contact_person!.trim(),
          contact_phone: data.contact_phone!.trim(),
        });
        setFormData(prev => ({
          ...prev,
          warehouse: data.warehouse_name!.trim(),
          contact_person: data.contact_person!.trim(),
          contact_phone: data.contact_phone!.trim()
        }));
      }

      setCatalogModal(prev => ({ ...prev, isOpen: false, errors: {} }));
    } catch (err) {
      console.error('Error adding catalog item:', err);
    }
  };

  useEffect(() => {
    setContErrorMsg(null);
    setTaxSearchResult(null);

    if (initialData) {
      const initType = initialData.return_invoice_type || 'customer';
      const custObj = findCustomerByName(initialData.customer, customers);

      let taxCode = initialData.return_invoice_tax_code || '';
      let compName = initialData.return_invoice_company_name || '';
      let addr = initialData.return_invoice_address || '';

      if (initType === 'customer') {
        taxCode = custObj?.tax_code || taxCode;
        compName = custObj?.company_full_name || custObj?.customer_name || compName || initialData.customer || '';
        addr = custObj?.address || addr;
      }

      setFormData({
        ...initialData,
        id: modalMode === 'add' ? ('rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)) : initialData.id,
        return_invoice_type: initType,
        return_invoice_tax_code: taxCode,
        return_invoice_company_name: compName,
        return_invoice_address: addr,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        date_announced: today,
        delivery_date: today,
        route: '',
        transporter: '',
        cont_number: '',
        customer: '',
        batch_number: '',
        cont_quantity: 1,
        warehouse: '',
        contact_person: '',
        contact_phone: '',
        phoi_nang: false,
        phoi_ha: false,
        hd_ha_rong: false,
        hd_dich_vu: false,
        notes: '',
        base_price: 0,
        sale_price: 0,
        return_invoice_type: 'customer',
        return_invoice_tax_code: '',
        return_invoice_company_name: '',
        return_invoice_address: '',
      });
    }
  }, [modalMode, initialData, isOpen, customers]);

  if (!isOpen) return null;

  const handleCustomerChange = (val: string) => {
    const custObj = findCustomerByName(val, customers);

    setFormData(prev => {
      const isCustomerType = (prev.return_invoice_type || 'customer') === 'customer';
      return {
        ...prev,
        customer: val,
        return_invoice_type: prev.return_invoice_type || 'customer',
        return_invoice_tax_code: isCustomerType ? (custObj?.tax_code || '') : prev.return_invoice_tax_code,
        return_invoice_company_name: isCustomerType ? (custObj?.company_full_name || custObj?.customer_name || val) : prev.return_invoice_company_name,
        return_invoice_address: isCustomerType ? (custObj?.address || '') : prev.return_invoice_address,
      };
    });
  };

  const handleInvoiceTypeChange = (type: 'customer' | 'other') => {
    setFormData(prev => {
      if (type === 'customer') {
        const custObj = findCustomerByName(prev.customer, customers);
        return {
          ...prev,
          return_invoice_type: 'customer',
          return_invoice_tax_code: custObj?.tax_code || '',
          return_invoice_company_name: custObj?.company_full_name || custObj?.customer_name || prev.customer || '',
          return_invoice_address: custObj?.address || '',
        };
      }
      return {
        ...prev,
        return_invoice_type: 'other',
      };
    });
  };

  const handleLookupTaxCode = async () => {
    const custObj = findCustomerByName(formData.customer, customers);
    const code = formData.return_invoice_tax_code?.trim() || custObj?.tax_code?.trim();
    if (!code) {
      setTaxSearchResult({ type: 'error', message: 'Vui lòng nhập hoặc chọn Mã số thuế trước khi tra cứu!' });
      return;
    }
    const cleanCode = code.replace(/\D/g, '');
    setIsSearchingTax(true);
    setTaxSearchResult({ type: 'info', message: 'Đang tra cứu dữ liệu masothue.com...' });

    try {
      const result = await lookupTaxCode(cleanCode);
      let fullCompanyName = result.found ? result.companyName : '';
      let address = result.found ? result.address : '';
      let foundTaxCode = result.found ? result.taxCode : cleanCode;

      // 3. Fallback to Catalog search if online API did not return data
      if (!fullCompanyName) {
        const foundCust = customers.find(c => c.tax_code && c.tax_code.replace(/\D/g, '') === cleanCode);
        const foundTrans = transporters.find(t => t.tax_code && t.tax_code.replace(/\D/g, '') === cleanCode);

        if (foundCust && (foundCust.company_full_name || foundCust.address)) {
          fullCompanyName = foundCust.company_full_name || foundCust.customer_name || '';
          address = foundCust.address || '';
        } else if (foundTrans && (foundTrans.company_full_name || foundTrans.address)) {
          fullCompanyName = foundTrans.company_full_name || foundTrans.transporter_name || '';
          address = foundTrans.address || '';
        }
      }

      if (fullCompanyName || address) {
        setFormData(prev => ({
          ...prev,
          return_invoice_tax_code: foundTaxCode || prev.return_invoice_tax_code || code,
          return_invoice_company_name: fullCompanyName || prev.return_invoice_company_name,
          return_invoice_address: address || prev.return_invoice_address,
        }));

        setTaxSearchResult({
          type: 'success',
          message: `Đã trích xuất thành công từ ${result.source || 'Masothue'}: ${fullCompanyName || 'Đã cập nhật địa chỉ'}`
        });
      } else {
        setTaxSearchResult({
          type: 'error',
          message: 'Không tìm thấy thông tin cho Mã số thuế này trên masothue.com. Vui lòng nhập thủ công.'
        });
      }
    } catch (err) {
      console.error('Lỗi tra cứu MST:', err);
      setTaxSearchResult({
        type: 'error',
        message: 'Lỗi tra cứu dữ liệu masothue. Vui lòng nhập thông tin thủ công.'
      });
    } finally {
      setIsSearchingTax(false);
    }
  };

  // Handle Multi-Cont Input
  const rawContText = formData.cont_number || '';
  const parsedContList = rawContText
    .split(/[\n,;\s]+/)
    .map(c => c.trim())
    .filter(Boolean);

  const handleContNumberChange = (text: string) => {
    const upper = text.toUpperCase();
    const list = upper
      .split(/[\n,;\s]+/)
      .map(c => c.trim())
      .filter(Boolean);

    setFormData(prev => ({
      ...prev,
      cont_number: upper,
      cont_quantity: list.length > 0 ? list.length : (prev.cont_quantity || 1)
    }));
    setContErrorMsg(null);
  };

  const handleWarehouseChange = (val: string) => {
    const found = warehouses.find(
      w => w.warehouse_name.toLowerCase() === val.trim().toLowerCase()
    );
    setFormData(prev => ({
      ...prev,
      warehouse: val,
      contact_person: found ? found.contact_person : prev.contact_person,
      contact_phone: found ? found.contact_phone : prev.contact_phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateShipmentDraft(formData, {
      warehouses,
      transporters,
      customers,
      routes,
    }, existingRecords);
    const blockingIssue = validation.issues.find(issue => issue.severity === 'error');
    if (blockingIssue) {
      setContErrorMsg(blockingIssue.message);
      return;
    }

    setIsSaving(true);
    try {
      const creatorInfo = initialData?.created_by || (currentUser ? {
        uid: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role
      } : undefined);

      const invType = formData.return_invoice_type || 'customer';
      let invTax = formData.return_invoice_tax_code || '';
      let invComp = formData.return_invoice_company_name || '';
      let invAddr = formData.return_invoice_address || '';

      if (invType === 'customer') {
        const custObj = findCustomerByName(formData.customer, customers);
        invTax = custObj?.tax_code || invTax;
        invComp = custObj?.company_full_name || custObj?.customer_name || invComp || formData.customer || '';
        invAddr = custObj?.address || invAddr;
      }

      let isAdminEdited = initialData?.admin_edited_price || false;
      if (currentUser?.role === 'admin') {
        if ((formData.base_price && formData.base_price !== initialData?.base_price) || 
            (formData.sale_price && formData.sale_price !== initialData?.sale_price)) {
          isAdminEdited = true;
        }
      }

      const savePayload: Partial<ShipmentRecord> = {
        ...formData,
        return_invoice_type: invType,
        return_invoice_tax_code: invTax,
        return_invoice_company_name: invComp,
        return_invoice_address: invAddr,
        cont_number: formData.cont_number?.trim() || '',
        cont_quantity: formData.cont_quantity !== undefined ? formData.cont_quantity : 1,
        created_by: creatorInfo,
        admin_edited_price: isAdminEdited,
        processing_status: 'confirmed',
        ocr: formData.ocr ? { ...formData.ocr, reviewStatus: 'confirmed' } : undefined,
      };

      if (currentUser?.role === 'employee' && initialData?.admin_edited_price) {
        savePayload.base_price = initialData.base_price;
        savePayload.sale_price = initialData.sale_price;
      }

      await onSave(savePayload);
      onClose();
    } catch (err) {
      console.error('Error saving shipment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 transform transition-all my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {modalMode === 'add' && initialData ? (
              <Copy className="w-5 h-5 text-emerald-400" />
            ) : modalMode === 'add' ? (
              <PlusCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Edit2 className="w-5 h-5 text-indigo-400" />
            )}
            <h3 className="font-extrabold text-slate-100 text-sm sm:text-base">
              {modalMode === 'add' && initialData
                ? 'Nhân Bản Chuyến Hàng (Tạo bản sao mới)'
                : modalMode === 'add'
                ? 'Thêm Mới Chuyến Hàng (Cột A đến R)'
                : 'Chỉnh Sửa Thông Tin Chuyến Hàng'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOcrModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-indigo-300/30 bg-indigo-400/15 px-2.5 py-1.5 text-[11px] font-bold text-indigo-100 transition hover:bg-indigo-400/25"
              title="Tải chứng từ để AI trích xuất thành bản nháp"
            >
              <FileSearch className="w-3.5 h-3.5" /> AI đọc chứng từ
            </button>
            <button type="button" onClick={() => setIsOcrModalOpen(true)} className="sm:hidden rounded-lg p-1.5 text-indigo-200 hover:bg-white/10" title="AI đọc chứng từ">
              <FileSearch className="w-5 h-5" />
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Creator Tag (Requirement 5) */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-indigo-950">
              <User className="w-4 h-4 text-indigo-600" />
              <span>
                Tự động ghi nhận Người Nhập Liệu:{' '}
                <strong className="text-indigo-700">
                  {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Hệ thống'}
                </strong>
              </span>
            </div>
            <span className="bg-indigo-200 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
              {currentUser?.role || 'User'}
            </span>
          </div>

          {/* Error message banner if any */}
          {contErrorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{contErrorMsg}</span>
            </div>
          )}

          {/* Section 1: Thông tin chuyến xe */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block mb-3">
              1. Thông Tin Chuyến & Thời Gian (Cột A - H)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">A. Ngày báo xe <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.date_announced || ''}
                  onChange={e => setFormData({ ...formData, date_announced: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">B. Ngày đóng/trả hàng <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.delivery_date || ''}
                  onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">C. Tuyến đường</label>
                <input
                  type="text"
                  list="route-list"
                  placeholder="Ví dụ: Hải Phòng - Hà Nội"
                  value={formData.route || ''}
                  onChange={e => setFormData({ ...formData, route: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="route-list">
                  {routes.map(r => (
                    <option key={r.id} value={r.route_name} />
                  ))}
                </datalist>
                {formData.route?.trim() && !routes.some(r => r.route_name.toLowerCase() === formData.route!.trim().toLowerCase()) && onSaveCatalogItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogModal({
                        isOpen: true,
                        subTab: 'route',
                        title: 'Thêm Tuyến Đường Vào Danh Mục',
                        data: {
                          route_name: formData.route!.trim()
                        },
                        errors: {}
                      });
                    }}
                    className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg transition"
                  >
                    <PlusCircle className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>Thêm tuyến "{formData.route}" vào Danh mục</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">D. Đơn vị vận chuyển <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  list="transporter-list"
                  required
                  placeholder="Tên nhà xe"
                  value={formData.transporter || ''}
                  onChange={e => setFormData({ ...formData, transporter: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="transporter-list">
                  {transporters.map(t => (
                    <option key={t.id} value={t.transporter_name} />
                  ))}
                </datalist>
                {formData.transporter?.trim() && !transporters.some(t => t.transporter_name.toLowerCase() === formData.transporter!.trim().toLowerCase()) && onSaveCatalogItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogModal({
                        isOpen: true,
                        subTab: 'transporter',
                        title: 'Thêm Nhà Xe (Đơn Vị Vận Chuyển) Vào Danh Mục',
                        data: {
                          transporter_name: formData.transporter!.trim(),
                          company_full_name: '',
                          tax_code: '',
                          address: '',
                        },
                        errors: {}
                      });
                    }}
                    className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg transition"
                  >
                    <PlusCircle className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>Thêm nhà xe "{formData.transporter}" vào Danh mục</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">F. Khách hàng <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  list="customer-list"
                  required
                  placeholder="Tên khách hàng"
                  value={formData.customer || ''}
                  onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="customer-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.customer_name} />
                  ))}
                </datalist>
                {formData.customer?.trim() && !customers.some(c => c.customer_name.toLowerCase() === formData.customer!.trim().toLowerCase()) && onSaveCatalogItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogModal({
                        isOpen: true,
                        subTab: 'customer',
                        title: 'Thêm Khách Hàng Vào Danh Mục',
                        data: {
                          customer_name: formData.customer!.trim(),
                          company_full_name: '',
                          tax_code: '',
                          address: '',
                        },
                        errors: {}
                      });
                    }}
                    className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg transition"
                  >
                    <PlusCircle className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>Thêm khách hàng "{formData.customer}" vào Danh mục</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">G. Số lô nhập/xuất</label>
                <input
                  type="text"
                  placeholder="Ví dụ: NK-2026-088"
                  value={formData.batch_number || ''}
                  onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">H. Số lượng cont</label>
                <input
                  type="number"
                  min={1}
                  value={formData.cont_quantity ?? 1}
                  onChange={e => setFormData({ ...formData, cont_quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-indigo-50/50 border border-indigo-200 text-indigo-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Multi-Cont Input Field */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E. Số cont (Có thể nhập nhiều số cont, phân cách bằng phẩy hoặc xuống dòng)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: TGHU1234567, MSKU9876543 (nhập nhiều cont phân cách bằng phẩy hoặc xuống dòng)"
                  value={formData.cont_number || ''}
                  onChange={e => handleContNumberChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {/* Display parsed container tags */}
                {parsedContList.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {parsedContList.map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1"
                      >
                        <span>{code}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Kho & Tự động điền */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block mb-3">
              2. Thông Tin Kho / Xưởng & Người Giao Nhận (Cột I - K)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">I. Chọn hoặc nhập Kho / Xưởng (Gợi ý SĐT)</label>
                <input
                  type="text"
                  list="warehouse-list"
                  placeholder="Nhập tên kho/xưởng hoặc chọn..."
                  value={formData.warehouse || ''}
                  onChange={e => handleWarehouseChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="warehouse-list">
                  {warehouses.map(w => (
                    <option key={w.id} value={w.warehouse_name}>
                      {w.warehouse_name} {w.location ? `(${w.location})` : ''}
                    </option>
                  ))}
                </datalist>
                {formData.warehouse?.trim() && !warehouses.some(w => w.warehouse_name.toLowerCase() === formData.warehouse!.trim().toLowerCase()) && onSaveCatalogItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogModal({
                        isOpen: true,
                        subTab: 'warehouse',
                        title: 'Thêm Kho / Xưởng Vào Danh Mục',
                        data: {
                          warehouse_name: formData.warehouse!.trim(),
                          location: '',
                          contact_person: formData.contact_person || '',
                          contact_phone: formData.contact_phone || '',
                        },
                        errors: {}
                      });
                    }}
                    className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg transition"
                  >
                    <PlusCircle className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>Thêm kho "{formData.warehouse}" vào Danh mục</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">J. Tên người giao/nhận hàng</label>
                <input
                  type="text"
                  placeholder="Người liên hệ"
                  value={formData.contact_person || ''}
                  onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">K. SĐT người nhận hàng</label>
                <input
                  type="text"
                  placeholder="Số điện thoại"
                  value={formData.contact_phone || ''}
                  onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Chứng từ & Phơi */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block mb-3">
              3. Trạng Thái Chứng Từ & Phơi
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.phoi_nang || false}
                  onChange={e => setFormData({ ...formData, phoi_nang: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">Phơi nâng</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.phoi_ha || false}
                  onChange={e => setFormData({ ...formData, phoi_ha: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">Phơi hạ</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.hd_ha_rong || false}
                  onChange={e => setFormData({ ...formData, hd_ha_rong: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">HĐ hạ rỗng</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.hd_dich_vu || formData.hd_dau_vao || false}
                  onChange={e => setFormData({ ...formData, hd_dich_vu: e.target.checked, hd_dau_vao: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">HĐ đầu vào</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.hd_dau_ra || false}
                  onChange={e => setFormData({ ...formData, hd_dau_ra: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">HĐ đầu ra</span>
              </label>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú chuyến hàng</label>
              <textarea
                rows={2}
                placeholder="Ghi chú chi tiết giao nhận, lưu ý đặc biệt..."
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 4: Thông Tin Hóa Đơn Hạ Vỏ (Xuất biên bản giao hàng) */}
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>4. Thông Tin Hóa Đơn Hạ Vỏ (Container)</span>
              </h4>

              {/* Radio choices */}
              <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="return_invoice_type"
                    value="customer"
                    checked={(formData.return_invoice_type || 'customer') === 'customer'}
                    onChange={() => handleInvoiceTypeChange('customer')}
                    className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Của khách hàng</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="return_invoice_type"
                    value="other"
                    checked={formData.return_invoice_type === 'other'}
                    onChange={() => handleInvoiceTypeChange('other')}
                    className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Khác</span>
                </label>
              </div>
            </div>

            {(formData.return_invoice_type || 'customer') === 'customer' ? (() => {
              const custObj = findCustomerByName(formData.customer, customers);
              const currentTaxCode = formData.return_invoice_tax_code || custObj?.tax_code || '';

              return (
                <div className="bg-white p-3.5 rounded-xl border border-indigo-200 text-xs space-y-3">
                  <p className="text-slate-600 text-[11px] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Trích xuất thông tin xuất hóa đơn hạ vỏ từ Khách hàng: <strong className="text-indigo-900">{formData.customer || 'Chưa chọn KH'}</strong>
                    </span>
                  </p>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Mã số thuế HĐ hạ vỏ</label>
                      <a
                        href={`https://masothue.com/tra-cuu-ma-so-thue-doanh-nghiep?q=${encodeURIComponent(currentTaxCode)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" /> Tra cứu trên masothue.com ↗
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.return_invoice_tax_code || custObj?.tax_code || ''}
                        onChange={e => setFormData({ ...formData, return_invoice_tax_code: e.target.value })}
                        placeholder="VD: 0101234567"
                        className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-900"
                      />
                      <button
                        type="button"
                        onClick={handleLookupTaxCode}
                        disabled={isSearchingTax}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
                        title="Bấm để tự động tra cứu lấy Tên công ty đầy đủ & Địa chỉ từ masothue.com"
                      >
                        {isSearchingTax ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lấy...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5" />
                            <span>Lấy Dữ Liệu Masothue</span>
                          </>
                        )}
                      </button>
                    </div>
                    {taxSearchResult && (
                      <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                        taxSearchResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        taxSearchResult.type === 'error' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}>
                        {taxSearchResult.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        <span>{taxSearchResult.message}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên công ty đầy đủ HĐ hạ vỏ</label>
                    <input
                      type="text"
                      value={formData.return_invoice_company_name || custObj?.company_full_name || custObj?.customer_name || ''}
                      onChange={e => setFormData({ ...formData, return_invoice_company_name: e.target.value })}
                      placeholder="Tên công ty đầy đủ HĐ hạ vỏ..."
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ công ty HĐ hạ vỏ</label>
                    <textarea
                      rows={2}
                      value={formData.return_invoice_address || custObj?.address || ''}
                      onChange={e => setFormData({ ...formData, return_invoice_address: e.target.value })}
                      placeholder="Địa chỉ trụ sở công ty HĐ hạ vỏ..."
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-700"
                    />
                  </div>
                </div>
              );
            })() : (
              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 text-xs space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Mã số thuế HĐ hạ vỏ</label>
                    <a
                      href={`https://masothue.com/tra-cuu-ma-so-thue-doanh-nghiep?q=${encodeURIComponent(formData.return_invoice_tax_code || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> Tra cứu trên masothue.com ↗
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.return_invoice_tax_code || ''}
                      onChange={e => setFormData({ ...formData, return_invoice_tax_code: e.target.value })}
                      placeholder="VD: 0101234567"
                      className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-900"
                    />
                    <button
                      type="button"
                      onClick={handleLookupTaxCode}
                      disabled={isSearchingTax}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
                    >
                      {isSearchingTax ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang lấy...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          <span>Lấy Dữ Liệu Masothue</span>
                        </>
                      )}
                    </button>
                  </div>
                  {taxSearchResult && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                      taxSearchResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      taxSearchResult.type === 'error' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }`}>
                      {taxSearchResult.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      <span>{taxSearchResult.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên công ty đầy đủ HĐ hạ vỏ</label>
                  <input
                    type="text"
                    value={formData.return_invoice_company_name || ''}
                    onChange={e => setFormData({ ...formData, return_invoice_company_name: e.target.value })}
                    placeholder="Nhập tên công ty xuất hóa đơn hạ vỏ..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ công ty HĐ hạ vỏ</label>
                  <textarea
                    rows={2}
                    value={formData.return_invoice_address || ''}
                    onChange={e => setFormData({ ...formData, return_invoice_address: e.target.value })}
                    placeholder="Nhập địa chỉ trụ sở công ty xuất hóa đơn hạ vỏ..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Doanh thu & Giá gốc (Admin/Staff) */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>5. Quản Lý Giá & Doanh Thu Nội Bộ</span>
              </h4>
              {formData.admin_edited_price && (
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Quản trị viên đã chỉnh sửa (Đã ẩn với Nhân viên)
                </span>
              )}
            </div>

            {currentUser?.role === 'employee' && formData.admin_edited_price ? (
              <div className="p-3 bg-amber-100/80 rounded-xl border border-amber-300 text-xs text-amber-950 font-medium space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Dữ liệu giá đã được Quản trị viên điều chỉnh</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  Thông tin giá gốc và giá bán của chuyến xe này đã được Admin thiết lập chính thức và ẩn sau khi chỉnh sửa đối với tài khoản Nhân viên.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Giá gốc / cont (VNĐ)</label>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Chi phí đầu vào (VD: 3.500.000)"
                      value={formData.base_price ? formatNumberWithDots(formData.base_price) : ''}
                      onChange={e => {
                        const num = parseFormattedNumber(e.target.value);
                        setFormData({ ...formData, base_price: num });
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                    />
                    {formData.base_price ? (
                      <span className="text-[11px] text-amber-800 font-semibold block mt-1">
                        = {formatNumberWithDots(formData.base_price)} VNĐ
                      </span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Giá bán / cont (VNĐ)</label>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Giá thu từ khách hàng (VD: 4.500.000)"
                      value={formData.sale_price ? formatNumberWithDots(formData.sale_price) : ''}
                      onChange={e => {
                        const num = parseFormattedNumber(e.target.value);
                        setFormData({ ...formData, sale_price: num });
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold text-emerald-800 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {formData.sale_price ? (
                      <span className="text-[11px] text-emerald-800 font-semibold block mt-1">
                        = {formatNumberWithDots(formData.sale_price)} VNĐ
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang Lưu Cloud DB...' : 'Lưu Dữ Liệu Chuyến'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Quick Add Catalog Item Sub-Modal with Strict Field Validation */}
      {catalogModal.isOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{catalogModal.title}</h4>
                  <p className="text-[11px] text-slate-500">Yêu cầu nhập đầy đủ các trường thông tin bắt buộc (*)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCatalogModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogModalSubmit} className="space-y-3.5">
              {/* Route Fields */}
              {catalogModal.subTab === 'route' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Tuyến Đường <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Hải Phòng - Hà Nội"
                    value={catalogModal.data.route_name || ''}
                    onChange={e => setCatalogModal(prev => ({
                      ...prev,
                      data: { ...prev.data, route_name: e.target.value },
                      errors: { ...prev.errors, route_name: '' }
                    }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {catalogModal.errors.route_name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.route_name}</p>
                  )}
                </div>
              )}

              {/* Customer Fields */}
              {catalogModal.subTab === 'customer' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Viết Tắt / Tên Khách Hàng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Samsung Electronics"
                      value={catalogModal.data.customer_name || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, customer_name: e.target.value },
                        errors: { ...prev.errors, customer_name: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.customer_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.customer_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mã Số Thuế <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nhập MST (10 hoặc 13 số)..."
                        value={catalogModal.data.tax_code || ''}
                        onChange={e => setCatalogModal(prev => ({
                          ...prev,
                          data: { ...prev.data, tax_code: e.target.value },
                          errors: { ...prev.errors, tax_code: '' }
                        }))}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={catalogModal.isSearchingTax}
                        onClick={() => handleLookupCatalogTaxCode(catalogModal.data.tax_code || '')}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
                      >
                        {catalogModal.isSearchingTax ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Tra Cứu</span>
                      </button>
                    </div>
                    {catalogModal.errors.tax_code && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.tax_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Đầy Đủ Công Ty / Pháp Nhân <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CÔNG TY TNHH..."
                      value={catalogModal.data.company_full_name || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, company_full_name: e.target.value },
                        errors: { ...prev.errors, company_full_name: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.company_full_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.company_full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Địa Chỉ Công Ty (Xuất Hóa Đơn) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Địa chỉ đăng ký kinh doanh..."
                      value={catalogModal.data.address || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, address: e.target.value },
                        errors: { ...prev.errors, address: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.address && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.address}</p>
                    )}
                  </div>
                </>
              )}

              {/* Transporter Fields */}
              {catalogModal.subTab === 'transporter' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Nhà Xe / ĐVVC <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Vận Tải Á Châu"
                      value={catalogModal.data.transporter_name || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, transporter_name: e.target.value },
                        errors: { ...prev.errors, transporter_name: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.transporter_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.transporter_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mã Số Thuế <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nhập MST nhà xe..."
                        value={catalogModal.data.tax_code || ''}
                        onChange={e => setCatalogModal(prev => ({
                          ...prev,
                          data: { ...prev.data, tax_code: e.target.value },
                          errors: { ...prev.errors, tax_code: '' }
                        }))}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={catalogModal.isSearchingTax}
                        onClick={() => handleLookupCatalogTaxCode(catalogModal.data.tax_code || '')}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
                      >
                        {catalogModal.isSearchingTax ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Tra Cứu</span>
                      </button>
                    </div>
                    {catalogModal.errors.tax_code && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.tax_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Đầy Đủ Doanh Nghiệp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CÔNG TY CỔ PHẦN..."
                      value={catalogModal.data.company_full_name || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, company_full_name: e.target.value },
                        errors: { ...prev.errors, company_full_name: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.company_full_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.company_full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Địa Chỉ Nhà Xe <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Địa chỉ trụ sở..."
                      value={catalogModal.data.address || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, address: e.target.value },
                        errors: { ...prev.errors, address: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.address && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.address}</p>
                    )}
                  </div>
                </>
              )}

              {/* Warehouse Fields */}
              {catalogModal.subTab === 'warehouse' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Kho / Xưởng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Kho ICD Đình Vũ"
                      value={catalogModal.data.warehouse_name || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, warehouse_name: e.target.value },
                        errors: { ...prev.errors, warehouse_name: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.warehouse_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.warehouse_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Địa Chỉ / Vị Trí Kho Xưởng <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Địa chỉ cụ thể hoặc link bản đồ vị trí kho..."
                      value={catalogModal.data.location || ''}
                      onChange={e => setCatalogModal(prev => ({
                        ...prev,
                        data: { ...prev.data, location: e.target.value },
                        errors: { ...prev.errors, location: '' }
                      }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {catalogModal.errors.location && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.location}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Người Liên Hệ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Anh Hùng / Chị Mai"
                        value={catalogModal.data.contact_person || ''}
                        onChange={e => setCatalogModal(prev => ({
                          ...prev,
                          data: { ...prev.data, contact_person: e.target.value },
                          errors: { ...prev.errors, contact_person: '' }
                        }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {catalogModal.errors.contact_person && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.contact_person}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số Điện Thoại <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="0901234567"
                        value={catalogModal.data.contact_phone || ''}
                        onChange={e => setCatalogModal(prev => ({
                          ...prev,
                          data: { ...prev.data, contact_phone: e.target.value },
                          errors: { ...prev.errors, contact_phone: '' }
                        }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {catalogModal.errors.contact_phone && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold">{catalogModal.errors.contact_phone}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCatalogModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Vào Danh Mục</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ShipmentOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        mode="single"
        masterData={{ warehouses, transporters, customers, routes }}
        existingRecords={existingRecords}
        onApplyDraft={(draft, metadata) => {
          setFormData(previous => ({
            ...previous,
            ...draft,
            ocr: metadata,
            processing_status: 'draft_review',
          }));
          setContErrorMsg(null);
        }}
      />
    </div>
  );
};
