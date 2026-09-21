# 04 — DATABASE [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21 v1.9 PIRAMIDA 35/35 TUTUP 🎓]

> Amendemen v1.9 rev2 (2026-09-21): T_RTL 15 cols, 11 sheet (3 master + 8 tabel), 11 prefix (ref,pjb,tpl,sm,sk,nd,dp,ar,lmp,log,rtl), enum sumber_evaluasi 7 + kompat 13, status_rtl 4 + transisi legal baru→diproses/batal diproses→selesai/batal, audit backend 20 OK, frontend V_Rtl fix.
> Standar ekosistem: **master bisnis 3–5 + tabel bisnis ≥3**. SI-ARSIP v1.9: **master 3 ✅ tabel 8 ✅ (11 sheet total)**.
> Kolom audit (`created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`)
> **wajib** — diisi CoreLib otomatis.
>
> Rujukan: Permendagri 78/2012 (Tata Naskah Dinas), Perka ANRI (kode klasifikasi & JRA).

## M1 `M_KLASIFIKASI` — master kode klasifikasi arsip

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `ref` |
| kode_klasifikasi | text | unik, format ANRI (`005.1`, `015`, `800`, dst.) |
| uraian | text | keterangan kode |
| retensi_aktif_th | number | tahun masa aktif (≥ 0) |
| retensi_inaktif_th | number | tahun masa inaktif (≥ 0) |
| tindakan_akhir | enum | `musnah` / `permanen` |
| status_aktif | text | `true` / `false` |
| keterangan | text | opsional |
| + audit | | |

**Seed awal** (dapat disesuaikan):

| Kode | Uraian | Aktif | Inaktif | Akhir |
|---|---|---|---|---|
| `005.1` | Undang-Undang | 5 | 5 | permanen |
| `005.2` | Peraturan Pemerintah | 5 | 5 | permanen |
| `015` | Surat Perintah Kerja (SPK) | 2 | 3 | musnah |
| `020` | Kepegawaian | 5 | 5 | permanen |
| `090` | Perjalanan Dinas | 1 | 2 | musnah |
| `800` | Keuangan | 5 | 5 | musnah |
| `900` | Lain-lain | 2 | 3 | musnah |

## M2 `M_PEJAJAB` — master pejabat & hierarki

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `pjb` |
| pegawai_id | fk PEGAWAI | referensi SIMPEG |
| jabatan_id | fk JABATAN | referensi SIMPEG |
| urutan_hierarki | number | 1 = tertinggi (Kasat), 2 = Kabid, 3 = Kasi/Kasubbag, dst. |
| tanda_tangan_url | text | URL scan ttd (opsional, untuk TTE fase lanjut) |
| aktif | text | `true` / `false` |
| keterangan | text | |
| + audit | | |

**Catatan**: M2 adalah master lokal — data pegawai & jabatan di-resolve dari SIMPEG. Tidak ada duplikasi nama lengkap.

## M3 `M_TEMPLATE` — master template naskah

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `tpl` |
| kode_template | text | unik |
| nama_template | text | mis. "Surat Tugas Patroli" |
| jenis_naskah | enum | `surat_masuk` / `surat_keluar` / `nota_dinas` / `memo` / `laporan` / `lainnya` |
| format_default | text | JSON atau teks format (kop, footer, kode default) |
| status_aktif | text | `true` / `false` |
| keterangan | text | |
| + audit | | |

## T1 `T_SURAT_MASUK` — surat dari luar kantor

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `sm` |
| nomor_agenda_masuk | text | auto-generate `<urut:3>/<kode_unit>/<tahun>` — unik |
| nomor_surat | text | nomor asli dari pengirim |
| tanggal_surat | date | yyyy-MM-dd |
| tanggal_terima | date | yyyy-MM-dd (WIB) |
| asal | text | instansi/perorangan pengirim |
| perihal | text | ringkasan isi surat |
| kode_klasifikasi | fk M1 | referensi `M_KLASIFIKASI.kode_klasifikasi` |
| jumlah_lampiran | number | ≥ 0 |
| sifat | enum | `biasa` / `segera` / `rahasia` |
| status_surat | enum | `baru` / `didiposisi` / `selesai` |
| lampiran_link | text | URL (opsional) |
| catatan | text | |
| dicatat_oleh | text | email user (auto) |
| tgl_registrasi | date | yyyy-MM-dd (WIB, auto) |
| + audit | | |

