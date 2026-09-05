import {
  CatalogSubTab,
  CustomerItem,
  RouteItem,
  TransporterItem,
  WarehouseItem,
} from '../types';

export type MasterCatalogItem = CustomerItem | TransporterItem | WarehouseItem | RouteItem;

export interface MasterResolution<T extends MasterCatalogItem = MasterCatalogItem> {
  item?: T;
  confidence: number;
  matchedBy: 'exact_name' | 'alias' | 'legal_name' | 'tax_code' | 'similar_name' | 'unmatched';
  alternatives: T[];
}

export interface MasterDuplicateGroup<T extends MasterCatalogItem = MasterCatalogItem> {
  key: string;
  reason: 'same_name' | 'same_tax_code';
  items: T[];
}

const DIACRITICS = /[\u0300-\u036f]/g;

/**
 * Produces a Vietnamese-insensitive identifier that is safe for matching, but is
 * never displayed to the user. The original canonical name remains untouched.
 */
export const normalizeMasterText = (value?: string): string =>
  (value || '')
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeTaxCode = (value?: string): string => (value || '').replace(/\D/g, '');

export const parseAliases = (value?: string | string[]): string[] => {
  const candidates = Array.isArray(value) ? value : (value || '').split(/[\n,;]+/);
  const seen = new Set<string>();

  return candidates.reduce<string[]>((aliases, candidate) => {
    const alias = candidate.trim();
    const normalized = normalizeMasterText(alias);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      aliases.push(alias);
    }
    return aliases;
  }, []);
};

export const getMasterName = (item: MasterCatalogItem, subTab: CatalogSubTab): string => {
  switch (subTab) {
    case 'customer':
      return (item as CustomerItem).customer_name || '';
    case 'transporter':
      return (item as TransporterItem).transporter_name || '';
    case 'warehouse':
      return (item as WarehouseItem).warehouse_name || '';
    case 'route':
      return (item as RouteItem).route_name || '';
  }
};

const getLegalName = (item: MasterCatalogItem): string =>
  'company_full_name' in item ? item.company_full_name || '' : '';

const getTaxCode = (item: MasterCatalogItem): string =>
  'tax_code' in item ? item.tax_code || '' : '';

const scoreNameSimilarity = (left: string, right: string): number => {
  const leftTokens = new Set(normalizeMasterText(left).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeMasterText(right).split(' ').filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;

  let shared = 0;
  leftTokens.forEach(token => {
    if (rightTokens.has(token)) shared += 1;
  });
  return shared / new Set([...leftTokens, ...rightTokens]).size;
};

export const normalizeCatalogItem = <T extends MasterCatalogItem>(
  subTab: CatalogSubTab,
  item: T,
  now = new Date().toISOString(),
): T => {
  const canonicalName = getMasterName(item, subTab).trim();
  const aliases = parseAliases(item.aliases || []).filter(
    alias => normalizeMasterText(alias) !== normalizeMasterText(canonicalName),
  );

  return {
    ...item,
    aliases,
    normalized_name: normalizeMasterText(canonicalName),
    updatedAt: now,
  } as T;
};

/**
 * Resolves a noisy OCR value only when a canonical match is defensible. The
 * caller must leave ambiguous values for human review rather than inventing a
 * new master record.
 */
export const resolveMasterValue = <T extends MasterCatalogItem>(
  value: string | undefined,
  items: T[],
  subTab: CatalogSubTab,
): MasterResolution<T> => {
  const query = normalizeMasterText(value);
  const taxQuery = normalizeTaxCode(value);
  if (!query && !taxQuery) {
    return { confidence: 0, matchedBy: 'unmatched', alternatives: [] };
  }

  const exactName = items.filter(item => normalizeMasterText(getMasterName(item, subTab)) === query);
  if (exactName.length === 1) {
    return { item: exactName[0], confidence: 1, matchedBy: 'exact_name', alternatives: exactName };
  }

  const aliases = items.filter(item => (item.aliases || []).some(alias => normalizeMasterText(alias) === query));
  if (aliases.length === 1) {
    return { item: aliases[0], confidence: 0.98, matchedBy: 'alias', alternatives: aliases };
  }

  const legalName = items.filter(item => normalizeMasterText(getLegalName(item)) === query);
  if (legalName.length === 1) {
    return { item: legalName[0], confidence: 0.96, matchedBy: 'legal_name', alternatives: legalName };
  }

  const taxCode = taxQuery.length >= 10
    ? items.filter(item => normalizeTaxCode(getTaxCode(item)) === taxQuery)
    : [];
  if (taxCode.length === 1) {
    return { item: taxCode[0], confidence: 1, matchedBy: 'tax_code', alternatives: taxCode };
  }

  const scored = items
    .map(item => ({ item, score: Math.max(
      scoreNameSimilarity(value || '', getMasterName(item, subTab)),
      scoreNameSimilarity(value || '', getLegalName(item)),
    ) }))
    .filter(result => result.score >= 0.72)
    .sort((a, b) => b.score - a.score);

  if (scored.length && (scored.length === 1 || scored[0].score - scored[1].score >= 0.12)) {
    return {
      item: scored[0].item,
      confidence: Number(scored[0].score.toFixed(2)),
      matchedBy: 'similar_name',
      alternatives: scored.slice(0, 3).map(result => result.item),
    };
  }

  return {
    confidence: 0,
    matchedBy: 'unmatched',
    alternatives: scored.slice(0, 3).map(result => result.item),
  };
};

export const findDuplicateGroups = <T extends MasterCatalogItem>(
  items: T[],
  subTab: CatalogSubTab,
): MasterDuplicateGroup<T>[] => {
  const groups = new Map<string, MasterDuplicateGroup<T>>();

  const add = (key: string, reason: MasterDuplicateGroup<T>['reason'], item: T) => {
    if (!key) return;
    const groupKey = `${reason}:${key}`;
    const group = groups.get(groupKey) || { key, reason, items: [] };
    group.items.push(item);
    groups.set(groupKey, group);
  };

  items.forEach(item => {
    add(normalizeMasterText(getMasterName(item, subTab)), 'same_name', item);
    const taxCode = normalizeTaxCode(getTaxCode(item));
    if (taxCode.length >= 10) add(taxCode, 'same_tax_code', item);
  });

  return [...groups.values()]
    .filter(group => group.items.length > 1)
    .sort((a, b) => a.reason.localeCompare(b.reason) || a.key.localeCompare(b.key));
};

export const mergeMasterAliases = <T extends MasterCatalogItem>(
  primary: T,
  duplicates: T[],
  subTab: CatalogSubTab,
): T => {
  const aliasCandidates = [
    ...(primary.aliases || []),
    ...duplicates.flatMap(item => [
      getMasterName(item, subTab),
      ...(item.aliases || []),
      getLegalName(item),
    ]),
  ];

  return normalizeCatalogItem(subTab, {
    ...primary,
    aliases: parseAliases(aliasCandidates),
  } as T);
};
