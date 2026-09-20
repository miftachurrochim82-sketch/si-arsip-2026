// ============================================================
// SI-ARSIP - 07_KearsipanApi.gs (v1.1.0 — CoreLib-First, Fase 2)
// ============================================================
// Domain Kearsipan (T_ARSIP + T_LOGBOOK):
//   - arAutoArchive_    → FR-28/29/30 baris arsip idempoten
//                         (dipanggil 04 saat sk terkirim, 05 saat sm
//                         selesai, 06 saat nd final)
//   - arGetList_        → FR-31 list + filter + flag is_akan_musnah
//   - arGetDetail_      → detail arsip
//   - arGetAkanMusnah_  → FR-32 retensi habis ≤ hari ini
//   - arUbahLokasi_     → FR-33 user+
//   - arTandaiMusnah_ / arTandaiSerah_ → FR-33 admin + BA/catatan
//                         + tulis T_LOGBOOK
// ============================================================

var AR_STATUS_VALID_ = ['aktif', 'inaktif', 'permanen', 'musnah'];
var AR_JENIS_ASAL_ = ['surat_masuk', 'surat_keluar', 'naskah_dinas'];
var AR_SHEET_ASAL_ = {
  'surat_masuk': 'T_SURAT_MASUK',
  'surat_keluar': 'T_SURAT_KELUAR',
  'naskah_dinas': 'T_NASKAH_DINAS'
};

// ==================== §1 HELPER ====================

/** tgl_retensi_habis = tgl_arsip + retensi_aktif_th + retensi_inaktif_th (M1). */
function arHitungRetensiHabis_(tglArsip, kodeKlasifikasi) {
  var kunci = CoreLib.dateKey10(tglArsip);
  if (!kunci) return '';
  var th = 0;
  var m1 = getSheetData_('M_KLASIFIKASI').filter(function (k) {
    return String(k.kode_klasifikasi) === String(kodeKlasifikasi);
  })[0];
  if (m1) th = (Number(m1.retensi_aktif_th) || 0) + (Number(m1.retensi_inaktif_th) || 0);
  var d = new Date(kunci + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + th);
  return CoreLib.dateKey10(d);
}

/** Runtime: status aktif/inaktif dan retensi habis ≤ hari ini WIB. */
function arIsAkanMusnah_(record) {
  if (!record) return false;
  var st = CoreLib.normStr(record.status_arsip);
  if (st !== 'aktif' && st !== 'inaktif') return false;
  var jt = CoreLib.dateKey10(record.tgl_retensi_habis);
  if (!jt) return false;
  return jt <= CoreLib.todayIsoLocal();
}

/** Tulis jejak dokumen ke T_LOGBOOK (T7). Dipanggil di dalam lock pemanggil. */
function arLogbook_(dokumenId, dokumenJenis, aksi, user, sebelum, sesudah, catatan) {
  try {
    var rec = {
      id: '',
      dokumen_id: dokumenId || '',
      dokumen_jenis: dokumenJenis || '',
      aksi: aksi || '',
      aktor_email: (user && user.email) || '',
      tgl_aksi: new Date().toISOString(),
      detail_sebelum: sebelum || '',
      detail_sesudah: sesudah || '',
      catatan: catatan || ''
    };
    writeRecordNoLock_('T_LOGBOOK', rec, true, user, 'id');
  } catch (e) {
    Logger.log('[arLogbook_] ' + e.message);   // logbook gagal ≠ aksi gagal
  }
}

// ==================== §2 AUTO-ARCHIVE (FR-28/29/30) ====================

/**
 * Buat baris T_ARSIP dari dokumen asal. Idempoten by (jenis_asal+ref_id).
 * Aman dipanggil dari dalam lock pemanggil? TIDAK — fungsi ini mengambil
 * lock sendiri; pemanggil (04/05/06) memanggilnya SETELAH melepas lock.
 */