**Status flow**: `baru` → `didiposisi` → `selesai`.

**Alert Surat Kritis**: `kode_klasifikasi ∈ {005.1, 015}` atau `sifat ∈ {segera, rahasia}` → flag `is_kritis` di response (tidak disimpan di sheet, dihitung runtime).

## T2 `T_SURAT_KELUAR` — surat dari kantor

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `sk` |
| nomor_surat | text | auto-generate `<kode_klas>/<urut:3>/<kode_unit>/<tahun>` — unik |
| tanggal_surat | date | yyyy-MM-dd |
| tujuan | text | instansi/perorangan penerima |
| perihal | text | |
| kode_klasifikasi | fk M1 | |
| jumlah_lampiran | number | |
| sifat | enum | `biasa` / `segera` / `rahasia` |
| penandatangan_id | fk M2 | referensi `M_PEJABAT.id` |
| status_surat | enum | `draft` / `review` / `terkirim` |
| lampiran_link | text | URL |
| catatan | text | |
| dibuat_oleh | text | email user (auto) |
| tgl_dibuat | date | yyyy-MM-dd (WIB, auto) |
| tgl_terkirim | date | yyyy-MM-dd (WIB, auto saat status terkirim) |
| + audit | | |

**Status flow**: `draft` → `review` → `terkirim`.

**Auto-archive**: saat status = `terkirim` → buat baris `T_ARSIP` (idempoten by `ref_id`).

## T3 `T_NASKAH_DINAS` — nota/memo/laporan internal (Fase 2)

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `nd` |
| jenis_naskah | enum | `nota_dinas` / `memo` / `laporan` / `lainnya` |
| nomor_naskah | text | auto-generate (format sesuai jenis) |
| tanggal | date | yyyy-MM-dd |
| perihal | text | |
| tujuan | text | unit/pejabat penerima |
| isi | text | isi lengkap (markdown/plain) |
| kode_klasifikasi | fk M1 | |
| status_naskah | enum | `draft` / `final` / `terarsip` |
| lampiran_link | text | |
| dibuat_oleh | text | |
| + audit | | |

**Catatan**: P4 (Fase 2) — skema sudah siap, handler menyusul.

## T4 `T_DISPOSISI` — disposisi atasan

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `dp` |
| surat_id | fk T1 | referensi `T_SURAT_MASUK.id` |
| dari_pejabat_id | fk M2 | pengirim disposisi |
| ke_pejabat_id | fk M2 | penerima disposisi |
| instruksi | text | perintah singkat |
| catatan | text | |
| tgl_disposisi | date | yyyy-MM-dd (WIB, auto) |
| jatuh_tempo | date | yyyy-MM-dd (opsional) |
| status_disposisi | enum | `diteruskan` / `diproses` / `selesai` |
| tgl_selesai | date | yyyy-MM-dd (auto saat selesai) |
| + audit | | |

**Status flow**: `diteruskan` → `diproses` → `selesai`.

**SLA alert**: `jatuh_tempo < today` && `status_disposisi ≠ selesai` → flag `is_lewat_sla` di response list.

## T5 `T_ARSIP` — arsip & retensi (Fase 2)

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `ar` |
| jenis_asal | enum | `surat_masuk` / `surat_keluar` / `naskah_dinas` |
| ref_id | text | ID dari sheet asal (T1/T2/T3) |
| kode_klasifikasi | fk M1 | |
| judul | text | gabungan perihal/tujuan |
| tgl_arsip | date | yyyy-MM-dd |
| lokasi_fisik | text | ruang-rak-box-folder |
| status_arsip | enum | `aktif` / `inaktif` / `permanen` / `musnah` |
| tgl_retensi_habis | date | tgl_arsip + retensi_aktif_th + retensi_inaktif_th |
| catatan | text | |
| + audit | | |

**Idempoten by**: (`jenis_asal` + `ref_id`) unik.

