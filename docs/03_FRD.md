# 03 — FRD [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21 v1.9 PIRAMIDA 35/35 TUTUP 🎓]

> Amendemen v1.9 rev2 (2026-09-21): FR-86..92 RTL R1-R5 TUTUP, 92 FR total, 72 handler, 20 file .gs, 203/0/1 suite, audit backend+frontend OK. Piramida final 12+10+8+5=35.
> Aturan Gate 0: **satu baris FR = satu item kode** (handler/fungsi/komponen/kolom).
> Build tidak boleh mendahului baris di dokumen ini.
>
> Rujukan: Permendagri 78/2012, Perka ANRI tentang JRA, SRIKANDI.

## Master (M1–M3)

- **FR-01** CRUD `M_KLASIFIKASI` (admin): kode_klasifikasi (unik, format `NNN.N`), uraian, retensi_aktif_th (numerik ≥0), retensi_inaktif_th (numerik ≥0), tindakan_akhir ∈ {musnah, permanen}, status_aktif.
  - Backend: `masterKlasifikasiList_` / `masterKlasifikasiSave_` / `masterKlasifikasiDelete_` (`02_AppLogic.gs`).

- **FR-02** CRUD `M_PEJAJAB` (admin): pegawai_id (dari SIMPEG, wajib), jabatan_id, urutan_hierarki (numerik), tanda_tangan_url (opsional). Sinkronisasi dari SIMPEG via `getSimpegLookup_()`.
  - Backend: `masterPejabatList_` / `masterPejabatSave_` / `masterPejabatDelete_` (`02_AppLogic.gs`).

- **FR-03** CRUD `M_TEMPLATE` (admin): kode_template (unik), nama_template, jenis_naskah ∈ {surat_masuk, surat_keluar, nota_dinas, memo, laporan, lainnya}, format_default (text).
  - Backend: `masterTemplateList_` / `masterTemplateSave_` / `masterTemplateDelete_` (`02_AppLogic.gs`).

- **FR-04** Whitelist `tindakan_akhir` ∈ {musnah, permanen}; whitelist `jenis_naskah` di M3.
  - Backend: `KLASIFIKASI_TINDAKAN_AKHIR_`, `TEMPLATE_JENIS_NASKAH_` (`02_AppLogic.gs`).

## Surat Masuk (T_SURAT_MASUK)

- **FR-05** Simpan surat masuk (user+): tanggal_terima (WIB, wajib), nomor_surat (wajib), tanggal_surat, asal (wajib), perihal (wajib), kode_klasifikasi (whitelist dari M1, wajib), jumlah_lampiran (numerik ≥0), sifat ∈ {biasa, segera, rahasia}, lampiran_link (URL, opsional), catatan.
  - Backend: `smSave_` (`03_SuratMasukApi.gs`).

- **FR-06** Auto-generate `nomor_agenda_masuk` (internal, terpisah dari nomor_surat): format `<urut:3>/<kode_unit_singkat>/<tahun>` (mis. `001/SATPOL/2026`). Bisa override manual via param `override_agenda`.
  - Backend: `smGenerateNomorAgenda_` + `CoreLib.genUniqueCode('SM-', 'T_SURAT_MASUK', 'nomor_agenda_masuk', 3, ...)` (`03_SuratMasukApi.gs`).

- **FR-07** Auto-inject `dicatat_oleh` (email user), `tgl_registrasi` (`CoreLib.todayIsoLocal()`), `status_surat` = `baru` saat insert baru.
  - Backend: `smSave_` (`03_SuratMasukApi.gs`).

- **FR-08** Validasi duplikat: (nomor_surat + asal + tahun) tidak boleh sama. Cek saat insert baru.
  - Backend: `smSave_` (`03_SuratMasukApi.gs`).

- **FR-09** List surat masuk: filter `tanggal_dari`, `tanggal_sampai`, `asal`, `kode_klasifikasi`, `sifat`, `status_surat`; search `nomor_surat` / `perihal` / `asal`; sort `tanggal_terima` desc; paginasi.
  - Backend: `smGetList_` (`03_SuratMasukApi.gs`).

- **FR-10** Detail surat masuk: get by ID + daftar disposisi terkait (nested dari `T_DISPOSISI` by `surat_id`).
  - Backend: `smGetDetail_` (`03_SuratMasukApi.gs`).

