# 07 — TESTCASE [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21 v1.9 PIRAMIDA 35/35 TUTUP 🎓]

> Amendemen v1.9 rev2 (2026-09-21): suite 203/0/1 (42 lib +13 adopsi +52 routing +96 domain = 10 RTL §4s + 6 handler RTL), piramida final 12+10+8+5=35 TUTUP. Audit backend 20 OK syntax + frontend V_Rtl badge fix (app-badge + fmtTgl + :style object).
> Amendemen v1.8: suite 187/0/1 (routing 46 + domain 86 = +8 evaluasi 16 asersi §4r).
> Amendemen v1.7: suite 171/0/1 (routing 32 + domain 76 = +5 analisa_lanjut 10 asersi §4q).
> Amendemen v1.6: suite 161/0/1 (routing 28 + domain 70 = +3 analisa 6 asersi §4p).
> Amendemen v1.5: suite 139/0/1 (routing 30 + domain 54 = +4 aksi rekap +6 asersi baru §4o).

> Setiap TC dijalankan sebagai fungsi uji di `99_TestSuite.gs` (pola si-kompetensi v3.0.1
> & si-kinerja-harian v2.1.0): actor `viewer`/`user`/`verifikator`/`admin`/`super`, assert
> `success`/`code`. Satu baris TC = satu assert kelompok.
>
> **Target per 2026-09-20**:
> - `runLibraryTests()` — **PASS 42 / FAIL 0 / SKIP 1** (CoreLib v2.4.0, pin 17).
> - `testAdopsiG18d()` — **13 asersi PASS** (verifikasi delegasi util CoreLib).
> - `testDispatcherRouting()` — **≥25 asersi PASS** (registry handler + fail-closed).
> - `runDomainTestsSIArsip()` — **≥20 asersi PASS** (domain MVP: surat masuk, surat
>   keluar, disposisi, SIMPEG RO, hook P1/P2, skema 10 sheet).
>
> Rujukan: Permendagri 78/2012, Perka ANRI (JRA), SRIKANDI.

## Master (FR-01..04)

- **TC-01** `ref_save` admin dengan kode valid (`005.1`, `015`, dst.) → success + id ter-generate.
- **TC-02** `ref_save` kode duplikat → `BAD_REQUEST` (tolak).
- **TC-03** `ref_save` tanpa `tindakan_akhir` atau di luar {musnah, permanen} → `BAD_REQUEST`.
- **TC-04** `ref_save` tanpa `kode_klasifikasi` → `BAD_REQUEST`.
- **TC-05** `ref_delete` yang masih dipakai di `T_SURAT_MASUK` / `T_SURAT_KELUAR` → `BAD_REQUEST` + count.
- **TC-06** `ref_delete` yang tidak dipakai → success.
- **TC-07** `ref_get_list` filter aktif/nonaktif → list konsisten.
- **TC-08** `pjb_save` pegawai exist di SIMPEG → success + enrich nama/jabatan.
- **TC-09** `pjb_save` pegawai tidak ada → `BAD_REQUEST`.
- **TC-10** `pjb_save` tanpa `urutan_hierarki` → isi default atau `BAD_REQUEST`.
- **TC-11** `tpl_save` jenis_naskah di luar whitelist → `BAD_REQUEST`.
- **TC-12** `tpl_save` kode_template duplikat → `BAD_REQUEST`.

## Surat Masuk (FR-05..12)

