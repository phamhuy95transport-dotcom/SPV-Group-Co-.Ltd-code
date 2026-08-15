export interface TaxLookupResult {
  taxCode: string;
  companyName: string;
  address: string;
  source?: string;
  found: boolean;
}

// In-memory cache to speed up repeated queries for the same tax code
const taxCache = new Map<string, TaxLookupResult>();

/**
 * Tra cứu thông tin công ty và địa chỉ từ mã số thuế
 * Nguồn dữ liệu ưu tiên: masothue.com / CSDL Doanh nghiệp Việt Nam qua VietQR Business & Thongtindoanhnghiep
 */
export async function lookupTaxCode(rawTaxCode: string): Promise<TaxLookupResult> {
  const cleanCode = (rawTaxCode || '').replace(/\s+/g, '').replace(/[^0-9-]/g, '');
  if (!cleanCode) {
    return { taxCode: '', companyName: '', address: '', found: false };
  }

  if (taxCache.has(cleanCode)) {
    return taxCache.get(cleanCode)!;
  }

  // 1. Try VietQR Business API (Cơ sở dữ liệu Thuế & Doanh nghiệp Quốc Gia)
  try {
    const res = await fetch(`https://api.vietqr.io/v2/business/${cleanCode}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.code === '00' && data.data) {
        const result: TaxLookupResult = {
          taxCode: data.data.taxCode || cleanCode,
          companyName: data.data.name || data.data.shortName || '',
          address: data.data.address || '',
          source: 'masothue.com / CSDL Doanh nghiệp',
          found: true
        };
        taxCache.set(cleanCode, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('VietQR tax lookup error:', err);
  }

  // 2. Try Thongtindoanhnghiep API
  try {
    const res = await fetch(`https://api.thongtindoanhnghiep.co/api/company/${cleanCode}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.Title || data.name)) {
        const result: TaxLookupResult = {
          taxCode: cleanCode,
          companyName: data.Title || data.name || '',
          address: data.Address || data.address || '',
          source: 'masothue.com / CSDL Doanh nghiệp',
          found: true
        };
        taxCache.set(cleanCode, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Thongtindoanhnghiep lookup error:', err);
  }

  // 3. Try server-side proxy endpoint
  try {
    const res = await fetch(`/api/tax-lookup/${cleanCode}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.found && data.companyName) {
        const result: TaxLookupResult = {
          taxCode: cleanCode,
          companyName: data.companyName,
          address: data.address || '',
          source: data.source || 'masothue.com',
          found: true
        };
        taxCache.set(cleanCode, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Server tax-lookup error:', err);
  }

  return {
    taxCode: cleanCode,
    companyName: '',
    address: '',
    found: false
  };
}
