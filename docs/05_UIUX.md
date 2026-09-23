# 05 — UI/UX [SI-ARSIP: Sistem Informasi Kearsipan Dinamis — 2026-09-21 v1.10 POLISH UIUX 59/28/0/0/56 🎨]

> Amendemen v1.10 (2026-09-21 malam): Polish UIUX 5 sub-fase — v1.10a tabel & mobile (min-w 59 + table-scroll 28 + overflow 0), v1.10b badge valid (empty 0 + raw badge 0), v1.10c stat-card (custom 0 + app-stat-card 56), v1.10d pagination btn-icon + filter label text-[11px], v1.10e modal :show→v-if + tema #0369a1 locked + preview_v1.10.html 217KB. Backend tetap 203/0/1.
> Amendemen v1.9 rev2 (2026-09-21): +V_Rtl R1-R5 puncak (generate panel + filter bar + stat 4 card + tabel 7 kolom + progress bar + 2 modal), Index 13 include, menu 11 item (8 operasional incl Laporan+Analisa+Evaluasi+RTL +2 kearsipan+2 sistem), audit frontend V_Rtl badge invalid→app-badge + formatTanggal→fmtTgl + :style object fixed.
> Shell & komponen kit dipertahankan: `<app-login>`/`<app-sidebar>`/`<app-header>`,
> `<app-crud-table>`, `<app-filter-bar>`, `<app-badge>`, `<app-modal>`, toast, dark mode.
> Halaman bisnis = view `V_*` (pola modular si-kompetensi & si-kinerja-harian). Modal dipusatkan
> di `V_Modals.html`.
>
> Rujukan: SRIKANDI (ANRI), Permendagri 78/2012.

## Peta halaman (menu sidebar final v1.9 — piramida 35/35 TUTUP)

Menu sidebar = **11 item** (8 operasional termasuk Laporan+Analisa+Evaluasi+RTL + 2 kearsipan + 2 master/sistem).

| Grup | Menu | View | Fase | Isi utama |
|---|---|---|---|---|
| **Utama** | Dashboard | `V_Dashboard.html` | **1** | 4 KPI (`<app-stat-card>`): Surat Masuk Bulan Ini, Surat Keluar Bulan Ini, Disposisi Menunggu, Disposisi Lewat SLA. Chart bar 12 bulan + doughnut top 5 klasifikasi + doughnut status disposisi. Panel **Surat Kritis** + panel **Disposisi Jatuh Tempo**. Export Excel 4 sheet (v1.3) + footer info aplikasi. |
| **Utama** | Laporan | `V_Laporan.html` | **1.5** | **4 tab segmented (L4/L5/L11/L12)**: Klasifikasi (tabel lengkap kode+uraian+masuk/keluar/total+%, filter tahun+search), Per Unit (disposisi per unit + keluar per unit, filter tahun), Kepatuhan JRA (4 stat-card total/patuh/tidak patuh/% + tabel rincian tidak patuh), Bulanan Khas (input month + Export KHAS 7 sheet). |
| **Utama** | Analisa | `V_Analisa.html` | **1.6/1.7** | **8 tab (A3-A10)**: Distribusi Unit, Top Pengirim, Beban Pejabat, Retensi 5th, Klas↔Unit matrix, TTE Ratio, SLA per Pejabat, Kritis Bulanan. Chart bar/doughnut/heatmap. |
| **Utama** | Evaluasi | `V_Evaluasi.html` | **1.8** | **8 tab (E1-E8)**: SLA Disposisi, SLA Keluar, Kelengkapan, Format Nomor, JRA, Musnah, Fisik, Alih Media. Stat-card + doughnut + rincian tabel. |
| **Utama** | RTL | `V_Rtl.html` | **1.9** | **Puncak piramida R1-R5**: Generate panel (sumber semua/E5/E6/E7/E8/E3/A9 + tahun + Generate), filter bar search+status+sumber+tahun, stat 4 card, tabel judul+sumber+status+progress bar+assignee+due+aksi Edit/Ubah Status/Hapus, modal Form + modal Status, paginasi 10. |
| **Utama** | Surat Masuk | `V_SuratMasuk.html` | **1** | `<app-filter-bar>` (tanggal/asal/klasifikasi/sifat) + `<app-crud-table>`. Baris ada badge **Kritis** (kode 005.1/015 atau sifat segera/rahasia). Aksi per baris via menu ⋮: Detail & Lampiran, Ubah, Disposisikan, Hapus. Tombol "Registrasi Surat Masuk". |
| **Utama** | Surat Keluar | `V_SuratKeluar.html` | **1** | `<app-filter-bar>` (tanggal/tujuan/klasifikasi/status) + `<app-crud-table>`. Baris status: draft/review/terkirim. Aksi via ⋮: Detail, Ajukan Review, Terbitkan, Edit, Hapus (saat draft). Tombol "Buat Surat Baru". |
| **Utama** | Disposisi | `V_Disposisi.html` | **1** | `<app-filter-bar>` (status/dari/ke/tanggal + preset rentang) + `<app-crud-table>`. Badge **Lewat SLA**. Aksi: Teruskan, Tandai Diproses, Selesaikan, Hapus. |
| **Utama** | Naskah Dinas | `V_NaskahDinas.html` | **2** | 3 tab segmented: Nota Dinas / Memo / Laporan. CRUD sederhana + status final. |
| **Utama** | Kearsipan | `V_Kearsipan.html` | **2** | 3 tab: Arsip Aktif, Arsip Inaktif, Permanen. Panel "Akan Musnah" di atas. Aksi: Ubah Lokasi, Tandai Musnah (BA), Tandai Serah. |
| **Utama** | Pencarian | `V_Pencarian.html` | **2** | Satu search box besar + filter jenis/tahun/klasifikasi. Hasil dari 4 sheet (Surat Masuk, Surat Keluar, Naskah Dinas, Arsip) dengan badge jenis. |
| **Master** | Master Data | `V_Master.html` | **1** | 3 tab segmented: **Klasifikasi** / **Pejabat** / **Template**. Filter + paginasi per tab. Aksi tabel pakai `.btn-icon`/`.btn-icon-danger`. Admin-only. |
| **Sistem** | Pengaturan | `V_Pengaturan.html` | **1** | Wrapper `<app-settings>` kit (self-contained). Admin-only. |

