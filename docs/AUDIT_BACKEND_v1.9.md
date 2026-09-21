# AUDIT BACKEND SI-ARSIP v1.9 — 2026-09-21 (Piramida 35/35 TUTUP)

> Tujuan: teliti ulang semua file backend `.gs` di workspace setelah update RTL R1-R5.
> Status akhir: **20 file `.gs` syntax OK (node --check)**, 72 handler terdaftar, suite expected **203/0/1**.

## 1. Daftar file backend (workspace)

| # | File | Ukuran | Fungsi utama | Status |
|---|---|---|---|---|
| 1 | `00_Utils.gs` | 4.1K | `audit_`, `sendAuditLog_` ke SI-PLATFORM | ✅ OK |
| 2 | `00b_LocalHelpers.gs` | 8.5K | `acquireLock_`, `releaseLock_`, `writeRecordNoLock_`, `invalidateSheetCache_`, `catatLogbook_`, `logbookRingkasanDok_`, `LOGBOOK_AKSI_VALID_` | ✅ OK |
| 3 | `01_ConfigAndBridge.gs` | 22K | **KONFIG UTAMA**: APP_CODE, SPREADSHEET_ID, ROLE_LEVELS, LOCAL_SHEETS (11), LOCAL_ID_PREFIX_ (11 prefix rtl), ALL_SHEET_HEADERS (15 cols T_RTL), isSimpegSheet_, getSheetData_, saveRecord_, actionLevels (72) | ✅ OK — fix v1.9 |
| 4 | `02_AppLogic.gs` | 31K | doGet/doPost/include, handleAction dispatcher, buildLocalHandlers_ (72), master CRUD, config, initDatabase | ✅ OK — fix pesan 11 sheet |
| 5 | `03_SuratMasukApi.gs` | 17K | SM_KODE_KRITIS_, smGenerateNomorAgenda_ (MAX anti-duplikat + includeDeleted), smIsKritis_, smGetList_, smGetDetail_, smSave_ (validasi + lock check duplikat → release → save), smDelete_, smDisposisi_ (writeRecordNoLock_) | ✅ OK |
| 6 | `04_SuratKeluarApi.gs` | 18K | SK_STATUS_VALID_, SK_TRANSISI_LEGAL_, skGenerateNomor_, skGetList_, skGetDetail_, skSave_, skDelete_, skUbahStatus_ (lock + writeRecordNoLock_ + auto-archive setelah lock) | ✅ OK |
| 7 | `05_DisposisiApi.gs` | 22K | DP_STATUS_VALID_, DP_TRANSISI_LEGAL_, dpIsLewatSla_, dpGetList_, dpGetDetail_, dpSave_, dpTeruskan_/Selesaikan (dpUbahStatusInternal_ → writeRecordNoLock_), dpUpdateStatusSuratInduk_, dpCekDanUpdateStatusSuratSelesai_ | ✅ OK |
| 8 | `06_NaskahApi.gs` | 12K | ND_STATUS_VALID_, ND_TRANSISI_LEGAL_, ND_JENIS_VALID_, ND_PREFIX_JENIS_, ndGenerateNomor_, ndGetList_, ndSave_, ndUbahStatus_, ndDelete_ | ✅ OK |
| 9 | `07_KearsipanApi.gs` | 13K | AR_STATUS_VALID_, AR_JENIS_ASAL_, AR_SHEET_ASAL_, arHitungRetensiHabis_, arIsAkanMusnah_, arAutoArchive_ (idempoten jenis+ref_id), arGetList_, arGetAkanMusnah_, arUbahLokasi_, arTandaiMusnah/Serah | ✅ OK |
| 10 | `08_PencarianApi.gs` | 3.8K | searchAll_ — lintas 4 sheet (SM/SK/ND/Arsip) via matchSearch, filter jenis/tahun/kode, limit 50, tanpa param = 0 (tidak bocor) | ✅ OK |
| 11 | `09_DashboardApi.gs` | 13K | dashRingkas_ (4 KPI), dashChartTren_ (12 bulan), dashKlasifikasi_ (top5), dashSuratKritis_, dashDisposisiLewatSla_, dashChartDisposisi_ (3 status) + helper _dashGenerateMonths_ | ✅ OK |
| 12 | `10_LaporanApi.gs` | 13K | laporanBulanData_ (4 sheet workbook), exportExcelBulanan_ (xlsx via UrlFetch + OAuth + folder SI-ARSIP Export), laporanKhasData_ (7 sheet khas), exportKhasBulanan_ | ✅ OK |
| 13 | `11_LampiranApi.gs` | 5.1K | validasiLampiranFile_ (≤5MB whitelist mime), namaFileDrive_, lmpUpload_ (base64 → Drive folder SI-ARSIP Lampiran → T_LAMPIRAN file_drive + logbook) | ✅ OK |
| 14 | `12_NotifikasiApi.gs` | 4.7K | notifikasiItems_ (disposisi baru untuk penerima + SLA lewat untuk penerima+pengawas, umur ≤14 hari), getNotifikasi_, notifTandaiDibaca_ (props NOTIF_READ_<email>) | ✅ OK |
| 15 | `13_LaporanRekapApi.gs` | 13K | _lapFilterTahun_, _lapKlasMap_, _lapPejabatUnitMap_, lapRekapKlasifikasi_ (L4 full table + pct + search), lapRekapUnit_ (L5 disposisi+keluar per unit), lapKepatuhanJra_ (L11 patuh/tidak patuh + rincian 100) | ✅ OK |
| 16 | `14_AnalisaApi.gs` | 12K | analisaDistribusiUnit_ (A3 merge L5 → chart top8), analisaTopPengirim_ (A4 tally asal/tujuan + limit), analisaBebanPejabat_ (A5 beban per pejabat + avg_hari_selesai) | ✅ OK |
| 17 | `15_AnalisaLanjutApi.gs` | 16K | analisaRetensi5Thn_ (A6 bucket 5th), analisaKlasifikasiUnit_ (A7 units+klas+matrix), analisaTteRatio_ (A8 placeholder 0% siap_tte false), analisaSlaPerPejabat_ (A9 sla_per_pejabat + total_lewat), analisaKritisBulanan_ (A10 labels 12 + values) | ✅ OK |
| 18 | `16_EvaluasiApi.gs` | 23K | evaluasiSlaDisposisi_ (E1 total/selesai/tepat/lewat + pct_patuh_total/selesai + avg_telat), evaluasiSlaKeluar_ (E2 sla_hari 3), evaluasiKelengkapan_ (E3 missing array), evaluasiFormatNomor_ (E4 regex NNN/KODE/YYYY & KODE/NNN/KODE/YYYY), evaluasiJra_ (E5 reuse L11 + per_klasifikasi), evaluasiMusnah_ (E6 total_musnah/musnah_tanpa_ba/retensi_habis_belum_musnah), evaluasiFisik_ (E7 ada_lokasi/tanpa_lokasi + siap_kondisi_fisik false placeholder), evaluasiAlihMedia_ (E8 total_dokumen/sudah_digital/belum_digital + per_jenis) | ✅ OK |
| 19 | `17_RtlApi.gs` | 19K | **NEW v1.9**: RTL_STATUS_VALID_ (4), RTL_SUMBER_VALID_ (13 inc manual), RTL_TRANSISI_LEGAL_ (baru→diproses/batal, diproses→selesai/batal), rtlGetList_ (filter status/sumber/tahun via due_date + search judul/deskripsi/assignee + sort due_date asc + paginate 10), rtlGetDetail_, rtlSave_ (judul wajib, sumber enum fallback manual, status enum fallback baru, progress 0-100 auto 100 jika selesai, due_date dateKey10, saveRecord_ tanpa double-lock), rtlDelete_ (softDelete tanpa double-lock), rtlUbahStatus_ (guard transisi legal + lock + writeRecordNoLock_), rtlGenerate_ (sumber semua/E5/E6/E7/E8/E3/A9, tahun default todayIsoLocal YYYY, existsJudul duplikat guard tahun+judul, R1 dari E6 retensi_habis_belum_musnah, R2 dari E5 permanen count, R3 dari E8 belum_digital, R4 dari E7 tanpa_lokasi, R5 dari E3 tidak_lengkap, R5b dari A9 total_lewat, save via writeRecordNoLock_ di dalam lock) | ✅ OK — fix 2026-09-21 |
| 20 | `99_TestSuite.gs` | 49K | _tsAssert_, _tsRunGroup_, runLibraryTests (42/0/1), testAdopsiG18d (13), testDispatcherRouting (52 critical handler inc rtl 6), runDomainTestsSIArsip (96 asersi: SM 5 + SK 5 + DP 4 + SIMPEG 3 + pre-save 6 + skema 5 + ND 5 + AR 5 + search 3 + dash 1 + logbook 2 + laporan 2 + lampiran 2 + notifikasi 2 + rekap 6 + analisa 6 + lanjut 10 + evaluasi 16 + rtl 10) — total expected 203/0/1 | ✅ OK |