## T6 `T_LAMPIRAN` — lampiran file/link per dokumen

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `lmp` |
| dokumen_id | text | ID dari T1/T2/T3 (dokumen induk) |
| dokumen_jenis | enum | `surat_masuk` / `surat_keluar` / `naskah_dinas` |
| jenis_bukti | enum | `link` / `file` / `foto` / `scan` |
| url | text | URL lampiran |
| nama_bukti | text | judul lampiran |
| keterangan | text | |
| + audit | | |

**Fase 1**: URL manual. **Fase 2**: upload file biner ke Drive → isi `url` dari hasil upload.

## T7 `T_LOGBOOK` — audit trail dokumen

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `log` |
| dokumen_id | text | ID dokumen (dari T1/T2/T3/T4/T5) |
| dokumen_jenis | enum | `surat_masuk` / `surat_keluar` / `naskah_dinas` / `disposisi` / `arsip` |
| aksi | text | mis. `create`, `update_status`, `disposisi`, `delete` |
| aktor_email | text | email user pelaku |
| tgl_aksi | text | timestamp ISO UTC (kanonik §7 CoreLib) |
| detail_sebelum | text | JSON snapshot status sebelumnya |
| detail_sesudah | text | JSON snapshot status sesudahnya |
| catatan | text | |
| + audit | | |

**Catatan**: logbook tidak difilter soft-delete (selalu tampil untuk audit).

## ZZ_TEST_CRUD — infrastruktur uji CoreLib

| Kolom | Tipe |
|---|---|
| id | text pk |
| laporan_id | text |
| nama | text |
| no_hp | text |
| catatan_baru | text |
| + audit | |

Dipakai `CoreLib.runCoreTests(testCtx_())` — auto-bersih tiap tes.

## Referensi otomatis (tidak masuk budget sheet)

| Sheet | Sumber | Akses |
|---|---|---|
| `PEGAWAI` | Spreadsheet SIMPEG master | read-only via `masterSsId` |
| `JABATAN` | Spreadsheet SIMPEG master | read-only via `masterSsId` |
| `UNIT_KERJA` | Spreadsheet SIMPEG master | read-only via `masterSsId` |
| `AUDIT_LOGS` | Sistem CoreLib | auto-create |
| `MAIN_DATA` | Sistem CoreLib | auto-create |
| `KONFIGURASI` | Script Properties (bukan sheet) | via `getConfigList_` |

## Enum whitelist (server-side)

| Enum | Nilai | Lokasi |
|---|---|---|
| `tindakan_akhir` | `musnah`, `permanen` | `M_KLASIFIKASI` |
| `jenis_naskah` | `surat_masuk`, `surat_keluar`, `nota_dinas`, `memo`, `laporan`, `lainnya` | `M_TEMPLATE` |
| `sifat` (surat) | `biasa`, `segera`, `rahasia` | T1, T2 |
| `status_surat` (masuk) | `baru`, `didiposisi`, `selesai` | T1 |
| `status_surat` (keluar) | `draft`, `review`, `terkirim` | T2 |
| `status_naskah` | `draft`, `final`, `terarsip` | T3 |
| `status_disposisi` | `diteruskan`, `diproses`, `selesai` | T4 |
| `jenis_asal` (arsip) | `surat_masuk`, `surat_keluar`, `naskah_dinas` | T5 |
| `status_arsip` | `aktif`, `inaktif`, `permanen`, `musnah` | T5 |
| `jenis_bukti` | `link`, `file`, `foto`, `scan` | T6 |
| `dokumen_jenis` | `surat_masuk`, `surat_keluar`, `naskah_dinas`, `disposisi`, `arsip` | T6, T7 |
| `sumber_evaluasi` | `E5`, `E6`, `E7`, `E8`, `E3`, `A9`, `manual` | T8 RTL |
| `status_rtl` | `baru`, `diproses`, `selesai`, `batal` | T8 RTL |

**Kode klasifikasi** di-whitelist dinamis dari `M_KLASIFIKASI` (status aktif).

## Prefix ID per-sheet (untuk `localPreSaveHook_` P1)

| Sheet | Prefix |
|---|---|
| `M_KLASIFIKASI` | `ref` |
| `M_PEJABAT` | `pjb` |
| `M_TEMPLATE` | `tpl` |
| `T_SURAT_MASUK` | `sm` |
| `T_SURAT_KELUAR` | `sk` |
| `T_NASKAH_DINAS` | `nd` |
| `T_DISPOSISI` | `dp` |
| `T_ARSIP` | `ar` |
| `T_LAMPIRAN` | `lmp` |
| `T_LOGBOOK` | `log` |
| `T_RTL` | `rtl` |

