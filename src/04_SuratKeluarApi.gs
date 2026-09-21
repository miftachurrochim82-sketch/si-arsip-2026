// ============================================================
// SI-ARSIP - 04_SuratKeluarApi.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Domain Surat Keluar (T_SURAT_KELUAR).
// FR-13..FR-20 dari FRD.
//
// Handler yang diregistrasi di 02_AppLogic.gs:
//   - skGetList_      → FR-19 list + filter + search
//   - skGetDetail_    → detail + lampiran nested
//   - skSave_         → FR-13/14/18 save + auto nomor + validasi
//   - skDelete_       → FR-20 soft delete (admin; hanya saat draft)
//   - skUbahStatus_   → FR-15/16/17 workflow (draft → review → terkirim)
//
// Rujukan: Permendagri 78/2012 (format nomor).
// ============================================================

// Status workflow legal
var SK_STATUS_VALID_ = ['draft', 'review', 'terkirim'];

// Transisi legal (role minimum dicek di handler).
// Map: dari → array of to
var SK_TRANSISI_LEGAL_ = {
  'draft':     ['review', 'terkirim'],  // draft→terkirim hanya untuk admin (bypass)
  'review':    ['terkirim'],
  'terkirim':  []
};

// ==================== §1 HELPER NOMOR SURAT ====================

/**
 * Generate nomor surat keluar.
 * Format: `<kode_klas>/<urut:3>/<kode_unit>/<tahun>` — mis. `800/045/SATPOL/2026`.
 *
 * FIX v1.0.1 (2026-09-20):
 *   - Sebelumnya pakai `count(list) + 1` → setelah delete, nomor akan
 *     DUPLIKAT (contoh: 800/001 s/d 800/005 ada, hapus 003, insert baru
 *     dengan kode 800 → 800/005 lagi).
 *   - Sekarang pakai MAX urut dari nomor yang PERNAH ADA (termasuk
 *     soft-deleted) untuk kode_klasifikasi + tahun yang sama.
 *   - Nomor dihitung PER kode_klasifikasi — jadi 800/001 dan 015/001
 *     adalah dua counter berbeda (sesuai standar tata naskah dinas).
 *
 * Dipanggil di dalam lock (skSave_) untuk mencegah race condition.
 */
