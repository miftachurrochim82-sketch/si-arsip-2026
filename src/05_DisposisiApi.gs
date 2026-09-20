// ============================================================
// SI-ARSIP - 05_DisposisiApi.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Domain Disposisi (T_DISPOSISI).
// FR-21..FR-27 dari FRD.
//
// Handler yang diregistrasi di 02_AppLogic.gs:
//   - dpGetList_      → FR-26 list + filter + flag is_lewat_sla
//   - dpGetDetail_    → detail + info surat induk
//   - dpSave_         → FR-21/22 simpan + validasi pejabat + auto WIB
//                       + FR-24 update status surat → 'didiposisi'
//   - dpTeruskan_     → FR-23 diteruskan → diproses (user penerima)
//   - dpSelesaikan_   → FR-23 diproses → selesai (verifikator+)
//                       + FR-24 kalau semua disposisi selesai →
//                       update status surat → 'selesai'
//   - dpDelete_       → FR-27 soft delete (admin, tolak saat selesai)
//
// Rujukan: Permendagri 78/2012.
//
// ⚠️ Catatan integrasi:
//   03_SuratMasukApi.gs → smDisposisi_ memanggil dpSave_ DAN update
//   status surat sendiri. Karena dpSave_ di sini SUDAH handle FR-24,
//   update di smDisposisi_ menjadi idempoten (tidak masalah, tapi
//   bisa dibersihkan di fase 2 — cukup andalkan dpSave_).
// ============================================================

// Status workflow disposisi legal
var DP_STATUS_VALID_ = ['diteruskan', 'diproses', 'selesai'];

// Transisi legal (guard role di handler):
//   diteruskan → diproses   (user penerima)
//   diproses   → selesai    (pemilik atau verifikator+)
var DP_TRANSISI_LEGAL_ = {
  'diteruskan': ['diproses'],
  'diproses':   ['selesai'],
  'selesai':    []
};

// ==================== §1 HELPER ====================

/**
 * Cek apakah disposisi sudah lewat SLA (jatuh_tempo < hari ini WIB
 * dan status ≠ selesai). Runtime, tidak disimpan di sheet.
 */
function dpIsLewatSla_(record) {
  if (!record) return false;
  var jt = CoreLib.dateKey10(record.jatuh_tempo);
  if (!jt) return false;
  var today = CoreLib.todayIsoLocal();
  var st = CoreLib.normStr(record.status_disposisi);
  return jt < today && st !== 'selesai';
}

/**
 * Cari record pejabat (M_PEJABAT) dari pegawai_id user yang login.
 * Return null kalau user bukan pejabat terdaftar.
 */
function dpFindPejabatByPegawaiId_(pegawaiId) {
  if (!pegawaiId) return null;
  var target = normalizeEntityId_(pegawaiId);
  if (!target) return null;
  var list = getSheetData_('M_PEJABAT');
  for (var i = 0; i < list.length; i++) {
    if (normalizeEntityId_(list[i].pegawai_id) === target) return list[i];
  }
  return null;
}

/**
 * Validasi pejabat ID ada di M_PEJABAT (dan aktif).
 * Return record pejabat atau null.
 */
function dpFindPejabatById_(pejabatId) {
  if (!pejabatId) return null;
  var rec = findRecordById_('M_PEJABAT', pejabatId);
  if (!rec) return null;
  if (CoreLib.normStr(rec.aktif) === 'false') return null;
  return rec;
}

// ==================== §2 LIST & DETAIL ====================

/**
 * List disposisi.
 * params: { filters?: {status_disposisi, dari_pejabat_id, ke_pejabat_id,
 *                      tanggal_dari, tanggal_sampai}, page?, limit? }
 */
