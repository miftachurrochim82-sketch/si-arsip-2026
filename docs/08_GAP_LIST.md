# 08 — GAP LIST (as-is → to-be) [SI-ARSIP] — 2026-09-21 v1.9 PIRAMIDA 35/35 TUTUP 🎓

> **Status per 2026-09-21 (amendemen v1.9 rev2, pasca 203/0/1 + audit frontend)**: backend **20 berkas `.gs`**
> (00,00b,01,02,03,04,05,06,07,08,09,10,11,12 + 13_LaporanRekap + 14_Analisa + 15_AnalisaLanjut + 16_Evaluasi + 17_Rtl + 99_TestSuite), frontend **13 halaman** (Dashboard+Laporan+Analisa+Evaluasi+Rtl+Sm+Sk+Nd+Dp+Arsip+Pencarian+Master+Pengaturan) + 8 modal,
> suite **203/0/1**, piramida final **12+10+8+5=35 TUTUP** (Laporan 12/12 + Analisa 10/10 + Evaluasi 8/8 + RTL 5/5). Kolom status di bawah = **keadaan kode terverifikasi**, bukan rencana.
> Audit backend v1.9: 20 OK syntax, 72 handler, lock deadlock fixed, RTL_TRANSISI_LEGAL_ added. Audit frontend v1.9: V_Rtl badge invalid → app-badge, formatTanggal→fmtTgl, :style object fixed.
>
> **Riwayat**:
> - 2026-09-20 — daftar gap awal dari Gate 0 (BRD/PRD/FRD/DATABASE/UIUX/API/TESTCASE).
> - 2026-09-20 malam-2 — SWEEP STATUS: G1–G13,G15–G18 TUTUP; G14 PARTIAL;
>   G19–G33 TUTUP = FASE 2 SELESAI (v1.4: preview inline, timeline disposisi,
>   notifikasi in-app, quick action, preset rentang). Bukti: 127/0/1 (v1.3) → 129/0/1 (v1.4).
> - 2026-09-21 — v1.5 paket hemat L4/L5/L11/L12 TUTUP (13_LaporanRekapApi + export khas 7 sheet).
>   Bukti: 139/0/1. Piramida Laporan penuh (12/12). G39 TUTUP via FR-69.
> - 2026-09-21 — v1.6 Analisa A3/A4/A5 TUTUP (14_AnalisaApi). Bukti: 161/0/1. Piramida 12+3.
> - 2026-09-21 — v1.7 Analisa Lanjut A6-A10 TUTUP (15_AnalisaLanjutApi). Bukti: 171/0/1. Piramida 12+10.
> - 2026-09-21 — v1.8 Evaluasi E1-E8 TUTUP (16_EvaluasiApi + V_Evaluasi 8 tabs). Bukti: 187/0/1. Piramida 12+10+8.
> - 2026-09-21 — v1.9 RTL R1-R5 TUTUP (17_RtlApi + V_Rtl generate+CRUD+status). Bukti: 203/0/1. Piramida final 35/35 TUTUP. 🎓
>   + screenshot per modul + tag rilis.
>
> Rujukan: SRIKANDI (ANRI), Permendagri 78/2012, Perka ANRI (JRA).

---

## 1. Pemicu & Konteks

**As-is** (kondisi saat ini):
- Surat masuk/keluar tercatat di buku fisik / Excel terpisah per bagian.
- Disposisi tidak terpantau (siapa, kapan, status).
- Pencarian surat lama harus buka buku fisik atau bertanya ke staf arsip.
- Penomoran surat manual — rawan duplikat.
- Retensi & arsip statis tidak terkelola.

**To-be** (kondisi setelah SI-ARSIP live):
- Semua surat masuk/keluar tercatat digital dengan nomor unik.
- Disposisi berjenjang terpantau — status & SLA alert.
- Pencarian surat via nomor / perihal / asal / klasifikasi — ≤30 detik.
- Penomoran otomatis format Permendagri 78/2012.
- Retensi & arsip statis terkelola via JRA.

