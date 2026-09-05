import assert from 'node:assert/strict';
import test from 'node:test';
import type { CustomerItem, ShipmentRecord, TransporterItem } from '../src/types';
import { parseContainerNumbers, validateIso6346Container, validateShipmentDraft } from '../src/lib/shipmentValidation';

const customers: CustomerItem[] = [{
  id: 'customer_1',
  customer_name: 'Madin Chem',
  company_full_name: 'CÔNG TY TNHH MADIN CHEM',
  tax_code: '0101234567',
  address: 'Hà Nội',
  aliases: ['Madin Chemical'],
}];

const transporters: TransporterItem[] = [{
  id: 'transporter_1',
  transporter_name: 'SPV Transport',
  tax_code: '0109999999',
  aliases: ['SPV Trucking'],
}];

const existing: ShipmentRecord = {
  id: 'existing_1',
  date_announced: '2026-08-29',
  delivery_date: '2026-08-30',
  route: 'Hải Phòng - Hà Nội',
  transporter: 'SPV Transport',
  cont_number: 'MSCU1234566',
  customer: 'Madin Chem',
  cont_quantity: 1,
};

test('parses container input and validates ISO 6346 check digits', () => {
  assert.deepEqual(parseContainerNumbers('mscu1234566, MSCU1234566\nTGHU1234567'), ['MSCU1234566', 'TGHU1234567']);
  assert.equal(validateIso6346Container('MSCU1234566').isValid, true);
  assert.equal(validateIso6346Container('MSCU1234567').isValid, false);
});

test('requires human review for invalid dates, aliases, and duplicate containers', () => {
  const result = validateShipmentDraft({
    date_announced: '2026-09-02',
    delivery_date: '2026-09-01',
    route: 'Hải Phòng - Hà Nội',
    transporter: 'SPV Trucking',
    cont_number: 'MSCU1234566',
    customer: 'Madin Chemical',
    cont_quantity: 1,
  }, {
    warehouses: [],
    transporters,
    customers,
    routes: [{ id: 'route_1', route_name: 'Hải Phòng - Hà Nội' }],
  }, [existing]);

  assert.ok(result.issues.some(issue => issue.code === 'delivery_before_announced' && issue.severity === 'error'));
  assert.ok(result.issues.some(issue => issue.code === 'duplicate_container'));
  assert.ok(result.issues.some(issue => issue.code === 'canonical_suggestion' && issue.field === 'customer'));
  assert.ok(result.masterMatches.find(match => match.field === 'transporter')?.canonicalValue === 'SPV Transport');
});
