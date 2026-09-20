# AI CONTEXT — SI-ARSIP 2026 (untuk AI coder lain)

Ekosistem: Google Apps Script V8 + Google Sheets + Vue 3 via CDN jsDelivr.
- CoreLib library GAS pin **15** (v2.3.0): auth SSO, role guard, CRUD generik,
  util tanggal/paginasi/pencarian (`todayIsoLocal`, `dateKey10`, `paginate`, `matchSearch`).
- Frontend kit **@v2.8.1**: komponen `<app-*>`, `.btn-icon`, `<app-filter-bar>` (span 2..4),
  `AppCore.create/loadLib/exportExcel/exportPDF`. Vue pin 3.5.42.
- Struktur WAJIB pola starter-kit/si-lahar: `Index.html` shell tipis + include SATU tingkat;
  modul view `V_*.html` per halaman; modul logika `J_*.html`; backend `01_ConfigAndBridge`,
  `02_AppLogic` (localHandlers), `03…09` API per domain, `99_TestSuite`.
- Gate 0: dokumen di `docs/` adalah sumber kebenaran; satu baris dok = satu item kode;
  perubahan skema/fitur = amendemen docs DULU baru kode.
- CoreLib-first: jangan salin badan fungsi CoreLib ke app; wrapper delegasi boleh.
  Helper lokal sah hanya untuk logika bisnis (nomor surat, SLA disposisi, retensi).
- Sheet bisnis wajib kolom audit (created_at…deleted_at) — diisi CoreLib otomatis.
- SIMPEG (pegawai/jabatan/unit) = referensi read-only via MASTER_SPREADSHEET_ID;
  jangan duplikasi nama; reader toleran terhadap variasi kolom.
- Mazhab config/profil/audit mengikuti si-lahar: sheet KONFIGURASI & MAIN_DATA via
  CoreLib, AUDIT_LOGS lokal (putusan C8 belum final — ikuti amendemen terkini).
- Test: `runAllTestsSIArsip()` + `runLibraryTests()`; sebelum salin ke GAS jalankan
  `python3 frontend-cdn/tools/contract_check.py` (exit 0 = aman).
- Lock & write atomik: pakai `00b_LocalHelpers.gs` (kandidat CoreLib C9/C10) sampai promosi.
