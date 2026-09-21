# Kandidat CDN v2.9.0 — dari Polish UIUX v1.10 SI-ARSIP

> **Status:** 2026-09-21 malam — setelah v1.10 SELESAI (59 min-w, 28 table-scroll, 0 overflow, 0 custom card, 56 app-stat-card, 0 :show, tema #0369a1). Backend 203/0/1 hijau.
> **Prinsip CDN (user 2026-09-18):** apps harus konvergen ke CDN, A0_Head CSS di Index = blueprint baru. Kandidat di sini = pola berulang yang muncul di ≥2 app atau ≥3 halaman dalam 1 app.

## Ringkasan Pola Baru v1.10

| Pola | Muncul di | Status di v2.8.1 | Usulan v2.9.0 |
|---|---|---|---|
| `min-w-[...]` di th + `table-scroll` wrapper | 11 V_* (59 hits) | `table-scroll` sudah ada, tapi `min-w` rule belum di doc | **Dokumentasi + contoh** di CDN_SNIPPET, bukan CSS baru — cukup panduan |
| `app-stat-card` untuk KPI | 56 usage (Dashboard 4, Rtl 4, Laporan 7, Analisa 8, Evaluasi 28) | sudah ada di CDN v2.8.1 | **Tetap**, tidak perlu baru — hanya pastikan subtext prop dipakai konsisten |
| Badge mapping valid list | 15+ mapping di semua V_* | `app-badge` status sudah ada (aktif/disetujui/ditolak/menunggu/proses/draft/nonaktif dll) | **Tambah helper JS** `AppCore.badgeStatusMap` untuk mapping umum? Atau dokumentasi mapping |
| Filter bar analytics (label text-[11px] + flex gap-2 items-end) | Laporan L4/L5/L11/L12, Analisa, Evaluasi, Rtl | `app-filter-bar` ada untuk transaksional, tapi untuk analitik masih custom flex | **Kandidat C1**: `.filter-bar-analytics` + `.filter-label` |
| Progress bar RTL (w-16 h-2 bg-slate-200 rounded + inner emerald width %) | V_Rtl.html | belum ada komponen | **Kandidat C2**: `<app-progress-bar :value="pct" color="emerald" :show-label="true">` atau CSS `.progress-bar` |
| Pagination btn-icon chevron | 6 halaman (Sm, Sk, Dp, Nd, Arsip, Rtl) | `.btn-icon` sudah ada v2.8.0 | **Tetap**, hanya dokumentasi |
| Modal v-if + @close | 11 modal (9 V_Modals + 2 V_Rtl) | `<app-modal>` sudah dukung v-if (Vue) | **Update docs** — contoh migrasi :show→v-if |
| Label `text-[11px] text-slate-500` | Rtl, Laporan, Analisa, Evaluasi | belum ada class util | **Kandidat C3**: `.form-label-sm` atau `.filter-label` |

## Detail Kandidat C1-C3 untuk v2.9.0

### C1 — Filter Bar Analytics (CSS util baru)

**Masalah:** `app-filter-bar` cocok untuk transaksional (search + select + date), tapi untuk analitik (tahun + tombol Tampilkan) masih custom `flex flex-col sm:flex-row gap-2 items-end` berulang di 4 halaman.

**Usulan:**
```css
/* di app-common.css */
.filter-bar-analytics {
  @apply flex flex-col sm:flex-row gap-2 items-end;
}
.filter-label {
  @apply text-[11px] text-slate-500 dark:text-slate-400 font-medium;
}
```

**Pemakaian:**
```html
<div class="filter-bar-analytics">
  <h3 class="mr-auto">Rekap per Klasifikasi (L4)</h3>
  <div class="w-28">
    <label class="filter-label">Tahun</label>
    <input type="text" class="input w-full" v-model="tahun">
  </div>
  <button class="btn btn-primary">Tampilkan</button>
</div>
```

**Impact:** 4 file (Laporan, Analisa, Evaluasi, Rtl) bisa pakai class baru, kurangi duplikasi.

**Status:** KANDIDAT — tunggu cek apakah si-lahar & si-kompetensi juga punya pola sama. Jika ya, promosi ke v2.9.0.

---

### C2 — Progress Bar (komponen baru atau CSS)

**Masalah:** RTL punya progress bar custom:
```html
<div class="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden inline-block align-middle mr-1">
  <div class="h-full bg-emerald-500" :style="{ width: (r.progress_pct||0) + '%' }"></div>
</div>
<span class="text-[11px]">{{ r.progress_pct || 0 }}%</span>
```

Berulang di banyak app kalau ada fitur progress.

**Usulan Opsi A — CSS util:**
```css
.progress-track { @apply w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden inline-block; }
.progress-fill { @apply h-full bg-emerald-500 transition-all; }
.progress-fill.sky { @apply bg-sky-500; }
.progress-fill.amber { @apply bg-amber-500; }
.progress-fill.rose { @apply bg-rose-500; }
```

**Usulan Opsi B — Komponen Vue:**
```html
<app-progress-bar :value="r.progress_pct" color="emerald" size="sm" :show-label="true"></app-progress-bar>
```
Props: value (0-100), color (emerald/sky/amber/rose), size (sm/md), show-label boolean.

**Rekomendasi:** Opsi A dulu (CSS ringan) untuk v2.9.0, Opsi B kalau ada ≥3 app butuh.

**Status:** KANDIDAT — simpan dulu di si-arsip, jika si-kompetensi/si-lahar butuh progress, promosi.

---

### C3 — Form Label Small (CSS util)

**Masalah:** `text-[11px] text-slate-500` berulang 20+ kali sebagai label filter.

**Usulan:**
```css
.form-label-sm { @apply text-[11px] text-slate-500 dark:text-slate-400; }
```
Atau pakai `.filter-label` dari C1 (sama).

**Status:** KANDIDAT — gabung dengan C1.

---

## Yang TIDAK perlu naik CDN (sudah ada atau bukan pola umum)

| Pola | Alasan tidak naik |
|---|---|
| `min-w-[...]` di th | Sudah best practice Tailwind, cukup dokumentasi di 05_UIUX — bukan CSS baru |
| `table-scroll` | Sudah ada di app-common.css v2.8.1 (shadow/fade) |
| `btn-icon` / `btn-icon-danger` | Sudah ada v2.8.0 (F2) |
| `app-stat-card` | Sudah ada v2.8.1, hanya perlu pakai subtext prop |
| `app-badge` status valid | Sudah ada, hanya mapping di app yang perlu konsisten |
| Modal v-if pattern | Pattern Vue, bukan CSS/JS CDN — cukup update docs |

## Rencana Promosi (sesuai mandat user: docs-now/code-later + stabilize dulu)

1. **v1.10 ini:** kandidat C1-C3 tetap di si-arsip (tidak ubah CDN). Tandai sebagai kandidat di doc ini.
2. **Langkah 2 (setelah frontend stabil):** cek si-kompetensi & si-lahar — apakah punya pola filter analytics & progress bar juga?
3. **Jika YA (≥2 app butuh):** buat branch `feat/v2.9.0-c1-c3` di `libs/frontend-cdn`, tambah CSS di `app-common.css` + komponen di `app-components.js` jika perlu, `npm run build`, test harness 20/20 PASS, tag `v2.9.0`, update `Index.html` pin `@v2.9.0`.
4. **Jika TIDAK:** biarkan sebagai pola lokal si-arsip, tidak naik CDN.

## Acceptance untuk naik v2.9.0

- [ ] C1-C3 ada di ≥2 app atau ≥3 halaman di 1 app (sudah: C1 4 halaman, C2 1 halaman tapi potensial, C3 20+ label)
- [ ] CSS baru tidak break existing (test harness PASS)
- [ ] Docs CDN_SNIPPET.md update contoh pemakaian
- [ ] Tag v2.9.0 + jsDelivr cache purge (tunggu 5 menit)
- [ ] Semua app konsumen update pin dari `@v2.8.1` → `@v2.9.0` (Index.html)

## Catatan Tema

- Tema #0369a1 (sky-700) locked di si-arsip v1.10 — bukan kandidat CDN (tema per app beda). CDN tetap netral (tidak set --primary). Setiap app set :root --primary sendiri di Index.html.

---

*Disusun: Agent Mode — 2026-09-21 malam, setelah 203/0/1 + UIUX 59/28/0/0/56*
*Next: tunggu instruksi user untuk Langkah 2 (CDN v2.9.0) — jangan eksekusi tanpa aba-aba.*
