# 06 — API FLOW [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21 v1.9 PIRAMIDA 35/35 TUTUP 🎓]

> Amendemen v1.9 rev2 (2026-09-21): +6 aksi RTL R1-R5 puncak (17_RtlApi.gs) — RTL_TRANSISI_LEGAL_ + lock deadlock fixed (save/delete no outer lock, ubahStatus/generate lock+writeRecordNoLock_). Piramida final 12+10+8+5=35 TUTUP. Audit backend 20 OK syntax + frontend V_Rtl app-badge fix.
> Amendemen v1.8: +8 aksi evaluasi E1-E8 (16_EvaluasiApi.gs).
> Amendemen v1.7: +5 aksi analisa lanjut A6-A10 (15_AnalisaLanjutApi.gs).
> Amendemen v1.6: +3 aksi analisa A3-A5 (14_AnalisaApi.gs).
> Amendemen v1.5: +4 aksi laporan rekap L4/L5/L11/L12 (13_LaporanRekapApi.gs + 10_LaporanApi.gs khas).

> Semua aksi lewat CoreLib router (`handleAction({action, data, token})`).
> Level aksi dideklarasikan di `01_ConfigAndBridge.gs` (`getAppConfig_().actionLevels`) —
> cermin fail-closed CoreLib (default aksi tak dikenal = `viewer`).
>
> **Catatan CoreLib built-in default** (v2.2.2+): tiga aksi berikut punya default `admin`
> **tanpa perlu didaftarkan di `actionLevels`**: `save`, `delete`, `save_config_item`.
> Karena itu `<app-settings>` di `V_Pengaturan.html` berfungsi penuh tanpa app perlu
> mendeklarasikan ketiganya.
>
> Rujukan: SRIKANDI (ANRI), Permendagri 78/2012.

## Alur bisnis utama

```
[Surat Masuk dari Luar]
        │
        ▼
[T_SURAT_MASUK] ──registrasi──► [status=baru]
        │
        ├──disposisi──► [T_DISPOSISI] ──status=diteruskan──►
        │                       │
        │                       └──diproses──► selesai
        │
        ▼ (saat semua disposisi selesai)
[status=selesai] ──auto-archive (Fase 2)──► [T_ARSIP]

═══════════════════════════════════════════════════════════

[Draft Surat Keluar dari Kantor]
        │
        ▼
[T_SURAT_KELUAR] ──draft──► review ──terkirim──► [status=terkirim]
                                                        │
                                                        ▼ (auto-archive Fase 2)
                                                    [T_ARSIP]
```

## Daftar aksi v1.9 — 72 handler (48 base + 4 rekap + 3 analisa + 5 analisa_lanjut + 8 evaluasi + 6 rtl)

Handler didaftarkan di `02_AppLogic.gs` via `buildLocalHandlers_()`, digabung ke
`cfg.localHandlers` lalu dieksekusi `CoreLib.dispatchAction`. Level aksi dideklarasikan
terpisah di `01_ConfigAndBridge.gs` (`getAppConfig_().actionLevels`). Piramida final 35/35 TUTUP (L4/L5/L11/L12 + A3-A10 + E1-E8 + R1-R5).

### A. Health Check & Profil

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `ping` | viewer | `02_AppLogic.gs` | — | `{ pong: true, app, time }` |
| `get_my_profile` | viewer | `02_AppLogic.gs` | — | user dari session CoreLib |
| `save_my_profile` | viewer | `CoreLib.saveMyProfile` | `{alamat?, no_hp?}` | update MAIN_DATA lokal |

### B. Dashboard

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `get_dashboard` | viewer | `09_DashboardApi.gs` → `dashRingkas_` | `{periode?}` | 4 KPI (surat masuk bulan ini, surat keluar bulan ini, disposisi menunggu, disposisi lewat SLA) |
| `dash_chart_tren` | viewer | `09_DashboardApi.gs` → `dashChartTren_` | `{bulan?: 12}` | 2 dataset (surat masuk + keluar per bulan) |
| `dash_klasifikasi` | viewer | `09_DashboardApi.gs` → `dashKlasifikasi_` | `{limit?: 5}` | Top 5 klasifikasi (masuk + keluar) |
| `dash_surat_kritis` | viewer | `09_DashboardApi.gs` → `dashSuratKritis_` | `{limit?: 10}` | 10 surat masuk terbaru flag `is_kritis` |
| `dash_disposisi_lewat_sla` | viewer | `09_DashboardApi.gs` → `dashDisposisiLewatSla_` | `{limit?: 10}` | 10 disposisi lewat SLA |