**Catatan**: Menu "Naskah Dinas", "Kearsipan", "Pencarian" **disembunyikan** di Fase 1 (via `adminOnly` false & `fase: 2` di config menu) — supaya UI tidak bingung. Dibuka saat Fase 2 mulai.

## Modal terpusat di `V_Modals.html`

Semua modal pakai kit `<app-modal>`:

| # | Modal | Size | Fase | Pattern v1.10 | Fungsi |
|---|---|---|---|---|---|
| 1 | **Form Surat Masuk** | 2xl | **1** | v-if + @close | Registrasi surat dari luar |
| 2 | **Form Surat Keluar** | 2xl | **1** | v-if + @close | Buat draft / edit surat |
| 3 | **Detail Dokumen** | 3xl | **1** | v-if + @close + :show-confirm false | Detail lengkap + timeline disposisi + lampiran preview inline (G29/G30) |
| 4 | **Form Disposisi** | lg | **1** | v-if + @close | Buat disposisi + pilih pejabat |
| 5 | **Form Klasifikasi** | lg | **1** | v-if + @close | CRUD master klasifikasi |
| 6 | **Form Pejabat** | lg | **1** | v-if + @close | CRUD master pejabat |
| 7 | **Form Naskah Dinas** | 2xl | 2 | v-if + @close | Buat/edit naskah |
| 8 | **Form Aksi Arsip (lokasi/musnah/serah)** | lg | 2 | v-if arAksiMode !== '' | Ubah lokasi fisik / BA musnah / BA serah |
| 9 | **Form Template** | lg | **1** | v-if + @close | CRUD master template |
| 10 | **Form RTL** | lg | **1.9** | v-if showRtlForm + @close | CRUD RTL R1-R5 puncak piramida |
| 11 | **Status RTL** | md | **1.9** | v-if showRtlStatusForm + @close | Ubah status RTL + progress |

> **Fase 1**: modal #1-#6, #9. **Fase 2**: modal #7-#8. **v1.9**: modal #10-#11. **Total 11 modal** (9 di V_Modals.html + 2 di V_Rtl.html) — semua v-if + @close per v1.10e.

