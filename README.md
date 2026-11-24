# CertStudio — Personalized Bilingual Certification Study App

Ứng dụng web tĩnh (React + Vite + TailwindCSS v4, sẵn sàng deploy lên GitHub Pages) hỗ trợ tự học chứng chỉ cá nhân hóa song ngữ **EN / EN–VI / VI** dựa trên dữ liệu chuẩn hóa từ `certprep.practica.asia`.

## Chứng chỉ tích hợp sẵn

- `ccar-f` — Claude Certified Architect – Foundations
- `ccar-p` — Claude Certified Architect – Professional
- `cpmai` — PMI Certified Professional in Managing AI (PMI-CPMAI)
- `pmp` — Project Management Professional (PMP)

## Khởi chạy & Phát triển

```bash
npm install
npm run dev
```

Build bản production tĩnh:

```bash
npm run build
```

## Thu thập dữ liệu / Thêm chứng chỉ mới

```bash
npm run scrape
# Hoặc từng chứng chỉ:
npm run scrape -- cpmai pmp
```
