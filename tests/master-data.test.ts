import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findDuplicateGroups,
  mergeMasterAliases,
  normalizeCatalogItem,
  normalizeMasterText,
  resolveMasterValue,
} from '../src/lib/masterData';
import { CustomerItem } from '../src/types';

const customers: CustomerItem[] = [
  {
    id: 'customer_1',
    customer_name: 'Madin Chem',
    company_full_name: 'CÔNG TY TNHH MADIN CHEM',
    tax_code: '0101234567',
    address: 'Hà Nội',
    aliases: ['Madin Chemical'],
  },
  {
    id: 'customer_2',
    customer_name: 'MADIN CHEM',
    tax_code: '0101234567',
    address: 'Hà Nội',
  },
  {
    id: 'customer_3',
    customer_name: 'Madin Chem Hà Nội',
    tax_code: '0101234567',
    address: 'Hà Nội',
  },
];

test('normalizes Vietnamese names without changing the display name', () => {
  assert.equal(normalizeMasterText('  Hòa Hưng Phú  '), 'hoa hung phu');
  const normalized = normalizeCatalogItem('customer', customers[0], '2026-08-31T00:00:00.000Z');
  assert.equal(normalized.customer_name, 'Madin Chem');
  assert.equal(normalized.normalized_name, 'madin chem');
});

test('resolves canonical customer names by aliases and tax code', () => {
  const byAlias = resolveMasterValue('madin chemical', customers, 'customer');
  assert.equal(byAlias.item?.id, 'customer_1');
  assert.equal(byAlias.matchedBy, 'alias');

  const byTaxCode = resolveMasterValue('0101234567', customers.slice(0, 1), 'customer');
  assert.equal(byTaxCode.item?.id, 'customer_1');
  assert.equal(byTaxCode.matchedBy, 'tax_code');
});

test('flags duplicate master records and preserves their spellings as aliases on merge', () => {
  const groups = findDuplicateGroups(customers, 'customer');
  assert.ok(groups.some(group => group.reason === 'same_name'));
  assert.ok(groups.some(group => group.reason === 'same_tax_code'));

  const merged = mergeMasterAliases(customers[0], [customers[1], customers[2]], 'customer');
  assert.ok(merged.aliases?.includes('Madin Chem Hà Nội'));
  assert.ok(merged.aliases?.includes('Madin Chemical'));
});