### C. SIMPEG Read-Only (bundle + granular)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `get_simpeg_lookup` | viewer | `02_AppLogic.gs` → `getSimpegLookup_` | — | `{pegawai, unit, jabatan}` (bundle) |
| `get_master_pegawai` | viewer | `02_AppLogic.gs` → `getPegawaiList_` | — | list pegawai |
| `get_master_unit` | viewer | `02_AppLogic.gs` → `getUnitList_` | — | list unit |
| `get_master_jabatan` | viewer | `02_AppLogic.gs` → `getJabatanList_` | — | list jabatan |
| `get_pegawai_list` | viewer | alias `get_master_pegawai` | — | kompat AppCore.loadMasterSIMPEG |
| `get_unit_list` | viewer | alias `get_master_unit` | — | kompat |
| `get_jabatan_list` | viewer | alias `get_master_jabatan` | — | kompat |

### D. Surat Masuk (T_SURAT_MASUK)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `sm_get_list` | viewer | `03_SuratMasukApi.gs` → `smGetList_` | `{filters?: {tanggal_dari, tanggal_sampai, asal, kode_klasifikasi, sifat, status_surat}, search?, page?, limit?}` | list + meta + flag `is_kritis` |
| `sm_get_detail` | viewer | `03_SuratMasukApi.gs` → `smGetDetail_` | `{id}` | detail + nested `disposisi[]` + `lampiran[]` |
| `sm_save` | **user** | `03_SuratMasukApi.gs` → `smSave_` | `{record}` | upsert + validasi + auto-generate nomor agenda (WIB) |
| `sm_delete` | **verifikator** | `03_SuratMasukApi.gs` → `smDelete_` | `{id}` | soft delete; tolak jika ada disposisi aktif |
| `sm_disposisi` | **verifikator** | `03_SuratMasukApi.gs` → `smDisposisi_` | `{surat_id, ke_pejabat_id, instruksi, jatuh_tempo?}` | buat disposisi + update status surat |

**Ownership surat masuk**:
- **user**: boleh registrasi surat baru + edit surat yang belum `didiposisi`.
- **verifikator+**: edit semua + hapus.

### E. Surat Keluar (T_SURAT_KELUAR)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `sk_get_list` | viewer | `04_SuratKeluarApi.gs` → `skGetList_` | `{filters?: {tanggal_dari, tanggal_sampai, tujuan, kode_klasifikasi, status_surat}, search?, page?, limit?}` | list + meta |
| `sk_get_detail` | viewer | `04_SuratKeluarApi.gs` → `skGetDetail_` | `{id}` | detail + lampiran |
| `sk_save` | **user** | `04_SuratKeluarApi.gs` → `skSave_` | `{record}` | upsert + auto-generate nomor surat |
| `sk_delete` | **admin** | `04_SuratKeluarApi.gs` → `skDelete_` | `{id}` | soft delete; hanya saat status `draft` |
| `sk_ubah_status` | **user** / **verifikator** / **admin** | `04_SuratKeluarApi.gs` → `skUbahStatus_` | `{id, status_baru}` | transisi status (draft→review→terkirim) |

**Ownership surat keluar**:
- **user**: buat draft + ajukan review (milik sendiri).
- **verifikator**: review + approve (ubah review→terkirim bila diizinkan).
- **admin**: bisa langsung `draft→terkirim`, hapus saat draft.

**Transisi status** (FR-16):
| Dari | Ke | Role minimum |
|---|---|---|
| `draft` | `review` | pemilik atau verifikator+ |
| `review` | `terkirim` | admin |
| `draft` | `terkirim` | admin (bypass review) |

**Auto-archive**: saat transisi ke `terkirim` (Fase 2) → buat baris `T_ARSIP` (idempoten).