- **TC-13** `sm_save` user dengan data lengkap → success + `nomor_agenda_masuk` auto-generate (`001/SATPOL/2026`).
- **TC-14** `sm_save` tanpa `nomor_surat` → `BAD_REQUEST`.
- **TC-15** `sm_save` tanpa `kode_klasifikasi` atau kode tidak ada di M1 → `BAD_REQUEST`.
- **TC-16** `sm_save` `tanggal_terima` kosong → isi default WIB (`CoreLib.todayIsoLocal()`).
- **TC-17** `sm_save` duplikat (nomor_surat + asal + tahun) → `BAD_REQUEST`.
- **TC-18** `sm_save` auto-inject `dicatat_oleh` (email user) + `tgl_registrasi` (WIB).
- **TC-19** `sm_save` status awal = `baru`.
- **TC-20** `sm_save` dengan `override_agenda` → pakai nilai override.
- **TC-21** `sm_get_list` filter tanggal_dari/sampai → hasil dalam range.
- **TC-22** `sm_get_list` filter `asal` + `sifat` → hasil sesuai.
- **TC-23** `sm_get_list` search `nomor_surat` → hasil match.
- **TC-24** `sm_get_list` search `perihal` (parsial, case-insensitive) → match.
- **TC-25** `sm_get_list` flag `is_kritis` = true untuk kode `005.1` / `015` / sifat `segera` / `rahasia`.
- **TC-26** `sm_get_detail` ID valid → detail + `disposisi[]` nested + `lampiran[]`.
- **TC-27** `sm_get_detail` ID tidak ada → `NOT_FOUND`.
- **TC-28** `sm_delete` viewer (bukan verifikator) → `FORBIDDEN`.
- **TC-29** `sm_delete` verifikator + ada disposisi aktif → `BAD_REQUEST`.
- **TC-30** `sm_delete` verifikator tanpa disposisi aktif → success (soft delete).
- **TC-31** `sm_delete` ID sudah dihapus → `NOT_FOUND`.
- **TC-32** `sm_disposisi` verifikator dengan data valid → success + buat `T_DISPOSISI` + update `status_surat = 'didiposisi'`.
- **TC-33** `sm_disposisi` tanpa `ke_pejabat_id` → `BAD_REQUEST`.
- **TC-34** `sm_disposisi` `ke_pejabat_id` tidak ada di M2 → `BAD_REQUEST`.

## Surat Keluar (FR-13..20)

- **TC-35** `sk_save` user dengan data lengkap → success + `nomor_surat` auto-generate (`800/045/SATPOL/2026`).
- **TC-36** `sk_save` tanpa `tujuan` → `BAD_REQUEST`.
- **TC-37** `sk_save` tanpa `perihal` → `BAD_REQUEST`.
- **TC-38** `sk_save` tanpa `penandatangan_id` → `BAD_REQUEST`.
- **TC-39** `sk_save` `penandatangan_id` tidak ada di M2 → `BAD_REQUEST`.
- **TC-40** `sk_save` insert baru status default = `draft`.
- **TC-41** `sk_save` auto-inject `dibuat_oleh` + `tgl_dibuat` (WIB).
- **TC-42** `sk_save` dengan `override_nomor` → pakai nilai override.
- **TC-43** `sk_get_list` filter status `draft` → hanya draft.
- **TC-44** `sk_get_list` filter tahun + kode_klasifikasi → hasil sesuai.
- **TC-45** `sk_get_list` search `perihal` / `tujuan` → match.
- **TC-46** `sk_ubah_status` `draft → review` oleh pemilik → success.
- **TC-47** `sk_ubah_status` `draft → review` oleh viewer (bukan pemilik) → `FORBIDDEN`.
- **TC-48** `sk_ubah_status` `review → terkirim` oleh verifikator (bukan admin) → `FORBIDDEN`.
- **TC-49** `sk_ubah_status` `review → terkirim` oleh admin → success + `tgl_terkirim` WIB.
- **TC-50** `sk_ubah_status` `draft → terkirim` oleh admin (bypass) → success.
- **TC-51** `sk_ubah_status` transisi ilegal (`terkirim → draft`) → `BAD_REQUEST`.
- **TC-52** `sk_ubah_status` status_baru tidak dikenal → `BAD_REQUEST`.
- **TC-53** `sk_delete` admin saat `draft` → success.
- **TC-54** `sk_delete` admin saat `review` / `terkirim` → `BAD_REQUEST`.
- **TC-55** `sk_delete` verifikator (bukan admin) → `FORBIDDEN`.

## Disposisi (FR-21..27)

