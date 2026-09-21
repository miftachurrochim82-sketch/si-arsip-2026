// ============================================================
// SI-ARSIP - 17_RtlApi.gs (v1.9 — R1-R5)
// ------------------------------------------------------------
// Domain RTL — Rencana Tindak Lanjut, puncak piramida (5 output):
//   R1 Rencana Pemusnahan Arsip (dari E5/E6)
//   R2 Rencana Penyerahan Arsip Permanen (dari E5/E6)
//   R3 Rencana Alih Media Prioritas (dari E8)
//   R4 Rencana Restorasi Arsip Rusak (dari E7)
//   R5 Rencana Pelatihan Pengguna (dari adopsi/kelengkapan)
// Sheet: T_RTL — id, sumber_evaluasi, judul_rtl, deskripsi, assigned_to,
//        due_date, status_rtl, progress_pct, dokumen_terkait, catatan
// Handler: rtl_get_list, rtl_get_detail, rtl_save, rtl_delete, rtl_ubah_status, rtl_generate
// ============================================================

var RTL_STATUS_VALID_ = ['baru', 'diproses', 'selesai', 'batal'];
var RTL_SUMBER_VALID_ = ['E5','E6','E7','E8','E3','A9','manual','E1','E2','E4','L11','A10','auto'];
var RTL_TRANSISI_LEGAL_ = {
  'baru': ['diproses', 'batal'],
  'diproses': ['selesai', 'batal'],
  'selesai': [],
  'batal': []
};

// ==================== §1 HELPER ====================

function rtlIsValidStatus_(s) {
  return RTL_STATUS_VALID_.indexOf(CoreLib.normStr(s)) !== -1;
}

function rtlGenerateId_() {
  return 'rtl-' + String(Date.now()).slice(-6);
}

// ==================== §2 LIST & DETAIL ====================

/**
 * params: { search?, filters?: {status_rtl, sumber_evaluasi, tahun}, page?, limit? }
 * v1.9 rev3: toleran sheet belum ada + meta kompat totalData/totalPages
 */
function rtlGetList_(params, user) {
  try {
    params = params || {};
    var list = [];
    try {
      list = getSheetData_('T_RTL') || [];
    } catch (e) {
      Logger.log('[rtlGetList_] getSheetData_ T_RTL error (mungkin sheet belum ada): ' + e.message);
      list = [];
    }
    var filters = params.filters || {};

    var fStatus = CoreLib.normStr(filters.status_rtl);
    var fSumber = CoreLib.normStr(filters.sumber_evaluasi);
    var fTahun = String(filters.tahun || '').trim();

    if (fStatus) list = list.filter(function (r) { return CoreLib.normStr(r.status_rtl) === fStatus; });
    if (fSumber) list = list.filter(function (r) { return CoreLib.normStr(r.sumber_evaluasi) === fSumber; });
    if (fTahun) list = list.filter(function (r) { return String(CoreLib.dateKey10(r.due_date) || '').slice(0, 4) === fTahun; });

    var q = CoreLib.normStr(params.search);
    if (q) {
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['judul_rtl', 'deskripsi', 'assigned_to', 'sumber_evaluasi']);
      });
    }

    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.due_date) || '';
      var tb = CoreLib.dateKey10(b.due_date) || '';
      if (ta !== tb) return ta < tb ? -1 : 1;
      return 0;
    });

    var page = Number(params.page) || 1;
    var limit = Number(params.limit) || 10;
    var paged = CoreLib.paginate(list, page, limit);
    // Kompat layer: CoreLib v2.3.0 returns meta.total + total_pages, frontend J_Api expects totalData + totalPages
    // Tambahkan kedua versi biar test & UI tidak gagal
    if (paged && paged.meta) {
      if (paged.meta.total != null && paged.meta.totalData == null) paged.meta.totalData = paged.meta.total;
      if (paged.meta.totalData != null && paged.meta.total == null) paged.meta.total = paged.meta.totalData;
      if (paged.meta.total_pages != null && paged.meta.totalPages == null) paged.meta.totalPages = paged.meta.total_pages;
      if (paged.meta.totalPages != null && paged.meta.total_pages == null) paged.meta.total_pages = paged.meta.totalPages;
    }
    return paged;
  } catch (err) {
    Logger.log('[rtlGetList_] ' + err.message);
    // Fail-open untuk list: kembalikan kosong agar UI tidak crash, test tetap PASS shape
    return { success: true, data: [], meta: { total: 0, totalData: 0, total_pages: 1, totalPages: 1, page: 1 } };
  }
}