### F. Disposisi (T_DISPOSISI)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `dp_get_list` | viewer | `05_DisposisiApi.gs` → `dpGetList_` | `{filters?: {status_disposisi, dari_pejabat_id, ke_pejabat_id, tanggal_dari, tanggal_sampai}, page?, limit?}` | list + meta + flag `is_lewat_sla` |
| `dp_get_detail` | viewer | `05_DisposisiApi.gs` → `dpGetDetail_` | `{id}` | detail + info surat induk |
| `dp_save` | **verifikator** | `05_DisposisiApi.gs` → `dpSave_` | `{record}` | upsert + validasi pejabat + auto tgl WIB |
| `dp_teruskan` | **user** | `05_DisposisiApi.gs` → `dpTeruskan_` | `{id}` | ubah status ke `diproses` |
| `dp_selesaikan` | **verifikator** | `05_DisposisiApi.gs` → `dpSelesaikan_` | `{id, catatan?}` | ubah status ke `selesai` + tgl_selesai WIB |
| `dp_delete` | **admin** | `05_DisposisiApi.gs` → `dpDelete_` | `{id}` | soft delete; tolak jika sudah selesai |

**Ownership disposisi**:
- **verifikator**: buat disposisi + selesaikan.
- **user** (penerima): tandai `diproses`.
- **admin**: hapus (saat belum selesai).

**Efek ke surat masuk**:
- Disposisi pertama dibuat → `T_SURAT_MASUK.status_surat` = `didiposisi`.
- Semua disposisi terkait selesai → `T_SURAT_MASUK.status_surat` = `selesai`.

### G. Master Klasifikasi (M_KLASIFIKASI)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `ref_get_list` | viewer | `02_AppLogic.gs` → `masterKlasifikasiList_` | `{search?, page?, limit?}` | list + meta |
| `ref_save` | **admin** | `02_AppLogic.gs` → `masterKlasifikasiSave_` | `{record}` | upsert + validasi kode unik |
| `ref_delete` | **admin** | `02_AppLogic.gs` → `masterKlasifikasiDelete_` | `{id}` | soft delete; tolak jika masih dipakai di surat |

### H. Master Pejabat (M_PEJABAT)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `pjb_get_list` | viewer | `02_AppLogic.gs` → `masterPejabatList_` | `{search?, page?, limit?}` | list + enrich nama/jabatan dari SIMPEG |
| `pjb_save` | **admin** | `02_AppLogic.gs` → `masterPejabatSave_` | `{record}` | upsert + validasi pegawai exist |
| `pjb_delete` | **admin** | `02_AppLogic.gs` → `masterPejabatDelete_` | `{id}` | soft delete |

### I. Master Template (M_TEMPLATE)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `tpl_get_list` | viewer | `02_AppLogic.gs` → `masterTemplateList_` | `{search?, jenis_naskah?, page?, limit?}` | list + meta |
| `tpl_save` | **admin** | `02_AppLogic.gs` → `masterTemplateSave_` | `{record}` | upsert + validasi kode unik |
| `tpl_delete` | **admin** | `02_AppLogic.gs` → `masterTemplateDelete_` | `{id}` | soft delete |

### J. Konfigurasi (Script Properties)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `get_config` | viewer | `02_AppLogic.gs` → `getConfigList_` | — | list default + stored (whitelist) |
| `get_config_list` | viewer | alias | — | |
| `save_config_item` | **admin** | `02_AppLogic.gs` → `saveConfigItem_` | `{key, value, keterangan?}` | upsert Script Property |
| `save_config` | **admin** | alias | — | |
| `delete_config_item` | **admin** | `02_AppLogic.gs` → `deleteConfigItem_` | `{key}` atau `{id}` | hapus Script Property |
| `delete_config` | **admin** | alias | — | |
| `delete` | admin (default CoreLib) | routing internal → `deleteConfigItem_` | `{entity: 'KONFIGURASI', key}` | dipakai `<app-settings>` |

### K. Publik (Pre-Auth)

| Aksi | Level | Handler | Input | Output |
|---|---|---|---|---|
| `exchange_platform_ticket` | publik | CoreLib native | `{ticket}` | token + user (SSO) |
| `exchange_sso_ticket` | publik | alias | — | |
| `logout` | publik | CoreLib native | — | cleanup session |

### L. Sistem

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `init_database` | **super** | `02_AppLogic.gs` → `initDatabase` | — | delegasi `CoreLib.initDatabase` |

## Aksi Fase 2 + v1.5 Laporan + v1.6 Analisa + v1.7 Lanjut + v1.8 Evaluasi + v1.9 RTL (semua di `actionLevels` per v1.9)