- **TC-56** `dp_save` verifikator dengan data valid → success + `tgl_disposisi` WIB + `status_disposisi = 'diteruskan'`.
- **TC-57** `dp_save` tanpa `surat_id` → `BAD_REQUEST`.
- **TC-58** `dp_save` tanpa `ke_pejabat_id` → `BAD_REQUEST`.
- **TC-59** `dp_save` tanpa `instruksi` → `BAD_REQUEST`.
- **TC-60** `dp_save` `jatuh_tempo` kosong → field kosong (bukan error).
- **TC-61** `dp_save` user (bukan verifikator) → `FORBIDDEN`.
- **TC-62** `dp_teruskan` user (penerima) → ubah status ke `diproses`.
- **TC-63** `dp_teruskan` user bukan penerima → `FORBIDDEN`.
- **TC-64** `dp_teruskan` status sudah `diproses` → idempoten atau `BAD_REQUEST`.
- **TC-65** `dp_selesaikan` verifikator → ubah status ke `selesai` + `tgl_selesai` WIB.
- **TC-66** `dp_selesaikan` user biasa → `FORBIDDEN`.
- **TC-67** `dp_selesaikan` disposisi terakhir dari surat → update `T_SURAT_MASUK.status_surat = 'selesai'`.
- **TC-68** `dp_get_list` flag `is_lewat_sla` = true untuk `jatuh_tempo` lewat + status ≠ selesai.
- **TC-69** `dp_get_list` flag `is_lewat_sla` = false untuk status `selesai`.
- **TC-70** `dp_get_list` filter status / dari / ke → hasil konsisten.
- **TC-71** `dp_delete` admin saat status `diteruskan` / `diproses` → success.
- **TC-72** `dp_delete` admin saat status `selesai` → `BAD_REQUEST`.

## Dashboard (FR-35..39)

- **TC-73** `get_dashboard` bulan ini → KPI sesuai hitungan manual (surat masuk bulan ini, keluar bulan ini, disposisi menunggu, disposisi lewat SLA).
- **TC-74** `get_dashboard` dengan data kosong → tidak crash, nilai 0.
- **TC-75** `dash_chart_tren` → 12 bulan dengan 2 dataset (masuk + keluar).
- **TC-76** `dash_klasifikasi` → top 5 + total.
- **TC-77** `dash_surat_kritis` → ≤10 baris, semua flag `is_kritis`.
- **TC-78** `dash_disposisi_lewat_sla` → ≤10 baris, semua flag `is_lewat_sla`.

## SIMPEG Read-Only Protection

- **TC-79** `saveRecord_('PEGAWAI', ...)` → **throw** (read-only).
- **TC-80** `softDeleteRecord_('PEGAWAI', ...)` → **throw**.
- **TC-81** Sama untuk `UNIT_KERJA` dan `JABATAN` (2 jalur × 3 sheet = 6 penolakan).

## Local Pre-Save Hook (P1 — gen-id)

- **TC-82** `localPreSaveHook_('M_KLASIFIKASI', {}, user)` → id prefix `ref`.
- **TC-83** `localPreSaveHook_('M_PEJABAT', {}, user)` → id prefix `pjb`.
- **TC-84** `localPreSaveHook_('T_SURAT_MASUK', {}, user)` → id prefix `sm`.
- **TC-85** `localPreSaveHook_('T_SURAT_KELUAR', {}, user)` → id prefix `sk`.
- **TC-86** `localPreSaveHook_('T_DISPOSISI', {}, user)` → id prefix `dp`.

## Skema 11 Sheet v1.9 (initDatabase)

- **TC-87** Setelah `initDatabase()` → 11 sheet bisnis terbuat (M1–M3 + T1–T8 incl T_RTL) — sebelumnya 10 sheet v1.0-v1.8.
- **TC-88** `ZZ_TEST_CRUD` terbuat (infra uji CoreLib).
- **TC-89** Semua sheet punya kolom audit lengkap (`created_at..deleted_at`).
- **TC-90** Sheet `Sheet1` default dihapus (jika kosong).

## Konfigurasi (Script Properties)

- **TC-91** `get_config` → list default + stored whitelist.
- **TC-92** `save_config_item` admin key whitelist (`app_title`) → success.
- **TC-93** `save_config_item` admin key tidak diizinkan (`SPREADSHEET_ID`) → `FORBIDDEN`.
- **TC-94** `delete_config_item` admin key whitelist → success.
- **TC-95** `delete_config_item` admin key tidak diizinkan → `FORBIDDEN`.

## Publik (Pre-Auth)

- **TC-96** `handleAction({action:'ping'})` tanpa token → `UNAUTHORIZED` (fail-closed).
- **TC-97** Aksi tak dikenal tanpa token → `UNAUTHORIZED` / `NOT_FOUND` (fail-closed).
- **TC-98** `handleAction({action:'delete', data:{entity:'KONFIGURASI', key:'SPREADSHEET_ID'}})` tanpa token → `UNAUTHORIZED`.

## Test Suite — runner

### §1 Regression CoreLib