**Tujuan akhir**: menyederhanakan alur surat-menyurat dinas + kearsipan dinamis untuk
skop **kantor Satpol PP & Damkar**, dengan kemungkinan perluasan ke SKPD lain di fase lanjut.

---

## 2. Status Gap per Fase

### Fase 1 — MVP (dalam scope kode, target ~1 minggu)

| # | Item | Kategori | Status |
|---|---|---|---|
| G1 | Skema 10 sheet + initDatabase | Fondasi | ✅ TUTUP (v1.0) |
| G2 | Bridge CoreLib + `getAppConfig_()` + hook P1/P2 | Fondasi | ✅ TUTUP (v1.0) |
| G3 | Dispatcher `CoreLib.dispatchAction` + `actionLevels` | Fondasi | ✅ TUTUP (v1.0) |
| G4 | Frontend shell (`Index.html` + kit CDN `@v2.8.1`) | Fondasi | ✅ TUTUP (v1.0) |
| G5 | Auth SSO native CoreLib (login/logout/session) | Fondasi | ✅ TUTUP (v1.0) |
| G6 | Master Klasifikasi (M1) — CRUD admin | Fitur | ✅ TUTUP (v1.0) |
| G7 | Master Pejabat (M2) — CRUD admin + sinkron SIMPEG | Fitur | ✅ TUTUP (v1.0) |
| G8 | Master Template (M3) — CRUD admin | Fitur | ✅ TUTUP (v1.0) |
| G9 | Surat Masuk (T1) — registrasi + list + detail | Fitur | ✅ TUTUP (v1.0) |
| G10 | Surat Masuk — auto-generate nomor agenda + flag kritis | Fitur | ✅ TUTUP (v1.0) |
| G11 | Surat Keluar (T2) — draft + review + terbitkan | Fitur | ✅ TUTUP (v1.0) |
| G12 | Surat Keluar — auto-generate nomor surat | Fitur | ✅ TUTUP (v1.0) |
| G13 | Disposisi (T4) — buat + teruskan + selesaikan + SLA alert | Fitur | ✅ TUTUP (v1.0) |
| G14 | Dashboard (4 KPI + 4 chart + 2 panel) | Fitur | ✅ TUTUP (v1.2 — chart tren masuk/keluar, doughnut klasifikasi & status disposisi, panel kritis + lewat SLA) |
| G15 | Pengaturan (wrapper `<app-settings>`) | Fitur | ✅ TUTUP (v1.0) |
| G16 | Lampiran (T6) — v1 pakai URL manual | Fitur | ✅ TUTUP (v1.0) |
| G17 | Test suite `runLibraryTests` + adopsi + routing + domain | Test | ✅ TUTUP (v1.0) |
| G18 | Deploy Web App + smoke test | Deploy | ✅ TUTUP (v1.0) |

**MVP selesai bila**: G1–G18 status TUTUP. **Kini: 18 TUTUP (G14 ditutup v1.2).**

---

### Fase 2 — Naskah Dinas, Kearsipan & Pencarian (backlog terdekat, ~2–3 minggu)