- **FR-11** Delete surat masuk (soft): hanya verifikator+; tolak jika masih ada disposisi berstatus ≠ selesai.
  - Backend: `smDelete_` (`03_SuratMasukApi.gs`).

- **FR-12** Alert Surat Kritis: kode_klasifikasi `005.1` / `015` atau `sifat` ∈ {segera, rahasia} → tandai flag `is_kritis` di response list.
  - Backend: `smGetList_` (`03_SuratMasukApi.gs`).
  - Frontend: badge khusus di `V_SuratMasuk.html`.

## Surat Keluar (T_SURAT_KELUAR)

- **FR-13** Simpan surat keluar (user+): tanggal_surat (wajib), tujuan (wajib), perihal (wajib), kode_klasifikasi (whitelist dari M1, wajib), jumlah_lampiran, sifat, penandatangan_id (dari M2, wajib), lampiran_link, catatan.
  - Backend: `skSave_` (`04_SuratKeluarApi.gs`).

- **FR-14** Auto-generate `nomor_surat` keluar: format `<kode_klasifikasi>/<urut:3>/<kode_unit_singkat>/<tahun>` (mis. `800/045/SATPOL/2026`). Bisa override manual via param `override_nomor`.
  - Backend: `skGenerateNomor_` + `CoreLib.genUniqueCode('SK-', 'T_SURAT_KELUAR', 'nomor_surat', 3, ...)` (`04_SuratKeluarApi.gs`).

- **FR-15** Status workflow: `draft` → `review` → `terkirim`. Insert baru = `draft`.
  - Backend: `skSave_` + `skUbahStatus_` (`04_SuratKeluarApi.gs`).

- **FR-16** Validasi transisi status: `draft → review` (pemilik atau verifikator+), `review → terkirim` (admin), `draft → terkirim` (admin langsung, bypass review).
  - Backend: `skUbahStatus_` (`04_SuratKeluarApi.gs`).

- **FR-17** Auto-archive saat status `terkirim`: buat baris di `T_ARSIP` (FR-27) dengan retensi dari M1. Idempoten (skip jika `ref_id` sudah ada di arsip).
  - Backend: `skUbahStatus_` (`04_SuratKeluarApi.gs`).

- **FR-18** Auto-inject `dibuat_oleh`, `tgl_dibuat` (WIB), `tgl_terkirim` (WIB saat status terkirim).
  - Backend: `skSave_` + `skUbahStatus_` (`04_SuratKeluarApi.gs`).

- **FR-19** List surat keluar: filter `tanggal_dari`, `tanggal_sampai`, `tujuan`, `kode_klasifikasi`, `status_surat`; search `nomor_surat` / `perihal` / `tujuan`; sort `tanggal_surat` desc; paginasi.
  - Backend: `skGetList_` (`04_SuratKeluarApi.gs`).

- **FR-20** Delete surat keluar (soft): admin; hanya boleh saat status `draft`.
  - Backend: `skDelete_` (`04_SuratKeluarApi.gs`).

## Disposisi (T_DISPOSISI)

- **FR-21** Simpan disposisi (verifikator+): surat_id (dari T_SURAT_MASUK, wajib), dari_pejabat_id (dari M2), ke_pejabat_id (dari M2, wajib), instruksi (wajib), catatan, jatuh_tempo (opsional).
  - Backend: `dpSave_` (`05_DisposisiApi.gs`).

- **FR-22** Auto-inject `tgl_disposisi` (`CoreLib.todayIsoLocal()`), `status_disposisi` = `diteruskan`.
  - Backend: `dpSave_` (`05_DisposisiApi.gs`).

- **FR-23** Transisi status disposisi: `diteruskan → diproses` (user ke_pejabat), `diproses → selesai` (pemilik atau verifikator+).
  - Backend: `dpTeruskan_` + `dpSelesaikan_` (`05_DisposisiApi.gs`).

- **FR-24** Update status surat masuk terkait: saat disposisi pertama dibuat → `status_surat` = `didiposisi`; saat semua disposisi selesai → `selesai`.
  - Backend: `dpSave_` + `dpSelesaikan_` (`05_DisposisiApi.gs`).