| Aksi | Level | Backend | Input | Output |
|---|---|---|---|---|
| `nd_get_list` / `nd_save` / `nd_delete` | viewer / user / admin | `06_NaskahApi.gs` | — | Naskah Dinas |
| `nd_ubah_status` | user | `06_NaskahApi.gs` | — | draft→final |
| `ar_get_list` / `ar_get_detail` | viewer | `07_KearsipanApi.gs` | — | Kearsipan |
| `ar_get_akan_musnah` | viewer | `07_KearsipanApi.gs` | — | Akan musnah |
| `ar_ubah_lokasi` | user | `07_KearsipanApi.gs` | — | Ubah lokasi |
| `ar_tandai_musnah` / `ar_tandai_serah` | admin | `07_KearsipanApi.gs` | — | BA musnah/serah |
| `search_all` | viewer | `08_PencarianApi.gs` | `{q, jenis, tahun, kode}` | Lintas 4 sheet |
| `dash_chart_disposisi` | viewer | `09_DashboardApi.gs` | — | Chart status disposisi |
| `laporan_export_excel` | user | `10_LaporanApi.gs` | `{ym: YYYY-MM}` | xlsx 4 sheet generik |
| `laporan_export_khas` | user | `10_LaporanApi.gs` → `exportKhasBulanan_` | `{ym: YYYY-MM}` | **v1.5 L12** xlsx 7 sheet (Format Satpol PP + 4 generik + 2 rekap) |
| `lap_rekap_klasifikasi` | viewer | `13_LaporanRekapApi.gs` | `{tahun?: YYYY, search?}` | **v1.5 L4** full rekap per klasifikasi |
| `lap_rekap_unit` | viewer | `13_LaporanRekapApi.gs` | `{tahun?: YYYY}` | **v1.5 L5** disposisi+keluar per unit |
| `lap_kepatuhan_jra` | viewer | `13_LaporanRekapApi.gs` | `{tahun?: YYYY}` | **v1.5 L11** % patuh JRA tahunan |
| `analisa_distribusi_unit` | viewer | `14_AnalisaApi.gs` | `{tahun?}` | **v1.6 A3** distribusi per unit |
| `analisa_top_pengirim` | viewer | `14_AnalisaApi.gs` | `{tahun?, limit?}` | **v1.6 A4** top pengirim/penerima |
| `analisa_beban_pejabat` | viewer | `14_AnalisaApi.gs` | `{tahun?}` | **v1.6 A5** beban per pejabat |
| `analisa_retensi_5th` | viewer | `15_AnalisaLanjutApi.gs` | `{tahun_mulai?}` | **v1.7 A6** proyeksi 5th |
| `analisa_klasifikasi_unit` | viewer | `15_AnalisaLanjutApi.gs` | `{tahun?, top_klas?, top_unit?}` | **v1.7 A7** klas↔unit matrix |
| `analisa_tte_ratio` | viewer | `15_AnalisaLanjutApi.gs` | `{tahun?}` | **v1.7 A8** rasio TTE |
| `analisa_sla_per_pejabat` | viewer | `15_AnalisaLanjutApi.gs` | `{tahun?}` | **v1.7 A9** SLA per pejabat |
| `analisa_kritis_bulanan` | viewer | `15_AnalisaLanjutApi.gs` | `{bulan?}` | **v1.7 A10** kritis bulanan |
| `evaluasi_sla_disposisi` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E1** SLA disposisi |
| `evaluasi_sla_keluar` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E2** SLA keluar |
| `evaluasi_kelengkapan` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E3** kelengkapan |
| `evaluasi_format_nomor` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E4** format nomor |
| `evaluasi_jra` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E5** JRA |
| `evaluasi_musnah` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E6** musnah |
| `evaluasi_fisik` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E7** fisik |
| `evaluasi_alih_media` | viewer | `16_EvaluasiApi.gs` | `{tahun?}` | **v1.8 E8** alih media |
| `rtl_get_list` | viewer | `17_RtlApi.gs` | `{search?, filters?:{status_rtl,sumber_evaluasi,tahun}, page?, limit?}` | **v1.9 R1-R5** list RTL paginated |
| `rtl_get_detail` | viewer | `17_RtlApi.gs` | `{id}` | detail RTL |
| `rtl_save` | **user** | `17_RtlApi.gs` | `{record:{judul_rtl,sumber_evaluasi,...}}` | upsert RTL |
| `rtl_delete` | **admin** | `17_RtlApi.gs` | `{id}` | soft delete |
| `rtl_ubah_status` | **user** | `17_RtlApi.gs` | `{id,status_baru,progress_pct?,catatan?}` | ubah status RTL |
| `rtl_generate` | **user** | `17_RtlApi.gs` | `{sumber?:E5/E6/E7/E8/E3/A9/semua,tahun?}` | auto-generate dari evaluasi → T_RTL |
| `lmp_upload` | user | `11_LampiranApi.gs` | `{dokumen_jenis,dokumen_id,nama,mime,base64}` | T_LAMPIRAN file_drive |
| `get_notifikasi` | viewer | `12_NotifikasiApi.gs` | — | `{items, unread}` ≤14 hari |
| `notif_read` | viewer | `12_NotifikasiApi.gs` | — | Marker baca hari ini |

