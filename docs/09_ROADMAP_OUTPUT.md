# 09 — ROADMAP OUTPUT [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21, amendemen v1.5]

> Amendemen v1.5 (2026-09-21 siang): L4, L5, L11, L12 TUTUP sekaligus (paket hemat). Suite 139/0/1.

> Dokumen ini memetakan **output** yang akan dihasilkan SI-ARSIP — melampaui
> sekadar fitur CRUD. Setiap output diukur **manfaat terukurnya** (pengguna,
> frekuensi, pengganti kerja manual, waktu hemat, keputusan).
>
> **Prinsip**: **Piramida Output** — Laporan > Analisa > Evaluasi > RTL.
> Bangun **bertahap per kategori**, bukan sekaligus.
>
> **Prinsip kedua**: **"Tidak ada pengguna + tidak ada keputusan = tidak ada output."**
> Setiap output wajib bisa dijawab: siapa pakai, berapa kali, untuk keputusan apa.
>
> Rujukan: Permendagri 78/2012, Perka ANRI (JRA), SRIKANDI.
>
> **Amendemen v1.4 (2026-09-21)**: status realisasi disinkronkan dengan kode
> hidup (v1.0–v1.4). Banyak output 'RENCANA/BACKLOG' ternyata sudah terbangun
> lewat jalur fitur (G19–G33), bukan lewat jalur output — piramida tetap
> jadi kompas, GAP_LIST tetap jadi radar.

## 1. Rasio Output Ideal

```
        ▲
       ╱ RTL ╲            5 output   ← aksi konkret, paling sedikit
      ╱───────╲
     ╱ Evaluasi ╲         8 output   ← penilaian, butuh kriteria
    ╱─────────────╲
   ╱    Analisa    ╲     10 output   ← menemukan pola, gap
  ╱───────────────────╲
 ╱      Laporan       ╲  12 output   ← fondasi, paling banyak
╱───────────────────────╲
```

**Target total Level 3 (strategis)**: **35 output** (12 L + 10 A + 8 E + 5 RTL).

**Untuk SI-ARSIP Fase 1 (MVP)**: fokus **Laporan dasar** dulu — 8 output minimal.

**Rasio inti**: 3 : 2,5 : 2 : 1,25 (dibulatkan 3:2:2:1).

---

## 2. Formula Prioritas (Scoring)

Setiap output dinilai dengan formula:

```
Skor = (Dampak × 3) + (Frekuensi × 2) - Effort
```

| Faktor | Skala | Keterangan |
|---|---|---|
| **Dampak** | 1–5 | Seberapa besar pengaruh ke keputusan/manfaat |
| **Frekuensi** | 1–5 | Seberapa sering dipakai (5=daily, 1=yearly) |
| **Effort** | 1–5 | Seberapa sulit dibangun (5=sulit, 1=mudah) |

**Urutan eksekusi**: skor tertinggi → terendah.

---

## 3. LAPORAN (12 output target)

### Fase 1 — MVP (6 laporan)

| # | Laporan | Pengguna | Frek/th | Hemat | Keputusan | Dampak | Frek | Effort | Skor | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| L1 | Daftar Surat Masuk | Staf arsip, Sekretaris | 12 | 2j | Monitoring | 4 | 5 | 1 | **21** | ✅ HIDUP v1.0 (+sheet xlsx v1.3) |
| L2 | Daftar Surat Keluar | Staf arsip, Sekretaris | 12 | 2j | Monitoring | 4 | 5 | 1 | **21** | ✅ HIDUP v1.0 (+sheet xlsx v1.3) |
| L3 | Daftar Disposisi | Sekretaris, Pimpinan | 12 | 1.5j | Monitoring SLA | 4 | 5 | 1 | **21** | ✅ HIDUP v1.0 (+sheet xlsx v1.3) |
| L4 | Rekap Surat per Klasifikasi | Staf arsip | 4 | 2j | Evaluasi beban | 3 | 3 | 2 | **13** | ✅ HIDUP v1.5 (tabel lengkap + pct + filter tahun + search, FR-66) |
| L5 | Rekap Surat per Unit | Pimpinan | 4 | 2j | Evaluasi unit | 3 | 3 | 2 | **13** | ✅ HIDUP v1.5 (disposisi per unit + keluar per unit via M_PEJABAT→SIMPEG, FR-67) |
| L6 | Berita Acara Musnah (v1 dummy) | Admin arsip | 1 | 4j | Pemusnahan resmi | 5 | 1 | 3 | **14** | ✅ HIDUP v1.1 (G23) |