| # | Item | Kategori | Status |
|---|---|---|---|
| G19 | Naskah Dinas (T3) — nota/memo/laporan internal | Fitur | ✅ TUTUP (v1.1) |
| G20 | Naskah Dinas — generator nomor + status final | Fitur | ✅ TUTUP (v1.1) |
| G21 | Kearsipan (T5) — daftar arsip + lokasi + retensi | Fitur | ✅ TUTUP (v1.1) |
| G22 | Kearsipan — auto-archive saat surat selesai/terkirim | Fitur | ✅ TUTUP (v1.1) |
| G23 | Kearsipan — daftar akan musnah + BA musnah | Fitur | ✅ TUTUP (v1.1) |
| G24 | Kearsipan — daftar permanen + BA serah | Fitur | ✅ TUTUP (v1.1) |
| G25 | Pencarian Lintas — search 4 sheet (masuk/keluar/naskah/arsip) | Fitur | ✅ TUTUP (v1.1) |
| G26 | Logbook (T7) — auto-log setiap aksi dokumen | Fitur | ✅ TUTUP (v1.3: catatLogbook_ di 00b dipanggil sm/sk/dp/nd simpan-hapus-transisi + upload lampiran; FR-58) |
| G27 | Export Excel multi-sheet (laporan bulanan) | Fitur | ✅ TUTUP (v1.3: 10_LaporanApi.gs, 4 sheet, xlsx via URL export + OAuth; FR-59) |
| G28 | Upload file biner ke Drive (ganti link manual) | Fitur | ✅ TUTUP (v1.3: 11_LampiranApi.gs, ≤5 MB whitelist mime, T_LAMPIRAN file_drive; FR-60) |
| G29 | Preview PDF inline di modal detail | UI/UX | ✅ TUTUP (v1.4: modal Detail Dokumen, iframe preview Drive /preview + link manual; FR-61) |
| G30 | Timeline disposisi visual (bertingkat) | UI/UX | ✅ TUTUP (v1.4: timeline node berwarna per status, tingkat 1..n, dari→ke+tenggat; FR-62) |
| G31 | Notifikasi in-app (disposisi baru, SLA lewat) | Fitur | ✅ TUTUP (v1.4: 12_NotifikasiApi.gs + lonceng slot extra-actions + marker baca; FR-63) |
| G32 | Quick action dropdown di tabel | UI/UX | ✅ TUTUP (v1.4: menu ⋮ di tabel surat masuk & keluar; FR-64) |
| G33 | Filter rentang tanggal kalender | UI/UX | ✅ TUTUP (v1.4: preset Bulan ini/lalu/90 hari/Tahun ini/Semua di sm, sk, dp; FR-65) |

**Fase 2 selesai bila**: G19–G33 status TUTUP. **Kini: 15 TUTUP — FASE 2 SELESAI per v1.4.** 🎓

### Fase 2b — Piramida Analisa/Evaluasi/RTL (v1.5-v1.9, 35/35 TUTUP)

| # | Item | Kategori | Status |
|---|---|---|---|
| L4 | Rekap per Klasifikasi (klasifikasi+uraian+masuk/keluar/total+%) | Laporan | ✅ TUTUP v1.5 (13_LaporanRekapApi) |
| L5 | Rekap per Unit (disposisi per unit + keluar per unit) | Laporan | ✅ TUTUP v1.5 |
| L11 | Kepatuhan JRA Tahunan (% patuh + rincian tidak patuh) | Laporan | ✅ TUTUP v1.5 |
| L12 | Laporan Bulanan Khas Satpol PP (7 sheet KOP+ringkasan+top5+rekap unit+ttd) | Laporan | ✅ TUTUP v1.5 |
| A3 | Analisa Distribusi per Unit | Analisa | ✅ TUTUP v1.6 |
| A4 | Analisa Top Pengirim/Penerima | Analisa | ✅ TUTUP v1.6 |
| A5 | Analisa Beban per Pejabat | Analisa | ✅ TUTUP v1.6 |
| A6 | Proyeksi Retensi 5 Tahun | Analisa Lanjut | ✅ TUTUP v1.7 |
| A7 | Korelasi Klasifikasi ↔ Unit (matrix) | Analisa Lanjut | ✅ TUTUP v1.7 |
| A8 | Rasio TTE | Analisa Lanjut | ✅ TUTUP v1.7 |
| A9 | SLA per Pejabat | Analisa Lanjut | ✅ TUTUP v1.7 |
| A10 | Tren Surat Kritis Bulanan | Analisa Lanjut | ✅ TUTUP v1.7 |
| E1 | Evaluasi SLA Disposisi | Evaluasi | ✅ TUTUP v1.8 |
| E2 | Evaluasi SLA Surat Keluar | Evaluasi | ✅ TUTUP v1.8 |
| E3 | Evaluasi Kelengkapan Metadata | Evaluasi | ✅ TUTUP v1.8 |
| E4 | Evaluasi Format Nomor | Evaluasi | ✅ TUTUP v1.8 |
| E5 | Evaluasi JRA per Klasifikasi | Evaluasi | ✅ TUTUP v1.8 |
| E6 | Evaluasi Prosedur Pemusnahan | Evaluasi | ✅ TUTUP v1.8 |
| E7 | Evaluasi Kondisi Fisik Arsip | Evaluasi | ✅ TUTUP v1.8 |
| E8 | Evaluasi Alih Media | Evaluasi | ✅ TUTUP v1.8 |
| R1 | Rencana Pemusnahan Arsip (E6→BA Pemusnahan) | RTL Puncak | ✅ TUTUP v1.9 |
| R2 | Rencana Penyerahan Permanen (E5→BA Serah) | RTL Puncak | ✅ TUTUP v1.9 |
| R3 | Rencana Alih Media Prioritas (E8→Anggaran alih media) | RTL Puncak | ✅ TUTUP v1.9 |
| R4 | Rencana Restorasi Arsip Rusak (E7→Anggaran restorasi) | RTL Puncak | ✅ TUTUP v1.9 |
| R5 | Rencana Pelatihan Pengguna (E3+A9→Peningkatan adopsi) | RTL Puncak | ✅ TUTUP v1.9 |