function dpGetList_(params, user) {
  try {
    params = params || {};
    var list = getSheetData_('T_DISPOSISI');
    var filters = params.filters || {};

    var fStatus = CoreLib.normStr(filters.status_disposisi);
    var fDari   = normalizeEntityId_(filters.dari_pejabat_id);
    var fKe     = normalizeEntityId_(filters.ke_pejabat_id);
    var fTglDr  = CoreLib.dateKey10(filters.tanggal_dari);
    var fTglSp  = CoreLib.dateKey10(filters.tanggal_sampai);

    if (fStatus) list = list.filter(function (r) {
      return CoreLib.normStr(r.status_disposisi) === fStatus;
    });
    if (fDari) list = list.filter(function (r) {
      return normalizeEntityId_(r.dari_pejabat_id) === fDari;
    });
    if (fKe) list = list.filter(function (r) {
      return normalizeEntityId_(r.ke_pejabat_id) === fKe;
    });
    if (fTglDr) list = list.filter(function (r) {
      return CoreLib.dateKey10(r.tgl_disposisi) >= fTglDr;
    });
    if (fTglSp) list = list.filter(function (r) {
      return CoreLib.dateKey10(r.tgl_disposisi) <= fTglSp;
    });

    // Sort: tgl_disposisi desc, fallback created_at
    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tgl_disposisi) || String(a.created_at || '');
      var tb = CoreLib.dateKey10(b.tgl_disposisi) || String(b.created_at || '');
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    // Clone + flag runtime
    list = list.map(function (r) {
      var out = Object.assign({}, r);
      out.is_lewat_sla = dpIsLewatSla_(out);
      return out;
    });

    var page  = Number(params.page)  || 1;
    var limit = Number(params.limit) || 50;
    return CoreLib.paginate(list, page, limit);
  } catch (err) {
    Logger.log('[dpGetList_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Detail disposisi + info surat induk (perihal, nomor agenda, asal).
 */
function dpGetDetail_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID disposisi wajib diisi.' };
    }

    var row = findRecordById_('T_DISPOSISI', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Disposisi tidak ditemukan.' };

    var out = Object.assign({}, row);
    out.is_lewat_sla = dpIsLewatSla_(out);

    // Nested: surat induk
    if (out.surat_id) {
      var surat = findRecordById_('T_SURAT_MASUK', out.surat_id);
      if (surat) {
        out.surat = {
          id:            surat.id,
          nomor_agenda_masuk: surat.nomor_agenda_masuk,
          nomor_surat:   surat.nomor_surat,
          perihal:       surat.perihal,
          asal:          surat.asal,
          tanggal_terima: surat.tanggal_terima,
          sifat:         surat.sifat,
          status_surat:  surat.status_surat
        };
      }
    }

    return { success: true, data: out };
  } catch (err) {
    Logger.log('[dpGetDetail_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 SAVE ====================

/**
 * Simpan disposisi (insert atau update).
 * FR-21/22.
 *
 * Validasi:
 *   - surat_id wajib, harus ada di T_SURAT_MASUK
 *   - ke_pejabat_id wajib, harus ada di M_PEJABAT (aktif)
 *   - dari_pejabat_id opsional; kalau kosong → auto dari M_PEJABAT
 *     berdasarkan pegawai_id user
 *   - instruksi wajib
 *
 * Auto-inject:
 *   - tgl_disposisi = todayIsoLocal() (WIB) saat insert baru
 *   - status_disposisi = 'diteruskan' saat insert baru
 *
 * FR-24: setelah insert baru, update T_SURAT_MASUK.status_surat =
 * 'didiposisi' (idempoten).
 */
function dpSave_(data, user) {
  try {
    var record = data.record || data;
    if (!record || typeof record !== 'object') {
      return { success: false, code: 'BAD_REQUEST', error: 'Payload tidak valid.' };
    }
    record = Object.assign({}, record);

    // ---------- Validasi wajib ----------
    if (!String(record.surat_id || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'surat_id wajib diisi.' };
    }
    if (!String(record.ke_pejabat_id || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'ke_pejabat_id wajib diisi.' };
    }
    if (!String(record.instruksi || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'instruksi wajib diisi.' };
    }

    // ---------- Validasi surat induk ----------
    var surat = findRecordById_('T_SURAT_MASUK', record.surat_id);
    if (!surat) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'surat_id tidak ditemukan di T_SURAT_MASUK.' };
    }
    record.surat_id = surat.id;

    // ---------- Validasi pejabat ----------
    var kePjbId = normalizeEntityId_(record.ke_pejabat_id);
    var kePjb = dpFindPejabatById_(kePjbId);
    if (!kePjb) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'ke_pejabat_id tidak ditemukan di master pejabat (atau nonaktif).' };
    }
    record.ke_pejabat_id = kePjb.id;

    // Dari pejabat: pakai input, atau auto dari user pegawai_id
    if (record.dari_pejabat_id) {
      var dariPjbId = normalizeEntityId_(record.dari_pejabat_id);
      var dariPjb = dpFindPejabatById_(dariPjbId);
      if (!dariPjb) {
        return { success: false, code: 'BAD_REQUEST',
                 error: 'dari_pejabat_id tidak ditemukan di master pejabat.' };
      }
      record.dari_pejabat_id = dariPjb.id;
    } else if (user && user.pegawai_id) {
      var autoPjb = dpFindPejabatByPegawaiId_(user.pegawai_id);
      if (autoPjb) record.dari_pejabat_id = autoPjb.id;
    }

    // ---------- Normalisasi ----------
    if (record.jatuh_tempo) {
      record.jatuh_tempo = CoreLib.dateKey10(record.jatuh_tempo) || '';
    }
    if (record.status_disposisi) {
      try {
        record.status_disposisi = CoreLib.whitelist(
          record.status_disposisi, DP_STATUS_VALID_, 'status_disposisi'
        );
      } catch (e) {
        return { success: false, code: 'BAD_REQUEST', error: e.message };
      }
    }

    var isInsert = !record.id || String(record.id).trim() === '';

    if (isInsert) {
      // Auto-inject (FR-22)
      record.tgl_disposisi     = record.tgl_disposisi || CoreLib.todayIsoLocal();
      record.status_disposisi  = record.status_disposisi || 'diteruskan';
      record.tgl_selesai       = '';
    } else {
      // Update: pertahankan field sistem (jangan boleh diubah user)
      var existing = findRecordById_('T_DISPOSISI', record.id);
      if (!existing) return { success: false, code: 'NOT_FOUND', error: 'Disposisi tidak ditemukan.' };

      if (CoreLib.normStr(existing.status_disposisi) === 'selesai') {
        return { success: false, code: 'BAD_REQUEST',
                 error: 'Disposisi sudah selesai — tidak boleh diedit.' };
      }

      record.tgl_disposisi    = existing.tgl_disposisi || record.tgl_disposisi || '';
      record.status_disposisi = existing.status_disposisi || 'diteruskan';
      record.tgl_selesai      = existing.tgl_selesai || '';
      // surat_id dan dari_pejabat_id juga di-lock
      record.surat_id         = existing.surat_id || record.surat_id;
      record.dari_pejabat_id  = existing.dari_pejabat_id || record.dari_pejabat_id;
    }

    var saved = saveRecord_('T_DISPOSISI', record, user);

    // ---------- FR-24: update status surat → didiposisi (idempoten) ----------
    if (isInsert) {
      dpUpdateStatusSuratInduk_(saved.surat_id, 'didiposisi', user);
    }

    audit_(user, isInsert ? 'CREATE_DISPOSISI' : 'UPDATE_DISPOSISI',
           'T_DISPOSISI', saved.id, true,
           'Surat: ' + (surat.nomor_agenda_masuk || saved.surat_id) +
           ' → ' + (kePjb.pegawai_id || kePjb.id));

    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[dpSave_] ' + err.message);
    audit_(user, 'SAVE_DISPOSISI', 'T_DISPOSISI',
           (data.record && data.record.id) || '', false, err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 TRANSISI STATUS ====================

/**
 * Ubah disposisi → 'diproses'. FR-23.
 * Hanya user yang jadi ke_pejabat_id (penerima disposisi).
 *
 * ActionLevels: 'user' (paling rendah yang bisa akses aksi ini),
 * guard ownership detail di handler.
 */
function dpTeruskan_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID disposisi wajib diisi.' };
    }
    return dpTransisiStatus_(data.id, 'diproses', user, {
      requireOwnerPenerima: true,
      catatan: data.catatan || ''
    });
  } catch (err) {
    Logger.log('[dpTeruskan_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Ubah disposisi → 'selesai'. FR-23.
 * Verifikator+ ATAU pemilik disposisi (ke_pejabat_id).
 * Set tgl_selesai = todayIsoLocal() (WIB).
 *
 * FR-24: setelah selesai, cek semua disposisi surat induk —
 * kalau semua selesai, update T_SURAT_MASUK.status_surat = 'selesai'.
 */
function dpSelesaikan_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID disposisi wajib diisi.' };
    }
    return dpTransisiStatus_(data.id, 'selesai', user, {
      requireOwnerPenerima: false,     // verifikator+ atau pemilik
      catatan: data.catatan || ''
    });
  } catch (err) {
    Logger.log('[dpSelesaikan_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Core: ubah status_disposisi dengan semua guard + efek samping.
 * @private
 */
function dpTransisiStatus_(id, statusBaru, user, opts) {
  opts = opts || {};
  if (DP_STATUS_VALID_.indexOf(statusBaru) === -1) {
    return { success: false, code: 'BAD_REQUEST',
             error: 'status_baru harus salah satu: ' + DP_STATUS_VALID_.join(', ') };
  }

  var lock = acquireLock_();
  if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };

  try {
    var row = findRecordById_('T_DISPOSISI', id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Disposisi tidak ditemukan.' };

    var statusLama = CoreLib.normStr(row.status_disposisi) || 'diteruskan';

    // Idempoten
    if (statusLama === statusBaru) {
      return { success: true, data: row, message: 'Status sudah ' + statusBaru + ' (idempoten).' };
    }

    // Cek transisi legal
    var legalTo = DP_TRANSISI_LEGAL_[statusLama] || [];
    if (legalTo.indexOf(statusBaru) === -1) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'Transisi ' + statusLama + ' → ' + statusBaru + ' tidak diizinkan.' };
    }

    // Guard role & ownership
    var roleUser = String((user && user.role) || 'viewer').toLowerCase();
    var isVerif = ['verifikator', 'admin', 'super'].indexOf(roleUser) !== -1;

    // ke_pejabat_id vs user.pegawai_id
    var isPenerima = false;
    if (user && user.pegawai_id && row.ke_pejabat_id) {
      var userPjb = dpFindPejabatByPegawaiId_(user.pegawai_id);
      if (userPjb && normalizeEntityId_(userPjb.id) === normalizeEntityId_(row.ke_pejabat_id)) {
        isPenerima = true;
      }
    }

    if (opts.requireOwnerPenerima && !isPenerima && !isVerif) {
      return { success: false, code: 'FORBIDDEN',
               error: 'Hanya penerima disposisi yang bisa menandai "diproses".' };
    }

    if (statusBaru === 'selesai' && !isVerif && !isPenerima) {
      return { success: false, code: 'FORBIDDEN',
               error: 'Hanya verifikator+ atau penerima disposisi yang bisa menyelesaikan.' };
    }

    // Update record
    var rec = Object.assign({}, row);
    rec.status_disposisi = statusBaru;
    if (statusBaru === 'selesai') {
      rec.tgl_selesai = CoreLib.todayIsoLocal();   // WIB
    }
    if (opts.catatan && String(opts.catatan).trim() !== '') {
      rec.catatan = String(opts.catatan).trim();
    }

    writeRecordNoLock_('T_DISPOSISI', rec, true, user, 'id');

    audit_(user, 'UBAH_STATUS_DISPOSISI', 'T_DISPOSISI', id, true,
           'Status: ' + statusLama + ' → ' + statusBaru);

    // ---------- FR-24: kalau selesai, cek semua disposisi surat ----------
    if (statusBaru === 'selesai' && rec.surat_id) {
      dpCekDanUpdateStatusSuratSelesai_(rec.surat_id, user);
    }

    return { success: true, data: rec };
  } finally {
    releaseLock_(lock);
  }
}