### Fase 2 (4 laporan)

| # | Laporan | Pengguna | Frek/th | Hemat | Keputusan | Skor | Status |
|---|---|---|---|---|---|---|---|
| L7 | Daftar Inventaris Arsip (DIA) | Staf arsip | 4 | 3j | Audit | **14** | ✅ HIDUP v1.1 (halaman Kearsipan & Retensi) |
| L8 | Daftar Arsip Akan Musnah | Staf arsip | 2 | 2j | Pemusnahan | **14** | ✅ HIDUP v1.1 (G23) |
| L9 | Daftar Arsip Permanen | Staf arsip | 2 | 2j | Penyerahan | **14** | ✅ HIDUP v1.1 (G24) |
| L10 | Berita Acara Serah ke ANRI | Admin arsip | 1 | 4j | Penyerahan | **14** | ✅ HIDUP v1.1 (G24) |

### Fase 3 (2 laporan)

| # | Laporan | Pengguna | Frek/th | Hemat | Keputusan | Skor | Status |
|---|---|---|---|---|---|---|---|
| L11 | Laporan Kepatuhan JRA Tahunan | Pimpinan | 1 | 8j | Evaluasi kebijakan | **12** | ✅ HIDUP v1.5 (total/patuh/tidak patuh/pct_patuh + rincian 100, FR-68) |
| L12 | Laporan Bulanan Satpol PP (export khas) | Pimpinan | 12 | 1j | Pelaporan dinas | **18** | ✅ HIDUP v1.5 (7 sheet: Format Satpol PP KOP+ringkasan+top5+rekap unit+ttd + 4 generik + 2 rekap, FR-69/G39) |

**Total hemat Fase 1 (L1–L6)**: ~150 jam/tahun.
**Total hemat Fase 2 (L7–L10)**: ~44 jam/tahun.
**Total hemat Fase 3 (L11–L12)**: ~20 jam/tahun.
**Total Laporan (12)**: **~214 jam/tahun** (~27 hari kerja).

---

## 4. ANALISA (10 output target)

### Fase 2 (5 analisa)

| # | Analisa | Pengguna | Frek/th | Hemat | Keputusan | Skor | Status |
|---|---|---|---|---|---|---|---|
| A1 | Tren Volume Surat 12 Bulan | Pimpinan | 12 | 1j | Perencanaan SDM | **19** | ✅ HIDUP v1.2 (chart bar tren masuk/keluar) |
| A2 | Distribusi per Klasifikasi | Staf analisa | 4 | 3j | Evaluasi beban | **14** | ✅ HIDUP v1.2 (doughnut klasifikasi) |
| A3 | Distribusi per Unit Kerja | Pimpinan | 4 | 3j | Distribusi kerja | **14** | 🟡 BACKLOG |
| A4 | Top Pengirim / Penerima Surat | Staf analisa | 4 | 2j | Relasi antar-instansi | **12** | 🟡 BACKLOG |
| A5 | Beban Kerja per Pejabat (disposisi) | Pimpinan | 12 | 1j | Rotasi/penambahan | **18** | 🟡 BACKLOG |

### Fase 3 (5 analisa)

| # | Analisa | Pengguna | Frek/th | Hemat | Keputusan | Skor | Status |
|---|---|---|---|---|---|---|---|
| A6 | Proyeksi Retensi Habis 5 Tahun | Staf arsip | 1 | 8j | Perencanaan ruang | **11** | 🔵 BACKLOG LANJUT |
| A7 | Korelasi Klasifikasi ↔ Unit | Staf analisa | 4 | 3j | Evaluasi proses | **12** | 🔵 BACKLOG LANJUT |
| A8 | Rasio Surat TTE vs Non-TTE (setelah TTE) | Staf analisa | 12 | 1j | Adopsi TTE | **14** | 🔵 BACKLOG LANJUT |
| A9 | Analisa Disposisi Lewat SLA (per pejabat) | Pimpinan | 12 | 1j | Evaluasi kinerja | **15** | 🟡 PARTIAL v1.2/v1.4 (panel SLA + lonceng; per-pejabat belum) |
| A10 | Analisa Volume Surat Kritis per Bulan | Pimpinan | 12 | 1j | Kewaspadaan | **15** | 🟡 PARTIAL v1.2 (panel kritis; agregat bulanan belum) |

