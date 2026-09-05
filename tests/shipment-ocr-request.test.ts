import assert from 'node:assert/strict';
import test from 'node:test';
import { OcrRequestError, validateOcrDocuments } from '../server/shipmentOcr';

test('accepts bounded base64 documents and rejects malformed client payloads', () => {
  const documents = validateOcrDocuments([{
    name: 'booking.pdf',
    mimeType: 'application/pdf',
    size: 5,
    data: 'aGVsbG8=',
  }]);
  assert.equal(documents[0].name, 'booking.pdf');
  assert.equal(documents[0].size, 5);

  assert.throws(
    () => validateOcrDocuments([{ name: 'bad.pdf', mimeType: 'application/pdf', size: 1, data: 'data:application/pdf;base64,aA==' }]),
    (error: unknown) => error instanceof OcrRequestError && error.status === 400,
  );
});
