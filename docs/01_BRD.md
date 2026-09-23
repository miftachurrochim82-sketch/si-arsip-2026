# 01 — BRD [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21 v1.9 PIRAMIDA 35/35 TUTUP 🎓]

> Amendemen v1.9 (2026-09-21 rev2): 11 sheet (3 master + 8 tabel incl T_RTL), 20 file .gs, 72 handler, 203/0/1 suite, piramida final 12+10+8+5=35 TUTUP. Audit backend+frontend selesai.
> SI-ARSIP = **kloning SRIKANDI** untuk skop **kantor Satpol PP & Damkar Kab. Trenggalek**.
> Bukan SRIKANDI nasional (lintas K/L/D), tapi versi lokal yang bisa diperluas ke SKPD lain
> di fase lanjut. Menyederhanakan alur surat-menyurat dinas + kearsipan dinamis, dengan
> pengembangan fitur khas kantor + piramida output Laporan>Analisa>Evaluasi>RTL.

| Butir | Isi |
|---|---|
| Nama & kode | `SI-ARSIP` — Sistem Informasi Kearsipan Dinamis; kode app `SIARSIP` |
| Masalah | (a) Surat masuk/keluar tercatat di buku/Excel terpisah; (b) Disposisi tidak terpantau (siapa, kapan, status); (c) Pencarian surat lama sulit (harus buka buku fisik); (d) Penomoran surat manual rawan duplikat; (e) Retensi & arsip statis tidak terkelola |
| Rujukan konsep | **SRIKANDI** (ANRI + KemenPANRB + BSSN + Kominfo); **UU 43/2009** tentang Kearsipan; **PP 28/2012** tentang Pelaksanaan UU Kearsipan; **Permendagri 78/2012** tentang Tata Naskah Dinas; **Perka ANRI** tentang JRA |
| Pengguna | **viewer** = ASN Satpol PP (lihat surat yang relevan); **user** = staf pengelola surat (registrasi, draft); **verifikator** = Kasubbag/Kasi (disposisi, approve); **admin** = Sekretaris/Kabid (kelola master + audit); **super** = admin platform |
| Ukuran sukses (**diusulkan**) | (a) ≥90% surat masuk/keluar tercatat ≤1 hari kerja; (b) 0 surat tanpa nomor resmi; (c) pencarian surat ≤30 detik; (d) 100% surat ter-disposisi ≤2 hari kerja; (e) waktu buat laporan bulanan turun dari 4 jam → 10 menit |
| BATAS | Tidak mengelola kepegawaian (SIMPEG), user/role (SI-PLATFORM), TTE (BSrE = fase lanjut); upload file biner ke Drive = fase 2 (v1 = link); integrasi SIASN = fase lanjut |
| Wali data | Pemilik aplikasi (user) — perubahan skema wajib amendemen docs (Gate 0) |
| App ekosistem | `si-platform` (SSO), SIMPEG (referensi pegawai & unit), **CoreLib pin 17**, **CDN v2.9.1**, `si-kinerja-harian` (integrasi fase 2) |

## Nilai bisnis

1. **Surat tercatat rapi** — semua surat masuk/keluar punya jejak digital, tidak hilang di buku fisik.
2. **Disposisi terpantau** — atasan tahu status surat yang sudah/belum ditindaklanjuti.
3. **Pencarian cepat** — cari surat berdasarkan nomor, klasifikasi, perihal, pengirim, tanggal.
4. **Penomoran otomatis** — tidak ada duplikat nomor surat; format standar tata naskah dinas.
5. **Retensi terkelola** — surat yang habis masa retensi otomatis masuk daftar musnah/serah.

## Paket ruang tumbuh (11 sheet v1.9: master 3 + tabel 8 incl T_RTL — piramida 35/35 TUTUP)

| Kode | Sheet | Jenis | Piramida |
|---|---|---|---|
| M1 | `M_KLASIFIKASI` | master kode klasifikasi ANRI + uraian | — |
| M2 | `M_PEJABAT` | master pejabat kantor (dari SIMPEG + jabatan + tanda tangan) | — |
| M3 | `M_TEMPLATE` | master template naskah (kop, format, kode default) | — |
| T1 | `T_SURAT_MASUK` | tabel surat dari luar kantor | Laporan L1-L3 |
| T2 | `T_SURAT_KELUAR` | tabel surat dari kantor | Laporan |
| T3 | `T_NASKAH_DINAS` | tabel nota dinas / memo / laporan internal | — |
| T4 | `T_DISPOSISI` | tabel disposisi atasan | Analisa A3-A10, Evaluasi E1-E2 |
| T5 | `T_ARSIP` | tabel arsip (setelah naskah selesai) | Evaluasi E5-E8 |
| T6 | `T_LAMPIRAN` | tabel file scan / link / bukti | — |
| T7 | `T_LOGBOOK` | tabel audit trail | — |
| T8 | `T_RTL` | **NEW v1.9** Rencana Tindak Lanjut R1-R5 (pemusnahan, serah permanen, alih media, restorasi, pelatihan) | **RTL R1-R5 puncak** |

## Kepatuhan platform (ekosistem)

- **CoreLib First**: seluruh util generik (tanggal, paginasi, pencarian, whitelist, role)
  pakai CoreLib v2.4.0 pin 17. Tanggal sadar-WIB: `todayIsoLocal()`, `dateKey10()`.
- **CDN kit v2.9.1**: seluruh UI pakai `<app-*>` kit. `.btn-icon`/`.btn-icon-danger` untuk
  aksi tabel.
- **Struktur modular**: `V_*.html` per halaman + `J_*.html` per modul logika.

## Fitur khas Satpol PP (yang tidak ada di SRIKANDI nasional)

1. **Integrasi SI-LAHAR** (fase 2) — surat tugas → entri e-Kinerja Harian.
2. **Template Surat Satpol PP** — Surat Tugas Patroli, SPK Penertiban, BA Pemeriksaan, dll.
3. **Dashboard Satpol PP** — KPI ringkas (surat patroli, penertiban, Damkar).
4. **Alert Surat Kritis** — highlight kode klasifikasi penting (`005.1` UU, `015` SPK).
5. **Export Excel khas Satpol PP** — format laporan bulanan.

## Fitur masa depan (fase lanjut, tercatat)

- **TTE** (BSrE atau internal) — fase 3 setelah alur surat matang.
- **Upload file biner ke Drive** — fase 2 (v1 = link).
- **Multi-kantor** — arsitektur siap, tapi single-tenant dulu.
- **Disposisi multi-level** — fase 2.
- **Integrasi SIASN/SRIKANDI nasional** — fase lanjut.
- **Naskah Dinas & Template Generator PDF** — fase 2.

## Modul (rencana awal untuk PRD)

| Kode | Modul | Prioritas |
|---|---|---|
| P1 | Surat Masuk | **MVP** |
| P2 | Surat Keluar | **MVP** |
| P3 | Disposisi | **MVP** (sederhana) |
| P4 | Naskah Dinas | Fase 2 |
| P5 | Kearsipan & Retensi | Fase 2 |
| P6 | Pencarian Lintas | Fase 2 |
| P7 | Dashboard | Fase 1 (KPI dasar) |
| P8 | Master (klasifikasi, pejabat, template) | **MVP** |
| P9 | Pengaturan | Fase 1 |
