// ============================================================
// SI-ARSIP - 03_SuratMasukApi.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Domain Surat Masuk (T_SURAT_MASUK).
// FR-05..FR-12 dari FRD.
//
// Handler yang diregistrasi di 02_AppLogic.gs:
//   - smGetList_      → FR-09 list + filter + search + flag kritis
//   - smGetDetail_    → FR-10 detail + nested disposisi + lampiran
//   - smSave_         → FR-05/06/07/08 save + auto nomor agenda + validasi
//   - smDelete_       → FR-11 soft delete (verifikator+)
//   - smDisposisi_    → FR-12 wrapper buat disposisi (delegasi ke 05)
//
// Rujukan: Permendagri 78/2012 (format nomor), Perka ANRI (klasifikasi).
// ============================================================

// Kode klasifikasi yang dianggap kritis (highlight di UI).
// Bisa disesuaikan via Script Properties (opsional, fase lanjut).
var SM_KODE_KRITIS_ = ['005.1', '015'];
var SM_SIFAT_KRITIS_ = ['segera', 'rahasia'];

// ==================== §1 HELPER NOMOR AGENDA ====================

/**
 * Generate nomor agenda masuk.
 * Format: `<urut:3>/<kode_unit>/<tahun>` — mis. `001/SATPOL/2026`.
 *
 * FIX v1.0.1 (2026-09-20):
 *   - Sebelumnya pakai `count(list) + 1` → setelah delete, nomor akan
 *     DUPLIKAT (contoh: 001–005 tersimpan, hapus 003, insert baru → 005 lagi).
 *   - Sekarang pakai MAX dari nomor urut yang PERNAH ADA (termasuk yang
 *     soft-deleted) — anti duplikat.
 *   - Catatan: CoreLib.genUniqueCode TIDAK cocok karena hanya match nilai
 *     yang DIAWALI prefix (mis. 'SM-001'), sedangkan format kita
 *     '001/SATPOL/2026' — tidak diawali prefix apa pun.
 *
 * Dipanggil di dalam lock (smSave_) untuk mencegah race condition.
 */