- **FR-25** SLA alert: jika `jatuh_tempo` < hari ini (WIB) dan `status_disposisi` ≠ `selesai` → flag `is_lewat_sla` = true di response list.
  - Backend: `dpGetList_` (`05_DisposisiApi.gs`).
  - Frontend: badge merah di `V_Disposisi.html` + panel di `V_Dashboard.html`.

- **FR-26** List disposisi: filter `status_disposisi`, `dari_pejabat_id`, `ke_pejabat_id`, `tanggal_dari`, `tanggal_sampai`; sort `tgl_disposisi` desc; paginasi.
  - Backend: `dpGetList_` (`05_DisposisiApi.gs`).

- **FR-27** Delete disposisi (soft): admin; tolak jika sudah `selesai`.
  - Backend: `dpDelete_` (`05_DisposisiApi.gs`).

## Kearsipan & Retensi (T_ARSIP) — Fase 2

- **FR-28** Auto-generate baris arsip saat: surat keluar status `terkirim`, surat masuk status `selesai`, naskah dinas status `final`. Idempoten by `ref_id` + `jenis_asal`.
  - Backend: `arAutoArchive_` (`07_KearsipanApi.gs`).

- **FR-29** Field arsip: arsip_id, jenis_asal ∈ {surat_masuk, surat_keluar, naskah_dinas}, ref_id, kode_klasifikasi, judul, tgl_arsip, lokasi_fisik, status_arsip ∈ {aktif, inaktif, permanen, musnah}, tgl_retensi_habis.
  - Backend: `arAutoArchive_` (`07_KearsipanApi.gs`).

- **FR-30** Auto-set `status_arsip` & `tgl_retensi_habis` dari M1: `tgl_retensi_habis` = tgl_arsip + retensi_aktif_th + retensi_inaktif_th; `status_arsip` = `permanen` jika tindakan_akhir = permanen, else `aktif`.
  - Backend: `arAutoArchive_` (`07_KearsipanApi.gs`).

- **FR-31** List arsip: filter `jenis_asal`, `kode_klasifikasi`, `status_arsip`, `tahun`; search `judul` / `kode_klasifikasi`; paginasi.
  - Backend: `arGetList_` (`07_KearsipanApi.gs`).

- **FR-32** Daftar Akan Musnah: arsip `status_arsip ∈ {aktif, inaktif}` dengan `tgl_retensi_habis` ≤ hari ini.
  - Backend: `arGetAkanMusnah_` (`07_KearsipanApi.gs`).

- **FR-33** Aksi ubah lokasi arsip (user+), tandai musnah & tandai serah (admin, dengan catatan/BA).
  - Backend: `arUbahLokasi_` + `arTandaiMusnah_` + `arTandaiSerah_` (`07_KearsipanApi.gs`).

## Pencarian Lintas (Fase 2)

- **FR-34** `searchAll_`: search lintas `T_SURAT_MASUK`, `T_SURAT_KELUAR`, `T_NASKAH_DINAS`, `T_ARSIP` dengan `CoreLib.matchSearch` pada field relevan. Filter jenis, tahun, kode_klasifikasi. Sort by tanggal desc. Limit 50.
  - Backend: `searchAll_` (`08_PencarianApi.gs`).

## Dashboard

- **FR-35** `dashRingkas_`: 4 KPI — surat masuk bulan ini, surat keluar bulan ini, disposisi menunggu, disposisi lewat SLA. Filter periode bulan (default bulan berjalan WIB).
  - Backend: `dashRingkas_` (`09_DashboardApi.gs`).

- **FR-36** `dashChartTren_`: volume surat masuk + keluar per bulan, 12 bulan terakhir (termasuk bulan berjalan). Return 2 dataset.
- **FR-36b** (amendemen v1.2, 2026-09-20): `dashChartDisposisi_` — chart ke-4: distribusi status disposisi (diteruskan/diproses/selesai) untuk doughnut dashboard.
  - Backend: `dashChartTren_` (`09_DashboardApi.gs`).
  - Frontend: `<app-chart-bar>` di `V_Dashboard.html`.

- **FR-37** `dashKlasifikasi_`: distribusi surat per kode klasifikasi (top 5), dari `T_SURAT_MASUK` + `T_SURAT_KELUAR`.
  - Backend: `dashKlasifikasi_` (`09_DashboardApi.gs`).
  - Frontend: `<app-chart-doughnut>` di `V_Dashboard.html`.