## T8 `T_RTL` — Rencana Tindak Lanjut (v1.9 puncak piramida)

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text pk | prefix `rtl` |
| sumber_evaluasi | enum | `E5`/`E6`/`E7`/`E8`/`E3`/`A9`/`manual` — sumber temuan evaluasi |
| judul_rtl | text | wajib — contoh `R1 Pemusnahan 2026 — 12 arsip retensi habis` |
| deskripsi | text | detail temuan + output yang diharapkan |
| assigned_to | text | nama pegawai/unit penanggung jawab |
| due_date | date | yyyy-MM-dd target selesai |
| status_rtl | enum | `baru`/`diproses`/`selesai`/`batal` |
| progress_pct | number | 0–100, auto 100 jika selesai |
| dokumen_terkait | text | ID arsip / link drive terkait |
| catatan | text | catatan progres / BA |
| + audit | | |

**Status flow**: `baru` → `diproses` → `selesai` (atau `batal` dari baru/diproses).
**Auto-generate**: `rtlGenerate_` dari E5/E6/E7/E8/E3/A9 — duplikat guard tahun+judul.
**Piramida**: R1 Pemusnahan (E6) → BA Pemusnahan, R2 Penyerahan Permanen (E5) → BA Serah, R3 Alih Media (E8) → Anggaran alih media, R4 Restorasi (E7) → Anggaran restorasi, R5 Pelatihan (E3+A9) → Peningkatan adopsi.

## Total sheet aktif SI-ARSIP (11 + 1 uji) — v1.9

| # | Sheet | Klasifikasi |
|---|---|---|
| 1 | `M_KLASIFIKASI` | master M1 |
| 2 | `M_PEJABAT` | master M2 |
| 3 | `M_TEMPLATE` | master M3 |
| 4 | `T_SURAT_MASUK` | tabel T1 |
| 5 | `T_SURAT_KELUAR` | tabel T2 |
| 6 | `T_NASKAH_DINAS` | tabel T3 (Fase 2) |
| 7 | `T_DISPOSISI` | tabel T4 |
| 8 | `T_ARSIP` | tabel T5 (Fase 2) |
| 9 | `T_LAMPIRAN` | tabel T6 |
| 10 | `T_LOGBOOK` | tabel T7 |
| 11 | `T_RTL` | tabel T8 — Rencana Tindak Lanjut (v1.9 puncak) |
| + | `ZZ_TEST_CRUD` | infra uji CoreLib |

**Sheet sistem CoreLib (auto-create)**: `AUDIT_LOGS`, `MAIN_DATA`.
**Sheet referensi SIMPEG**: `PEGAWAI`, `JABATAN`, `UNIT_KERJA`.
**Konfigurasi app**: Script Properties.

## Aturan simpan (v2 CoreLib)

- **`apiSave`**: update ID asing ditolak; duplikat PK ditolak; `null`/`''` = kosongkan; field audit otoritas server.
- **`apiDelete`**: soft delete (set `deleted_at`) — kecuali KONFIGURASI (hard delete via handler khusus).
- **`getSheetData_`**: filter `!deleted_at` otomatis. Untuk audit pakai `getSheetData_(sheetName, {includeDeleted: true})`.

## Format ID & nomor dokumen

| Jenis | Format | Contoh |
|---|---|---|
| ID internal (row) | `<prefix>-<timestamp>` | `sm-1758259200000` |
| Nomor agenda surat masuk | `<urut:3>/<kode_unit>/<tahun>` | `001/SATPOL/2026` |
| Nomor surat keluar | `<kode_klas>/<urut:3>/<kode_unit>/<tahun>` | `800/045/SATPOL/2026` |
| Nomor naskah dinas (fase 2) | `<kode_jenis>/<urut:3>/<kode_unit>/<tahun>` | `ND/012/SATPOL/2026` |

**Kode unit singkat**: dari Script Properties `kode_unit_singkat` (default `SATPOL`).
**Format nomor**: dari Script Properties `format_nomor_surat` (default seperti di atas).
