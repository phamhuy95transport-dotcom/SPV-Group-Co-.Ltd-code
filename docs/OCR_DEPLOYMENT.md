# OCR shipment workflow

The OCR feature turns each uploaded PDF/JPG/PNG/WEBP document into a **reviewable shipment draft**. It does not infer internal prices, invoice statuses, or checkboxes, and it never saves a confirmed shipment until a person reviews the form and presses Save.

## What is implemented

1. `POST /api/ocr/extract-shipment` accepts at most 8 documents, 12 MB per document and 30 MB total. It validates MIME type/base64, has a per-instance rate guard, and sends files to Gemini only from the server.
2. `gemini-2.5-flash` returns schema-constrained JSON: the fields shown in the transport form, confidence, short evidence, and warnings.
3. The browser displays the source document next to editable extracted fields. Missing required values block applying a single-document result; batch imports create records marked `OCR chờ duyệt`.
4. Alias-aware master-data resolution suggests canonical customer/transporter/warehouse/route names without silently changing them.
5. Saving a reviewed draft confirms it; audit events record creation, OCR drafts, confirmation, master-data saves, merges, and checkbox changes.

## Deployment configuration

Set these server environment variables in Vercel (or the server that runs `bun run dev`):

```text
GEMINI_API_KEY=...
OCR_GEMINI_MODEL=gemini-2.5-flash
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY={...}  # only if Drive sync is needed
```

The Vercel function is in `api/ocr/extract-shipment.ts`; `vercel.json` allows up to 60 seconds for it. The same endpoint is mounted by `server.ts` during local development.

## Required security follow-up before production

The project’s existing user login and Firebase data access are client-managed. The new endpoint keeps the Gemini key server-side, but IP rate limiting by itself is **not authentication** and is per server instance.

Before putting OCR in front of real users or sensitive documents:

1. Migrate login to Firebase Authentication and verify Firebase ID tokens in the OCR function (or place the endpoint behind an identity-aware gateway).
2. Add Firebase Realtime Database rules that enforce owner/role access on shipments, catalog data, and `audit_events`; UI role checks alone are not enforcement.
3. Enable Firebase App Check, set request-size/WAF controls, and use a shared rate limiter for multi-instance deployment.
4. Restrict Gemini API keys by application and rotate them on a schedule.
5. A legacy Google Drive service-account credential was removed from the current source, but may exist in git history or a prior deployment. Revoke/rotate that credential immediately and, if the repository was public, purge the secret from its history according to your incident process.

## Checks before releasing

```bash
bun run lint
bun test tests/master-data.test.ts tests/shipment-validation.test.ts tests/shipment-ocr-request.test.ts
bun run build
```
