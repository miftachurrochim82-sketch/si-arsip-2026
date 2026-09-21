# AI CONTEXT — SI-ARSIP 2026 v1.9 PIRAMIDA 35/35 TUTUP 🎓 rev2 audit (untuk AI coder lain)

> rev2 2026-09-21 malam-2: backend 20 file .gs syntax OK, frontend 21 html audit (V_Rtl badge invalid→app-badge + formatTanggal→fmtTgl + :style object fixed), docs 01-09 + 2 audit + paket konsisten v1.9, 72 handler, 203/0/1 suite, 35/35 TUTUP.

Ekosistem: Google Apps Script V8 + Google Sheets + Vue 3 via CDN jsDelivr.
- CoreLib library GAS pin **15** (v2.3.0): auth SSO, role guard, CRUD generik,
  util tanggal/paginasi/pencarian (`todayIsoLocal`, `dateKey10`, `paginate`, `matchSearch`).
- Frontend kit **@v2.8.1**: komponen `<app-*>`, `.btn-icon`, `<app-filter-bar>` (span 2..4),
  `AppCore.create/loadLib/exportExcel/exportPDF`. Vue pin 3.5.42.
- Struktur WAJIB pola starter-kit/si-lahar: `Index.html` shell tipis + include SATU tingkat;
  modul view `V_*.html` per halaman (v1.9: 13 view — Dashboard+Laporan+Analisa+Evaluasi+Rtl+Sm+Sk+Nd+Dp+Arsip+Pencarian+Master+Pengaturan); modul logika `J_*.html`; backend `01_ConfigAndBridge`,
  `02_AppLogic` (localHandlers), `03…09` base API + `10_Laporan` + `11_Lampiran` + `12_Notifikasi` + `13_LaporanRekap` + `14_Analisa` + `15_AnalisaLanjut` + `16_Evaluasi` + `17_Rtl`, `99_TestSuite` (203/0/1).
- Piramida final 35/35 TUTUP: Laporan 12/12 (L1-L12) + Analisa 10/10 (A1-A10) + Evaluasi 8/8 (E1-E8) + RTL 5/5 (R1-R5). Sheet `T_RTL` (11 sheet total, prefix rtl-).
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
