# 08 — GAP LIST (as-is → to-be) [SI-ARSIP] — 2026-09-20

> **Status per 2026-09-20 (amendemen malam)**: backend **sebagian dimulai** —
> API Surat Masuk/Keluar/Disposisi/Dashboard/Master/Config + `99_TestSuite.gs`
> sudah ada; frontend **belum dimulai** (nol berkas HTML); `appsscript.json`
> ditambahkan 2026-09-20 (CoreLib pin 15). Fitur yang belum berkode tetap
> berstatus **RENCANA/BACKLOG** pada tabel di bawah. Dokumen ini adalah
> **baseline tracking** untuk seluruh roadmap SI-ARSIP.
>
> **Riwayat**:
> - 2026-09-20 — daftar gap awal dari Gate 0 (BRD/PRD/FRD/DATABASE/UIUX/API/TESTCASE).
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
| G1 | Skema 10 sheet + initDatabase | Fondasi | 📋 RENCANA |
| G2 | Bridge CoreLib + `getAppConfig_()` + hook P1/P2 | Fondasi | 📋 RENCANA |
| G3 | Dispatcher `CoreLib.dispatchAction` + `actionLevels` | Fondasi | 📋 RENCANA |
| G4 | Frontend shell (`Index.html` + kit CDN `@v2.8.1`) | Fondasi | 📋 RENCANA |
| G5 | Auth SSO native CoreLib (login/logout/session) | Fondasi | 📋 RENCANA |
| G6 | Master Klasifikasi (M1) — CRUD admin | Fitur | 📋 RENCANA |
| G7 | Master Pejabat (M2) — CRUD admin + sinkron SIMPEG | Fitur | 📋 RENCANA |
| G8 | Master Template (M3) — CRUD admin | Fitur | 📋 RENCANA |
| G9 | Surat Masuk (T1) — registrasi + list + detail | Fitur | 📋 RENCANA |
| G10 | Surat Masuk — auto-generate nomor agenda + flag kritis | Fitur | 📋 RENCANA |
| G11 | Surat Keluar (T2) — draft + review + terbitkan | Fitur | 📋 RENCANA |
| G12 | Surat Keluar — auto-generate nomor surat | Fitur | 📋 RENCANA |
| G13 | Disposisi (T4) — buat + teruskan + selesaikan + SLA alert | Fitur | 📋 RENCANA |
| G14 | Dashboard (4 KPI + 2 chart + 2 panel) | Fitur | 📋 RENCANA |
| G15 | Pengaturan (wrapper `<app-settings>`) | Fitur | 📋 RENCANA |
| G16 | Lampiran (T6) — v1 pakai URL manual | Fitur | 📋 RENCANA |
| G17 | Test suite `runLibraryTests` + adopsi + routing + domain | Test | 📋 RENCANA |
| G18 | Deploy Web App + smoke test | Deploy | 📋 RENCANA |

**MVP selesai bila**: G1–G18 status TUTUP (18 item).

---

### Fase 2 — Naskah Dinas, Kearsipan & Pencarian (backlog terdekat, ~2–3 minggu)

| # | Item | Kategori | Status |
|---|---|---|---|
| G19 | Naskah Dinas (T3) — nota/memo/laporan internal | Fitur | 🟡 BACKLOG |
| G20 | Naskah Dinas — generator nomor + status final | Fitur | 🟡 BACKLOG |
| G21 | Kearsipan (T5) — daftar arsip + lokasi + retensi | Fitur | 🟡 BACKLOG |
| G22 | Kearsipan — auto-archive saat surat selesai/terkirim | Fitur | 🟡 BACKLOG |
| G23 | Kearsipan — daftar akan musnah + BA musnah | Fitur | 🟡 BACKLOG |
| G24 | Kearsipan — daftar permanen + BA serah | Fitur | 🟡 BACKLOG |
| G25 | Pencarian Lintas — search 4 sheet (masuk/keluar/naskah/arsip) | Fitur | 🟡 BACKLOG |
| G26 | Logbook (T7) — auto-log setiap aksi dokumen | Fitur | 🟡 BACKLOG |
| G27 | Export Excel multi-sheet (laporan bulanan) | Fitur | 🟡 BACKLOG |
| G28 | Upload file biner ke Drive (ganti link manual) | Fitur | 🟡 BACKLOG |
| G29 | Preview PDF inline di modal detail | UI/UX | 🟡 BACKLOG |
| G30 | Timeline disposisi visual (bertingkat) | UI/UX | 🟡 BACKLOG |
| G31 | Notifikasi in-app (disposisi baru, SLA lewat) | Fitur | 🟡 BACKLOG |
| G32 | Quick action dropdown di tabel | UI/UX | 🟡 BACKLOG |
| G33 | Filter rentang tanggal kalender | UI/UX | 🟡 BACKLOG |

**Fase 2 selesai bila**: G19–G33 status TUTUP (15 item).

---

### Fase 3 — TTE, Integrasi & Multi-Kantor (backlog lanjut, tanpa jadwal)

| # | Item | Kategori | Status |
|---|---|---|---|
| G34 | TTE (BSrE) — integrasi tanda tangan elektronik | Fitur | 🔵 BACKLOG LANJUT |
| G35 | TTE internal (opsi alternatif) — kriptografi lokal | Fitur | 🔵 BACKLOG LANJUT |
| G36 | Integrasi SI-LAHAR — surat tugas → e-Kinerja Harian | Integrasi | 🔵 BACKLOG LANJUT |
| G37 | Template Surat Satpol PP (Surat Tugas Patroli, SPK, BA Pemeriksaan) | Fitur Khas | 🔵 BACKLOG LANJUT |
| G38 | Dashboard KPI khas Satpol PP (patroli, penertiban, Damkar) | Fitur Khas | 🔵 BACKLOG LANJUT |
| G39 | Export Excel format Satpol PP (laporan bulanan) | Fitur Khas | 🔵 BACKLOG LANJUT |
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
| 8 | Warna tema | **Biru tua** (blue-800, `#1e40af`) | ✅ Diputuskan |
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

**Fungsional**:
- ✅ 6 menu aktif: Dashboard, Surat Masuk, Surat Keluar, Disposisi, Master, Pengaturan.
- ✅ Login SSO via SI-PLATFORM berhasil.
- ✅ Surat masuk bisa diregistrasi + disposisi + selesai.
- ✅ Surat keluar bisa draft → review → terkirim.
- ✅ Dashboard menampilkan 4 KPI + 2 chart + 2 panel.
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
| **Fase 1 (MVP)** | 18 (G1–G18) | 📋 RENCANA |
| **Fase 2** | 15 (G19–G33) | 🟡 BACKLOG |
| **Fase 3** | 12 (G34–G45) | 🔵 BACKLOG LANJUT |
| **Kandidat (belum masuk PRD)** | 9 (B1–B9) | 📝 IDE |
| **Keputusan pemilik** | 13 | ✅ DIPUTUSKAN |

**Kesehatan keseluruhan**:
- **Backend**: 100% akan pakai CoreLib-First (pin 15).
- **Frontend**: 100% akan pakai CDN kit `@v2.8.1`.
- **Dokumen**: 9 dokumen `docs/` (dalam proses penulisan — 8 selesai, 1 tersisa).
- **Test**: target ~100 asersi untuk Fase 1.

**Kesimpulan**: SI-ARSIP siap masuk Fase 1 (kode). Tidak ada gap blocker. Sisa item
adalah fitur fase lanjut (bukan gap fungsional).
