# 02 — PRD [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21 v1.9 PIRAMIDA 35/35 TUTUP 🎓]

> Amendemen v1.9 rev2 (2026-09-21): RTL R1-R5 TUTUP puncak (17_RtlApi + V_Rtl). Suite 203/0/1. Piramida final 12+10+8+5=35 TUTUP. Audit backend 20 OK + frontend badge fix.
> Amendemen v1.8: E1-E8 TUTUP. v1.7: A6-A10. v1.6: A3-A5. v1.5: L4/L5/L11/L12 TUTUP (paket hemat). P10 G39 HIDUP via FR-69.

> Modul & user story. Satu modul = satu "kamar" backend/frontend (pola si-kompetensi
> & si-kinerja-harian: `V_*.html` per halaman + `J_*.html` per modul logika).
>
> **Versi awal (v1.0.0)** — MVP: Surat Masuk + Surat Keluar + Disposisi sederhana +
> Master + Dashboard dasar. Fase 2: Naskah Dinas, Kearsipan & Retensi, Pencarian Lintas,
> TTE, Upload Drive, Integrasi SI-LAHAR.
>
> Rujukan: SRIKANDI (ANRI + KemenPANRB), Permendagri 78/2012 (Tata Naskah Dinas),
> Perka ANRI (JRA).

## P1 — Surat Masuk (T_SURAT_MASUK) — MVP
- Story: staf menerima surat fisik/email dari luar → registrasi ke sistem; pimpinan/atasan tahu surat masuk yang perlu ditindaklanjuti.
- AC:
  - Form registrasi: tanggal_terima, nomor_surat, tanggal_surat, asal (instansi/pengirim), perihal, kode_klasifikasi (dari M1), jumlah_lampiran, sifat (biasa/segera/rahasia), lampiran_link (URL opsional), catatan.
  - **Penomoran masuk** auto-generate: `<urut>/<asal_singkat>/<tahun>` (mis. `001/SATPOL/2026`) — bisa override manual.
  - Validasi: nomor_surat wajib, kode_klasifikasi wajib (whitelist dari M1), tanggal_terima wajib WIB.
  - Auto-inject `dicatat_oleh` (email user), `tgl_registrasi` (WIB).
  - **Alert Surat Kritis**: kode klasifikasi `005.1` (UU) & `015` (SPK) ditandai badge khusus.
  - Aksi: disposisi (ke P3), arsipkan (ke P5 fase 2), edit (pemilik/verifikator+), hapus (verifikator+ saja).
  - List: filter tanggal/asal/klasifikasi/sifat; search nomor/perihal/asal; paginasi.
  - Export Excel daftar surat masuk periode.
- Modul backend: `03_SuratMasukApi.gs` (`smGetList_`, `smSave_`, `smDelete_`, `smDisposisi_`).
- Modul frontend: `V_SuratMasuk.html`, modal di `V_Modals.html`.

## P2 — Surat Keluar (T_SURAT_KELUAR) — MVP
- Story: staf membuat draft surat → review → terbitkan dengan nomor resmi; pimpinan menandatangani (TTE di fase lanjut).
- AC:
  - Form: tanggal_surat, tujuan, perihal, kode_klasifikasi (dari M1), jumlah_lampiran, sifat, penandatangan (dari M2 — pilih pejabat), lampiran_link, catatan.
  - **Penomoran keluar** auto-generate: `<kode_klasifikasi>/<urut>/<kode_unit>/<tahun>` (mis. `800/045/SATPOL/2026`) — bisa override manual.
  - **Status workflow**: `draft` → `review` → `terkirim` (final).
  - Validasi: tujuan wajib, perihal wajib, kode_klasifikasi wajib, penandatangan wajib.
  - Auto-archive: saat status `terkirim`, buat baris di `T_ARSIP` (fase 2) dengan retensi dari M1.
  - Aksi: edit (pemilik saat status draft), review (verifikator+), tandai terkirim (admin), hapus (admin hanya saat draft).
  - List: filter tanggal/tujuan/klasifikasi/status; search nomor/perihal/tujuan; paginasi.
  - Export Excel daftar surat keluar periode.
- Modul backend: `04_SuratKeluarApi.gs` (`skGetList_`, `skSave_`, `skDelete_`, `skUbahStatus_`).
- Modul frontend: `V_SuratKeluar.html`, modal di `V_Modals.html`.