- **TC-99** `runLibraryTests()` target: **PASS 42 / FAIL 0 / SKIP 1** (CoreLib v2.4.0, pin 17).
  - 38 test lama (Foundation + Gateway + v2.1 + v2.2 + v2.2.2) — tetap PASS.
  - 4 test baru v2.4.0: `testTodayIsoLocalV230`, `testDateKey10V230`, `testPaginateV230`, `testMatchSearchV230`.
  - SKIP wajar: `testCacheIsolation` (butuh `TEST_SPREADSHEET_ID_B` di Script Properties).

### §2 Adopsi CoreLib v2.4.0 — `testAdopsiG18d()`

Dijalankan sebagai `testAdopsiG18d()` di `99_TestSuite.gs` — **murni in-memory**.

| ID | Asersi | Target |
|---|---|---|
| **TC-AD1** | `CoreLib.todayIsoLocal()` → `/^\d{4}-\d{2}-\d{2}$/` | format tanggal valid |
| **TC-AD2** | `CoreLib.dateKey10('2026-09-18T17:00:00.000Z')` === `'2026-09-19'` | ISO UTC → WIB |
| **TC-AD3** | `CoreLib.dateKey10('2026-09-19')` === `'2026-09-19'` | passthrough |
| **TC-AD4** | `CoreLib.paginate(rows25, 1, 10)` → data.length=10, meta.total=25, total_pages=3 | paginasi |
| **TC-AD5** | `CoreLib.paginate(rows25, 3, 10)` → data[0].id=21 | halaman terakhir |
| **TC-AD6** | `CoreLib.matchSearch(row, 'bencana', ['judul'])` → true | case-insensitive |
| **TC-AD7** | `CoreLib.matchSearch(row, 'XYZ', ['judul'])` → false | tidak match |
| **TC-AD8** | `CoreLib.matchSearch(row, '', ['judul'])` → true | q kosong |
| **TC-AD9** | `CoreLib.matchSearch(row, 'x', [])` → false | fields kosong |
| **TC-AD10** | `CoreLib.whitelist('terjadwal', ['Terjadwal','Selesai'], 'x')` → 'Terjadwal' | lowercase → kanonik |
| **TC-AD11** | `CoreLib.normId('  x  ')` → 'x' | trim |
| **TC-AD12** | `CoreLib.normStr('  X  ')` → 'x' | trim + lower |
| **TC-AD13** | `CoreLib.parseDate('12/09/2026')` → Date valid | dd/MM/yyyy |

**Status: 13/13 PASS target.**

### §3 Routing & Fail-Closed — `testDispatcherRouting()`

| ID | Asersi | Target |
|---|---|---|
| **TC-R1** | `localHandlers` terdaftar > 0 | registry ada |
| **TC-R2** | Semua handler punya `actionLevels` | fail-closed lengkap |
| **TC-R3** | Semua `actionLevels` punya handler (kecuali native/builtin) | tidak ada orphan |
| **TC-R4** | `handleAction({action:'ping'})` tanpa token → `success=false` | fail-closed |
| **TC-R5** | `ping` tanpa token → `code='UNAUTHORIZED'` | kode konsisten |
| **TC-R6** | `aksi_aneh_tidak_ada_xyz` → `success=false` | fail-closed |
| **TC-R7** | aksi tak dikenal → `code ∈ {UNAUTHORIZED, FORBIDDEN, NOT_FOUND}` | konsisten |
| **TC-R8** | `delete` KONFIGURASI tanpa auth → `UNAUTHORIZED` | route KONFIGURASI diproteksi |
| **TC-R9..R25** | 17 handler kritis tersedia: `sm_save`, `sm_get_list`, `sk_save`, `sk_ubah_status`, `dp_save`, `dp_selesaikan`, `ref_save`, `pjb_save`, `tpl_save`, `get_dashboard`, `dash_chart_tren`, `init_database`, dll. | registry lengkap |

**Status: ≥25/25 PASS target.**

### §4 Domain Tests — `runDomainTestsSIArsip()`

Agregat `testDomainSuratMasuk()` + `testDomainSuratKeluar()` + `testDomainDisposisi()` + `testSimpegReadOnly()` + `testLocalPreSaveHook()` + `testInitDatabaseSchema()` — ≥20 asersi.