// ==================== §5 UPDATE STATUS SURAT INDUK (FR-24) ====================

/**
 * Set T_SURAT_MASUK.status_surat = statusBaru untuk surat_id tertentu.
 * Dipakai oleh dpSave_ (→ 'didiposisi'). Idempoten.
 * @private
 */
function dpUpdateStatusSuratInduk_(suratId, statusBaru, user) {
  if (!suratId) return;
  var lock = acquireLock_();
  if (!lock) return;
  try {
    var surat = findRecordById_('T_SURAT_MASUK', suratId);
    if (!surat) return;
    if (CoreLib.normStr(surat.status_surat) === CoreLib.normStr(statusBaru)) return;

    var rec = Object.assign({}, surat);
    rec.status_surat = statusBaru;
    writeRecordNoLock_('T_SURAT_MASUK', rec, true, user, 'id');

    audit_(user, 'UBAH_STATUS_SURAT_MASUK', 'T_SURAT_MASUK', suratId, true,
           'Auto (disposisi): status → ' + statusBaru);
  } catch (e) {
    Logger.log('[dpUpdateStatusSuratInduk_] ' + e.message);
  } finally {
    releaseLock_(lock);
  }

  // FR-28 (Fase 2 aktif): surat masuk selesai → baris arsip otomatis.
  // Dipanggil SETELAH lock dilepas (arAutoArchive_ mengambil lock sendiri).
  if (CoreLib.normStr(statusBaru) === 'selesai') {
    try { arAutoArchive_('surat_masuk', suratId, user); }
    catch (e) { Logger.log('[WARN] auto-archive sm: ' + e.message); }
  }
}