## P3 — Disposisi (T_DISPOSISI) — MVP sederhana
- Story: atasan menerima surat masuk → memberikan disposisi ke bawahan; bawahan menindaklanjuti; status terpantau.
- AC:
  - Form disposisi: surat_id (auto dari aksi P1), dari_pejabat (dari M2), ke_pejabat (dari M2), instruksi (singkat), catatan, tgl_disposisi (WIB), jatuh_tempo (opsional).
  - **Alur 1–2 jenjang**: Kasat → Kabid → Kasi; atau Sekretaris → Kasubbag. Serial, bukan paralel.
  - **Status**: `diteruskan` → `diproses` → `selesai`.
  - **SLA alert**: jika jatuh_tempo lewat & status ≠ selesai → badge merah + tampil di dashboard.
  - Aksi: teruskan (verifikator+), tindak lanjut (user), selesaikan (pemilik disposisi atau verifikator+), hapus (admin).
  - List: filter status/dari/ke/tanggal; sort tgl_disposisi desc; paginasi.
  - Tampil di dashboard: jumlah disposisi menunggu + jatuh tempo.
- Modul backend: `05_DisposisiApi.gs` (`dpGetList_`, `dpSave_`, `dpTeruskan_`, `dpSelesaikan_`, `dpDelete_`).
- Modul frontend: `V_Disposisi.html`, modal di `V_Modals.html`.

## P4 — Naskah Dinas (T_NASKAH_DINAS) — Fase 2
- Story: staf membuat nota dinas, memo, atau laporan internal yang tidak termasuk surat masuk/keluar.
- AC:
  - Form: jenis_naskah (`nota_dinas` / `memo` / `laporan` / `lainnya`), nomor, tanggal, perihal, tujuan (unit/pejabat), isi, kode_klasifikasi, lampiran_link.
  - **Penomoran internal** auto-generate sesuai jenis.
  - Status: `draft` → `final` → `terarsip`.
  - Aksi: edit (pemilik saat draft), tandai final (verifikator+), arsipkan (admin).
  - List + filter + search.
- Modul backend: `06_NaskahDinasApi.gs`.
- Modul frontend: `V_NaskahDinas.html`, modal di `V_Modals.html`.

## P5 — Kearsipan & Retensi (T_ARSIP) — Fase 2
- Story: staf mengelola arsip (surat/naskah yang sudah selesai) dan masa retensinya.
- AC:
  - Auto-generate baris arsip saat: surat keluar status `terkirim`, surat masuk status `diselesaikan`, naskah status `final`.
  - Field: arsip_id, jenis_asal (`surat_masuk` / `surat_keluar` / `naskah_dinas`), ref_id (surat/naskah ID), kode_klasifikasi, judul, tgl_arsip (WIB), lokasi_fisik, status_arsip (`aktif` / `inaktif` / `permanen` / `musnah`), tgl_retensi_habis.
  - **Auto-set status & retensi** dari M1 (kode klasifikasi).
  - **Daftar Akan Musnah**: arsip yang `tgl_retensi_habis` ≤ hari ini.
  - **Daftar Permanen**: arsip dengan tindakan akhir = permanen.
  - Aksi: ubah lokasi, tandai musnah (admin, butuh BA), tandai serah (admin).
  - Export Daftar Inventaris Arsip (DIA).
- Modul backend: `07_KearsipanApi.gs`.
- Modul frontend: `V_Kearsipan.html`, modal di `V_Modals.html`.

## P6 — Pencarian Lintas (Search) — Fase 2
- Story: pegawai mencari surat/naskah/arsip dengan cepat lintas kategori.
- AC:
  - Satu search box → hasil dari `T_SURAT_MASUK`, `T_SURAT_KELUAR`, `T_NASKAH_DINAS`, `T_ARSIP`.
  - Filter: jenis (semua/surat masuk/surat keluar/naskah/arsip), tahun, klasifikasi.
  - Sorting: relevansi atau tanggal terbaru.
  - Hasil tampil dengan badge jenis + aksi langsung (buka detail).
- Modul backend: `08_PencarianApi.gs` (`searchAll_`).
- Modul frontend: `V_Pencarian.html` (atau search bar di `V_Dashboard`).