## Kontrak respons (CoreLib v2.2+)

Standar CoreLib `dispatchAction`:

```js
// Sukses
{ success: true, data: <payload> }
{ success: true, data: [...], meta: { total, page, limit, total_pages } }

// Gagal
{ success: false, code: 'BAD_REQUEST'|'UNAUTHORIZED'|'FORBIDDEN'|'NOT_FOUND'|'BUSY', error: 'pesan' }
```

**Frontend auto-handling** (app-core v2.8.0):
- `code: 'UNAUTHORIZED'` → `handleSessionExpired()` (clear token + redirect init).
- `code: 'BUSY'` → toast "Server sibuk, coba lagi".
- `code: 'FORBIDDEN'` → toast pesan error dari backend.
- `code: 'BAD_REQUEST'` → toast pesan validasi.
- `code: 'NOT_FOUND'` → toast "Data tidak ditemukan".

**Dedup & cache-bust**: `AppCore.callServer` menambah `_cacheBust` timestamp ke payload;
`CoreLib.dispatchAction` membuang field ini sebelum diproses (fix v2.2.2). In-flight
dedup otomatis untuk aksi baca (`get_*`, `*_get_*`, `dashboard`, `analytics`).

## Aksi CoreLib built-in (tidak perlu didaftarkan di `actionLevels`)

| Aksi | Level Default CoreLib | Dipakai oleh |
|---|---|---|
| `save` | **admin** | Generic CRUD (tidak dipakai frontend — pakai handler khusus) |
| `delete` | **admin** | Generic CRUD (`<app-settings>` pakai untuk hapus KONFIGURASI) |
| `save_config_item` | **admin** | `<app-settings>` (V_Pengaturan) |
| `get_config` | viewer (default) | `<app-settings>` |
| `exchange_platform_ticket` | publik (tanpa session) | login SSO gateway |
| `logout` | publik | keluar sesi |

## Alur detail per fitur

### 1. Login SSO
```
[User buka app] → [doGet(ticket?)] → Index.html + window.__SSO_TICKET__
                                        ↓
[AppCore.processInitialAuth] → callServer('exchange_platform_ticket', {ticket})
                                        ↓
[CoreLib.exchangePlatformTicket] → HTTP POST ke SI-PLATFORM → token + user
                                        ↓
[sessionStorage: token + user] → [runInitApp()]
                                        ↓
[loadMasterSIMPEG] → [get_master_pegawai/unit/jabatan] → cache SWR
                                        ↓
[config.initApp(vm)] → load semua modul (silent) → [dataLoaded = true]
```

### 2. Registrasi Surat Masuk
```
[V_SuratMasuk] → klik "Registrasi Surat Masuk" → openSmForm()
                                        ↓
[Modal Form] → isi form → Simpan
                                        ↓
[callServer('sm_save', {record})]
                                        ↓
[CoreLib.dispatchAction] → actionLevels.sm_save = 'user' → checkAuth
                                        ↓
[dispatchAction → localHandlers.sm_save] → smSave_(data, user)
                                        ↓
[Validasi + auto-generate nomor agenda + auto-inject dicatat_oleh]
                                        ↓
[T_SURAT_MASUK] tersimpan → toast + refresh list
```

### 3. Disposisi Surat Masuk
```
[V_SuratMasuk] → klik "Disposisi" → openDpForm(surat_id)
                                        ↓
[Modal Disposisi] → pilih pejabat + instruksi + jatuh tempo
                                        ↓
[callServer('dp_save', {surat_id, ke_pejabat_id, ...})]
                                        ↓
[CoreLib.dispatchAction] → actionLevels.dp_save = 'verifikator'
                                        ↓
[dpSave_] → validasi + update T_SURAT_MASUK.status_surat = 'didiposisi'
                                        ↓
[T_DISPOSISI] tersimpan + [T_SURAT_MASUK] terupdate
```