**Total hemat Analisa (10)**: **~144 jam/tahun** (~18 hari kerja).

---

## 5. EVALUASI (8 output target)

### Fase 2 (4 evaluasi)

| # | Evaluasi | Pengguna | Frek/th | Hemat | Keputusan | Skor | Status |
|---|---|---|---|---|---|---|---|
| E1 | Kepatuhan SLA Disposisi | Pimpinan | 12 | 1j | Evaluasi kinerja | **19** | 🟡 PARTIAL v1.2 (KPI + badge LEWAT; % kepatuhan belum) |
| E2 | Kepatuhan SLA Surat Keluar | Pimpinan | 12 | 1j | Evaluasi proses | **19** | 🟡 BACKLOG |
| E3 | Kelengkapan Metadata Surat | Staf arsip | 4 | 3j | Perbaikan data | **14** | 🟡 BACKLOG |
| E4 | Kepatuhan Format Nomor Surat | Admin arsip | 4 | 2j | Perbaikan SOP | **12** | 🟡 BACKLOG |

### Fase 3 (4 evaluasi)

| # | Evaluasi | Pengguna | Frek/th | Hemat | Keputusan | Skor | Status |
|---|---|---|---|---|---|---|---|
| E5 | Kepatuhan JRA (retensi sesuai standar) | Pimpinan | 1 | 6j | Perbaikan JRA | **11** | 🔵 BACKLOG LANJUT |
| E6 | Kepatuhan Prosedur Pemusnahan | Auditor | 1 | 4j | Audit internal | **11** | 🔵 BACKLOG LANJUT |
| E7 | Kondisi Fisik Arsip (baik/rusak) | Staf arsip | 2 | 3j | Restorasi | **12** | 🔵 BACKLOG LANJUT |
| E8 | Progress Alih Media (fisik → digital) | Admin arsip | 4 | 2j | Percepatan alih media | **14** | 🔵 BACKLOG LANJUT |

**Total hemat Evaluasi (8)**: **~92 jam/tahun** (~11 hari kerja).

---

## 6. RTL — RENCANA TINDAK LANJUT (5 output target)

### Fase 3 (5 RTL)

| # | RTL | Pengguna | Frek/th | Hemat | Keputusan | Skor | Status |
|---|---|---|---|---|---|---|---|
| R1 | Rencana Pemusnahan Arsip (dari E5/E6) | Admin arsip | 1 | 3j | BA Pemusnahan | **10** | 🔵 BACKLOG LANJUT |
| R2 | Rencana Penyerahan Arsip Permanen | Admin arsip | 1 | 3j | BA Serah | **10** | 🔵 BACKLOG LANJUT |
| R3 | Rencana Alih Media Prioritas | Staf arsip | 4 | 2j | Anggaran alih media | **11** | 🔵 BACKLOG LANJUT |
| R4 | Rencana Restorasi Arsip Rusak | Staf arsip | 2 | 2j | Anggaran restorasi | **10** | 🔵 BACKLOG LANJUT |
| R5 | Rencana Pelatihan Pengguna | Admin arsip | 1 | 2j | Peningkatan adopsi | **10** | 🔵 BACKLOG LANJUT |

**Total hemat RTL (5)**: **~30 jam/tahun** (~4 hari kerja).

---

## 7. Ringkasan Manfaat (Level 3 — Total 35 Output)

| Kategori | Jumlah | Hemat/th | Persentase |
|---|---|---|---|
| **Laporan** | 12 | **~214 jam** | 45% |
| **Analisa** | 10 | **~144 jam** | 30% |
| **Evaluasi** | 8 | **~92 jam** | 19% |
| **RTL** | 5 | **~30 jam** | 6% |
| **TOTAL** | **35** | **~480 jam/tahun** | 100% |

**Setara**: **~60 hari kerja** (8 jam/hari) — atau **~3 bulan kerja 1 pegawai**.

---

## 8. Roadmap Eksekusi Bertahap

### Pendekatan: Horizontal Staging

**Bukan** vertical (1 modul lengkap sekaligus), tapi **horizontal** (selesaikan 1 kategori untuk semua modul).