## P7 — Dashboard — Fase 1 (KPI dasar)
- Story: pimpinan & staf memantau ringkasan surat & disposisi.
- AC:
  - 4 kartu KPI: Surat Masuk Bulan Ini, Surat Keluar Bulan Ini, Disposisi Menunggu, Disposisi Lewat Jatuh Tempo.
  - Chart batang: volume surat masuk + keluar per bulan (12 bulan terakhir).
  - Chart doughnut: distribusi surat per kode klasifikasi (top 5).
  - Panel **Surat Kritis** — surat masuk dengan kode `005.1`, `015`, atau sifat `segera`/`rahasia`.
  - Panel **Disposisi Jatuh Tempo** — list teratas.
  - Footer info aplikasi.
- Modul backend: `09_DashboardApi.gs` (`dashRingkas_`, `dashChartTren_`, `dashKlasifikasi_`).
- Modul frontend: `V_Dashboard.html` (pakai `<app-stat-card>`, `<app-chart-bar>`, `<app-chart-doughnut>`).

## P8 — Master (M_KLASIFIKASI, M_PEJAJAB, M_TEMPLATE) — MVP
- Story: admin mengelola master kode klasifikasi ANRI, daftar pejabat (dari SIMPEG), dan template naskah.
- AC:
  - **Tab Klasifikasi**: CRUD kode (format `005.1`, `015`, dst), uraian, retensi_aktif_th, retensi_inaktif_th, tindakan_akhir (`musnah` / `permanen`), status_aktif.
  - **Tab Pejabat**: sinkronisasi dari SIMPEG (pegawai_id + jabatan_id), tambah field lokal: tanda_tangan_url, urutan_hierarki.
  - **Tab Template**: CRUD template (kode_template, nama, jenis_naskah, format_default).
  - Filter + paginasi per tab.
  - Aksi tabel: edit/hapus pakai `.btn-icon` / `.btn-icon-danger`.
- Modul backend: `02_AppLogic.gs` (`masterHandlers_`) + `01_ConfigAndBridge.gs` (skema).
- Modul frontend: `V_Master.html` (3 tab segmented).

## P9 — Pengaturan (KONFIGURASI) — Fase 1
- Story: admin mengelola konfigurasi aplikasi (Script Properties).
- AC:
  - Wrapper `<app-settings>` kit (self-contained).
  - CRUD Script Properties dengan whitelist key (`CoreLib.isAllowedConfigKey`).
  - Default key: `app_title`, `app_version`, `instansi`, `kode_unit_singkat`, `format_nomor_surat`, `sla_disposisi_hari`.
- Modul frontend: `V_Pengaturan.html`.
- Modul backend: `02_AppLogic.gs` (`getConfigList_`, `saveConfigItem_`, `deleteConfigItem_`).

## Fitur khas Satpol PP (peta silang ke GAP_LIST)

| # | Fitur | Fase | Status |
|---|---|---|---|
| 1 | **Integrasi SI-LAHAR** — surat tugas → entri e-Kinerja | 3 | 🔵 G36 ROADMAP |
| 2 | **Template Surat Satpol PP** — Surat Tugas Patroli, SPK Penertiban, BA Pemeriksaan | 3 | 🔵 G37 ROADMAP (master M_TEMPLATE sudah ada sejak v1.1) |
| 3 | **Dashboard KPI khas** — surat patroli, penertiban, Damkar | 3 | 🔵 G38 ROADMAP |
| 4 | **Alert Surat Kritis** — highlight kode prioritas | 1 | ✅ HIDUP (v1.1 `is_kritis`; panel dashboard v1.2) |
| 5 | **Export Excel format Satpol PP** — laporan bulanan | 3 | ✅ HIDUP v1.5 (G39 via FR-69, 7 sheet khas: Format Satpol PP KOP+top5+rekap unit+ttd) |

## Luar scope v1 — status terkini (v1.9 PIRAMIDA 35/35 TUTUP 🎓)

- **TTE (BSrE / internal)** — tetap Fase 3 (G34/G35, ROADMAP).
- **Upload file biner ke Drive** — ✅ SELESAI v1.3 (G28); link manual tetap fallback.
- **Disposisi multi-level (>2 jenjang)** — digeser ke Fase 3 (G44, ROADMAP).
- **Naskah Dinas** — ✅ SELESAI v1.1 (G19/G20). **Template Generator PDF** — kandidat B9 (IDE).
- **Multi-kantor** — arsitektur siap, single-tenant dulu.
- **Integrasi SRIKANDI nasional** — fase lanjut.
- **Integrasi SIASN/SRIKANDI KemenPANRB** — fase lanjut.
- **Laporan (L4/L5/L11/L12)** — ✅ SELESAI v1.5 (FR-66..69, suite 139/0/1, V_Laporan 4 tab).
- **Analisa (A3-A10)** — ✅ SELESAI v1.6-v1.7 (FR-70..77, suite 171/0/1, V_Analisa 8 tab).
- **Evaluasi (E1-E8)** — ✅ SELESAI v1.8 (FR-78..85, suite 187/0/1, V_Evaluasi 8 tab).
- **RTL (R1-R5)** — ✅ SELESAI v1.9 (FR-86..92, suite 203/0/1, V_Rtl generate+CRUD+status).