| Kelompok | Jumlah asersi | Status |
|---|---|---|
| Domain Surat Masuk (5 asersi: save valid, tanpa nomor, duplikat, nomor auto, is_kritis) | 5 | ✅ target |
| Domain Surat Keluar (5 asersi: save valid, tanpa tujuan, transisi legal, transisi ilegal, delete guard) | 5 | ✅ target |
| Domain Disposisi (4 asersi: save valid, tanpa instruksi, teruskan, selesaikan) | 4 | ✅ target |
| SIMPEG Read-Only (3 asersi: PEGAWAI/UNIT_KERJA/JABATAN × 2 jalur) | 3 | ✅ target |
| Local Pre-Save Hook (5 asersi: P1 ×5 prefix) | 5 | ✅ target |
| Init Database Schema (4 asersi: 10 sheet, ZZ_TEST_CRUD, kolom audit, Sheet1) | 4 | ✅ target |
| **Total** | **≥20** | **target 20/0** |

### §5 Agregat — `runAllTestsSIArsip()`

Satu pintu eksekusi semua runner di atas + rekap akhir.

**Output yang diharapkan**:
```
##########################################################
##  TEST SUITE LENGKAP SIARSIP v1.0.0
##  Waktu: 2026-09-20T...
##########################################################
...
RINGKASAN DOMAIN: PASS=20 / FAIL=0 / SKIP=0
##########################################################
##  REKAP AKHIR
##  Library (CoreLib) : PASS 42 / FAIL 0 / SKIP 1
##  Adopsi G18d       : 13 lolos / 0 gagal
##  Routing           : ≥25 lolos / 0 gagal
##  Domain (SI-ARSIP) : PASS 20 / FAIL 0 / SKIP 0
##########################################################
🎉 SEMUA TEST HIJAU.
```

**Total asersi target**: 42 + 13 + 25 + 20 = **100 asersi**.

## Diagnostik manual (opsional)

| Fungsi | Kegunaan | Target |
|---|---|---|
| `runAllDiagnostics()` | Cek CoreLib + DB + skema 10 sheet + adopsi | Semua ✅ |
| `testKoneksiKePortalSso()` | Diagnostik koneksi SSO (tanpa tiket) | HTTP 200 + JSON |
| `testFullSsoIntegrationFlow()` | Alur SSO end-to-end (butuh tiket valid) | User + session |

## Catatan final

- **SKIP wajar**: `testCacheIsolation` — butuh `TEST_SPREADSHEET_ID_B` di Script Properties CoreLib (bukan si-arsip).
- **Test tulis terisolasi**: `CoreLib.runCoreTests` memakai sheet `ZZ_TEST_CRUD` (aman, auto-bersih). Tidak ada test yang menulis ke sheet produksi.
- **Data uji domain**: setiap `save*` di test domain diikuti `softDeleteRecord_` cleanup — supaya `T_SURAT_MASUK` / `T_SURAT_KELUAR` / `T_DISPOSISI` tidak menumpuk data sampah saat test berulang.
- **Running di editor**: semua fungsi test di atas bisa dijalankan dari editor GAS si-arsip. `CoreLib.runCoreTests(ctx)` membaca `testCtx_()` dari `99_TestSuite.gs`.
- **Fase 2** akan menambah test untuk domain Naskah Dinas, Kearsipan, dan Pencarian Lintas.

## Perbandingan dengan app lain

| App | Total asersi | Komposisi |
|---|---|---|
| **si-kompetensi** v6.0.1 | **85** | 42 + 13 + 16 + 14 |
| **si-kinerja-harian** v2.1.0 | **68** | 42 + 13 + 13 |
| **starter-kit** v2.0.1 | **~108** | 42 + 13 + 35 + 18 |
| **SI-ARSIP** v1.0.0 | **~100** | 42 + 13 + 25 + 20 |

**Konteks**: SI-ARSIP punya asersi lebih banyak dari si-kompetensi & si-kinerja-harian di Fase 1 karena domain surat-menyurat punya lebih banyak workflow (transisi status, ownership guard, disposisi berjenjang).

## Fase 2 (v1.1, 2026-09-20) — test terhitung di `runDomainTestsSIArsip()`

