# 02 — PRD [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-20]

> Modul & user story. Satu modul = satu "kamar" backend/frontend (pola si-kompetensi
> & si-lahar: `V_*.html` per halaman + `J_*.html` per modul logika).
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

## Fitur khas Satpol PP (kandidat fase 2–3)

| # | Fitur | Prioritas |
|---|---|---|
| 1 | **Integrasi SI-LAHAR** — surat tugas → entri e-Kinerja | Fase 3 |
| 2 | **Template Surat Satpol PP** — Surat Tugas Patroli, SPK Penertiban, BA Pemeriksaan | Fase 2 |
| 3 | **Dashboard KPI khas** — surat patroli, penertiban, Damkar | Fase 2 |
| 4 | **Alert Surat Kritis** — highlight kode prioritas | **Fase 1** |
| 5 | **Export Excel format Satpol PP** — laporan bulanan | Fase 2 |

## Luar scope v1

- **TTE (BSrE / internal)** — fase 3.
- **Upload file biner ke Drive** — fase 2 (v1 = link URL).
- **Disposisi multi-level (>2 jenjang)** — fase 2.
- **Naskah Dinas & Template Generator PDF** — fase 2.
- **Multi-kantor** — arsitektur siap, single-tenant dulu.
- **Integrasi SRIKANDI nasional** — fase lanjut.
- **Integrasi SIASN/SRIKANDI KemenPANRB** — fase lanjut.

## Adopsi platform (v1.0.0)

- **CoreLib-First**: dispatcher `CoreLib.dispatchAction` + `actionLevels` fail-closed; hook P1/P2 (gen-id + kunci field verifikasi); filter soft-delete otomatis di `getSheetData_`; `todayIsoLocal()` untuk tanggal WIB.
- **CDN-First**: seluruh UI via `<app-*>`. Tombol aksi pakai `.btn-icon` / `.btn-icon-danger`.
- **Struktur modular**: `V_*.html` per halaman + `J_*.html` per modul logika (pola si-kompetensi & si-lahar).
- **Pin CoreLib 15** + **CDN `@v2.8.1`** + **Vue 3.5.42**.
