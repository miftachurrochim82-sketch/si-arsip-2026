// ============================================================
// SI-ARSIP - 06_NaskahApi.gs (v1.1.0 — CoreLib-First, Fase 2)
// ============================================================
// Domain Naskah Dinas (T_NASKAH_DINAS): nota/memo/laporan internal.
//
// Handler yang diregistrasi di 02_AppLogic.gs:
//   - ndGetList_    → list + filter + paginasi
//   - ndGetDetail_  → detail naskah
//   - ndSave_       → simpan (nomor auto per jenis) + validasi M1
//   - ndUbahStatus_ → draft→final→terarsip; final memicu
//                     FR-28 auto-archive (arAutoArchive_ di 07)
//   - ndDelete_     → soft delete (admin)
//
// Nomor naskah: <PREFIX_JENIS>/<urut:3>/<kode_unit>/<tahun>
//   PREFIX: nota_dinas=ND, memo=MEMO, laporan=LAP, lainnya=NSK
// ============================================================

var ND_STATUS_VALID_ = ['draft', 'final', 'terarsip'];
var ND_TRANSISI_LEGAL_ = {
  'draft': ['final'],
  'final': ['terarsip'],
  'terarsip': []
};
var ND_JENIS_VALID_ = ['nota_dinas', 'memo', 'laporan', 'lainnya'];
var ND_PREFIX_JENIS_ = {
  'nota_dinas': 'ND', 'memo': 'MEMO', 'laporan': 'LAP', 'lainnya': 'NSK'
};

// ==================== §1 GENERATOR NOMOR ====================