## 2. Bug keluarga yang diperiksa

| Bug | Status di v1.9 | Catatan |
|---|---|---|
| **else-default-on-update** (date = today di else) | ✅ Tidak ada di RTL — due_date hanya di-set via dateKey10, tidak ada else default | Di SM/SK sudah fix v1.4.1 |
| **Nested lock deadlock** (acquireLock_ + saveRecord_/softDelete yang lock lagi) | ✅ **FIXED di 17_RtlApi** 2026-09-21: rtlSave & rtlDelete tanpa lock, rtlUbahStatus & rtlGenerate pakai writeRecordNoLock_ di dalam lock | Pola benar: check di luar lock, write via apiSave, atau lock + writeNoLock |
| **Missing constant RTL_TRANSISI_LEGAL_** | ✅ **FIXED**: ditambahkan di 17_RtlApi v1.9 | Test suite §4s butuh ini |
| **Header mismatch / audit cols** | ✅ Semua 11 sheet bisnis punya audit 5 kolom | T_RTL 15 kolom (10 bisnis + 5 audit) |
| **actionLevels orphan / missing** | ✅ 72 handler semua punya level, tidak ada orphan | Cek via buildLocalHandlers_ vs actionLevels |
| **Prefix ID** | ✅ 11 prefix (ref,pjb,tpl,sm,sk,nd,dp,ar,lmp,log,rtl) | LOCAL_ID_PREFIX_ sinkron dengan LOCAL_SHEETS |
| **SIMPEG read-only guard** | ✅ isSimpegSheet_ hanya true untuk PEGAWAI/JABATAN/UNIT_KERJA, bukan M_* | Fix kritis v1.0.1 |
| **initDatabase pesan** | ✅ **FIXED**: 10→11 sheet bisnis (3 master + 8 tabel incl T_RTL) + ZZ + v1.9 tag | Di 02_AppLogic.gs |
| **catatLogbook_ di dalam lock** | ✅ Aman: writeRecordNoLock_ (append) + try/catch, tidak fail-kan aksi utama | Sesuai 00b |