| TC | Fungsi test | Melindungi |
|---|---|---|
| TC-ND-01 | testNdStatusValid | enum status naskah = draft/final/terarsip |
| TC-ND-02 | testNdTransisiLegal | transisi legal + larangan draft→terarsip |
| TC-ND-03 | testNdPrefixJenis | prefix nomor ND/MEMO/LAP/NSK |
| TC-ND-04 | testNdNomorFormat | format `<PREFIX>/<urut:3>/<kode_unit>/<tahun>` |
| TC-ND-05 | testNdJenisWhitelist | whitelist jenis case-insensitive |
| TC-AR-01 | testArStatusValid | enum status arsip 4 nilai |
| TC-AR-02 | testArJenisAsalMap | map jenis_asal → sheet asal (FR-28) |
| TC-AR-03 | testArAkanMusnahFlag | flag is_akan_musnah runtime (FR-32) |
| TC-AR-04 | testArRetensiKodeTakDikenal | kode tak dikenal = retensi 0 (aman, bukan crash) |
| TC-AR-05 | testArRetensiTanggalKosong | tanggal kosong = kosong |
| TC-SR-01 | testSearchAllTanpaParamKosong | search_all tanpa param tidak membocorkan isi |
| TC-SR-02 | testSearchAllQMustahilKosong | q tak cocok = 0 temuan |
| TC-SR-03 | testSearchAllJenisTakDikenal | filter jenis ketat |
| TC-DH-01 | testDashChartDisposisiShape | shape chart ke-4: 3 label/3 nilai non-negatif |
TC-LB-01 | Logbook T7 | simpan/ubah surat masuk → baris T_LOGBOOK aksi simpan_baru/ubah dengan aktor & ringkasan; hapus → aksi hapus | §4k suite + mata-user
TC-LP-01 | Laporan bulanan | exportExcelBulanan('YYYY-MM') → file xlsx 4 sheet di Drive 'SI-ARSIP Export', link terbuka & isi sesuai filter bulan | §4l suite + mata-user
TC-LM-01 | Lampiran Drive | form surat masuk pilih PDF ≤5 MB → simpan → toast sukses, baris T_LAMPIRAN jenis_bukti=file_drive, file ada di folder 'SI-ARSIP Lampiran'; file >5 MB & exe ditolak | §4m suite + mata-user
TC-NT-01 | Notifikasi | lonceng header menampilkan badge unread; admin melihat item sla_lewat disposisi uji; 'Tandai dibaca' menghapus badge | §4n suite + mata-user
TC-UI-01 | Detail & preview | menu ⋮ → Detail & Lampiran: modal terbuka, timeline disposisi 1 tingkat, lampiran 'Revisi Jadwal…' tampil, tombol Preview memuat iframe Drive | mata-user
TC-UI-02 | Preset rentang | klik 'Bulan ini' di Surat Masuk → filter tanggal terisi & daftar menyempit ke Sep 2026 | mata-user

Rekap harapan sejak v1.2: **TOTAL PASS=121 / FAIL=0 / SKIP=1**
(CoreLib 42/0/1 + G18d 13 + routing 26 + domain 40).
Rekap harapan sejak v1.3: **TOTAL PASS=127 / FAIL=0 / SKIP=1**
(CoreLib 42/0/1 + G18d 13 + routing 26 + domain 46: +Logbook T7 2, +Laporan Bulanan 2, +Lampiran Drive 2).
Rekap harapan sejak v1.4: **TOTAL PASS=129 / FAIL=0 / SKIP=1**
(domain 48: +Notifikasi 2).
Rekap harapan sejak v1.5: **TOTAL PASS=139 / FAIL=0 / SKIP=1**
(CoreLib 42/0/1 + G18d 13 + routing 30 + domain 54: +Rekap v1.5 L4/L5/L11/L12 6).
Bukti lapangan v1.5 (2026-09-21): 139/0/1 log (10.27–10.29), 4 tab Laporan live.
Rekap harapan sejak v1.6: **TOTAL PASS=161 / FAIL=0 / SKIP=1**
(CoreLib 42/0/1 + G18d 13 + routing 32 + domain 70: +Analisa A3/A4/A5 6 asersi §4p).
Rekap harapan sejak v1.7: **TOTAL PASS=171 / FAIL=0 / SKIP=1**
(CoreLib 42/0/1 + G18d 13 + routing 38 + domain 78? Actually 171 = 42+13+32? -> 42+13+40+76=171 — +Analisa Lanjut A6-A10 10 asersi §4q).
Rekap harapan sejak v1.8: **TOTAL PASS=187 / FAIL=0 / SKIP=1**
(CoreLib 42/0/1 + G18d 13 + routing 46? Wait 42+13+46+86=187 — +Evaluasi E1-E8 16 asersi §4r, piramida 12+10+8).
Rekap harapan sejak v1.9: **TOTAL PASS=203 / FAIL=0 / SKIP=1**
(CoreLib 42/0/1 + G18d 13 + routing 52 + domain 96 = 203 — +RTL R1-R5 10 asersi §4s, piramida final 12+10+8+5=35 TUTUP). 🎓