function ndGenerateNomor_(jenisNaskah, tahun) {
  tahun = String(tahun || new Date().getFullYear());
  var prefix = ND_PREFIX_JENIS_[jenisNaskah] || 'NSK';

  // includeDeleted: true → nomor yang pernah dipakai tetap dihitung.
  var list = getSheetData_('T_NASKAH_DINAS', { includeDeleted: true });

  var maxUrut = 0;
  list.forEach(function (r) {
    var m = String(r.nomor_naskah || '').match(/^([A-Z]+)\/(\d+)\//);
    if (!m || m[1] !== prefix) return;
    var tgl = String(r.tanggal || '');
    if (tgl.slice(0, 4) !== tahun) return;
    var n = parseInt(m[2], 10);
    if (!isNaN(n) && n > maxUrut) maxUrut = n;
  });

  var urut = ('000' + (maxUrut + 1)).slice(-3);
  var kodeUnit = String(appProps_().getProperty('kode_unit_singkat') || 'SATPOL').trim();
  return prefix + '/' + urut + '/' + kodeUnit + '/' + tahun;
}

// ==================== §2 LIST & DETAIL ====================

/**
 * params: { search?, filters?: {jenis_naskah, status_naskah,
 *         kode_klasifikasi, tanggal_dari, tanggal_sampai}, page?, limit? }
 */
function ndGetList_(params, user) {
  try {
    params = params || {};
    var list = getSheetData_('T_NASKAH_DINAS');
    var filters = params.filters || {};

    var fJenis  = CoreLib.normStr(filters.jenis_naskah);
    var fStatus = CoreLib.normStr(filters.status_naskah);
    var fKode   = String(filters.kode_klasifikasi || '').trim();
    var fDari   = CoreLib.dateKey10(filters.tanggal_dari);
    var fSampai = CoreLib.dateKey10(filters.tanggal_sampai);

    if (fJenis)  list = list.filter(function (r) { return CoreLib.normStr(r.jenis_naskah) === fJenis; });
    if (fStatus) list = list.filter(function (r) { return CoreLib.normStr(r.status_naskah) === fStatus; });
    if (fKode)   list = list.filter(function (r) { return String(r.kode_klasifikasi || '').trim() === fKode; });
    if (fDari)   list = list.filter(function (r) { return CoreLib.dateKey10(r.tanggal) >= fDari; });
    if (fSampai) list = list.filter(function (r) { return CoreLib.dateKey10(r.tanggal) <= fSampai; });

    var q = CoreLib.normStr(params.search);
    if (q) {
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['nomor_naskah', 'perihal', 'tujuan', 'isi']);
      });
    }

    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal) || '';
      var tb = CoreLib.dateKey10(b.tanggal) || '';
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    var page  = Number(params.page)  || 1;
    var limit = Number(params.limit) || 10;
    return CoreLib.paginate(list, page, limit);
  } catch (err) {
    Logger.log('[ndGetList_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function ndGetDetail_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    var row = findRecordById_('T_NASKAH_DINAS', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Naskah tidak ditemukan.' };
    return { success: true, data: row };
  } catch (err) {
    Logger.log('[ndGetDetail_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 SAVE ====================

function ndSave_(data, user) {
  try {
    var record = data.record || data;
    if (!record || typeof record !== 'object') {
      return { success: false, code: 'BAD_REQUEST', error: 'Payload tidak valid.' };
    }
    record = Object.assign({}, record);

    // ---------- Validasi wajib ----------
    if (!String(record.perihal || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'perihal wajib diisi.' };
    }
    if (!String(record.kode_klasifikasi || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'kode_klasifikasi wajib diisi.' };
    }
    try {
      record.jenis_naskah = CoreLib.whitelist(
        record.jenis_naskah || 'lainnya', ND_JENIS_VALID_, 'jenis_naskah');
    } catch (e) {
      return { success: false, code: 'BAD_REQUEST', error: e.message };
    }

    // FK M_KLASIFIKASI
    var m1 = getSheetData_('M_KLASIFIKASI').filter(function (k) {
      return String(k.kode_klasifikasi) === String(record.kode_klasifikasi);
    });
    if (!m1.length) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'kode_klasifikasi "' + record.kode_klasifikasi + '" tidak terdaftar di master.' };
    }

    var isInsert = !record.id || String(record.id).trim() === '';

    if (isInsert) {
      record.tanggal      = CoreLib.dateKey10(record.tanggal) || CoreLib.todayIsoLocal();
      record.nomor_naskah = ndGenerateNomor_(record.jenis_naskah, String(record.tanggal).slice(0, 4));
      record.status_naskah = 'draft';
      record.dibuat_oleh   = (user && user.email) || '';
    } else {
      var existing = findRecordById_('T_NASKAH_DINAS', record.id);
      if (!existing) return { success: false, code: 'NOT_FOUND', error: 'Naskah tidak ditemukan.' };
      // Field sistem tidak boleh diubah lewat save
      record.nomor_naskah  = existing.nomor_naskah;
      record.status_naskah = existing.status_naskah;
      record.dibuat_oleh   = existing.dibuat_oleh;
      record.tanggal       = CoreLib.dateKey10(record.tanggal) || existing.tanggal;
    }

    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
    try {
      writeRecordNoLock_('T_NASKAH_DINAS', record, true, user, 'id');
      invalidateSheetCache_('T_NASKAH_DINAS');
      audit_(user, isInsert ? 'CREATE_NASKAH' : 'UPDATE_NASKAH',
             'T_NASKAH_DINAS', record.id, true, record.nomor_naskah);
      catatLogbook_(record.id, 'naskah_dinas', isInsert ? 'simpan_baru' : 'ubah', user,
                    (!isInsert && existing) ? logbookRingkasanDok_(existing) : '',
                    logbookRingkasanDok_(record),
                    isInsert ? 'Naskah draft dibuat' : 'Edit naskah');
      return { success: true, data: record };
    } finally {
      releaseLock_(lock);
    }
  } catch (err) {
    Logger.log('[ndSave_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 UBAH STATUS ====================

/**
 * data: { id, status_baru } — transisi draft→final→terarsip.
 * final memicu FR-28 auto-archive (07_KearsipanApi.gs).
 */
function ndUbahStatus_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    var statusBaru = CoreLib.normStr(data.status_baru);
    if (ND_STATUS_VALID_.indexOf(statusBaru) === -1) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'status_baru harus salah satu: ' + ND_STATUS_VALID_.join(', ') };
    }

    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
    try {
      var row = findRecordById_('T_NASKAH_DINAS', data.id);
      if (!row) return { success: false, code: 'NOT_FOUND', error: 'Naskah tidak ditemukan.' };

      var statusLama = CoreLib.normStr(row.status_naskah) || 'draft';
      if (statusLama === statusBaru) {
        return { success: true, data: row, message: 'Status sudah ' + statusBaru + ' (idempoten).' };
      }
      var legalTo = ND_TRANSISI_LEGAL_[statusLama] || [];
      if (legalTo.indexOf(statusBaru) === -1) {
        return { success: false, code: 'BAD_REQUEST',
                 error: 'Transisi ' + statusLama + ' → ' + statusBaru + ' tidak diizinkan.' };
      }

      var rec = Object.assign({}, row);
      rec.status_naskah = statusBaru;
      writeRecordNoLock_('T_NASKAH_DINAS', rec, true, user, 'id');
      invalidateSheetCache_('T_NASKAH_DINAS');
      audit_(user, 'UBAH_STATUS_NASKAH', 'T_NASKAH_DINAS', data.id, true,
             'Status: ' + statusLama + ' → ' + statusBaru);
      catatLogbook_(data.id, 'naskah_dinas', 'ubah_status', user,
                    statusLama, statusBaru, 'Transisi status naskah');

      // FR-28: naskah final otomatis jadi baris arsip
      if (statusBaru === 'final') {
        arAutoArchive_('naskah_dinas', rec.id, user);
      }
      return { success: true, data: rec };
    } finally {
      releaseLock_(lock);
    }
  } catch (err) {
    Logger.log('[ndUbahStatus_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 DELETE ====================

function ndDelete_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    var isAdmin = user && ['admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isAdmin) return { success: false, code: 'FORBIDDEN', error: 'Hapus naskah hanya untuk admin.' };

    var row = findRecordById_('T_NASKAH_DINAS', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Naskah tidak ditemukan.' };

    var ok = softDeleteRecord_('T_NASKAH_DINAS', data.id, user);
    invalidateSheetCache_('T_NASKAH_DINAS');
    audit_(user, 'DELETE_NASKAH', 'T_NASKAH_DINAS', data.id, ok, row.nomor_naskah);
    if (ok) catatLogbook_(data.id, 'naskah_dinas', 'hapus', user,
                          logbookRingkasanDok_(row), '', 'Soft delete naskah');
    return { success: ok, message: ok ? 'Naskah dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    Logger.log('[ndDelete_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 SELF-CHECK ====================

function testNaskahSelfCheck() {
  Logger.log('=== 06_NaskahApi.gs v1.1.0 self-check ===');
  Logger.log((ND_PREFIX_JENIS_['nota_dinas'] === 'ND' ? '✅' : '❌') + ' prefix nota_dinas = ND');
  Logger.log((ND_TRANSISI_LEGAL_['terarsip'].length === 0 ? '✅' : '❌') + ' terarsip = titik akhir');
  var nomor = ndGenerateNomor_('nota_dinas', '2026');
  Logger.log('ℹ️  contoh nomor berikutnya: ' + nomor);
  var l = ndGetList_({}, { role: 'admin' });
  Logger.log((l && l.success ? '✅' : '❌') + ' ndGetList_ — ' + ((l.data || []).length) + ' item');
  Logger.log('=== Selesai ===');
}