function smGenerateNomorAgenda_(tahun) {
  tahun = String(tahun || new Date().getFullYear());

  // includeDeleted: true → nomor yang pernah dipakai tetap dihitung.
  var list = getSheetData_('T_SURAT_MASUK', { includeDeleted: true });

  var maxUrut = 0;
  list.forEach(function (r) {
    var m = String(r.nomor_agenda_masuk || '').match(/^(\d+)\//);
    if (!m) return;
    var tgl = String(r.tanggal_terima || r.tgl_registrasi || '');
    if (tgl.slice(0, 4) !== tahun) return;
    var n = parseInt(m[1], 10);
    if (!isNaN(n) && n > maxUrut) maxUrut = n;
  });

  var urut = ('000' + (maxUrut + 1)).slice(-3);
  var kodeUnit = String(appProps_().getProperty('kode_unit_singkat') || 'SATPOL').trim();
  return urut + '/' + kodeUnit + '/' + tahun;
}

/**
 * Cek apakah surat dianggap kritis.
 * Kritis jika kode_klasifikasi ∈ SM_KODE_KRITIS_ ATAU sifat ∈ SM_SIFAT_KRITIS_.
 */
function smIsKritis_(record) {
  var kode = String((record && record.kode_klasifikasi) || '').trim();
  var sifat = String((record && record.sifat) || '').toLowerCase().trim();
  return SM_KODE_KRITIS_.indexOf(kode) !== -1 || SM_SIFAT_KRITIS_.indexOf(sifat) !== -1;
}

// ==================== §2 LIST & DETAIL ====================

/**
 * List surat masuk.
 * params: { filters?: {...}, search?, page?, limit? }
 */
function smGetList_(params, user) {
  try {
    params = params || {};
    var list = getSheetData_('T_SURAT_MASUK');
    var filters = params.filters || {};

    // Filter tanggal (by tanggal_terima)
    var fDari   = CoreLib.dateKey10(filters.tanggal_dari);
    var fSampai = CoreLib.dateKey10(filters.tanggal_sampai);
    var fAsal   = CoreLib.normStr(filters.asal);
    var fKode   = String(filters.kode_klasifikasi || '').trim();
    var fSifat  = CoreLib.normStr(filters.sifat);
    var fStatus = CoreLib.normStr(filters.status_surat);

    if (fDari)   list = list.filter(function (r) { return CoreLib.dateKey10(r.tanggal_terima) >= fDari; });
    if (fSampai) list = list.filter(function (r) { return CoreLib.dateKey10(r.tanggal_terima) <= fSampai; });
    if (fAsal)   list = list.filter(function (r) { return CoreLib.normStr(r.asal).indexOf(fAsal) !== -1; });
    if (fKode)   list = list.filter(function (r) { return String(r.kode_klasifikasi || '') === fKode; });
    if (fSifat)  list = list.filter(function (r) { return CoreLib.normStr(r.sifat) === fSifat; });
    if (fStatus) list = list.filter(function (r) { return CoreLib.normStr(r.status_surat) === fStatus; });

    // Search
    var q = CoreLib.normStr(params.search);
    if (q) {
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, [
          'nomor_agenda_masuk', 'nomor_surat', 'asal', 'perihal', 'catatan'
        ]);
      });
    }

    // Sort: tanggal_terima desc, fallback tgl_registrasi
    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal_terima) || CoreLib.dateKey10(a.tgl_registrasi);
      var tb = CoreLib.dateKey10(b.tanggal_terima) || CoreLib.dateKey10(b.tgl_registrasi);
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    // Clone + flag kritis (runtime, tidak disimpan)
    list = list.map(function (r) {
      var out = Object.assign({}, r);
      out.is_kritis = smIsKritis_(out);
      return out;
    });

    // Paginasi via CoreLib.paginate (opsional — frontend bisa juga)
    var page  = Number(params.page)  || 1;
    var limit = Number(params.limit) || 50;
    return CoreLib.paginate(list, page, limit);
  } catch (err) {
    Logger.log('[smGetList_] ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Detail surat masuk + nested disposisi + lampiran.
 */
function smGetDetail_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID surat wajib diisi.' };
    }

    var row = findRecordById_('T_SURAT_MASUK', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Surat masuk tidak ditemukan.' };

    var out = Object.assign({}, row);
    out.is_kritis = smIsKritis_(out);

    // Nested disposisi
    var allDp = getSheetData_('T_DISPOSISI');
    out.disposisi = allDp.filter(function (d) {
      return CoreLib.normId(d.surat_id) === CoreLib.normId(data.id);
    });

    // Nested lampiran
    var allLmp = getSheetData_('T_LAMPIRAN');
    out.lampiran = allLmp.filter(function (l) {
      return CoreLib.normId(l.dokumen_id) === CoreLib.normId(data.id) &&
             CoreLib.normStr(l.dokumen_jenis) === 'surat_masuk';
    });

    return { success: true, data: out };
  } catch (err) {
    Logger.log('[smGetDetail_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 SAVE ====================

/**
 * Simpan surat masuk (insert atau update).
 * FR-05..FR-08.
 */
function smSave_(data, user) {
  try {
    var record = data.record || data;
    if (!record || typeof record !== 'object') {
      return { success: false, code: 'BAD_REQUEST', error: 'Payload tidak valid.' };
    }
    record = Object.assign({}, record);

    // ---------- Validasi wajib ----------
    if (!String(record.nomor_surat || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'nomor_surat wajib diisi.' };
    }
    if (!String(record.asal || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'asal wajib diisi.' };
    }
    if (!String(record.perihal || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'perihal wajib diisi.' };
    }
    if (!String(record.kode_klasifikasi || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'kode_klasifikasi wajib diisi.' };
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

    // ---------- Normalisasi ----------
    // Sifat whitelist
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

    // Tanggal normalisasi (WIB)
    if (record.tanggal_surat) {
      record.tanggal_surat = CoreLib.dateKey10(record.tanggal_surat) || record.tanggal_surat;
    }
    if (record.tanggal_terima) {
      record.tanggal_terima = CoreLib.dateKey10(record.tanggal_terima) || record.tanggal_terima;
    } else {
      record.tanggal_terima = CoreLib.todayIsoLocal();
    }

    // ---------- Insert baru: lock untuk nomor agenda ----------
    var isInsert = !record.id || String(record.id).trim() === '';
    if (isInsert) {
      var lock = acquireLock_();
      if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, coba lagi.' };
      try {
        // Duplikat: (nomor_surat + asal + tahun)
        var tahunSurat = String(record.tanggal_terima || '').slice(0, 4);
        var all = getSheetData_('T_SURAT_MASUK');
        var dup = all.find(function (r) {
          var rTahun = String(r.tanggal_terima || r.tgl_registrasi || '').slice(0, 4);
          return String(r.nomor_surat).toUpperCase() === String(record.nomor_surat).toUpperCase() &&
                 CoreLib.normStr(r.asal) === CoreLib.normStr(record.asal) &&
                 rTahun === tahunSurat;
        });
        if (dup) {
          return { success: false, code: 'BAD_REQUEST',
                   error: 'Surat dengan nomor + asal + tahun yang sama sudah ada (ID: ' + dup.id + ').' };
        }

        // Auto-generate nomor agenda (kecuali override)
        if (!String(record.nomor_agenda_masuk || '').trim()) {
          record.nomor_agenda_masuk = smGenerateNomorAgenda_(tahunSurat);
        }
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }

      // Default status
      record.status_surat = 'baru';
      // Auto-inject
      record.dicatat_oleh = (user && user.email) || '';
      record.tgl_registrasi = CoreLib.todayIsoLocal();

    } else {
      // ---------- Update: jangan ubah field sistem ----------
      var existing = findRecordById_('T_SURAT_MASUK', record.id);
      if (!existing) return { success: false, code: 'NOT_FOUND', error: 'Surat tidak ditemukan.' };

      // Guard ownership: user hanya boleh edit surat yang belum didiposisi
      var isVerif = user && ['verifikator', 'admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
      if (!isVerif) {
        var status = String(existing.status_surat || '').toLowerCase();
        if (status !== 'baru') {
          return { success: false, code: 'FORBIDDEN',
                   error: 'Surat sudah didiposisi — hanya verifikator+ yang boleh edit.' };
        }
      }

      // Warisi field sistem (tidak boleh diubah via update)
      record.nomor_agenda_masuk = existing.nomor_agenda_masuk || '';
      record.dicatat_oleh       = existing.dicatat_oleh || '';
      record.tgl_registrasi     = existing.tgl_registrasi || '';
      record.status_surat       = existing.status_surat || 'baru';
    }

    var saved = saveRecord_('T_SURAT_MASUK', record, user);

    audit_(user, isInsert ? 'CREATE_SURAT_MASUK' : 'UPDATE_SURAT_MASUK',
           'T_SURAT_MASUK', saved.id, true,
           'Agenda: ' + saved.nomor_agenda_masuk + ' — ' + saved.perihal);

    // FR-28 (Fase 2 aktif): status selesai lewat edit manual → auto-archive.
    if (CoreLib.normStr(saved.status_surat) === 'selesai') {
      try { arAutoArchive_('surat_masuk', saved.id, user); }
      catch (e) { Logger.log('[WARN] auto-archive sm-save: ' + e.message); }
    }

    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[smSave_] ' + err.message);
    audit_(user, 'SAVE_SURAT_MASUK', 'T_SURAT_MASUK',
           (data.record && data.record.id) || '', false, err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 DELETE ====================

/**
 * Hapus surat masuk (soft delete). Verifikator+ saja.
 * Tolak jika masih ada disposisi berstatus ≠ selesai.
 */
function smDelete_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    }

    var isVerif = user && ['verifikator', 'admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isVerif) {
      return { success: false, code: 'FORBIDDEN', error: 'Hapus surat masuk hanya untuk verifikator+.' };
    }

    var row = findRecordById_('T_SURAT_MASUK', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Surat tidak ditemukan.' };

    // Cek disposisi aktif
    var dp = getSheetData_('T_DISPOSISI').filter(function (d) {
      return CoreLib.normId(d.surat_id) === CoreLib.normId(data.id) &&
             CoreLib.normStr(d.status_disposisi) !== 'selesai';
    });
    if (dp.length > 0) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'Masih ada ' + dp.length + ' disposisi aktif. Selesaikan dulu.' };
    }

    var ok = softDeleteRecord_('T_SURAT_MASUK', data.id, user);
    audit_(user, 'DELETE_SURAT_MASUK', 'T_SURAT_MASUK', data.id, ok,
           'Agenda: ' + (row.nomor_agenda_masuk || data.id));
    return { success: ok, message: ok ? 'Surat masuk dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    Logger.log('[smDelete_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 DISPOSISI (shortcut dari surat) ====================

/**
 * Buat disposisi untuk surat ini.
 * Delegasi logic ke 05_DisposisiApi.gs.
 * Setelah insert, update T_SURAT_MASUK.status_surat = 'didiposisi'.
 */
function smDisposisi_(data, user) {
  try {
    if (!data || !data.surat_id) {
      return { success: false, code: 'BAD_REQUEST', error: 'surat_id wajib diisi.' };
    }

    var surat = findRecordById_('T_SURAT_MASUK', data.surat_id);
    if (!surat) return { success: false, code: 'NOT_FOUND', error: 'Surat tidak ditemukan.' };

    // Delegasi ke dpSave_ (dari 05) — pass data yang sama
    // (dpSave_ sudah handle validasi, WIB, dan auto-inject)
    var res = dpSave_(data, user);
    if (!res || !res.success) return res;

    // Update status surat → didiposisi
    var lock = acquireLock_();
    if (lock) {
      try {
        var fresh = findRecordById_('T_SURAT_MASUK', data.surat_id);
        if (fresh) {
          fresh.status_surat = 'didiposisi';
          writeRecordNoLock_('T_SURAT_MASUK', fresh, true, user, 'id');
          invalidateSheetCache_('T_SURAT_MASUK');
        }
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    return res;
  } catch (err) {
    Logger.log('[smDisposisi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 SELF-CHECK ====================

function testSuratMasukSelfCheck() {
  Logger.log('=== 03_SuratMasukApi.gs v1.0.0 self-check ===');

  var admin = { role: 'admin', email: 'test@test.com', pegawai_id: 'PEG-0001' };
  var user  = { role: 'user',  email: 'pegawai@test.com', pegawai_id: 'PEG-0002' };

  // Test 1: list
  var l = smGetList_({}, admin);
  Logger.log((l && l.success ? '✅' : '❌') + ' smGetList_ — ' +
             ((l.data || []).length) + ' item, meta=' + JSON.stringify(l.meta));

  // Test 2: validasi wajib
  var badSave = smSave_({ record: { nomor_surat: 'X' } }, user);
  Logger.log((!badSave.success ? '✅' : '❌') + ' save tanpa asal/perihal/kode DITOLAK');

  // Test 3: kode klasifikasi tidak terdaftar
  var badKode = smSave_({
    record: { nomor_surat: 'X/1', asal: 'Test', perihal: 'Test', kode_klasifikasi: 'XXX.999' }
  }, user);
  Logger.log((!badKode.success ? '✅' : '❌') + ' kode_klasifikasi tidak terdaftar DITOLAK');

  // Test 4: helper is_kritis
  var krit1 = smIsKritis_({ kode_klasifikasi: '005.1', sifat: 'biasa' });
  var krit2 = smIsKritis_({ kode_klasifikasi: '800', sifat: 'rahasia' });
  var krit3 = smIsKritis_({ kode_klasifikasi: '800', sifat: 'biasa' });
  Logger.log((krit1 && krit2 && !krit3 ? '✅' : '❌') +
             ' smIsKritis_ benar (kode 005.1=' + krit1 + ', rahasia=' + krit2 + ', biasa=' + krit3 + ')');

  // Test 5: nomor agenda
  try {
    var nom = smGenerateNomorAgenda_(2026);
    Logger.log((/^\d{3}\/[A-Z]+\/2026$/.test(nom) ? '✅' : '❌') + ' smGenerateNomorAgenda_ = ' + nom);
  } catch (e) {
    Logger.log('❌ smGenerateNomorAgenda_ exception: ' + e.message);
  }

  Logger.log('=== Selesai ===');
}
