# 05 — UI/UX [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-20]

> Shell & komponen kit dipertahankan: `<app-login>`/`<app-sidebar>`/`<app-header>`,
> `<app-crud-table>`, `<app-filter-bar>`, `<app-badge>`, `<app-modal>`, toast, dark mode.
> Halaman bisnis = view `V_*` (pola modular si-kompetensi & si-lahar). Modal dipusatkan
> di `V_Modals.html`.
>
> Rujukan: SRIKANDI (ANRI), Permendagri 78/2012.

## Peta halaman (menu sidebar final)

Menu sidebar = **9 item** (6 operasional + 2 master/sistem + 1 fase 2).

| Grup | Menu | View | Fase | Isi utama |
|---|---|---|---|---|
| **Utama** | Dashboard | `V_Dashboard.html` | **1** | 4 KPI (`<app-stat-card>`): Surat Masuk Bulan Ini, Surat Keluar Bulan Ini, Disposisi Menunggu, Disposisi Lewat SLA. Chart bar 12 bulan + doughnut top 5 klasifikasi. Panel **Surat Kritis** + panel **Disposisi Jatuh Tempo**. Footer info aplikasi. |
| **Utama** | Surat Masuk | `V_SuratMasuk.html` | **1** | `<app-filter-bar>` (tanggal/asal/klasifikasi/sifat) + `<app-crud-table>`. Baris ada badge **Kritis** (kode 005.1/015 atau sifat segera/rahasia). Aksi per baris: Detail, Disposisi, Edit, Hapus. Tombol "Registrasi Surat Masuk". |
| **Utama** | Surat Keluar | `V_SuratKeluar.html` | **1** | `<app-filter-bar>` (tanggal/tujuan/klasifikasi/status) + `<app-crud-table>`. Baris status: draft/review/terkirim. Aksi: Detail, Ajukan Review, Terbitkan, Edit, Hapus (saat draft). Tombol "Buat Surat Baru". |
| **Utama** | Disposisi | `V_Disposisi.html` | **1** | `<app-filter-bar>` (status/dari/ke/tanggal) + `<app-crud-table>`. Badge **Lewat SLA** (jatuh tempo lewat & belum selesai). Aksi: Teruskan, Tandai Diproses, Selesaikan, Hapus. |
| **Utama** | Naskah Dinas | `V_NaskahDinas.html` | **2** | 3 tab segmented: Nota Dinas / Memo / Laporan. CRUD sederhana + status final. |
| **Utama** | Kearsipan | `V_Kearsipan.html` | **2** | 3 tab: Arsip Aktif, Arsip Inaktif, Permanen. Panel "Akan Musnah" di atas. Aksi: Ubah Lokasi, Tandai Musnah (BA), Tandai Serah. |
| **Utama** | Pencarian | `V_Pencarian.html` | **2** | Satu search box besar + filter jenis/tahun/klasifikasi. Hasil dari 4 sheet (Surat Masuk, Surat Keluar, Naskah Dinas, Arsip) dengan badge jenis. |
| **Master** | Master Data | `V_Master.html` | **1** | 3 tab segmented: **Klasifikasi** / **Pejabat** / **Template**. Filter + paginasi per tab. Aksi tabel pakai `.btn-icon`/`.btn-icon-danger`. Admin-only. |
| **Sistem** | Pengaturan | `V_Pengaturan.html` | **1** | Wrapper `<app-settings>` kit (self-contained). Admin-only. |

**Catatan**: Menu "Naskah Dinas", "Kearsipan", "Pencarian" **disembunyikan** di Fase 1 (via `adminOnly` false & `fase: 2` di config menu) — supaya UI tidak bingung. Dibuka saat Fase 2 mulai.

## Modal terpusat di `V_Modals.html`

Semua modal pakai kit `<app-modal>`:

| # | Modal | Size | Fase | Fungsi |
|---|---|---|---|---|
| 1 | **Form Surat Masuk** | 2xl | **1** | Registrasi surat dari luar |
| 2 | **Form Surat Keluar** | 2xl | **1** | Buat draft / edit surat |
| 3 | **Detail Surat** | 3xl | **1** | Detail lengkap + daftar disposisi nested + lampiran |
| 4 | **Form Disposisi** | 2xl | **1** | Buat disposisi + pilih pejabat |
| 5 | **Form Ajukan Review** | md | **1** | Konfirmasi ubah status draft → review |
| 6 | **Form Terbitkan** | md | **1** | Konfirmasi ubah review → terkirim |
| 7 | **Form Klasifikasi** | lg | **1** | CRUD master klasifikasi |
| 8 | **Form Pejabat** | lg | **1** | CRUD master pejabat |
| 9 | **Form Template** | lg | **1** | CRUD master template |
| 10 | **Form Naskah Dinas** | 2xl | 2 | Buat/edit naskah |
| 11 | **Form Tandai Musnah** | lg | 2 | BA pemusnahan |
| 12 | **Form Tandai Serah** | lg | 2 | BA penyerahan |