function skGenerateNomor_(kodeKlasifikasi, tahun) {
  tahun = String(tahun || new Date().getFullYear());
  var kodeKlas = String(kodeKlasifikasi || '').replace(/\//g, '').trim();
  if (!kodeKlas) return '';

  // includeDeleted: true → nomor yang pernah dipakai tetap dihitung.
  var list = getSheetData_('T_SURAT_KELUAR', { includeDeleted: true });

  var maxUrut = 0;
  list.forEach(function (r) {
    // Format: <kode_klas>/<urut:3>/<kode_unit>/<tahun>
    var m = String(r.nomor_surat || '').match(/^([^\/]+)\/(\d+)\//);
    if (!m) return;
    if (m[1] !== kodeKlas) return;                          // kode klasifikasi harus sama
    var tgl = String(r.tanggal_surat || r.tgl_dibuat || '');
    if (tgl.slice(0, 4) !== tahun) return;                  // tahun harus sama
    var n = parseInt(m[2], 10);
    if (!isNaN(n) && n > maxUrut) maxUrut = n;
  });

  var urut = ('000' + (maxUrut + 1)).slice(-3);
  var kodeUnit = String(appProps_().getProperty('kode_unit_singkat') || 'SATPOL').trim();
  return kodeKlas + '/' + urut + '/' + kodeUnit + '/' + tahun;
}

// ==================== §2 LIST & DETAIL ====================

/**
 * List surat keluar.
 * params: { filters?: {...}, search?, page?, limit? }
 */
function skGetList_(params, user) {
  try {
    params = params || {};
    var list = getSheetData_('T_SURAT_KELUAR');
    var filters = params.filters || {};

    var fDari   = CoreLib.dateKey10(filters.tanggal_dari);
    var fSampai = CoreLib.dateKey10(filters.tanggal_sampai);
    var fTujuan = CoreLib.normStr(filters.tujuan);
    var fKode   = String(filters.kode_klasifikasi || '').trim();
    var fStatus = CoreLib.normStr(filters.status_surat);

    if (fDari)   list = list.filter(function (r) { return CoreLib.dateKey10(r.tanggal_surat) >= fDari; });
    if (fSampai) list = list.filter(function (r) { return CoreLib.dateKey10(r.tanggal_surat) <= fSampai; });
    if (fTujuan) list = list.filter(function (r) { return CoreLib.normStr(r.tujuan).indexOf(fTujuan) !== -1; });
    if (fKode)   list = list.filter(function (r) { return String(r.kode_klasifikasi || '') === fKode; });
    if (fStatus) list = list.filter(function (r) { return CoreLib.normStr(r.status_surat) === fStatus; });

    var q = CoreLib.normStr(params.search);
    if (q) {
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, [
          'nomor_surat', 'tujuan', 'perihal', 'catatan'
        ]);
      });
    }

    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal_surat) || CoreLib.dateKey10(a.tgl_dibuat);
      var tb = CoreLib.dateKey10(b.tanggal_surat) || CoreLib.dateKey10(b.tgl_dibuat);
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    list = list.map(function (r) { return Object.assign({}, r); });

    var page  = Number(params.page)  || 1;
    var limit = Number(params.limit) || 50;
    return CoreLib.paginate(list, page, limit);
  } catch (err) {
    Logger.log('[skGetList_] ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Detail surat keluar + lampiran nested + info penandatangan.
 */
function skGetDetail_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID surat wajib diisi.' };
    }

    var row = findRecordById_('T_SURAT_KELUAR', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Surat keluar tidak ditemukan.' };

    var out = Object.assign({}, row);

    // Info penandatangan (dari M_PEJABAT + enrich SIMPEG)
    if (out.penandatangan_id) {
      var pjb = findRecordById_('M_PEJABAT', out.penandatangan_id);
      if (pjb) {
        out.penandatangan = pjb;
      }
    }

    // Nested lampiran
    var allLmp = getSheetData_('T_LAMPIRAN');
    out.lampiran = allLmp.filter(function (l) {
      return CoreLib.normId(l.dokumen_id) === CoreLib.normId(data.id) &&
             CoreLib.normStr(l.dokumen_jenis) === 'surat_keluar';
    });

    return { success: true, data: out };
  } catch (err) {
    Logger.log('[skGetDetail_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 SAVE ====================

/**
 * Simpan surat keluar (insert atau update).
 * FR-13..FR-18.
 */
function skSave_(data, user) {
  try {
    var record = data.record || data;
    if (!record || typeof record !== 'object') {
      return { success: false, code: 'BAD_REQUEST', error: 'Payload tidak valid.' };
    }
    record = Object.assign({}, record);

    // ---------- Validasi wajib ----------
    if (!String(record.tujuan || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'tujuan wajib diisi.' };
    }
    if (!String(record.perihal || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'perihal wajib diisi.' };
    }
    if (!String(record.kode_klasifikasi || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'kode_klasifikasi wajib diisi.' };
    }
    if (!String(record.penandatangan_id || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'penandatangan_id wajib diisi.' };
    }

    // Validasi kode klasifikasi ada di M_KLASIFIKASI
    var allKlas = getSheetData_('M_KLASIFIKASI');
    var kodeExists = allKlas.some(function (k) {
      return String(k.kode_klasifikasi) === String(record.kode_klasifikasi);
    });
    if (!kodeExists) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'kode_klasifikasi "' + record.kode_klasifikasi + '" tidak terdaftar di master.' };
    }

    // Validasi penandatangan ada di M_PEJABAT
    var pjb = findRecordById_('M_PEJABAT', record.penandatangan_id);
    if (!pjb) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'penandatangan_id tidak ditemukan di master pejabat.' };
    }

    // ---------- Normalisasi ----------
    if (record.sifat) {
      try {
        record.sifat = CoreLib.whitelist(record.sifat, ['biasa', 'segera', 'rahasia'], 'sifat');
      } catch (e) {
        return { success: false, code: 'BAD_REQUEST', error: e.message };
      }
    } else {
      record.sifat = 'biasa';
    }

    record.jumlah_lampiran = Number(record.jumlah_lampiran) || 0;

    if (record.tanggal_surat) {
      record.tanggal_surat = CoreLib.dateKey10(record.tanggal_surat) || record.tanggal_surat;
    } else {
      record.tanggal_surat = CoreLib.todayIsoLocal();
    }

    var isInsert = !record.id || String(record.id).trim() === '';

    if (isInsert) {
      var lock = acquireLock_();
      if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
      try {
        // Auto-generate nomor (kecuali override)
        if (!String(record.nomor_surat || '').trim()) {
          var tahun = String(record.tanggal_surat || '').slice(0, 4);
          record.nomor_surat = skGenerateNomor_(record.kode_klasifikasi, tahun);
        }

        // Duplikat nomor_surat
        var all = getSheetData_('T_SURAT_KELUAR');
        var dup = all.find(function (r) {
          return String(r.nomor_surat).toUpperCase() === String(record.nomor_surat).toUpperCase();
        });
        if (dup) {
          return { success: false, code: 'BAD_REQUEST',
                   error: 'nomor_surat "' + record.nomor_surat + '" sudah dipakai (ID: ' + dup.id + ').' };
        }
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }

      // Default workflow
      record.status_surat = 'draft';
      record.dibuat_oleh  = (user && user.email) || '';
      record.tgl_dibuat   = CoreLib.todayIsoLocal();
      record.tgl_terkirim = '';

    } else {
      var existing = findRecordById_('T_SURAT_KELUAR', record.id);
      if (!existing) return { success: false, code: 'NOT_FOUND', error: 'Surat tidak ditemukan.' };

      // Guard ownership: hanya pemilik atau admin yang bisa edit
      var isAdmin = user && ['admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
      var isOwner = user && CoreLib.normStr(existing.dibuat_oleh) === CoreLib.normStr(user.email);
      if (!isAdmin && !isOwner) {
        return { success: false, code: 'FORBIDDEN',
                 error: 'Anda hanya bisa mengedit surat yang Anda buat sendiri.' };
      }

      // Surat yang sudah `terkirim` tidak boleh di-edit
      if (CoreLib.normStr(existing.status_surat) === 'terkirim') {
        return { success: false, code: 'FORBIDDEN',
                 error: 'Surat sudah terkirim — tidak boleh di-edit.' };
      }

      // Warisi field sistem
      record.nomor_surat  = existing.nomor_surat  || '';
      record.status_surat = existing.status_surat || 'draft';
      record.dibuat_oleh  = existing.dibuat_oleh  || '';
      record.tgl_dibuat   = existing.tgl_dibuat   || '';
      record.tgl_terkirim = existing.tgl_terkirim || '';
    }

    var saved = saveRecord_('T_SURAT_KELUAR', record, user);

    audit_(user, isInsert ? 'CREATE_SURAT_KELUAR' : 'UPDATE_SURAT_KELUAR',
           'T_SURAT_KELUAR', saved.id, true,
           'Nomor: ' + saved.nomor_surat + ' — ' + saved.perihal);

    // G26: logbook T7
    catatLogbook_(saved.id, 'surat_keluar', isInsert ? 'simpan_baru' : 'ubah', user,
                  (!isInsert && existing) ? logbookRingkasanDok_(existing) : '',
                  logbookRingkasanDok_(saved),
                  isInsert ? 'Draft surat keluar dibuat' : 'Edit surat keluar');

    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[skSave_] ' + err.message);
    audit_(user, 'SAVE_SURAT_KELUAR', 'T_SURAT_KELUAR',
           (data.record && data.record.id) || '', false, err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 DELETE ====================

/**
 * Hapus surat keluar (soft delete). Admin saja. Hanya saat status draft.
 * FR-20.
 */
function skDelete_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    }

    var isAdmin = user && ['admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isAdmin) {
      return { success: false, code: 'FORBIDDEN', error: 'Hapus surat keluar hanya untuk admin.' };
    }

    var row = findRecordById_('T_SURAT_KELUAR', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Surat tidak ditemukan.' };

    var status = CoreLib.normStr(row.status_surat);
    if (status !== 'draft') {
      return { success: false, code: 'BAD_REQUEST',
               error: 'Hanya surat dengan status "draft" yang bisa dihapus.' };
    }

    var ok = softDeleteRecord_('T_SURAT_KELUAR', data.id, user);
    audit_(user, 'DELETE_SURAT_KELUAR', 'T_SURAT_KELUAR', data.id, ok,
           'Nomor: ' + (row.nomor_surat || data.id));
    if (ok) catatLogbook_(data.id, 'surat_keluar', 'hapus', user,
                          logbookRingkasanDok_(row), '', 'Soft delete surat keluar');
    return { success: ok, message: ok ? 'Surat keluar dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    Logger.log('[skDelete_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 UBAH STATUS ====================

/**
 * Ubah status workflow surat keluar.
 * FR-15/16/17.
 *
 * Transisi legal:
 *   draft   → review    (pemilik atau verifikator+)
 *   review  → terkirim  (admin)
 *   draft   → terkirim  (admin — bypass review)
 *   terkirim → *        (tidak boleh)
 *
 * Saat transisi ke `terkirim` → set tgl_terkirim + auto-archive (Fase 2).
 */
function skUbahStatus_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    }
    var statusBaru = String(data.status_baru || '').toLowerCase().trim();
    if (!statusBaru) {
      return { success: false, code: 'BAD_REQUEST', error: 'status_baru wajib diisi.' };
    }
    if (SK_STATUS_VALID_.indexOf(statusBaru) === -1) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'status_baru harus salah satu: ' + SK_STATUS_VALID_.join(', ') };
    }

    var lock = acquireLock_();
    if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };

    try {
      var row = findRecordById_('T_SURAT_KELUAR', data.id);
      if (!row) return { success: false, code: 'NOT_FOUND', error: 'Surat tidak ditemukan.' };

      var statusLama = CoreLib.normStr(row.status_surat) || 'draft';

      // Idempoten
      if (statusLama === statusBaru) {
        return { success: true, data: row, message: 'Status sudah ' + statusBaru + ' (idempoten).' };
      }

      // Cek transisi legal
      var legalTo = SK_TRANSISI_LEGAL_[statusLama] || [];
      if (legalTo.indexOf(statusBaru) === -1) {
        return { success: false, code: 'BAD_REQUEST',
                 error: 'Transisi ' + statusLama + ' → ' + statusBaru + ' tidak diizinkan.' };
      }

      // Guard role per-transisi
      var roleUser = String((user && user.role) || 'viewer').toLowerCase();
      var isAdmin = ['admin', 'super'].indexOf(roleUser) !== -1;
      var isVerifikator = ['verifikator', 'admin', 'super'].indexOf(roleUser) !== -1;
      var isOwner = CoreLib.normStr(row.dibuat_oleh) === CoreLib.normStr(user && user.email);

      if (statusBaru === 'review') {
        // draft → review: pemilik atau verifikator+
        if (!isOwner && !isVerifikator) {
          return { success: false, code: 'FORBIDDEN',
                   error: 'Hanya pemilik atau verifikator+ yang bisa ajukan review.' };
        }
      } else if (statusBaru === 'terkirim') {
        // review → terkirim ATAU draft → terkirim: admin saja
        if (!isAdmin) {
          return { success: false, code: 'FORBIDDEN',
                   error: 'Hanya admin yang bisa terbitkan surat.' };
        }
      }

      // Update record
      var rec = Object.assign({}, row);
      rec.status_surat = statusBaru;
      if (statusBaru === 'terkirim') {
        rec.tgl_terkirim = CoreLib.todayIsoLocal();  // WIB
      }

      writeRecordNoLock_('T_SURAT_KELUAR', rec, true, user, 'id');
      invalidateSheetCache_('T_SURAT_KELUAR');

      audit_(user, 'UBAH_STATUS_SURAT_KELUAR', 'T_SURAT_KELUAR', data.id, true,
             'Status: ' + statusLama + ' → ' + statusBaru);
    } finally {
      try { lock.releaseLock(); } catch (e) {}
    }

    // FR-28 (Fase 2 aktif): auto-archive SETELAH lock dilepas —
    // arAutoArchive_ mengambil lock sendiri; gagal archive TIDAK
    // membatalkan transisi status.
    if (statusBaru === 'terkirim') {
      try { arAutoArchive_('surat_keluar', data.id, user); }
      catch (e) { Logger.log('[WARN] auto-archive sk: ' + e.message); }
    }

    return { success: true, data: rec };
  } catch (err) {
    Logger.log('[skUbahStatus_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 SELF-CHECK ====================

function testSuratKeluarSelfCheck() {
  Logger.log('=== 04_SuratKeluarApi.gs v1.0.0 self-check ===');

  var admin = { role: 'admin', email: 'test@test.com', pegawai_id: 'PEG-0001' };
  var user  = { role: 'user',  email: 'pegawai@test.com', pegawai_id: 'PEG-0002' };

  // Test 1: list
  var l = skGetList_({}, admin);
  Logger.log((l && l.success ? '✅' : '❌') + ' skGetList_ — ' + ((l.data || []).length) + ' item');

  // Test 2: validasi wajib
  var bad1 = skSave_({ record: { perihal: 'X' } }, user);
  Logger.log((!bad1.success ? '✅' : '❌') + ' save tanpa tujuan/perihal/kode/penandatangan DITOLAK');

  // Test 3: transisi ilegal
  var bad2 = skUbahStatus_({ id: 'sk-fake-1', status_baru: 'ngawur' }, admin);
  Logger.log((!bad2.success ? '✅' : '❌') + ' transisi status ngawur DITOLAK');

  // Test 4: helper nomor
  try {
    var nom = skGenerateNomor_('800', 2026);
    Logger.log((/^800\/\d{3}\/[A-Z]+\/2026$/.test(nom) ? '✅' : '❌') + ' skGenerateNomor_ = ' + nom);
  } catch (e) {
    Logger.log('❌ skGenerateNomor_ exception: ' + e.message);
  }

  // Test 5: whitelist status valid
  Logger.log((SK_STATUS_VALID_.length === 3 ? '✅' : '❌') + ' SK_STATUS_VALID_ = ' + SK_STATUS_VALID_.join(','));

  Logger.log('=== Selesai ===');
}
