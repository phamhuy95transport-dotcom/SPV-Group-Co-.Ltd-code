<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c2752ce1-3381-4f13-b053-f20b998594d9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local`, then set the server-side `GEMINI_API_KEY`
3. Run the app:
   `npm run dev`

## OCR chứng từ vận tải

OCR tạo bản nháp có review, đối chiếu danh mục chuẩn và audit trail. Xem [hướng dẫn triển khai OCR](docs/OCR_DEPLOYMENT.md) trước khi đưa lên production, đặc biệt phần Firebase Auth/Rules và xoay khóa cũ.