## P10a — Laporan Rekap v1.5 (KONTRAK BARU, TUTUP)

> Promosi dari ROADMAP_OUTPUT L4/L5/L11/L12 → PRD KONTRAK per v1.5 karena paket hemat + bukti 139/0/1.

- **P10a-L4**: Rekap per Klasifikasi lengkap (FR-66) — tabel full + pct + filter tahun.
- **P10a-L5**: Rekap per Unit (FR-67) — disposisi per unit + keluar per unit via SIMPEG.
- **P10a-L11**: Kepatuhan JRA Tahunan (FR-68) — % patuh + rincian tidak patuh.
- **P10a-L12**: Format Khas Satpol PP (FR-69/G39) — 7 sheet khas.

## P10b — Analisa v1.6-v1.7 (KONTRAK BARU, TUTUP)

> Promosi ROADMAP A3-A10 → PRD KONTRAK per v1.6 (A3-A5) & v1.7 (A6-A10). Suite 161→171/0/1.

- **P10b-A3**: Distribusi per Unit (FR-70) — merge L5 → chart top8 unit.
- **P10b-A4**: Top Pengirim/Penerima (FR-71) — tally asal/tujuan + limit 10.
- **P10b-A5**: Beban per Pejabat (FR-72) — beban + avg_hari_selesai.
- **P10b-A6**: Proyeksi Retensi 5 Tahun (FR-73) — bucket 5th.
- **P10b-A7**: Korelasi Klasifikasi ↔ Unit (FR-74) — units+klas+matrix.
- **P10b-A8**: Rasio TTE (FR-75) — placeholder siap_tte false.
- **P10b-A9**: SLA per Pejabat (FR-76) — sla_per_pejabat + total_lewat.
- **P10b-A10**: Tren Surat Kritis Bulanan (FR-77) — labels 12 + values.

## P10c — Evaluasi v1.8 (KONTRAK BARU, TUTUP)

> Promosi ROADMAP E1-E8 → PRD KONTRAK per v1.8. Suite 187/0/1.

- **P10c-E1**: SLA Disposisi (FR-78) — total/selesai/tepat/lewat + pct_patuh + avg_telat.
- **P10c-E2**: SLA Surat Keluar (FR-79) — sla_hari 3.
- **P10c-E3**: Kelengkapan Metadata (FR-80) — missing array.
- **P10c-E4**: Format Nomor (FR-81) — regex NNN/KODE/YYYY & KODE/NNN/KODE/YYYY.
- **P10c-E5**: JRA per Klasifikasi (FR-82) — reuse L11 + per_klasifikasi.
- **P10c-E6**: Prosedur Pemusnahan (FR-83) — total_musnah/musnah_tanpa_ba/retensi_habis_belum_musnah.
- **P10c-E7**: Kondisi Fisik Arsip (FR-84) — ada_lokasi/tanpa_lokasi + siap_kondisi_fisik false placeholder.
- **P10c-E8**: Alih Media (FR-85) — total_dokumen/sudah_digital/belum_digital + per_jenis.

## P10d — RTL R1-R5 v1.9 PUNCAK (KONTRAK BARU, TUTUP 🎓)

> Promosi ROADMAP R1-R5 → PRD KONTRAK per v1.9. Suite 203/0/1. Piramida final 35/35 TUTUP.

- **P10d-R1**: Rencana Pemusnahan Arsip (FR-86/87) — dari E6 retensi_habis_belum_musnah + musnah_tanpa_BA → BA Pemusnahan. Generate `R1 Pemusnahan Arsip YYYY — N arsip`.
- **P10d-R2**: Rencana Penyerahan Permanen (FR-88) — dari E5 permanen count → BA Serah. Generate `R2 Penyerahan Permanen YYYY — N arsip`.
- **P10d-R3**: Rencana Alih Media Prioritas (FR-89) — dari E8 belum_digital → Anggaran alih media. Generate `R3 Alih Media YYYY — N dokumen`.
- **P10d-R4**: Rencana Restorasi Arsip Rusak (FR-90) — dari E7 tanpa_lokasi (proxy kondisi_fisik) → Anggaran restorasi. Generate `R4 Restorasi YYYY — N arsip`.
- **P10d-R5**: Rencana Pelatihan Pengguna (FR-91/92) — dari E3 tidak_lengkap + A9 total_lewat → Peningkatan adopsi. Generate `R5 Pelatihan YYYY — N dokumen` + `R5b Pembinaan SLA YYYY — N lewat`.