**Fase 1**: modal #1–#9. **Fase 2**: modal #10–#12.

## Shell & arsitektur file

`Index.html` = **shell tipis**:
- Pin CDN `@v2.8.1` (4 aset: `app-common.min.css`, `app-components.min.js`, `app-core.min.js`, `app-modules.min.js`).
- Vue 3.5.42 + Font Awesome 6.5.2 + Tailwind Play.
- Identitas tema `:root` (`--primary-*`) — **warna SI-ARSIP: biru tua** (khas kearsipan).
- Boot dark-mode: kunci `siarsip_dark`.
- Window var SSO: `__SSO_TICKET__`, `__IS_SSO_ENTRY__`.
- Include satu tingkat: `V_Modals` → `V_Dashboard` → `V_SuratMasuk` → `V_SuratKeluar` → `V_Disposisi` → `V_Master` → `V_Pengaturan`; `J_State` → `J_Helpers` → `J_Api` → `J_Actions` → `J_Export` → `J_App`.
- **Tidak ada** `A0_Head.html` (head inline).

### Tema warna SI-ARSIP

```css
:root {
  --primary:         #1e40af;   /* blue-800 — kesan formal/arsip */
  --primary-dark:    #1e3a8a;   /* blue-900 */
  --primary-light:   #eff6ff;   /* blue-50  */
  --primary-lighter: #dbeafe;   /* blue-100 */
  --primary-text:    #1e3a8a;   /* blue-900 */
  --primary-accent:  #60a5fa;   /* blue-400 */
  --primary-rgb:     30, 64, 175;
}
```

## Aturan desain (konsisten lintas app)

- **Segmented tabs**: grid 3 kolom equal, aktif solid biru + ring biru; `<app-badge>` count di kanan label.
- **Filter bar**: grid 4 kolom @25% — Search, Filter 1, Filter 2, [🔄 Refresh] [＋ Tambah]. Khusus tab Portofolio (kalau ada) grid 5 kolom @20%.
- **Modal**: seluruh modal via kit `<app-modal>`. Size: `md` (konfirmasi), `lg` (form master), `2xl` (form transaksi), `3xl` (detail panjang).
- **Badge status**: 
  - Surat Masuk: `baru` → info, `didiposisi` → warning, `selesai` → success.
  - Surat Keluar: `draft` → netral, `review` → warning, `terkirim` → success.
  - Disposisi: `diteruskan` → info, `diproses` → warning, `selesai` → success.
- **Badge khusus**: **Kritis** (merah, ikon `fa-triangle-exclamation`), **Lewat SLA** (merah, animasi pulse), **Permanen** (ungu), **Musnah** (abu).
- **Alert Surat Kritis**: baris tabel dengan latar merah tipis (`bg-rose-50/40`) + badge di kolom status.
- **Dark mode**: semua view wajib varian dark (token kit).
- **min-w mobile**: kolom penting `<app-crud-table>` wajib `thClass min-w-[...]` agar scroll horizontal mulus di HP. Nomor surat & perihal `min-w-[220px]`.
- **Opsi waktu dinamis**: pemilih tahun/bulan SELALU computed (tahun ini ±2), **tidak pernah hardcode**.
- **Tombol aksi tabel**: 32×32 pakai `.btn-icon` / `.btn-icon-danger` (kit CDN v2.8.0/F2).

## Komponen kit yang dipakai (v2.8.1)

| Komponen | Dipakai di |
|---|---|
| `<app-login>` | `Index.html` (login SSO gateway) |
| `<app-sidebar>` / `<app-header>` | `Index.html` (shell); header punya `slot #extra-actions` (opsional) |
| `<app-stat-card>` | `V_Dashboard.html` (×4) |
| `<app-chart-bar>` / `<app-chart-doughnut>` (`bare`) | `V_Dashboard.html` |
| `<app-crud-table>` | `V_SuratMasuk`, `V_SuratKeluar`, `V_Disposisi`, `V_Master` (3 tab), `V_Kearsipan`, `V_NaskahDinas` |
| `<app-filter-bar>` | `V_SuratMasuk`, `V_SuratKeluar`, `V_Disposisi`, `V_Pencarian` |
| `<app-empty-state>` | Semua halaman (empty state) |
| `<app-skeleton>` | Semua halaman (loading) |
| `<app-modal>` | `V_Modals.html` (12 modal) |
| `<app-badge>` | Semua tabel + dashboard |
| `<app-pegawai-picker>` | Modal Form Pejabat (pilih pegawai dari SIMPEG) |
| `<app-settings>` (modul kit) | `V_Pengaturan.html` |