### 4. Transisi Status Surat Keluar
```
[V_SuratKeluar] → klik "Ajukan Review" → openAjukanReview()
                                        ↓
[Modal Konfirmasi] → klik Ya
                                        ↓
[callServer('sk_ubah_status', {id, status_baru: 'review'})]
                                        ↓
[skUbahStatus_] → cek role + transisi legal
                                        ↓
[T_SURAT_KELUAR.status_surat] = 'review'
                                        ↓
[Saat admin klik "Terbitkan"] → status = 'terkirim' → auto-archive (Fase 2)
```

### 5. Selesaikan Disposisi
```
[V_Disposisi] → klik "Selesaikan" → konfirmasi
                                        ↓
[callServer('dp_selesaikan', {id, catatan})]
                                        ↓
[dpSelesaikan_] → update T_DISPOSISI.status = 'selesai'
                → cek semua disposisi surat ini
                → jika semua selesai, T_SURAT_MASUK.status_surat = 'selesai'
                                        ↓
[T_SURAT_MASUK] + [T_DISPOSISI] terupdate
```

### 6. Dashboard Load
```
[User buka V_Dashboard]
                                        ↓
[callServer('get_dashboard')] → dashRingkas_ (4 KPI)
[callServer('dash_chart_tren')] → 2 dataset
[callServer('dash_klasifikasi')] → Top 5
[callServer('dash_surat_kritis')] → 10 surat
[callServer('dash_disposisi_lewat_sla')] → 10 disposisi
                                        ↓
[Promise.all paralel] → render kartu + chart + panel
```

### 7. Konfigurasi (Script Properties)
```
[Admin buka V_Pengaturan] → <app-settings> auto-load
                                        ↓
[callServer('get_config')] → getConfigList_ (default + stored whitelist)
                                        ↓
[Admin] → edit/tambah → save_config_item → saveConfigItem_ (whitelist)
                                        ↓
[Script Properties] terupdate
```

## Adopsi CoreLib v2.3.0 (pin 17)

Tidak ada aksi API baru karena pin sudah di 15. Yang dipakai:

| Util CoreLib | Dipakai di |
|---|---|
| `CoreLib.dispatchAction` | `handleAction` (`02_AppLogic.gs`) |
| `CoreLib.todayIsoLocal()` | Auto-inject tgl_registrasi, tgl_disposisi, tgl_selesai, dll. |
| `CoreLib.dateKey10()` | Normalisasi tanggal filter/list |
| `CoreLib.paginate()` | Paginasi server-side (opsional — bisa client-side) |
| `CoreLib.matchSearch()` | Search lintas field di list |
| `CoreLib.whitelist()` | Validasi enum (sifat, status_surat, tindakan_akhir, dll.) |
| `CoreLib.genUniqueCode()` | Auto-generate nomor agenda & nomor surat |
| `CoreLib.getEnvProperty()` | Baca Script Properties via `appProps_()` |
| `CoreLib.isAllowedConfigKey()` | Whitelist config key |
| `CoreLib.normId/normStr/parseDate` | Normalisasi |

## Catatan integrasi

- **Surat kritis** dihitung runtime (tidak disimpan di sheet): `kode_klasifikasi ∈ {005.1, 015}` atau `sifat ∈ {segera, rahasia}`.
- **SLA disposisi** dihitung runtime: `jatuh_tempo < today` && `status ≠ selesai`.
- **Export Excel** (v1.3): server-side `10_LaporanApi.gs` — Spreadsheet sementara →
  URL export xlsx + token OAuth → file di folder Drive 'SI-ARSIP Export' → temp di-trash.
- **Auto-archive** (Fase 2): saat surat keluar `terkirim` atau surat masuk `selesai`, buat baris `T_ARSIP` idempoten by (`jenis_asal` + `ref_id`).
- **CoreLib First**: aksi util generik (tanggal, paginasi, pencarian, whitelist) **wajib** pakai CoreLib. Jangan tulis ulang lokal.
- **Fail-closed**: setiap handler baru di `buildLocalHandlers_()` **wajib** didaftarkan di `actionLevels` (`01_ConfigAndBridge.gs`). Test `testAppLogicSelfCheck()` akan mendeteksi mismatch.