| Fase | Kategori | Output | Durasi | Pemicu lanjut |
|---|---|---|---|---|
| **1a** | **Laporan MVP** | L1–L3 (3 laporan dasar) | 2–3 hari | User pakai, feedback |
| **1b** | **Laporan lanjutan** | L4–L6 (3 laporan) | 2–3 hari | User puas |
| **2a** | **Analisa dasar** | A1, A2, A3 (3 analisa) | 4–5 hari | Data terkumpul cukup |
| **2b** | **Evaluasi dasar** | E1, E2, E3 (3 evaluasi) | 4–5 hari | Analisa sudah jalan |
| **2c** | **Analisa lanjutan** | A4, A5 + L7–L10 | 5–7 hari | Setelah evaluasi stabil |
| **3a** | **Evaluasi lanjutan** | E4–E8 | 5–7 hari | Kebijakan/peraturan tersedia |
| **3b** | **RTL** | R1–R5 | 7–10 hari | Evaluasi matang |

**Kunci**: setiap fase selesai → **PAUSE** → ukur manfaat → kumpulkan feedback → baru lanjut.

---

## 9. Fase 1 (MVP) — Laporan Saja

Untuk Fase 1 MVP, fokus **6 laporan** saja (L1–L6). Sisanya (Analisa, Evaluasi, RTL) di fase lanjut.

### Yang dibangun di Fase 1:

| # | Output | Modul Backend | Modul Frontend |
|---|---|---|---|
| L1 | Daftar Surat Masuk | `03_SuratMasukApi.gs` | `V_SuratMasuk.html` (tabel + export) |
| L2 | Daftar Surat Keluar | `04_SuratKeluarApi.gs` | `V_SuratKeluar.html` (tabel + export) |
| L3 | Daftar Disposisi | `05_DisposisiApi.gs` | `V_Disposisi.html` (tabel + export) |
| L4 | Rekap per Klasifikasi | `09_DashboardApi.gs` | `V_Dashboard.html` (chart doughnut) |
| L5 | Rekap per Unit | `09_DashboardApi.gs` | `V_Dashboard.html` (chart bar) |
| L6 | BA Musnah (v1 dummy) | `07_KearsipanApi.gs` (Fase 2) | — (Fase 2) |

**Fase 1 core**: L1–L5 (5 laporan) + Dashboard.

**Fase 2**: L6–L10, A1–A5, E1–E4, R1–R5.
**Fase 3**: L11–L12, A6–A10, E5–E8.

---

## 10. Framework Keputusan — Kapan Tambah Output?

**Aturan**: **"Tambah output kalau ada pemicu konkret."**

| Pemicu | Aksi |
|---|---|
| Ada kebutuhan rutin baru | +1 Laporan |
| Ada pertanyaan analitis dari pimpinan | +1 Analisa |
| Ada standar baru (regulasi) | +1 Evaluasi |
| Ada masalah konkret yang butuh tindak lanjut | +1 RTL |

**Kalau tidak ada pemicu** → **jangan tambah**. Over-production = app berat tanpa manfaat.

**3 tanda output tidak layak**:
1. Tidak ada pengguna konkret.
2. Frekuensi < 2×/tahun.
3. Tidak ada keputusan yang bergantung.

**Kalau salah satu terpenuhi → tunda.**

---

## 11. Matriks Dampak vs Effort

```
              Effort Rendah           Effort Tinggi
Dampak         │                        │
Tinggi         │ ✅ PRIORITAS 1         │ 🟡 Prioritas 2
               │ L1, L2, L3, A1         │ L7, L8, E5
Dampak         │                        │
Rendah         │ 🟡 Prioritas 3         │ 🔴 Jangan dulu
               │ L4, L5, E4             │ R5, A9
```

**Prioritas 1 (Fase 1)**: L1, L2, L3 (laporan dasar, semua butuh, effort rendah).
**Prioritas 2 (Fase 2)**: L7–L10, A1, A3, E1, E2 (dampak tinggi, effort menengah).
**Prioritas 3 (Fase 3)**: L4, L5, E4–E8, A4–A10.
**Jangan dulu**: R5, A9 — dampak rendah, effort tinggi.

---

## 12. Yang Perlu Diukur Setiap Fase

Setelah setiap fase selesai, **pause** dan ukur:

### 1. Ukur manfaat aktual
| Output | Frek aktual | Pengguna aktual | Hemat aktual |
|---|---|---|---|
| L1 | ? | ? | ? |
| L2 | ? | ? | ? |