- **FR-38** Panel **Surat Kritis**: 10 surat masuk terbaru dengan `is_kritis` = true.
  - Backend: `dashSuratKritis_` (`09_DashboardApi.gs`).

- **FR-39** Panel **Disposisi Jatuh Tempo**: 10 disposisi dengan `is_lewat_sla` = true, urut jatuh_tempo asc.
  - Backend: `dashDisposisiLewatSla_` (`09_DashboardApi.gs`).

## Konfigurasi (Script Properties)

- **FR-40** `getConfigList_` / `saveConfigItem_` / `deleteConfigItem_`: whitelist key via `CoreLib.isAllowedConfigKey(key, ['ADMIN_EMAILS','VERIFIKATOR_EMAILS'])`.
  - Backend: `02_AppLogic.gs`.

- **FR-41** Default config: `app_title`, `app_version`, `instansi`, `kode_unit_singkat` (`SATPOL`), `format_nomor_surat`, `sla_disposisi_hari` (`2`).
  - Backend: `getConfigList_` (`02_AppLogic.gs`).

## Kepatuhan CoreLib-First (v1.0.0)

- **FR-42** Delegasi penuh ke CoreLib: `normId`, `normStr`, `parseDate`, `whitelist`, `genUniqueCode`, `requireRole`, `checkRole`, `todayIsoLocal`, `dateKey10`, `paginate`, `matchSearch`, `dispatchAction`, `getDb`, `ensureSheet`, `initDatabase`, `executeAppSetup`. **Dilarang** menduplikasi di app.
  - Backend: seluruh `.gs`.

- **FR-43** Dispatcher `CoreLib.dispatchAction(payload, cfg)`; `cfg = getAppConfig_()` + `buildLocalHandlers_()`.
  - Backend: `handleAction` (`02_AppLogic.gs`), `getAppConfig_` (`01_ConfigAndBridge.gs`).

- **FR-44** `actionLevels` fail-closed: semua aksi didaftarkan eksplisit (viewer / user / verifikator / admin / super). Aksi tak dikenal = ditolak di gerbang auth.
  - Backend: `getAppConfig_().actionLevels` (`01_ConfigAndBridge.gs`).

- **FR-45** `localPreSaveHook_` (P1): generate id kosong (prefix per-sheet: `ref`, `pjb`, `tpl`, `sm`, `sk`, `nd`, `dp`, `ar`, `lmp`, `log`).
  - Backend: `localPreSaveHook_` (`01_ConfigAndBridge.gs`).

- **FR-46** Filter soft-delete otomatis di `getSheetData_` (parameter `{includeDeleted: true}` untuk audit).
  - Backend: `getSheetData_` (`01_ConfigAndBridge.gs`).

- **FR-47** SSO native CoreLib (`CoreLib.exchangePlatformTicket`, `CoreLib.checkAuth`, `CoreLib.logoutUser`) — tanpa fallback email aktif.
  - Backend: via `CoreLib.dispatchAction`.

## Kepatuhan CDN-First (v1.0.0)

- **FR-48** Seluruh UI pakai kit CDN `@v2.9.1 (1 CSS+9 JS)`: `<app-badge>`, `<app-modal>`, `<app-crud-table>`, `<app-filter-bar>`, `<app-stat-card>`, `<app-chart-bar>` / `<app-chart-doughnut>`, `<app-pegawai-picker>`, `<app-empty-state>`, `<app-skeleton>`, `<app-login>`, `<app-sidebar>`, `<app-header>`, `<app-settings>`.
  - Frontend: seluruh `V_*.html`.

- **FR-49** Tombol aksi tabel pakai `.btn-icon` / `.btn-icon-danger` (kit CDN v2.9.1/F2).
  - Frontend: seluruh tabel.

- **FR-50** Paginasi client-side pakai `AppCore.paginate` + `AppCore.pageCount`.
  - Frontend: computed di `J_State.html`.

- **FR-51** Library berat (chart, xlsx, jspdf) dimuat on-demand via `AppCore.loadLib()` — **tidak** dimuat di `<head>` `Index.html`.
  - Frontend: `J_Export.html` + `V_Dashboard.html`.

- **FR-52** Boot dark-mode pakai kunci `siarsip_dark` (baca ter-guard try/catch di `Index.html`).
  - Frontend: `Index.html`.