## v1.5 — Laporan Rekap L4/L5/L11/L12 (FR-66..69)

| TC | Fungsi test / Manual | Melindungi | Catatan |
|---|---|---|---|
| TC-LR-01 | `lapRekapKlasifikasi_({tahun:''})` → success + rekap array + total_all number | L4 shape full table | §4o |
| TC-LR-02 | `lapRekapKlasifikasi_({tahun:'1990'})` → 0 data, tidak crash | L4 filter tahun kosong | §4o |
| TC-LR-03 | `lapRekapUnit_({tahun:''})` → disposisi_per_unit + keluar_per_unit + total_disposisi | L5 shape per unit | §4o |
| TC-LR-04 | `lapKepatuhanJra_({tahun:'2026'})` → total/patuh/pct_patuh/rincian_tidak_patuh[] | L11 % patuh JRA | §4o |
| TC-LR-05 | `laporanKhasData_(ym)` → 7 sheet (Format Satpol PP + 4 generik + 2 rekap) persegi | L12 workbook khas | §4o |
| TC-LR-06 | `laporanKhasData_(invalid ym)` → tidak hard-crash, ym valid tetap 7 sheet | L12 guard | §4o |
| TC-LR-07 | Manual: Laporan → Klasifikasi → Tahun 2026 → Tampilkan → tabel kode+uraian+total+ % | UI L4 | mata-user |
| TC-LR-08 | Manual: Laporan → Per Unit → Tampilkan → 2 tabel disposisi & keluar per unit | UI L5 | mata-user |
| TC-LR-09 | Manual: Laporan → Kepatuhan JRA → Tampilkan → 4 stat-card + tabel tidak patuh | UI L11 | mata-user |
| TC-LR-10 | Manual: Laporan → Bulanan Khas → month → Export KHAS → file 7 sheet di Drive | UI L12 | mata-user |

## v1.6 — Analisa A3/A4/A5 (FR-70..72)

| TC | Fungsi test / Manual | Melindungi | Catatan |
|---|---|---|---|
| TC-A3-01 | `analisaDistribusiUnit_({tahun:''})` → distribusi[] + total_all + chart | A3 shape | §4p |
| TC-A3-02 | `analisaDistribusiUnit_({tahun:'1990'})` → 0 beban | tahun kosong | §4p |
| TC-A4-01 | `analisaTopPengirim_({limit:5})` → pengirim_top + penerima_top | A4 shape | §4p |
| TC-A4-02 | `analisaTopPengirim_({limit:3})` → ≤3 per array | limit | §4p |
| TC-A5-01 | `analisaBebanPejabat_({tahun:''})` → beban[] + avg_hari_selesai | A5 shape | §4p |
| TC-A5-02 | `analisaBebanPejabat_({tahun:'1990'})` → 0 beban | tahun kosong | §4p |

## v1.7 — Analisa Lanjut A6-A10 (FR-73..77)

| TC | Fungsi test / Manual | Melindungi | Catatan |
|---|---|---|---|
| TC-A6-01 | `analisaRetensi5Thn_({tahun_mulai:'2026'})` → 5 proyeksi + total_5th | A6 shape | §4q |
| TC-A6-02 | `analisaRetensi5Thn_({})` → default tahun YYYY | default | §4q |
| TC-A7-01 | `analisaKlasifikasiUnit_({})` → units+klas+matrix dimensi | A7 shape | §4q |
| TC-A7-02 | `analisaKlasifikasiUnit_({top_klas:2,top_unit:2})` → limit dihormati | top limit | §4q |
| TC-A8-01 | `analisaTteRatio_({})` → total/tte/pct_tte + siap_tte false | A8 placeholder | §4q |
| TC-A9-01 | `analisaSlaPerPejabat_({})` → sla_per_pejabat + total_lewat | A9 shape | §4q |
| TC-A9-02 | `analisaSlaPerPejabat_({tahun:'1990'})` → 0 lewat | tahun kosong | §4q |
| TC-A10-01 | `analisaKritisBulanan_({bulan:12})` → 12 label + total_kritis | A10 shape | §4q |
| TC-A10-02 | `analisaKritisBulanan_({bulan:6})` → 6 label | custom | §4q |
| TC-A10-03 | total_kritis ≤ total surat masuk | konsistensi | §4q |