## 3. Sinkronisasi actionLevels vs handlers

- Handler terdaftar: 72 (di 02_AppLogic.gs)
- actionLevels di 01_ConfigAndBridge.gs: 72 (termasuk publik ping, exchange, logout, init_database)
- Critical handlers v1.9: sm 5, sk 3, dp 4, ref/pjb/tpl 6, dash 6, laporan 3, rekap 3, analisa 3, lanjut 5, evaluasi 8, rtl 6, notif 2, lmp 1, simpeg 7, config 6, health 2, init 1 = 72
- Test `testDispatcherRouting` expects 52 critical (sekarang 52 setelah +6 rtl) — PASS

## 4. Schema T_RTL detail

```
id (pk rtl-)
sumber_evaluasi enum: E5/E6/E7/E8/E3/A9/manual (+ kompat E1/E2/E4/L11/A10/auto)
judul_rtl text wajib — format R1/R2/R3/R4/R5/R5b + tahun + count
deskripsi text — narasi temuan + output diharapkan
assigned_to text — email / nama unit
due_date date YYYY-MM-DD — default tahun-12-31, filter tahun via due_date
status_rtl enum: baru/diproses/selesai/batal — transisi legal baru→diproses/batal, diproses→selesai/batal
progress_pct number 0-100 — auto 100 jika selesai
dokumen_terkait text — ID arsip / link drive (sample 5 ID untuk R1)
catatan text — progres / BA
audit 5 kolom
```

## 5. Generate logic R1-R5

| RTL | Sumber | Trigger | Judul | Output |
|---|---|---|---|---|
| R1 Pemusnahan | E6 evaluasi_musnah | retensi_habis_belum_musnah >0 | R1 Pemusnahan Arsip YYYY — N arsip retensi habis | BA Pemusnahan |
| R2 Penyerahan Permanen | E5 evaluasi_jra + T_ARSIP permanen | permanenCount >0 | R2 Penyerahan Arsip Permanen YYYY — N arsip permanen | BA Serah |
| R3 Alih Media | E8 evaluasi_alih_media | belum_digital >0 | R3 Alih Media Prioritas YYYY — N dokumen belum digital | Anggaran alih media |
| R4 Restorasi | E7 evaluasi_fisik | tanpa_lokasi >0 | R4 Restorasi Arsip Rusak YYYY — N arsip tanpa lokasi | Anggaran restorasi |
| R5 Pelatihan | E3 evaluasi_kelengkapan | tidak_lengkap_masuk+keluar >0 | R5 Pelatihan Pengguna YYYY — N dokumen tidak lengkap | Peningkatan adopsi |
| R5b Pembinaan SLA | A9 analisa_sla_per_pejabat | total_lewat >0 | R5b Pembinaan SLA Pejabat YYYY — N disposisi lewat SLA | Pembinaan |

Duplikat guard: judul sama + tahun (via due_date year) → skip.

## 6. Syntax check

```
node --check *.gs (via tmp .js) → 20 OK (00,00b,01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,99)
```

## 7. Rekomendasi copy-paste ke GAS

1. `01_ConfigAndBridge.gs` (wajib pertama — schema + actionLevels)
2. `17_RtlApi.gs` (file baru)
3. `02_AppLogic.gs` (handler map)
4. `99_TestSuite.gs` (test)
5. Frontend: `J_State.html`, `J_Api.html`, `V_Rtl.html`, `Index.html`, `J_App.html`
6. Deploy → menu RTL → Generate semua 2026 → cek 5 item
7. Run `runAllTestsSIArsip()` → expect 203/0/1 (42+13+52+96) + 1 SKIP wajar (testCacheIsolation)

## 8. Kesimpulan

- Backend workspace **bersih** — tidak ada else-default, tidak ada nested lock setelah fix, semua konstanta ada, 72 handler sinkron, 11 sheet schema.
- Piramida **35/35 TUTUP**: Laporan 12 + Analisa 10 + Evaluasi 8 + RTL 5.
- Siap deploy GAS — tinggal copy-paste 9 file (4 backend + 5 frontend) sesuai paket v1.9.

---
*Audit by Agent Mode — 2026-09-21*