### 2. Kumpulkan feedback
- Output mana yang paling sering dibuka?
- Output mana yang tidak dipakai?
- Output mana yang perlu diperbaiki?
- User minta output apa lagi?

### 3. Baru putuskan lanjut
- Kalau user puas → lanjut fase berikutnya.
- Kalau user minta lebih banyak → tambah dulu.
- Kalau ada output tidak dipakai → hapus, jangan lanjut.

**Kunci**: **"Jangan bangun output baru sebelum output sebelumnya terbukti berguna."**

---

## 13. Kandidat Output Tambahan (belum masuk roadmap)

Item berikut **belum diputuskan** — tercatat untuk pertimbangan lanjut:

| # | Kandidat Output | Manfaat | Pemicu |
|---|---|---|---|
| O1 | Laporan Kecepatan Respon Surat | Ukur SLA keseluruhan | Kalau pimpinan minta |
| O2 | Analisa Kritis per Bulan | Deteksi tren surat kritis | Kalau ada kasus kritis |
| O3 | Evaluasi Kepatuhan SOP Tata Naskah | Audit internal | Kalau ada audit |
| O4 | Dashboard KPI Satpol PP (patroli, penertiban, Damkar) | Khas kantor | Fase 3 |
| O5 | Rekap Disposisi per Pejabat (bukan hanya per surat) | Evaluasi individu | Kalau multi-pejabat |
| O6 | Laporan Otomatis Bulanan (generate + kirim) | Hemat kerja staf | Setelah L1–L5 stabil |
| O7 | Analisa Surat Kritis per Unit | Kewaspadaan unit | Fase 3 |
| O8 | Evaluasi Kepatuhan Format Surat (dari Perbup) | Perbaikan kualitas | Fase 3 |

---

## 14. Total Manfaat (Ringkasan)

| Level | Total Output | Total Hemat/th |
|---|---|---|
| **Level 1 — MVP** (L1–L3 + Dashboard) | 3 laporan dasar + dashboard | ~60 jam/th |
| **Level 2 — Matang** (L1–L10, A1–A5, E1–E4) | 10 L + 5 A + 4 E | ~300 jam/th |
| **Level 3 — Strategis** (semua 35) | 12 L + 10 A + 8 E + 5 RTL | **~480 jam/th** |

**Setara Level 3**: **~60 hari kerja per tahun** — dibebaskan untuk tugas pokok.

---

## 15. Roadmap Bertahap — Rekomendasi