function arAutoArchive_(jenisAsal, refId, user) {
  try {
    if (AR_JENIS_ASAL_.indexOf(CoreLib.normStr(jenisAsal)) === -1) {
      return { success: false, code: 'BAD_REQUEST', error: 'jenis_asal tidak valid.' };
    }
    if (!refId) return { success: false, code: 'BAD_REQUEST', error: 'ref_id wajib diisi.' };

    // Idempoten: sudah ada → return existing
    var existing = getSheetData_('T_ARSIP').filter(function (a) {
      return CoreLib.normStr(a.jenis_asal) === CoreLib.normStr(jenisAsal) &&
             CoreLib.normId(a.ref_id) === CoreLib.normId(refId);
    })[0];
    if (existing) {
      return { success: true, data: existing, message: 'Arsip sudah ada (idempoten).' };
    }

    var sheetAsal = AR_SHEET_ASAL_[CoreLib.normStr(jenisAsal)];
    var src = findRecordById_(sheetAsal, refId);
    if (!src) return { success: false, code: 'NOT_FOUND', error: 'Dokumen asal tidak ditemukan.' };

    var kode  = String(src.kode_klasifikasi || '').trim();
    var judul = String(src.perihal || src.judul || '').trim();
    var tglArsip = CoreLib.todayIsoLocal();
    var m1 = getSheetData_('M_KLASIFIKASI').filter(function (k) {
      return String(k.kode_klasifikasi) === kode;
    })[0];
    var statusAwal = (m1 && CoreLib.normStr(m1.tindakan_akhir) === 'permanen') ? 'permanen' : 'aktif';

    var rec = {
      id: '',
      jenis_asal: CoreLib.normStr(jenisAsal),
      ref_id: src.id,
      kode_klasifikasi: kode,
      judul: judul,
      tgl_arsip: tglArsip,
      lokasi_fisik: '',
      status_arsip: statusAwal,
      tgl_retensi_habis: arHitungRetensiHabis_(tglArsip, kode),
      catatan: 'Auto-archive FR-28'
    };

    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
    try {
      writeRecordNoLock_('T_ARSIP', rec, true, user, 'id');
      invalidateSheetCache_('T_ARSIP');
      audit_(user, 'AUTO_ARSIP', 'T_ARSIP', rec.id, true, jenisAsal + ':' + refId);
      arLogbook_(refId, jenisAsal, 'arsip_auto', user, '',
                 JSON.stringify({ status_arsip: statusAwal }), 'FR-28');
      return { success: true, data: rec };
    } finally {
      releaseLock_(lock);
    }
  } catch (err) {
    Logger.log('[arAutoArchive_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 LIST & DETAIL (FR-31) ====================

/**
 * params: { search?, filters?: {jenis_asal, kode_klasifikasi,
 *         status_arsip, tahun}, page?, limit? }
 */
function arGetList_(params, user) {
  try {
    params = params || {};
    var list = getSheetData_('T_ARSIP');
    var filters = params.filters || {};

    var fJenis  = CoreLib.normStr(filters.jenis_asal);
    var fKode   = String(filters.kode_klasifikasi || '').trim();
    var fStatus = CoreLib.normStr(filters.status_arsip);
    var fTahun  = String(filters.tahun || '').trim();

    if (fJenis)  list = list.filter(function (r) { return CoreLib.normStr(r.jenis_asal) === fJenis; });
    if (fKode)   list = list.filter(function (r) { return String(r.kode_klasifikasi || '').trim() === fKode; });
    if (fStatus) list = list.filter(function (r) { return CoreLib.normStr(r.status_arsip) === fStatus; });
    if (fTahun)  list = list.filter(function (r) { return String(CoreLib.dateKey10(r.tgl_arsip) || '').slice(0, 4) === fTahun; });

    var q = CoreLib.normStr(params.search);
    if (q) {
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['judul', 'kode_klasifikasi', 'lokasi_fisik']);
      });
    }

    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tgl_arsip) || '';
      var tb = CoreLib.dateKey10(b.tgl_arsip) || '';
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    list = list.map(function (r) {
      var out = Object.assign({}, r);
      out.is_akan_musnah = arIsAkanMusnah_(out);
      return out;
    });

    var page  = Number(params.page)  || 1;
    var limit = Number(params.limit) || 10;
    return CoreLib.paginate(list, page, limit);
  } catch (err) {
    Logger.log('[arGetList_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function arGetDetail_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    var row = findRecordById_('T_ARSIP', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Arsip tidak ditemukan.' };
    var out = Object.assign({}, row);
    out.is_akan_musnah = arIsAkanMusnah_(out);
    return { success: true, data: out };
  } catch (err) {
    Logger.log('[arGetDetail_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 AKAN MUSNAH (FR-32) ====================

function arGetAkanMusnah_(params, user) {
  try {
    var list = getSheetData_('T_ARSIP').filter(function (r) { return arIsAkanMusnah_(r); });
    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tgl_retensi_habis) || '';
      var tb = CoreLib.dateKey10(b.tgl_retensi_habis) || '';
      return ta < tb ? -1 : (ta > tb ? 1 : 0);
    });
    list = list.map(function (r) {
      var out = Object.assign({}, r);
      out.is_akan_musnah = true;
      return out;
    });
    return { success: true, data: list.slice(0, 50), total: list.length };
  } catch (err) {
    Logger.log('[arGetAkanMusnah_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 AKSI FR-33 ====================

/** data: { id, lokasi_fisik } — level user. */
function arUbahLokasi_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    if (!String(data.lokasi_fisik || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'lokasi_fisik wajib diisi.' };
    }
    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
    try {
      var row = findRecordById_('T_ARSIP', data.id);
      if (!row) return { success: false, code: 'NOT_FOUND', error: 'Arsip tidak ditemukan.' };
      var sebelum = String(row.lokasi_fisik || '');
      var rec = Object.assign({}, row);
      rec.lokasi_fisik = String(data.lokasi_fisik).trim();
      writeRecordNoLock_('T_ARSIP', rec, true, user, 'id');
      invalidateSheetCache_('T_ARSIP');
      audit_(user, 'UBAH_LOKASI_ARSIP', 'T_ARSIP', data.id, true, rec.lokasi_fisik);
      arLogbook_(rec.id, 'arsip', 'ubah_lokasi', user,
                 JSON.stringify({ lokasi_fisik: sebelum }),
                 JSON.stringify({ lokasi_fisik: rec.lokasi_fisik }), '');
      return { success: true, data: rec };
    } finally {
      releaseLock_(lock);
    }
  } catch (err) {
    Logger.log('[arUbahLokasi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * data: { id, catatan } — level admin. catatan = nomor BA / keterangan.
 * mode: 'musnah' | 'serah'
 */
function arTandaiAkhir_(data, user, mode) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    if (!String(data.catatan || '').trim()) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'catatan (nomor BA/keterangan) wajib diisi.' };
    }
    var isAdmin = user && ['admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isAdmin) {
      return { success: false, code: 'FORBIDDEN',
               error: 'Aksi ' + mode + ' hanya untuk admin.' };
    }
    var statusBaru = mode === 'serah' ? 'permanen' : 'musnah';

    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
    try {
      var row = findRecordById_('T_ARSIP', data.id);
      if (!row) return { success: false, code: 'NOT_FOUND', error: 'Arsip tidak ditemukan.' };
      var statusLama = CoreLib.normStr(row.status_arsip);
      if (statusLama === statusBaru) {
        return { success: true, data: row, message: 'Sudah ' + statusBaru + ' (idempoten).' };
      }
      if (statusLama === 'musnah' || statusLama === 'permanen') {
        return { success: false, code: 'BAD_REQUEST',
                 error: 'Arsip sudah berstatus akhir ' + statusLama + '.' };
      }
      var rec = Object.assign({}, row);
      rec.status_arsip = statusBaru;
      rec.catatan = (String(row.catatan || '').trim() + ' | BA: ' + String(data.catatan).trim()).trim();
      writeRecordNoLock_('T_ARSIP', rec, true, user, 'id');
      invalidateSheetCache_('T_ARSIP');
      audit_(user, mode === 'serah' ? 'ARSIP_SERAH' : 'ARSIP_MUSNAH',
             'T_ARSIP', data.id, true, 'Status: ' + statusLama + ' → ' + statusBaru);
      arLogbook_(rec.id, 'arsip', mode, user,
                 JSON.stringify({ status_arsip: statusLama }),
                 JSON.stringify({ status_arsip: statusBaru }), String(data.catatan).trim());
      return { success: true, data: rec };
    } finally {
      releaseLock_(lock);
    }
  } catch (err) {
    Logger.log('[arTandaiAkhir_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function arTandaiMusnah_(data, user) { return arTandaiAkhir_(data, user, 'musnah'); }
function arTandaiSerah_(data, user)  { return arTandaiAkhir_(data, user, 'serah'); }

// ==================== §6 SELF-CHECK ====================

function testKearsipanSelfCheck() {
  Logger.log('=== 07_KearsipanApi.gs v1.1.0 self-check ===');
  var habis = arHitungRetensiHabis_('2026-09-20', '015');   // 2+3 = 5 tahun
  Logger.log((habis === '2031-09-20' ? '✅' : '❌') + ' retensi 015 (5 th) → ' + habis);
  Logger.log((arIsAkanMusnah_({ status_arsip: 'aktif', tgl_retensi_habis: '2020-01-01' }) === true ? '✅' : '❌') + ' akan musnah terdeteksi');
  Logger.log((arIsAkanMusnah_({ status_arsip: 'musnah', tgl_retensi_habis: '2020-01-01' }) === false ? '✅' : '❌') + ' status musnah tidak diflag');
  var l = arGetList_({}, { role: 'admin' });
  Logger.log((l && l.success ? '✅' : '❌') + ' arGetList_ — ' + ((l.data || []).length) + ' item');
  var am = arGetAkanMusnah_({}, { role: 'admin' });
  Logger.log((am && am.success ? '✅' : '❌') + ' arGetAkanMusnah_ — ' + ((am.data || []).length) + ' item');
  Logger.log('=== Selesai ===');
}
