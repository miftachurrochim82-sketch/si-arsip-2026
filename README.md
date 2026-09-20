# SI-ARSIP 2026 — Sistem Informasi Kearsipan Dinamis
### Klon SRIKANDI skop kantor Satpol PP & Damkar Kab. Trenggalek

Surat masuk/keluar, naskah dinas, disposisi berjenjang, kearsipan & retensi —
berbasis **Google Apps Script**, anggota ekosistem Pemkab Trenggalek.

## 📌 Dependensi ekosistem
| Paket | Versi |
|---|---|
| CoreLib (library GAS) | pin **15** (v2.3.0) |
| Frontend CDN jsDelivr | **@v2.8.1** |
| Blueprint struktur | starter-kit (Index shell + `V_*`/`J_*` modular) |
| Portal SSO & master | si-platform + SIMPEG (referensi read-only) |

Rujukan konsep: SRIKANDI (ANRI), UU 43/2009, PP 28/2012, Permendagri 78/2012, Perka ANRI (JRA).

## 🗂️ Isi repo
- `docs/` — Gate 0: BRD, PRD, FRD, DATABASE, UIUX, API_FLOW, TESTCASE, GAP_LIST, ROADMAP_OUTPUT
- `src/` — sumber GAS: backend `00`…`09` + `99_TestSuite.gs` + `appsscript.json`
  (frontend HTML = rencana v1, lihat amendemen `03_FRD.md` & `05_UIUX.md`)

## 🧪 Test
Di editor GAS jalankan `runAllTestsSIArsip()` (domain + adopsi CoreLib + skema)
dan `runLibraryTests()` (regresi CoreLib v2.3.0).

## 📏 Aturan main
Gate 0: dokumen dulu, kode kemudian; satu baris dok = satu item kode.
CoreLib-first: util generik delegasi, duplikasi hanya untuk logika bisnis.
Kit CDN wajib untuk UI; kolom audit wajib di semua sheet bisnis.