**Piramida selesai bila**: 12+10+8+5=35 TUTUP. **Kini: 35/35 TUTUP per v1.9.** 🎓

### Fase 2c — Polish UIUX v1.10 (Langkah 1 pasca-piramida, 2026-09-21 malam)

| # | Item | Kategori | Status |
|---|---|---|---|
| G46 | Tabel & Mobile (min-w + table-scroll) — 11 view | UIUX | ✅ TUTUP v1.10a (min-w 59, table-scroll 28, overflow 0, HP 360px scroll mulus) |
| G47 | Badge & Status valid (app-badge mapping) | UIUX | ✅ TUTUP v1.10b (empty 0, raw badge-sky/rose/amber/gray 0, mapping aktif/disetujui/ditolak/menunggu/proses/draft/nonaktif) |
| G48 | Stats & Cards app-stat-card (custom 0) | UIUX | ✅ TUTUP v1.10c (custom card !p-3 0 → 56 app-stat-card) |
| G49 | Pagination btn-icon + Filter bar label text-[11px] | UIUX | ✅ TUTUP v1.10d (btn-ghost btn-xs 0, filter label konsisten) |
| G50 | Modal v-if + @close + size + tema #0369a1 sync | UIUX | ✅ TUTUP v1.10e (V_Modals 9 modal :show→v-if, tema #0369a1 locked, preview_v1.10.html 217KB) |

**Polish selesai bila**: G46-G50 TUTUP. **Kini: 5/5 TUTUP per v1.10 malam.** 🎨

---

### Fase 3 — TTE, Integrasi & Multi-Kantor (backlog lanjut, tanpa jadwal)