**Fase 1**: modal #1–#9. **Fase 2**: modal #10–#12.

## Shell & arsitektur file

`Index.html` = **shell tipis**:
- Pin CDN `@v2.9.1 (1 CSS+9 JS)` (10 aset (1 CSS+9 JS): `app-common.min.css` + 9 JS (`app-core`, `app-components`, `app-modules`, `app-layout`, `app-ui`, `app-forms`, `app-data`, `app-charts`, `app-workflow`)).
- Vue 3.5.42 + Font Awesome 6.5.2 + Tailwind Play.
- Identitas tema `:root` (`--primary-*`) — **warna SI-ARSIP: biru tua** (khas kearsipan).
- Boot dark-mode: kunci `siarsip_dark`.
- Window var SSO: `__SSO_TICKET__`, `__IS_SSO_ENTRY__`.
- Include satu tingkat (v1.9): `V_Modals` → `V_Dashboard` → `V_Laporan` → `V_Analisa` → `V_Evaluasi` → `V_Rtl` → `V_SuratMasuk` → `V_SuratKeluar` → `V_NaskahDinas` → `V_Disposisi` → `V_Kearsipan` → `V_Pencarian` → `V_Master` → `V_Pengaturan`; `J_State` → `J_Helpers` → `J_Api` → `J_Actions` → `J_Export` → `J_App`.
- **Tidak ada** `A0_Head.html` (head inline).

### Tema warna SI-ARSIP — v1.10 locked #0369a1 (sky-700)

```css
:root {
  --primary:         #0369a1;   /* sky-700 — kesan arsip modern, dipilih v1.10 (vs #1e40af blue-800 lama) */
  --primary-dark:    #075985;   /* sky-800 */
  --primary-light:   #f0f9ff;   /* sky-50  */
  --primary-lighter: #e0f2fe;   /* sky-100 */
  --primary-text:    #0c4a6e;   /* sky-900 */
  --primary-accent:  #38bdf8;   /* sky-400 */
  --primary-rgb:     3, 105, 161;
}
```
> **Keputusan tema v1.10:** `#0369a1` (sky-700) — sinkron di `Index.html` meta theme-color + :root + tailwind config 600:#0284c7 700:#0369a1 800:#075985 900:#0c4a6e. `#1e40af` (blue-800) hanya di docs lama, src 0. Light theme `bg-slate-100 dark:bg-slate-950` dipertahankan.


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
- **min-w mobile v1.10**: semua `<th>` wajib `min-w-[...]` agar di HP 360px tidak gepeng — Judul/Perihal/Asal/Tujuan `min-w-[260px]`, Agenda/Nomor/Klasifikasi `min-w-[160-180px]`, Sifat/Status `min-w-[100px]`, Aksi `min-w-[120px]`. Wrapper tabel wajib `table-scroll` (kit punya shadow/fade), bukan `overflow-x-auto`. Acceptance: `grep min-w-\[ >=30` (v1.10 = 59), `table-scroll` 28, `overflow-x-auto` 0.
- **Badge valid v1.10**: hanya via `<app-badge :status="...">` — valid: aktif/selesai/disetujui/ditolak/batal/revisi/verifikasi/draft/belum/menunggu/proses/success/danger/warning/info/emerald/purple/nonaktif. Mapping: selesai/terkirim/terarsip/permanen=disetujui, didisposisi/review/final/diproses=menunggu/proses, rahasia/musnah/batal=ditolak, biasa/aktif=aktif, draft=draft, nonaktif=nonaktif. Dilarang raw class `badge-sky/rose/amber/gray`. Empty status 0.
- **Stat-card v1.10**: semua KPI wajib `<app-stat-card>` — tidak ada custom `card !p-3 text-center` + `text-lg font-black`. Props: title, :value, icon fa-solid, color sky/emerald/amber/rose, subtext. Acceptance: custom 0, app-stat-card 56.
- **Pagination v1.10**: standard `<button class="btn-icon" :disabled="page<=1" @click="loadX(page-1)"><i class="fa-solid fa-chevron-left"></i></button>` + kanan chevron-right. Dilarang `btn-ghost btn-xs` untuk pagination. Acceptance: 0 btn-ghost btn-xs.
- **Filter bar v1.10**: transaksional sudah `<app-filter-bar>` ✅. Analitik (Laporan/Analisa/Evaluasi/RTL) standard `flex flex-col sm:flex-row gap-2 items-end` + tiap input punya `<label class="text-[11px] text-slate-500">Tahun/Cari/Bulan</label>` + `input w-full` + placeholder jelas. Acceptance: semua filter ada label text-[11px].
- **Modal v1.10**: migrasi dari `:show="showX"` → `v-if="showX" @close="showX=false"` + :title + size md/lg/2xl/3xl + @confirm + loading spinner `fa-spinner fa-spin`. Ukuran: konfirmasi md, form master lg, transaksi 2xl, detail panjang 3xl. Acceptance: :show= 0.