- **FR-53** Include wajib satu tingkat dari `Index.html`: `V_Modals` → `V_Dashboard` → `V_SuratMasuk` → `V_SuratKeluar` → `V_Disposisi` → `V_Master` → `V_Pengaturan`; `J_State` → `J_Helpers` → `J_Api` → `J_Actions` → `J_Export` → `J_App`.

## Test (target v1.0.0)

- **FR-54** `runLibraryTests()` — regression CoreLib pin 17 (target PASS 42 / FAIL 0 / SKIP 1).
  - Backend: `99_TestSuite.gs`.

- **FR-55** `testAdopsiG18d()` — verifikasi util CoreLib v2.4.0 (target 13/13).
  - Backend: `99_TestSuite.gs`.

- **FR-56** `testDispatcherRouting()` — registry handler + fail-closed (target ≥20/0).
  - Backend: `99_TestSuite.gs`.

- **FR-57** `runDomainTestsSIArsip()` — domain FIX MVP (surat masuk/keluar/disposisi + SIMPEG RO + hook) — target ≥15/0.
- **FR-58** Logbook T7 otomatis: SETIAP aksi dokumen (simpan/ubah/hapus/ubah_status/
  upload_lampiran/arsip) menulis baris `T_LOGBOOK` via `catatLogbook_` (00b);
  gagal menulis logbook ≠ aksi gagal. AUDIT_LOGS tetap untuk audit sistem.
- **FR-59** Export Excel multi-sheet laporan bulanan (`laporan_export_excel`, level user):
  workbook 4 sheet (Ringkasan, Surat Masuk, Surat Keluar, Disposisi) difilter periode
  YYYY-MM; file xlsx disimpan ke folder Drive 'SI-ARSIP Export', URL dikembalikan.
- **FR-60** Upload lampiran biner ke Drive (`lmp_upload`, level user): base64 ≤ 5 MB,
  mime whitelist; file ke folder 'SI-ARSIP Lampiran', baris `T_LAMPIRAN`
  (jenis_bukti=file_drive) + logbook; field link manual tetap sebagai fallback.
- **FR-61** Modal Detail Dokumen (sm/sk/nd): ringkasan field + daftar lampiran dengan
  **preview inline** (iframe; link Drive otomatis dikonversi ke mode `/preview`).
- **FR-62** Timeline disposisi bertingkat di modal detail: node berwarna per status
  (amber=diteruskan, sky=diproses, emerald=selesai), tingkat 1..n, dari→ke, tenggat.
- **FR-63** Notifikasi in-app: lonceng di slot `extra-actions` app-header + badge unread;
  item = disposisi baru untuk penerima & SLA lewat (penerima + pengawas), umur ≤14 hari;
  marker baca per-email di Script Properties (`NOTIF_READ_<email>`).
- **FR-64** Quick action dropdown (⋮) di tabel surat masuk & surat keluar:
  Detail & Lampiran / Ubah / transisi status / Disposisikan / Hapus.
- **FR-65** Preset rentang tanggal (Bulan ini / Bulan lalu / 90 hari / Tahun ini / Semua)
  di filter bar surat masuk, surat keluar, disposisi; mengisi tanggal_dari/sampai.
- **FR-66** (v1.5 L4) Rekap per Klasifikasi lengkap: `lap_rekap_klasifikasi` (viewer) —
  params `{tahun?: YYYY, search?}` → `{rekap: [{kode_klasifikasi, uraian, jml_masuk, jml_keluar, total, pct}], total_masuk, total_keluar, total_all}`; tally dari `T_SURAT_MASUK` + `T_SURAT_KELUAR` group by `kode_klasifikasi`; uraian dari `M_KLASIFIKASI`; sort total desc; filter tahun via `dateKey10`.
  - Backend: `lapRekapKlasifikasi_` (`13_LaporanRekapApi.gs`).
  - Frontend: tab Klasifikasi di `V_Laporan.html`.