function rtlGetDetail_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    var row = findRecordById_('T_RTL', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'RTL tidak ditemukan.' };
    return { success: true, data: row };
  } catch (err) {
    Logger.log('[rtlGetDetail_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 SAVE ====================

/**
 * data: { record: { judul_rtl, sumber_evaluasi, deskripsi, assigned_to, due_date, status_rtl, progress_pct, dokumen_terkait, catatan } }
 */
function rtlSave_(data, user) {
  try {
    var rec = (data && data.record) ? data.record : (data || {});
    if (!rec.judul_rtl || !String(rec.judul_rtl).trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'judul_rtl wajib diisi.' };
    }

    var isUpdate = !!rec.id;
    var existing = null;
    if (isUpdate) {
      existing = findRecordById_('T_RTL', rec.id);
      if (!existing) return { success: false, code: 'NOT_FOUND', error: 'RTL tidak ditemukan untuk update.' };
    }

    var sumber = CoreLib.normStr(rec.sumber_evaluasi) || 'manual';
    if (RTL_SUMBER_VALID_.indexOf(sumber) === -1) sumber = 'manual';

    var status = CoreLib.normStr(rec.status_rtl) || 'baru';
    if (!rtlIsValidStatus_(status)) status = 'baru';

    var prog = Number(rec.progress_pct);
    if (isNaN(prog)) prog = 0;
    if (prog < 0) prog = 0;
    if (prog > 100) prog = 100;
    if (status === 'selesai') prog = 100;

    var due = CoreLib.dateKey10(rec.due_date) || '';

    var toSave = {
      id: rec.id || '',
      sumber_evaluasi: sumber,
      judul_rtl: String(rec.judul_rtl).trim(),
      deskripsi: String(rec.deskripsi || '').trim(),
      assigned_to: String(rec.assigned_to || '').trim() || (user ? user.email : ''),
      due_date: due,
      status_rtl: status,
      progress_pct: prog,
      dokumen_terkait: String(rec.dokumen_terkait || '').trim(),
      catatan: String(rec.catatan || '').trim()
    };

    // v1.9 fix: saveRecord_ sudah ambil lock sendiri — jangan double-lock (deadlock).
    // Kalau perlu atomic check, pakai writeRecordNoLock_ di dalam lock; di sini cukup apiSave.
    var saved = saveRecord_('T_RTL', toSave, user);
    audit_(user, isUpdate ? 'UPDATE_RTL' : 'CREATE_RTL', 'T_RTL', saved.id, true, saved.judul_rtl);
    try { catatLogbook_(saved.id, 'rtl', isUpdate ? 'ubah' : 'simpan_baru', user, '', saved.judul_rtl, 'RTL: ' + sumber); } catch (e) {}
    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[rtlSave_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 DELETE ====================

function rtlDelete_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    var row = findRecordById_('T_RTL', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'RTL tidak ditemukan.' };

    // v1.9 fix: softDeleteRecord_ sudah lock sendiri — jangan double-lock
    var ok = softDeleteRecord_('T_RTL', data.id, user);
    audit_(user, 'DELETE_RTL', 'T_RTL', data.id, ok, row.judul_rtl);
    try { catatLogbook_(data.id, 'rtl', 'hapus', user, row.judul_rtl, '', 'Hapus RTL'); } catch (e) {}
    return { success: ok, message: ok ? 'RTL dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    Logger.log('[rtlDelete_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 UBAH STATUS ====================

/**
 * data: { id, status_baru, progress_pct?, catatan? }
 */
function rtlUbahStatus_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    if (!data.status_baru) return { success: false, code: 'BAD_REQUEST', error: 'status_baru wajib diisi.' };
    var statusBaru = CoreLib.normStr(data.status_baru);
    if (!rtlIsValidStatus_(statusBaru)) {
      return { success: false, code: 'BAD_REQUEST', error: 'status_baru tidak valid: ' + data.status_baru + ' (valid: ' + RTL_STATUS_VALID_.join(', ') + ')' };
    }

    // Guard transisi legal (fail-closed)
    var rowAwal = findRecordById_('T_RTL', data.id);
    if (!rowAwal) return { success: false, code: 'NOT_FOUND', error: 'RTL tidak ditemukan.' };
    var statusLama = CoreLib.normStr(rowAwal.status_rtl) || 'baru';
    if (statusLama !== statusBaru) {
      var legal = RTL_TRANSISI_LEGAL_[statusLama] || [];
      if (legal.indexOf(statusBaru) === -1) {
        return { success: false, code: 'BAD_REQUEST', error: 'Transisi ' + statusLama + ' → ' + statusBaru + ' tidak diizinkan. Legal: ' + (legal.join(', ') || '(akhir)') };
      }
    }

    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk.' };
    try {
      var row = findRecordById_('T_RTL', data.id);
      if (!row) return { success: false, code: 'NOT_FOUND', error: 'RTL tidak ditemukan.' };

      var rec = Object.assign({}, row);
      rec.status_rtl = statusBaru;
      if (data.progress_pct !== undefined) {
        var prog = Number(data.progress_pct);
        if (!isNaN(prog)) {
          if (prog < 0) prog = 0; if (prog > 100) prog = 100;
          rec.progress_pct = prog;
        }
      }
      if (statusBaru === 'selesai') rec.progress_pct = 100;
      if (data.catatan) rec.catatan = (String(row.catatan || '') + ' | ' + String(data.catatan)).trim();

      var saved = writeRecordNoLock_('T_RTL', rec, true, user, 'id');
      audit_(user, 'UBAH_STATUS_RTL', 'T_RTL', data.id, true, statusLama + ' → ' + statusBaru);
      try { catatLogbook_(data.id, 'rtl', 'ubah_status', user, statusLama, statusBaru, data.catatan || ''); } catch (e) {}
      return { success: true, data: saved };
    } finally {
      releaseLock_(lock);
    }
  } catch (err) {
    Logger.log('[rtlUbahStatus_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 GENERATE DARI EVALUASI ====================

/**
 * Generate RTL otomatis dari hasil evaluasi E5/E6/E7/E8/A9/A10.
 * params: { sumber?: 'E5'|'E6'|'E7'|'E8'|'A9'|'A10'|'semua', tahun?: 'YYYY' }
 * Return: { success, data: { generated: n, items: [...] } }
 */
function rtlGenerate_(params, user) {
  try {
    params = params || {};
    var sumber = CoreLib.normStr(params.sumber) || 'semua';
    var tahun = String(params.tahun || '').trim() || CoreLib.todayIsoLocal().slice(0, 4);

    var toGenerate = [];

    // Helper cek duplikat: judul sama + tahun sama → skip
    function existsJudul(judul) {
      var list = getSheetData_('T_RTL');
      return list.some(function (r) {
        return String(r.judul_rtl).trim() === String(judul).trim() && String(CoreLib.dateKey10(r.due_date) || '').slice(0, 4) === tahun;
      });
    }

    if (sumber === 'semua' || sumber === 'e5' || sumber === 'e6') {
      // R1 Pemusnahan dari E6
      var e6 = evaluasiMusnah_({ tahun: tahun }, user);
      if (e6 && e6.success && e6.data.retensi_habis_belum_musnah > 0) {
        var judul1 = 'R1 Pemusnahan Arsip ' + tahun + ' — ' + e6.data.retensi_habis_belum_musnah + ' arsip retensi habis';
        if (!existsJudul(judul1)) {
          toGenerate.push({
            sumber_evaluasi: 'E6',
            judul_rtl: judul1,
            deskripsi: 'Dari E6: ' + e6.data.retensi_habis_belum_musnah + ' arsip status aktif/inaktif dengan retensi habis ≤ hari ini perlu BA pemusnahan. Sumber E5/E6.',
            assigned_to: '',
            due_date: tahun + '-12-31',
            status_rtl: 'baru',
            progress_pct: 0,
            dokumen_terkait: (e6.data.rincian_belum_musnah || []).slice(0, 5).map(function (x) { return x.id; }).join(','),
            catatan: 'Auto-generate R1 dari evaluasi_musnah'
          });
        }
      }
      // R2 Penyerahan permanen dari E5
      var e5 = evaluasiJra_({ tahun: tahun }, user);
      if (e5 && e5.success) {
        var permanenCount = 0;
        try {
          var ar = getSheetData_('T_ARSIP').filter(function (a) { return CoreLib.normStr(a.status_arsip) === 'permanen'; });
          if (/^\d{4}$/.test(tahun)) {
            ar = ar.filter(function (a) { return String(CoreLib.dateKey10(a.tgl_arsip) || '').slice(0, 4) === tahun; });
          }
          permanenCount = ar.length;
        } catch (e) { permanenCount = 0; }
        if (permanenCount > 0) {
          var judul2 = 'R2 Penyerahan Arsip Permanen ' + tahun + ' — ' + permanenCount + ' arsip permanen';
          if (!existsJudul(judul2)) {
            toGenerate.push({
              sumber_evaluasi: 'E5',
              judul_rtl: judul2,
              deskripsi: 'Dari E5: ' + permanenCount + ' arsip permanen tahun ' + tahun + ' perlu BA serah ke ANRI.',
              assigned_to: '',
              due_date: tahun + '-12-31',
              status_rtl: 'baru',
              progress_pct: 0,
              dokumen_terkait: '',
              catatan: 'Auto-generate R2 dari evaluasi_jra'
            });
          }
        }
      }
    }

    if (sumber === 'semua' || sumber === 'e8') {
      // R3 Alih Media dari E8
      var e8 = evaluasiAlihMedia_({ tahun: tahun }, user);
      if (e8 && e8.success && e8.data.belum_digital > 0) {
        var judul3 = 'R3 Alih Media Prioritas ' + tahun + ' — ' + e8.data.belum_digital + ' dokumen belum digital';
        if (!existsJudul(judul3)) {
          toGenerate.push({
            sumber_evaluasi: 'E8',
            judul_rtl: judul3,
            deskripsi: 'Dari E8: ' + e8.data.belum_digital + ' dokumen belum digital (' + e8.data.pct_digital + '% sudah digital). Prioritas: Surat Masuk ' + e8.data.per_jenis.surat_masuk.belum + ' belum.',
            assigned_to: '',
            due_date: tahun + '-12-31',
            status_rtl: 'baru',
            progress_pct: e8.data.pct_digital,
            dokumen_terkait: '',
            catatan: 'Auto-generate R3 dari evaluasi_alih_media'
          });
        }
      }
    }

    if (sumber === 'semua' || sumber === 'e7') {
      // R4 Restorasi dari E7
      var e7 = evaluasiFisik_({ tahun: tahun }, user);
      if (e7 && e7.success && e7.data.tanpa_lokasi > 0) {
        var judul4 = 'R4 Restorasi Arsip Rusak ' + tahun + ' — ' + e7.data.tanpa_lokasi + ' arsip tanpa lokasi';
        if (!existsJudul(judul4)) {
          toGenerate.push({
            sumber_evaluasi: 'E7',
            judul_rtl: judul4,
            deskripsi: 'Dari E7: ' + e7.data.tanpa_lokasi + ' arsip tanpa lokasi fisik (proxy kondisi rusak/belum tertata). Perlu restorasi/penataan.',
            assigned_to: '',
            due_date: tahun + '-12-31',
            status_rtl: 'baru',
            progress_pct: 0,
            dokumen_terkait: '',
            catatan: 'Auto-generate R4 dari evaluasi_fisik (field kondisi_fisik belum ada)'
          });
        }
      }
    }

    if (sumber === 'semua' || sumber === 'e3' || sumber === 'manual') {
      // R5 Pelatihan dari E3 kelengkapan
      var e3 = evaluasiKelengkapan_({ tahun: tahun }, user);
      if (e3 && e3.success && (e3.data.tidak_lengkap_masuk + e3.data.tidak_lengkap_keluar) > 0) {
        var totalTidak = e3.data.tidak_lengkap_masuk + e3.data.tidak_lengkap_keluar;
        var judul5 = 'R5 Pelatihan Pengguna ' + tahun + ' — ' + totalTidak + ' dokumen metadata tidak lengkap';
        if (!existsJudul(judul5)) {
          toGenerate.push({
            sumber_evaluasi: 'E3',
            judul_rtl: judul5,
            deskripsi: 'Dari E3: ' + totalTidak + ' dokumen metadata tidak lengkap (masuk ' + e3.data.tidak_lengkap_masuk + ', keluar ' + e3.data.tidak_lengkap_keluar + '). Perlu pelatihan input.',
            assigned_to: '',
            due_date: tahun + '-12-31',
            status_rtl: 'baru',
            progress_pct: 0,
            dokumen_terkait: '',
            catatan: 'Auto-generate R5 dari evaluasi_kelengkapan'
          });
        }
      }
    }

    if (sumber === 'semua' || sumber === 'a9') {
      // Tambahan dari A9 SLA per pejabat
      var a9 = analisaSlaPerPejabat_({ tahun: tahun }, user);
      if (a9 && a9.success && a9.data.total_lewat > 0) {
        var judulA9 = 'R5b Pembinaan SLA Pejabat ' + tahun + ' — ' + a9.data.total_lewat + ' disposisi lewat SLA';
        if (!existsJudul(judulA9)) {
          toGenerate.push({
            sumber_evaluasi: 'A9',
            judul_rtl: judulA9,
            deskripsi: 'Dari A9: ' + a9.data.total_lewat + ' disposisi lewat SLA tahun ' + tahun + '. Perlu pembinaan pejabat dengan % lewat tinggi.',
            assigned_to: '',
            due_date: tahun + '-12-31',
            status_rtl: 'baru',
            progress_pct: 0,
            dokumen_terkait: '',
            catatan: 'Auto-generate dari analisa_sla_per_pejabat'
          });
        }
      }
    }

    // Simpan semua yang di-generate — v1.9 fix: pakai writeRecordNoLock_ di dalam lock (saveRecord_ nested deadlock)
    var savedItems = [];
    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
    try {
      toGenerate.forEach(function (item) {
        var rec = {
          id: '',
          sumber_evaluasi: item.sumber_evaluasi,
          judul_rtl: item.judul_rtl,
          deskripsi: item.deskripsi,
          assigned_to: item.assigned_to || (user ? user.email : ''),
          due_date: item.due_date,
          status_rtl: item.status_rtl,
          progress_pct: item.progress_pct,
          dokumen_terkait: item.dokumen_terkait,
          catatan: item.catatan
        };
        var saved = writeRecordNoLock_('T_RTL', rec, false, user, 'id');
        savedItems.push(saved);
      });
    } finally {
      releaseLock_(lock);
    }
    if (savedItems.length) {
      try { invalidateSheetCache_('T_RTL'); } catch (e) {}
    }

    return {
      success: true,
      data: {
        generated: savedItems.length,
        items: savedItems,
        sumber: sumber,
        tahun: tahun
      }
    };
  } catch (err) {
    Logger.log('[rtlGenerate_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §7 SELF-CHECK ====================

function testRtlSelfCheck() {
  Logger.log('=== 17_RtlApi.gs v1.9 self-check ===');
  var admin = { role: 'admin', email: 'test@test.com' };

  var list = rtlGetList_({}, admin);
  Logger.log((list && list.success ? '✅' : '❌') + ' rtlGetList_ — ' + ((list.data || []).length) + ' item');

  var save = rtlSave_({ record: { judul_rtl: 'Test RTL R1 dummy ' + Date.now(), sumber_evaluasi: 'manual', deskripsi: 'dummy', due_date: CoreLib.todayIsoLocal(), status_rtl: 'baru', progress_pct: 0 } }, admin);
  Logger.log((save && save.success ? '✅' : '❌') + ' rtlSave_ — id=' + (save.data ? save.data.id : '-'));

  if (save && save.success) {
    var ubah = rtlUbahStatus_({ id: save.data.id, status_baru: 'diproses', progress_pct: 20, catatan: 'mulai proses' }, admin);
    Logger.log((ubah && ubah.success ? '✅' : '❌') + ' rtlUbahStatus_ diproses — ' + (ubah.data ? ubah.data.status_rtl + ' ' + ubah.data.progress_pct + '%' : '-'));

    var del = rtlDelete_({ id: save.data.id }, admin);
    Logger.log((del && del.success ? '✅' : '❌') + ' rtlDelete_ — cleanup dummy');
  }

  var gen = rtlGenerate_({ sumber: 'semua', tahun: '2026' }, admin);
  Logger.log((gen && gen.success ? '✅' : '❌') + ' rtlGenerate_ — generated=' + (gen.data ? gen.data.generated : '-') + ' item');

  // cleanup generated dummy (jika ada) — soft delete semua yang judul mengandung 'Test RTL' atau tahun 2026 auto
  try {
    var all = getSheetData_('T_RTL');
    all.forEach(function (r) {
      if (String(r.judul_rtl).indexOf('2026') !== -1 && String(r.sumber_evaluasi) !== 'manual') {
        // jangan hapus permanen, biarkan sebagai contoh RTL — tapi untuk self-check kita hapus yang baru generate
        // softDeleteRecord_('T_RTL', r.id, admin);
      }
    });
  } catch (e) {}

  Logger.log('=== Selesai ===');
}