## Adopsi platform (v1.0.0)

- **CoreLib-First**: dispatcher `CoreLib.dispatchAction` + `actionLevels` fail-closed; hook P1/P2 (gen-id + kunci field verifikasi); filter soft-delete otomatis di `getSheetData_`; `todayIsoLocal()` untuk tanggal WIB.
- **CDN-First**: seluruh UI via `<app-*>`. Tombol aksi pakai `.btn-icon` / `.btn-icon-danger`.
- **Struktur modular**: `V_*.html` per halaman + `J_*.html` per modul logika (pola si-kompetensi & si-kinerja-harian).
- **Pin CoreLib 17** + **CDN `@v2.9.1 (1 CSS+9 JS)`** + **Vue 3.5.42**.

## P10 — Roadmap Fase 3 (OPSIONAL — status ROADMAP, BELUM KONTRAK)

> Tangga status PRD: **KONTRAK** (P1–P9, semua TUTUP per v1.4) → **ROADMAP**
> (P10) → **IDE** (P11). Item naik jadi kontrak kode hanya lewat keputusan
> pemilik: masukkan ke sini sebagai komitmen, lalu beri nomor FR di FRD
> (satu baris dok = satu item kode). Tanpa itu, ia tetap parkir di GAP_LIST.

| G | Item | Story satu baris | Pemicu promosi |
|---|---|---|---|
| G34 | TTE BSrE | Pejabat menandatangani surat keluar secara elektronik tersertifikasi | Kewajiban/ksediaan BSrE |
| G35 | TTE internal | Alternatif tanda tangan kriptografi lokal tanpa pihak ketiga | BSrE tak tersedia |
| G36 | Integrasi SI-LAHAR | Surat tugas terbit → entri e-Kinerja Harian otomatis | Data surat tugas stabil |
| G37 | Template Surat Satpol PP | Surat Tugas Patroli/SPK/BA lahir dari template M3 | Kebutuhan operasional |
| G38 | Dashboard KPI khas | Pimpinan melihat patroli/penertiban/Damkar | Multi-data operasional |
| G39 | Export format Satpol PP | Laporan bulanan format internal satuan | Permintaan pimpinan |
| G40 | Multi-kantor | Satu deploy, banyak kantor, data terpisah | Organisasi melebar |
| G41 | Integrasi SRIKANDI (ANRI) | Arsip tersambung registrasi nasional | Kewajiban ANRI |
| G42 | Integrasi SIASN | Data pegawai otomatis dari KemenPANRB | Kebutuhan kepegawaian |
| G43 | Pencarian suara | Cari arsip dengan ucapan | Eksperimental |
| G44 | Disposisi multi-level | Rantai disposisi >2 jenjang paralel | Alur nyata bertingkat |
| G45 | Role kustom | Arsiparis fungsional dengan hak khusus | Tim bertambah |

## P11 — Kandidat ide (status IDE — BELUM MASUK KONTRAK)

| B | Kandidat | Manfaat | Pemicu |
|---|---|---|---|
| B1 | Tanda tangan digital scan (upload scan ttd) | Jembatan antara manual & BSrE | Admin butuh verifikasi visual |
| B2 | Auto-ingest email surat masuk | Hemat langkah registrasi | Email kantor terstruktur |
| B3 | QR code surat keluar | Verifikasi asli/palsu cepat | Butuh verifikasi publik |
| B4 | Enrich penandatangan dari SIMPEG | Pilih pejabat dari jabatan aktif | Sudah mungkin (M2) — murah dipromosikan |
| B5 | Dashboard per-unit | Pimpinan unit memantau sendiri | Multi-kantor aktif |
| B6 | Rekap bulanan PDF otomatis | Hemat kerja staf | Data stabil |
| B7 | Export format SRIKANDI | Submit ke ANRI | Ada kewajiban |
| B8 | Filter multi-tag | Analisa fleksibel | Kebutuhan analisa |
| B9 | Template generator PDF | Form → PDF surat | Volume surat naik |