- **FR-67** (v1.5 L5) Rekap per Unit kerja: `lap_rekap_unit` (viewer) — params `{tahun?: YYYY}` →
  `{disposisi_per_unit: [{unit_id, nama_unit, jumlah, pct}], keluar_per_unit: [...], total_disposisi, total_keluar}`; map `M_PEJABAT → PEGAWAI → UNIT_KERJA` via `_lapPejabatUnitMap_`; tally disposisi by `ke_pejabat_id` + surat keluar by `penandatangan_id`.
  - Backend: `lapRekapUnit_` (`13_LaporanRekapApi.gs`).
  - Frontend: tab Per Unit di `V_Laporan.html`.
- **FR-68** (v1.5 L11) Laporan Kepatuhan JRA Tahunan: `lap_kepatuhan_jra` (viewer) — params `{tahun?: YYYY}` →
  `{total, patuh, tidak_patuh, pct_patuh, rincian_tidak_patuh: [{id,judul,kode,tgl_arsip,tgl_retensi_habis,status_arsip,tindakan_akhir,alasan}]}`; hitung expected retensi via `arHitungRetensiHabis_` + cek `tindakan_akhir` vs `status_arsip` (permanen≠musnah); list tidak patuh max 100.
  - Backend: `lapKepatuhanJra_` (`13_LaporanRekapApi.gs`).
  - Frontend: tab Kepatuhan JRA di `V_Laporan.html` (4 stat-card + tabel tidak patuh).
- **FR-69** (v1.5 L12) Laporan Bulanan Format Khas Satpol PP: `laporan_export_khas` (user) — params `{ym: YYYY-MM}` →
  workbook 7 sheet: Format Satpol PP (cover KOP instansi + periode + ringkasan + top-5 klasifikasi bulan + rekap unit 10 + ttd), Ringkasan, Surat Masuk, Surat Keluar, Disposisi, Rekap Klasifikasi (full tahun), Rekap Unit (disposisi+keluar); reuse `laporanBulanData_` + `lapRekapKlasifikasi_`/`lapRekapUnit_`; file xlsx di folder Drive 'SI-ARSIP Export' via UrlFetch export + OAuth; temp spreadsheet di-trash.
  - Backend: `laporanKhasData_` + `exportKhasBulanan_` (`10_LaporanApi.gs`).
  - Frontend: tab Bulanan Khas di `V_Laporan.html` + export di Dashboard tetap hidup.
  - Backend: `99_TestSuite.gs`.