```
┌─────────────────────────────────────────────────────────┐
│ FASE 1 (MVP) — 1–2 minggu                                │
│ ├── Laporan L1, L2, L3, L4, L5                          │
│ ├── Dashboard (KPI + 2 chart + 2 panel)                 │
│ └── 6 modul MVP (Surat Masuk, Surat Keluar, Disposisi,  │
│     Master, Dashboard, Pengaturan)                      │
│                                                          │
│ ↓ PAUSE — ukur manfaat, kumpulkan feedback              │
├─────────────────────────────────────────────────────────┤
│ FASE 2a — 1 minggu                                       │
│ ├── Laporan L7, L8, L9, L10 (arsip)                     │
│ ├── Analisa A1, A3 (tren + distribusi)                 │
│ └── Kearsipan + Naskah Dinas + Pencarian                │
│                                                          │
│ ↓ PAUSE — ukur manfaat                                  │
├─────────────────────────────────────────────────────────┤
│ FASE 2b — 1 minggu                                       │
│ ├── Analisa A2, A4, A5                                  │
│ ├── Evaluasi E1, E2, E3, E4 (SLA + kelengkapan)         │
│ └── Logbook + Export Excel multi-sheet + Preview PDF    │
│                                                          │
│ ↓ PAUSE — ukur manfaat                                  │
├─────────────────────────────────────────────────────────┤
│ FASE 3 — tanpa jadwal                                    │
│ ├── Evaluasi E5–E8 (JRA + prosedur + alih media)        │
│ ├── RTL R1–R5 (pemusnahan + penyerahan + alih media)    │
│ ├── L11, L12 (kepatuhan + khas Satpol)                  │
│ ├── TTE + Integrasi SI-LAHAR + Multi-kantor             │
│ └── Analisa A6–A10                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 16. Definition of Done — Fase 1 (Output)

Fase 1 output **selesai** bila:

**Fungsional**:
- ✅ L1 Daftar Surat Masuk — tabel + filter + export Excel.
- ✅ L2 Daftar Surat Keluar — tabel + filter + export Excel.
- ✅ L3 Daftar Disposisi — tabel + filter + status SLA.
- ✅ L4 Rekap per Klasifikasi — chart doughnut di Dashboard.
- ✅ L5 Rekap per Unit — chart bar di Dashboard.
- ✅ Dashboard 4 KPI + 2 chart + 2 panel (Surat Kritis + Disposisi Jatuh Tempo).

**Kualitas**:
- ✅ Semua output bisa diakses ≤2 klik dari menu utama.
- ✅ Export Excel/PDF berjalan tanpa error.
- ✅ Console browser bersih.
- ✅ Mobile-friendly.

**Manfaat**:
- ✅ Minimal 1 staf sudah pakai untuk tugas nyata (bukan uji coba).
- ✅ Waktu pembuatan laporan berkurang dari manual.

---

## 17. Konsep RTL — Fase Lanjut

**RTL (Rencana Tindak Lanjut)** = aksi konkret setelah evaluasi. Ini fitur Fase 3, tapi konsepnya bisa dicatat sekarang:

| Konsep | Contoh |
|---|---|
| **Sumber RTL** | Evaluasi E5 (kepatuhan JRA rendah) → R1 (rencana perbaikan JRA) |
| **Format** | `{sumber_evaluasi, judul_rtl, assigned_to, due_date, status, progress_pct}` |
| **Sheet** | Belum ada — kandidat `T_RTL` di fase 3 (butuh amendemen skema) |
| **Integrasi** | SI-LAHAR (RTL = tugas harian) atau notifikasi |

**Catatan**: RTL butuh evaluasi matang. Jangan bangun RTL sebelum E1–E8 jalan.

---

## 18. Catatan Penutup

Dokumen ini **living document** — akan di-update setiap kali:
- Ada output baru disetujui pemilik.
- Ada output dihapus karena tidak dipakai.
- Fase selesai & pindah ke fase berikutnya.

**Aturan amendemen**: setiap output baru di dokumen ini → wajib update juga
`02_PRD.md` (user story) + `03_FRD.md` (FR) + `07_TESTCASE.md` (TC) + `08_GAP_LIST.md`
(status). Tanpa itu, output tidak boleh dibangun (aturan Gate 0).

**Filosofi**:
> **"Ukur manfaat dulu, baru bangun. Bukan bangun dulu, baru cari manfaat."**

---

## 19. Status Realisasi per v1.5 (2026-09-21)

| Kategori | ✅ HIDUP | 🟡 PARTIAL | Belum |
|---|---|---|---|
| Laporan (12) | L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12 (12) | — | — |
| Analisa (10) | A1, A2 (2) | A9, A10 (2) | A3–A8 (6) |
| Evaluasi (8) | — | E1 (1) | E2–E8 (7) |
| RTL (5) | — | — | R1–R5 (5) |

**Catatan realisasi v1.5**: paket hemat 4-in-1 menutup semua lubang Laporan sekaligus.
L4 tabel lengkap + pct, L5 per unit via M_PEJABAT→SIMPEG, L11 % patuh JRA, L12 7 sheet khas
(Format Satpol PP KOP+top5+rekap unit+ttd). Piramida Laporan kini **100% HIDUP (12/12)** —
fondasi paling bawah piramida penuh, tinggal Analisa/Evaluasi/RTL di atasnya.
Output di luar piramida yang juga hidup: logbook T7 (v1.3), notifikasi in-app (v1.4),
export xlsx generik 4 sheet (v1.3) + khas 7 sheet (v1.5) — ketiganya 'output proses'.

## Ringkasan

| Aspek | Nilai |
|---|---|
| **Target total output** | **35** (12 L + 10 A + 8 E + 5 RTL) |
| **Fase 1 MVP output** | 5 (L1–L5) + Dashboard |
| **Total manfaat Level 3** | **~480 jam/tahun** (~60 hari kerja) |
| **Prinsip utama** | Piramida Output + Manfaat Terukur |
| **Urutan eksekusi** | Laporan → Analisa → Evaluasi → RTL |
| **Strategi** | Horizontal staging (per kategori, bertahap) |
| **Pemicu tambah output** | Ada pengguna + keputusan + frekuensi ≥2×/tahun |