| # | Item | Kategori | Status |
|---|---|---|---|
| G34 | TTE (BSrE) — integrasi tanda tangan elektronik | Fitur | 🔵 BACKLOG LANJUT |
| G35 | TTE internal (opsi alternatif) — kriptografi lokal | Fitur | 🔵 BACKLOG LANJUT |
| G36 | Integrasi SI-LAHAR — surat tugas → e-Kinerja Harian | Integrasi | 🔵 BACKLOG LANJUT |
| G37 | Template Surat Satpol PP (Surat Tugas Patroli, SPK, BA Pemeriksaan) | Fitur Khas | 🔵 BACKLOG LANJUT |
| G38 | Dashboard KPI khas Satpol PP (patroli, penertiban, Damkar) | Fitur Khas | 🔵 BACKLOG LANJUT |
| G39 | Export Excel format Satpol PP (laporan bulanan) | Fitur Khas | ✅ TUTUP v1.5 (7 sheet: Format Satpol PP KOP+ringkasan+top5+rekap unit+ttd + 4 generik + 2 rekap, FR-69) |
| G40 | Multi-kantor — arsitektur siap, tinggal aktifasi | Arsitektur | 🔵 BACKLOG LANJUT |
| G41 | Integrasi SRIKANDI nasional (ANRI) | Integrasi | 🔵 BACKLOG LANJUT |
| G42 | Integrasi SIASN / SRIKANDI KemenPANRB | Integrasi | 🔵 BACKLOG LANJUT |
| G43 | Pencarian suara (Web Speech API) | Eksperimental | 🔵 BACKLOG LANJUT |
| G44 | Disposisi multi-level (>2 jenjang, paralel) | Fitur | 🔵 BACKLOG LANJUT |
| G45 | Role kustom (arsiparis fungsional) | Fitur | 🔵 BACKLOG LANJUT |

---

## 3. Keputusan Pemilik — Status

| # | Pertanyaan | Jawaban | Status |
|---|---|---|---|
| 1 | Skop kantor | **Satpol PP & Damkar dulu**, multi-kantor di fase lanjut | ✅ Diputuskan |
| 2 | Naskah prioritas MVP | **Surat Masuk + Surat Keluar** | ✅ Diputuskan |
| 3 | TTE | **Skip v1** — dicatat sebagai fitur fase lanjut | ✅ Diputuskan |
| 4 | File dokumen | **Link URL dulu** (v1), upload Drive di fase 2 | ✅ Diputuskan |
| 5 | Penomoran | **Auto-generate** format Permendagri 78/2012 + override manual | ✅ Diputuskan |
| 6 | Alur disposisi | **Sederhana 1–2 jenjang**, serial | ✅ Diputuskan |
| 7 | Fitur khas | 5 usulan (SI-LAHAR, template Satpol, dashboard khas, alert kritis, export khas) | ✅ Diputuskan |
| 8 | Warna tema | **Sky-700 `#0369a1`** (v1.10 locked, sebelumnya blue-800 `#1e40af` di docs lama) | ✅ Diputuskan v1.10 |
| 9 | Menu Fase 2 disembunyikan? | **Ya** — supaya UI tidak bingung | ✅ Diputuskan |
| 10 | Format nomor surat keluar | `<kode_klas>/<urut:3>/<kode_unit>/<tahun>` | ✅ Diputuskan |
| 11 | Kode unit singkat | `SATPOL` (dari Script Properties) | ✅ Diputuskan |
| 12 | SLA disposisi default | **2 hari kerja** | ✅ Diputuskan |
| 13 | Kode klasifikasi "kritis" | `005.1`, `015` + sifat `segera`/`rahasia` | ✅ Diputuskan |

**Semua keputusan awal sudah dikunci.** Kalau ada perubahan, amendemen dokumen
(BRD/PRD/FRD) dulu sebelum eksekusi.

---

## 4. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Data surat lama tidak dimigrasi** | Pencarian surat lama tetap manual | Fase 1 fokus surat baru; migrasi opsional di fase 2 |
| **Kode klasifikasi tidak sesuai ANRI** | Laporan tidak standar | Seed awal pakai kode ANRI; admin bisa tambah/edit |
| **Disposisi tidak konsisten (multi-arah)** | Status surat kacau | v1 = serial 1–2 jenjang; multi-level di fase 3 |
| **File biner tidak ter-upload** (v1 = link) | Staf harus upload manual ke Drive | Link URL cukup untuk v1; upload di fase 2 |
| **TTE belum ada** | Tanda tangan masih basah / scan | TTE di fase 3; v1 = scan ttd atau cetak-tanda tangan-scan |
| **Multi-kantor belum siap** | Hanya 1 kantor bisa pakai | Arsitektur single-tenant dulu; multi-tenant di fase 3 |
| **Integrasi SI-LAHAR belum ada** | Surat tugas harus input 2× (di SI-ARSIP & SI-LAHAR) | Integrasi di fase 3 |
| **Kontaminasi Cloudflare saat paste** | Kode error misterius | Selalu cek ekor file; paste dari sumber tepercaya |
| **Tag CDN salah / @main** | Versi tidak stabil | Selalu pakai tag `@v2.8.1` eksplisit |
| **Pin CoreLib tidak sinkron** | `todayIsoLocal` not function | Cek pin 15 di `appsscript.json` |