/**
 * Cek semua disposisi pada surat_id tertentu. Kalau SEMUA berstatus
 * 'selesai' → set T_SURAT_MASUK.status_surat = 'selesai'.
 * Kalau belum semua, biarkan (biar tidak turun statusnya).
 * @private
 */
function dpCekDanUpdateStatusSuratSelesai_(suratId, user) {
  if (!suratId) return;
  try {
    var list = getSheetData_('T_DISPOSISI').filter(function (d) {
      return CoreLib.normId(d.surat_id) === CoreLib.normId(suratId);
    });
    if (list.length === 0) return;

    var semuaSelesai = list.every(function (d) {
      return CoreLib.normStr(d.status_disposisi) === 'selesai';
    });
    if (!semuaSelesai) return;

    dpUpdateStatusSuratInduk_(suratId, 'selesai', user);
  } catch (e) {
    Logger.log('[dpCekDanUpdateStatusSuratSelesai_] ' + e.message);
  }
}

// ==================== §6 DELETE ====================

/**
 * Hapus disposisi (soft delete). FR-27.
 * Admin saja. Tolak jika status sudah 'selesai'.
 */
function dpDelete_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    }

    var isAdmin = user && ['admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isAdmin) {
      return { success: false, code: 'FORBIDDEN', error: 'Hapus disposisi hanya untuk admin.' };
    }

    var row = findRecordById_('T_DISPOSISI', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Disposisi tidak ditemukan.' };

    if (CoreLib.normStr(row.status_disposisi) === 'selesai') {
      return { success: false, code: 'BAD_REQUEST',
               error: 'Disposisi sudah selesai — tidak boleh dihapus.' };
    }

    var ok = softDeleteRecord_('T_DISPOSISI', data.id, user);
    audit_(user, 'DELETE_DISPOSISI', 'T_DISPOSISI', data.id, ok,
           'Surat: ' + (row.surat_id || '-'));
    return { success: ok, message: ok ? 'Disposisi dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    Logger.log('[dpDelete_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §7 SELF-CHECK ====================

function testDisposisiSelfCheck() {
  Logger.log('=== 05_DisposisiApi.gs v1.0.0 self-check ===');

  var admin = { role: 'admin', email: 'test@test.com', pegawai_id: 'PEG-0001' };
  var user  = { role: 'user',  email: 'pegawai@test.com', pegawai_id: 'PEG-0002' };

  // 1. List
  var l = dpGetList_({}, admin);
  Logger.log((l && l.success ? '✅' : '❌') + ' dpGetList_ — ' +
             ((l.data || []).length) + ' item, meta=' + JSON.stringify(l.meta));

  // 2. Validasi wajib
  var bad1 = dpSave_({ record: { ke_pejabat_id: 'X', instruksi: 'X' } }, user);
  Logger.log((!bad1.success ? '✅' : '❌') + ' tanpa surat_id DITOLAK');

  var bad2 = dpSave_({ record: { surat_id: 'X', instruksi: 'X' } }, user);
  Logger.log((!bad2.success ? '✅' : '❌') + ' tanpa ke_pejabat_id DITOLAK');

  var bad3 = dpSave_({ record: { surat_id: 'X', ke_pejabat_id: 'X' } }, user);
  Logger.log((!bad3.success ? '✅' : '❌') + ' tanpa instruksi DITOLAK');

  // 3. Validasi surat induk
  var bad4 = dpSave_({
    record: { surat_id: 'surat-tidak-ada-xyz', ke_pejabat_id: 'pjb-xyz', instruksi: 'Test' }
  }, user);
  Logger.log((!bad4.success ? '✅' : '❌') + ' surat_id tidak ada DITOLAK');

  // 4. Helper SLA
  var kemarin = CoreLib.todayIsoLocal();
  var kemarinDate = new Date(kemarin);
  kemarinDate.setDate(kemarinDate.getDate() - 1);
  var kemarinStr = CoreLib.dateKey10(kemarinDate);

  var sla1 = dpIsLewatSla_({ jatuh_tempo: kemarinStr, status_disposisi: 'diteruskan' });
  var sla2 = dpIsLewatSla_({ jatuh_tempo: kemarinStr, status_disposisi: 'selesai' });
  var sla3 = dpIsLewatSla_({ jatuh_tempo: kemarin, status_disposisi: 'diteruskan' });
  var sla4 = dpIsLewatSla_({ jatuh_tempo: '', status_disposisi: 'diteruskan' });

  Logger.log((sla1 === true ? '✅' : '❌') + ' SLA: jatuh_tempo lewat + belum selesai = true');
  Logger.log((sla2 === false ? '✅' : '❌') + ' SLA: jatuh_tempo lewat + selesai = false');
  Logger.log((sla3 === false ? '✅' : '❌') + ' SLA: jatuh_tempo hari ini = false (belum lewat)');
  Logger.log((sla4 === false ? '✅' : '❌') + ' SLA: jatuh_tempo kosong = false');

  // 5. Konstanta
  Logger.log((DP_STATUS_VALID_.length === 3 ? '✅' : '❌') +
             ' DP_STATUS_VALID_ = ' + DP_STATUS_VALID_.join(','));
  Logger.log((DP_TRANSISI_LEGAL_['selesai'].length === 0 ? '✅' : '❌') +
             ' selesai tidak bisa transisi ke mana-mana');

  Logger.log('=== Selesai ===');
}