- **FR-70** (v1.6 A3) Analisa Distribusi per Unit: `analisa_distribusi_unit` (viewer) — `{tahun?}` → `{distribusi:[{unit_id,nama_unit,jumlah,pct}], total_all, chart:{labels,values}}`; tally disposisi by ke_pejabat_id → unit via SIMPEG map.
- **FR-71** (v1.6 A4) Analisa Top Pengirim/Penerima: `analisa_top_pengirim` (viewer) — `{tahun?, limit?:10}` → `{pengirim_top:[{asal,jumlah,pct}], penerima_top:[{tujuan,jumlah,pct}], total_masuk, total_keluar}`.
- **FR-72** (v1.6 A5) Analisa Beban per Pejabat: `analisa_beban_pejabat` (viewer) — `{tahun?}` → `{beban:[{pejabat_id,nama_pejabat,nama_unit,total,selesai,lewat,avg_hari_selesai,pct_selesai}], total_disposisi}`.
- **FR-73** (v1.7 A6) Proyeksi Retensi 5 Tahun: `analisa_retensi_5th` (viewer) — `{tahun_mulai?}` → `{proyeksi:[{tahun,akan_musnah,permanen,aktif,total}], total_5th, chart}`; hitung tgl_retensi_habis ≤ tahun proyeksi.
- **FR-74** (v1.7 A7) Korelasi Klasifikasi ↔ Unit: `analisa_klasifikasi_unit` (viewer) — `{tahun?, top_klas?:5, top_unit?:8}` → `{units:[], klasifikasis:[], matrix:number[][], total}`; matrix[i][j]=count disposisi unit i + klas j.
- **FR-75** (v1.7 A8) Rasio TTE: `analisa_tte_ratio` (viewer) — `{tahun?}` → `{total,tte,pct_tte,siap_tte}`; placeholder 0% (G34/G35 backlog).
- **FR-76** (v1.7 A9) SLA per Pejabat: `analisa_sla_per_pejabat` (viewer) — `{tahun?}` → `{sla_per_pejabat:[{pejabat_id,nama_pejabat,total,lewat,pct_lewat,avg_telat_hari}], total_lewat}`; lewat = jatuh_tempo < today & status≠selesai.
- **FR-77** (v1.7 A10) Tren Surat Kritis Bulanan: `analisa_kritis_bulanan` (viewer) — `{bulan?:12}` → `{labels:[YYYY-MM], values:[], total_kritis}`; kritis = kode 005.1/015 atau sifat segera/rahasia.
- **FR-78** (v1.8 E1) Evaluasi SLA Disposisi: `evaluasi_sla_disposisi` (viewer) — `{tahun?}` → `{total,selesai,tepat_waktu,lewat,pct_patuh_total,pct_patuh_selesai,pct_lewat,avg_telat_hari}`; patuh = selesai ≤ tenggat.
- **FR-79** (v1.8 E2) Evaluasi SLA Surat Keluar: `evaluasi_sla_keluar` (viewer) — `{tahun?}` → `{total,patuh,lewat,pct_patuh,pct_lewat,avg_telat_hari,sla_hari}`; SLA default 3 hari dari tgl_surat ke tgl_terkirim.
- **FR-80** (v1.8 E3) Evaluasi Kelengkapan Metadata: `evaluasi_kelengkapan` (viewer) — `{tahun?}` → `{total_masuk,total_keluar,lengkap_masuk,lengkap_keluar,tidak_lengkap_masuk,tidak_lengkap_keluar,pct_lengkap_masuk,pct_lengkap_keluar,rincian_masuk:[{id,nomor,missing[]}], rincian_keluar}`; wajib = nomor+perihal+klasifikasi+tanggal.
- **FR-81** (v1.8 E4) Evaluasi Format Nomor: `evaluasi_format_nomor` (viewer) — `{tahun?}` → `{total_masuk,total_keluar,patuh_masuk,patuh_keluar,tidak_patuh_masuk,tidak_patuh_keluar,pct_patuh_masuk,pct_patuh_keluar,format_masuk,format_keluar,rincian_*}; regex `NNN/KODE/TAHUN` & `KODE/NNN/KODE/TAHUN`.
- **FR-82** (v1.8 E5) Evaluasi JRA: `evaluasi_jra` (viewer) — reuse L11: `{total,patuh,tidak_patuh,pct_patuh,per_klasifikasi:[{kode_klasifikasi,total,patuh,tidak_patuh,pct_patuh}]}`; patuh = retensi sesuai M1 + tindakan_akhir konsisten.
- **FR-83** (v1.8 E6) Evaluasi Prosedur Musnah: `evaluasi_musnah` (viewer) — `{total,total_musnah,musnah_tanpa_ba,retensi_habis_belum_musnah,pct_ba_lengkap,rincian_tanpa_ba}`; tanpa BA = status musnah tanpa dokumen BA.
- **FR-84** (v1.8 E7) Evaluasi Kondisi Fisik: `evaluasi_fisik` (viewer) — `{total,ada_lokasi,tanpa_lokasi,pct_ada_lokasi,siap_kondisi_fisik,catatan}`; siap_kondisi_fisik = false placeholder (field fisik belum ada).
- **FR-85** (v1.8 E8) Evaluasi Alih Media: `evaluasi_alih_media` (viewer) — `{total_dokumen,sudah_digital,belum_digital,pct_digital,total_lampiran_file,per_jenis:{surat_masuk:{total,digital,pct},...},catatan}`; digital = ada file_drive di T_LAMPIRAN atau lampiran_link.
- **FR-86** (v1.9 R1) RTL Pemusnahan: `rtl_generate` sumber E6 → `T_RTL` judul `R1 Pemusnahan YYYY — N arsip retensi habis` / `R1 Pemusnahan YYYY — N arsip musnah tanpa BA`; deskripsi = count + daftar sample; output → BA Pemusnahan.
- **FR-87** (v1.9 R2) RTL Penyerahan Permanen: `rtl_generate` sumber E5 → `R2 Penyerahan Permanen YYYY — N arsip permanen`; output → BA Serah.
- **FR-88** (v1.9 R3) RTL Alih Media Prioritas: `rtl_generate` sumber E8 → `R3 Alih Media Prioritas YYYY — N dokumen belum digital`; output → Anggaran alih media.
- **FR-89** (v1.9 R4) RTL Restorasi: `rtl_generate` sumber E7 → `R4 Restorasi YYYY — N arsip tanpa lokasi`; output → Anggaran restorasi.
- **FR-90** (v1.9 R5) RTL Pelatihan/Pembinaan: `rtl_generate` sumber E3 → `R5 Pelatihan YYYY — N dokumen tidak lengkap` + sumber A9 → `R5b Pembinaan YYYY — N SLA lewat`; output → Peningkatan adopsi.
- **FR-91** (v1.9) CRUD RTL: `rtl_get_list` filter status_rtl/sumber_evaluasi/tahun+search+sort due_date asc, `rtl_get_detail`, `rtl_save` (judul wajib, sumber enum, status enum baru/diproses/selesai/batal, progress 0-100 auto 100 jika selesai), `rtl_delete`, `rtl_ubah_status` (guard transisi legal).
- **FR-92** (v1.9) Frontend RTL: `V_Rtl.html` — generate panel (sumber dropdown semua/E5/E6/E7/E8/E3/A9 + tahun + Generate), filter bar search+status+sumber+tahun, stat 4 card total/baru/diproses/selesai, tabel judul+sumber+status+progress bar+assignee+due+aksi Edit/Ubah Status/Hapus, modal Form + modal Ubah Status, paginasi 10.
  - Backend: `99_TestSuite.gs`.

---

## Amendemen 2026-09-20 — Struktur berkas & modul (Gate 0)

> Satu baris dok = satu item kode. Backend = pola starter-kit/si-kinerja-harian; frontend
> cetak dari starter-kit (Index shell + include satu tingkat).

### Backend (`src/*.gs`) — kondisi + rencana
| Berkas | Status | Isi |
|---|---|---|
| `00_Utils.gs` | ADA | audit log lokal, self-check |
| `00b_LocalHelpers.gs` | ADA | lock ber-timeout + write atomik ber-preSaveHook (kandidat CoreLib C9/C10; bertahan sampai promosi) |
| `01_ConfigAndBridge.gs` | ADA | config, bridge CoreLib, normalisasi SIMPEG, preSaveHook prefix |
| `02_AppLogic.gs` | ADA | doGet/handleAction + peta localHandlers (ping, profil, dashboard×5, SIMPEG×7, sm×5, sk×5, dp×6, master×9, config×3) |
| `03_SuratMasukApi.gs` / `04_SuratKeluarApi.gs` / `05_DisposisiApi.gs` | ADA | CRUD + generator nomor + transisi + SLA |
| `09_DashboardApi.gs` | ADA | ringkas, tren, klasifikasi, surat kritis, disposisi lewat SLA |
| `99_TestSuite.gs` | ADA | runAllTestsSIArsip (adopsi CoreLib + registri handler + domain + guard SIMPEG + skema) |
| `appsscript.json` | DITAMBAHKAN 2026-09-20 | manifest V8, CoreLib pin 17, timeZone Asia/Jakarta |
| `06_KearsipanApi.gs` | RENCANA v1.1 | T5 arsip: retensi berjalan, daftar musnah/serah, pencarian global lintas T1/T2/T3 |

### Frontend (`src/*.html`) — RENCANA v1 (cetak starter-kit)
| Berkas | Tanggung jawab |
|---|---|
| `Index.html` | shell tipis: pin CDN v2.9.1, tema, include satu tingkat |
| `J_State.html` | state global: token, currentPage, filter per modul, flag modal |
| `J_Api.html` | wrapper callServer + loader per modul (sm/sk/dp/master/dash/arsip) |
| `J_Actions.html` | aksi CRUD + transisi (sm_disposisi, sk_ubah_status, dp_teruskan/selesaikan) |
| `J_Export.html` | exportExcelBulanan via aksi server `laporan_export_excel` (xlsx 4 sheet, link Drive); exportPDF = kandidat Fase 3 |
| `J_Arsip.html` | logika domain kearsipan: retensi, musnah/serah, pencarian global |
| `J_App.html` | bootstrap AppCore.create, menu, pageIcons, navigasi |
| `V_Dashboard/SuratMasuk/SuratKeluar/NaskahDinas/Disposisi/Kearsipan/Pencarian/Master/Pengaturan.html` | 9 halaman sesuai 05_UIUX |
| `V_Modals.html` | modal form bersama |