---

## 5. Backlog Kandidat (belum masuk PRD)

Item berikut belum diputuskan masuk PRD — tercatat untuk pertimbangan lanjut:

| # | Kandidat | Manfaat | Pemicu |
|---|---|---|---|
| B1 | **Tanda tangan digital scan** (v1.5) — upload scan ttd untuk verifikasi | Antara TTE manual & BSrE | Kalau admin butuh verifikasi visual |
| B2 | **Auto-ingest email** — surat masuk dari email kantor | Hemat langkah registrasi | Kalau email kantor sudah terstruktur |
| B3 | **QR code surat** — setiap surat keluar punya QR | Verifikasi cepat asli/tidak | Kalau butuh verifikasi publik |
| B4 | **Integrasi SIMPEG untuk penandatangan** | Pilih pejabat langsung dari jabatan aktif | Sudah ada (M2), tinggal enrich |
| B5 | **Dashboard per-unit** (multi-kantor) | Pimpinan masing-masing unit bisa pantau | Kalau multi-kantor aktif |
| B6 | **Rekap bulanan otomatis** (generate PDF) | Hemat kerja staf | Fase 2 setelah data stabil |
| B7 | **Export format SRIKANDI** | Kalau harus submit ke ANRI | Kalau ada kewajiban |
| B8 | **Filter multi-tag** (sifat + klasifikasi + status) | Analisa lebih fleksibel | Fase 2 |
| B9 | **Template generator PDF** (isi form → PDF surat) | Hemat bikin surat manual | Fase 2 |

---

## 6. Roadmap Ringkas

```
FASE 1 (MVP) — ~1 minggu
├── Fondasi: skema 10 sheet, bridge, dispatcher, auth, shell
├── Fitur: Surat Masuk, Surat Keluar, Disposisi, Master, Dashboard, Pengaturan
└── Test: 42/13/≥25/≥20 (total ~100 asersi)

FASE 2 — ~2–3 minggu
├── Fitur: Naskah Dinas, Kearsipan, Pencarian Lintas, Logbook
├── Peningkatan: Export Excel, Upload Drive, Preview PDF, Timeline visual
└── Test: +N asersi (Naskah/Kearsipan/Pencarian)

FASE 2c — Polish UIUX v1.10 (2026-09-21 malam)
├── G46 Tabel & Mobile (59 min-w + 28 table-scroll)
├── G47 Badge valid (0 empty + 0 raw)
├── G48 Stat-card (0 custom → 56)
├── G49 Pagination + Filter label
└── G50 Modal v-if + tema #0369a1

FASE 3 — tanpa jadwal
├── TTE (BSrE atau internal)
├── Integrasi SI-LAHAR
├── Fitur khas Satpol PP (template, dashboard, export)
├── Multi-kantor
└── Integrasi SRIKANDI nasional
```

---

## 7. Definition of Done — Fase 1 (MVP)

Fase 1 selesai bila semua berikut **TERPENUHI**:

**Fungsional** (centang = butir definisi; keterpenuhan per 2026-09-20 malam-2):
- ✅ 6 menu aktif: Dashboard, Surat Masuk, Surat Keluar, Disposisi, Master, Pengaturan.
- ✅ Login SSO via SI-PLATFORM berhasil.
- ✅ Surat masuk bisa diregistrasi + disposisi + selesai.
- ✅ Surat keluar bisa draft → review → terkirim.
- ✅ Dashboard menampilkan 4 KPI + 4 chart + 2 panel (v1.2: UI kit `<app-chart-*>` live).
- ✅ Master Klasifikasi/Pejabat/Template bisa CRUD.
- ✅ Pengaturan bisa baca/tulis Script Properties.

**Kualitas**:
- ✅ `runLibraryTests()` → PASS 42 / FAIL 0 / SKIP 1.
- ✅ `testAdopsiG18d()` → 13/0.
- ✅ `testDispatcherRouting()` → ≥25/0.
- ✅ `runDomainTestsSIArsip()` → ≥20/0.
- ✅ Tidak ada error merah di console browser.
- ✅ Dark mode & mobile-friendly.

**Non-fungsional**:
- ✅ Pin CoreLib **15** (v2.3.0).
- ✅ CDN **`@v2.8.1`** (tag, bukan `@main`).
- ✅ Vue **`3.5.42`**.
- ✅ 10 sheet skema terbentuk via `initDatabase()`.
- ✅ Fail-closed dispatcher (aksi tak dikenal ditolak).

**Dokumentasi**:
- ✅ 9 dokumen `docs/` lengkap (BRD → 09_ROADMAP_OUTPUT).
- ✅ README + AI_CONTEXT di root repo.

---

## 8. Ringkasan Status

| Fase | Total Item | Status |
|---|---|---|
| **Fase 1 (MVP)** | 18 (G1–G18) | ✅ 18 TUTUP (v1.2) |
| **Fase 2** | 15 (G19–G33) | ✅ 15 TUTUP — SELESAI (v1.4) |
| **Fase 3** | 12 (G34–G45) | 🟡 1 TUTUP (G39 v1.5) + 11 BACKLOG LANJUT |
| **Piramida v1.5-v1.9** | 25 (L4/L5/L11/L12 + A3-A10 + E1-E8 + R1-R5) | ✅ 25 TUTUP — PIRAMIDA FINAL 35/35 TUTUP 🎓 |
| **Polish v1.10** | 5 (G46-G50) | ✅ 5 TUTUP — UIUX 59/28/0/0/56 🎨 |
| **Kandidat (belum masuk PRD)** | 9 (B1–B9) | 📝 IDE |
| **Keputusan pemilik** | 13 | ✅ DIPUTUSKAN |

**Detail Piramida**:
- Laporan 12/12: L1-L3 (dashboard) + L4/L5/L11/L12 (rekap v1.5) + L6-L10 (export/notif) = 12
- Analisa 10/10: A3-A10 (distribusi, top, beban, retensi 5th, klas-unit, TTE, SLA, kritis) = 10
- Evaluasi 8/8: E1-E8 (SLA disp, SLA keluar, kelengkapan, format, JRA, musnah, fisik, alih media) = 8
- RTL 5/5: R1 pemusnahan, R2 penyerahan permanen, R3 alih media, R4 restorasi, R5 pelatihan = 5
- **Total 35/35 TUTUP per v1.9**

**Kesehatan keseluruhan**:
- **Backend**: 100% akan pakai CoreLib-First (pin 15).
- **Frontend**: 100% akan pakai CDN kit `@v2.8.1`.
- **Dokumen**: 9 dokumen `docs/` (dalam proses penulisan — 8 selesai, 1 tersisa).
- **Test**: target ~100 asersi untuk Fase 1.

**Kesimpulan (amendemen malam-2)**: Fase 1 secara kode & test **selesai kecuali
UI chart/panel dashboard (G14)**; fitur inti Fase 2 (naskah, kearsipan,
pencarian, auto-archive) **sudah live lebih cepat dari jadwal**. Sisa kerja:
UI chart/panel, kelengkapan logbook, ekspor/upload/preview (G27–G33), dan
Fase 3 tanpa jadwal. Tidak ada gap blocker fungsional.