- **Opsi waktu dinamis**: pemilih tahun/bulan SELALU computed (tahun ini ±2), **tidak pernah hardcode**.
- **Tombol aksi tabel**: 32×32 pakai `.btn-icon` / `.btn-icon-danger` (kit CDN v2.9.1/F2).

## Komponen kit yang dipakai (v2.9.1)

| Komponen | Dipakai di |
|---|---|
| `<app-login>` | `Index.html` (login SSO gateway) |
| `<app-sidebar>` / `<app-header>` | `Index.html` (shell); header punya `slot #extra-actions` (opsional) |
| `<app-stat-card>` | `V_Dashboard.html` (×4) + `V_Rtl.html` (×4) + `V_Laporan.html` (L4 3 + L11 4 =7) + `V_Analisa.html` (A3 3 + A6 2 + A8 3 =8) + `V_Evaluasi.html` (E1 4 + E2 3 + E3 4 + E4 4 + E5 3 + E6 3 + E7 3 + E8 4 =28) = total 56 (v1.10) |
| `<app-chart-bar>` / `<app-chart-doughnut>` (`bare`) | `V_Dashboard.html` |
| `<app-crud-table>` | `V_SuratMasuk`, `V_SuratKeluar`, `V_Disposisi`, `V_Master` (3 tab), `V_Kearsipan`, `V_NaskahDinas` |
| `<app-filter-bar>` | `V_SuratMasuk`, `V_SuratKeluar`, `V_Disposisi`, `V_Pencarian` |
| `<app-empty-state>` | Semua halaman (empty state) |
| `<app-skeleton>` | Semua halaman (loading) |
| `<app-modal>` | `V_Modals.html` (12 modal) |
| `<app-badge>` | Semua tabel + dashboard |
| `<app-pegawai-picker>` | Modal Form Pejabat (pilih pegawai dari SIMPEG) |
| `<app-settings>` (modul kit) | `V_Pengaturan.html` |

**Kelas CSS kit yang dipakai**: `.card`, `.btn*`, `.btn-icon`, `.btn-icon-danger`, `.btn-lg`, `.btn-aksi`, `.input`, `.form-label`, `.badge*`, `.toast-*`, `.modal-backdrop`, `.modal-content`, `.table-scroll`, `.animate-fade-in`, `.line-clamp-1/2` — semua dari `app-common.css` v2.9.1.

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

## Praktik baik yang diadopsi (dari si-kompetensi & si-kinerja-harian)

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

---

## Amendemen 2026-09-20 — Peta modul logika `J_*`
| Modul | Memuat | Dipakai halaman |
|---|---|---|
| `J_State` | state & filter per modul | semua |
| `J_Api` | loader data (sm/sk/dp/master/dash/arsip/pencarian) | semua |
| `J_Actions` | simpan/hapus/transisi/disposisi | SuratMasuk, SuratKeluar, NaskahDinas, Disposisi, Master |
| `J_Export` | ekspor Excel/PDF kit | SuratMasuk, SuratKeluar, Kearsipan, Laporan |
| `J_Arsip` | retensi, musnah/serah, pencarian global | Kearsipan, Pencarian |
| `J_App` | bootstrap, menu, navigasi, dark-mode | shell |
Aturan: include satu tingkat dari Index; tanpa nested include; komponen kit `<app-*>` wajib; aksi tabel `.btn-icon`/`.btn-icon-danger`.