**Kelas CSS kit yang dipakai**: `.card`, `.btn*`, `.btn-icon`, `.btn-icon-danger`, `.btn-lg`, `.btn-aksi`, `.input`, `.form-label`, `.badge*`, `.toast-*`, `.modal-backdrop`, `.modal-content`, `.table-scroll`, `.animate-fade-in`, `.line-clamp-1/2` — semua dari `app-common.css` v2.8.1.

**Helper kit**:
- `AppCore.paginate(list, page, perPage)` + `AppCore.pageCount(list, perPage)` — untuk paginasi client-side.
- `this.namaPegawai(id)`, `this.namaUnit(id)`, `this.namaJabatan(id)` — lookup SIMPEG.
- `this.formatDateDisplay(val)`, `this.formatDateTimeDisplay(val)` — format tanggal.
- `this.showToast(msg, type)` — notifikasi.

## Custom UI yang dipertahankan (diizinkan)

- **Badge Kritis** — komponen visual khusus untuk surat kritis (kombinasi ikon + warna + label).
- **Panel Surat Kritis** di Dashboard — tabel ringkas 10 baris terbaru dengan flag kritis.
- **Panel Disposisi Jatuh Tempo** di Dashboard — list 10 baris dengan badge SLA.
- **Kartu detail surat** di dalam modal detail — layout khusus (2 kolom: info + disposisi timeline).
- **Timeline disposisi** di modal Detail Surat — vertikal dengan ikon status.

## Praktik baik yang diadopsi (dari si-kompetensi & si-lahar)

| # | Adopsi | Item kode |
|---|---|---|
| 1 | Tab segmented lebar (ikon + label + count) | `V_Master.html` (3 tab), `V_Kearsipan.html` (3 tab) |
| 2 | Filter bar per tab (bukan global) | `V_SuratMasuk`, `V_SuratKeluar`, `V_Disposisi` |
| 3 | Tombol aksi tabel 32×32 (`.btn-icon`) | Semua tabel |
| 4 | Modal terpusat di `V_Modals.html` | sudah |
| 5 | Helper murni di `J_Helpers.html` | sudah |
| 6 | Empty state via `<app-empty-state>` | semua halaman |
| 7 | Skeleton loading via `<app-skeleton>` | semua halaman |
| 8 | Min-w mobile untuk kolom penting | semua tabel |
| 9 | Badge status dengan warna konsisten | semua |
| 10 | Preview PDF inline di modal (opsional) | modal Detail Surat (fase 2) |

## Backlog polesan (dari review pemilik, usulan)

- **Timeline disposisi visual** — perbaikan dari list simple ke timeline bertingkat (fase 2).
- **Preview PDF inline** di modal Detail Surat — kalau nanti upload Drive aktif (fase 2).
- **Drag-drop status** di tabel Surat Keluar — dari `draft` ke `review` via drag (fase 2).
- **Notifikasi in-app** untuk disposisi baru (fase 2).
- **Quick action** di baris tabel — dropdown aksi (Detail/Edit/Hapus/Disposisi) untuk hemat ruang (fase 2).
- **Filter lanjutan** — filter dengan rentang tanggal kalender (fase 2).
- **Export Excel multi-sheet** untuk laporan bulanan (fase 2).
- **Pencarian suara** di `V_Pencarian.html` — pakai Web Speech API (eksperimental, fase 3).

## Catatan Fase 1 (MVP)

Untuk MVP (Fase 1), UI yang dibangun:
- ✅ `Index.html` (shell)
- ✅ `V_Dashboard.html` (4 KPI + 2 chart + 2 panel)
- ✅ `V_SuratMasuk.html` (filter + tabel + tombol registrasi)
- ✅ `V_SuratKeluar.html` (filter + tabel + tombol buat)
- ✅ `V_Disposisi.html` (filter + tabel)
- ✅ `V_Master.html` (3 tab segmented)
- ✅ `V_Pengaturan.html` (wrapper `<app-settings>`)
- ✅ `V_Modals.html` (9 modal Fase 1)
- ✅ `J_*` (6 file: State, Helpers, Api, Actions, Export, App)

**Fase 2 (di luar scope MVP)**:
- `V_NaskahDinas.html`, `V_Kearsipan.html`, `V_Pencarian.html`
- 3 modal tambahan
- `09_PROFIL_KINERJA.md` (analog) — jika dibutuhkan