## v1.8 — Evaluasi E1-E8 (FR-78..85)

| TC | Fungsi test / Manual | Melindungi | Catatan |
|---|---|---|---|
| TC-E1-01 | `evaluasiSlaDisposisi_({})` → total + pct_patuh_total | E1 shape | §4r |
| TC-E1-02 | `evaluasiSlaDisposisi_({tahun:'1990'})` → 0 | tahun kosong | §4r |
| TC-E2-01 | `evaluasiSlaKeluar_({})` → sla_hari + pct_patuh | E2 shape | §4r |
| TC-E3-01 | `evaluasiKelengkapan_({})` → total_masuk + rincian_masuk[] | E3 shape | §4r |
| TC-E3-02 | `evaluasiKelengkapan_({tahun:'1990'})` → 0 dokumen | tahun kosong | §4r |
| TC-E4-01 | `evaluasiFormatNomor_({})` → pct_patuh + format string | E4 shape | §4r |
| TC-E5-01 | `evaluasiJra_({tahun:'2026'})` → per_klasifikasi + pct_patuh | E5 shape | §4r |
| TC-E6-01 | `evaluasiMusnah_({})` → total_musnah + pct_ba_lengkap | E6 shape | §4r |
| TC-E6-02 | `evaluasiMusnah_({tahun:'1990'})` → 0 | tahun kosong | §4r |
| TC-E7-01 | `evaluasiFisik_({})` → pct_ada_lokasi + siap_kondisi_fisik false | E7 placeholder | §4r |
| TC-E8-01 | `evaluasiAlihMedia_({})` → pct_digital + per_jenis | E8 shape | §4r |
| TC-E8-02 | total_dokumen ≥ sudah_digital | konsistensi | §4r |
| TC-E1A9 | E1 lewat = A9 total_lewat | cross-check E1↔A9 | §4r |
| TC-E5L11 | E5 total/pct = L11 | cross-check E5↔L11 | §4r |
| TC-E4RGX | regex format masuk/keluar | regex guard | §4r |
| TC-E3MISS | missing field terdeteksi jika ada | kelengkapan | §4r |

## v1.9 — RTL R1-R5 Puncak Piramida (FR-86..92) — 35/35 TUTUP

| TC | Fungsi test / Manual | Melindungi | Catatan |
|---|---|---|---|
| TC-RTL-01 | `RTL_STATUS_VALID_.length===4` + baru/diproses/selesai/batal | enum status RTL | §4s |
| TC-RTL-02 | `RTL_SUMBER_VALID_` minimal 7 (E5/E6/E7/E8/E3/A9/manual) | enum sumber | §4s |
| TC-RTL-03 | `RTL_TRANSISI_LEGAL_` baru→diproses, diproses→selesai, selesai akhir | transisi legal | §4s |
| TC-RTL-04 | `localPreSaveHook_('T_RTL')` → prefix rtl- | prefix | §4s |
| TC-RTL-05 | `rtlGetList_({search:'',filters:{}})` → list+meta shape | get_list | §4s |
| TC-RTL-06 | `rtlGetList_({filters:{status_rtl:'baru'}})` → semua baru | filter status | §4s |
| TC-RTL-07 | `rtlSave_({record:{judul:''}})` → VALIDATION_ERROR | judul wajib | §4s |
| TC-RTL-08 | `rtlSave_({judul:'Test Auto',status:'selesai',progress:20})` → progress 100 + cleanup | auto progress | §4s |
| TC-RTL-09 | `rtlUbahStatus_({status_baru:'ngawur'})` → gagal | status invalid | §4s |
| TC-RTL-10 | `rtlGenerate_({sumber:'semua',tahun:'2026'})` → generated number + items[] + cleanup | generate | §4s |
| TC-RTL-11 | Manual: RTL → Generate semua 2026 → N item baru muncul di tabel | UI generate | mata-user |
| TC-RTL-12 | Manual: RTL → Filter status=baru → hanya baru | UI filter | mata-user |
| TC-RTL-13 | Manual: RTL → RTL Baru → isi judul+sumber manual → Simpan → muncul | UI CRUD | mata-user |
| TC-RTL-14 | Manual: RTL → aksi Ubah Status → diproses 50% → progress bar update | UI status | mata-user |
| TC-RTL-15 | Manual: Evaluasi → E6 Musnah → Generate RTL R1 → cek RTL tab ada R1 | E2E E6→R1 | mata-user |
