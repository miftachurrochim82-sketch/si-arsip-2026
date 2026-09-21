// ============================================================
// SI-ARSIP - 00b_LocalHelpers.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Helper lokal: lock, write-tanpa-lock, invalidasi cache.
//
// Dipakai oleh 03_SuratMasukApi.gs & 04_SuratKeluarApi.gs
// untuk operasi "read-check-write" atomik (nomor agenda/surat,
// transisi status, disposisi shortcut).
//
// Kenapa file ini ada (bukan langsung CoreLib):
//   - CoreLib.acquireLock() ada, TAPI tanpa argumen timeout.
//   - CoreLib.writeRecordNoLock() ada, TAPI tidak memanggil preSaveHook
//     (jadi wrapper ini panggil manual supaya ID auto-generate tetap jalan).
//   - Call-site di 03/04 sudah pakai nama *_ (underscore), jadi wrapper
//     menjaga konsistensi & menambah guard SIPMEG.
//
// Rujukan CoreLib v2.3.0 (pin 15) — signature terverifikasi dari kode asli:
//   CoreLib.writeRecordNoLock(ssId, sheetName, record, isUpdate, actor,
//                             headersMap, isRefSheetFunc, pkField)
//     → TANPA lock, TANPA preSaveHook, cache AUTO-invalidate.
//   CoreLib.apiSave(...) → SELALU ambil lock sendiri
//                          (JANGAN dipanggil saat lock sudah dipegang —
//                           LockService tidak re-entrant).
//   CoreLib.invalidateSheetCache(sheetName, dbId)
//     ← ⚠️ urutan argumen (sheetName DULU, lalu dbId).
// ============================================================

// ==================== §1 LOCK ====================

/**
 * Ambil script-wide lock dengan timeout custom.
 * WAJIB di-release di blok finally oleh caller.
 *
 * @param {number} [timeoutMs=10000]
 * @returns {Lock|null} — Lock object kalau berhasil, null kalau timeout
 */
function acquireLock_(timeoutMs) {
  timeoutMs = Number(timeoutMs) || 10000;
  try {
    var lock = LockService.getScriptLock();
    if (lock.tryLock(timeoutMs)) return lock;
    Logger.log('[acquireLock_] timeout ' + timeoutMs + 'ms');
    return null;
  } catch (e) {
    Logger.log('[acquireLock_] error: ' + e.message);
    return null;
  }
}

/**
 * Lepas lock (idempoten — aman kalau lock null / sudah di-release).
 * @param {Lock|null} lock
 */
function releaseLock_(lock) {
  if (!lock) return;
  try { lock.releaseLock(); } catch (e) { /* ignore */ }
}

// ==================== §2 WRITE TANPA LOCK ====================

/**
 * Simpan record TANPA ambil lock — caller WAJIB sudah pegang lock.
 * Delegasi ke CoreLib.writeRecordNoLock (BUKAN apiSave).
 *
 * - Menolak SIMPEG (read-only) sebelum panggil CoreLib.
 * - Memanggil localPreSaveHook_ manual (CoreLib.writeRecordNoLock
 *   TIDAK memanggilnya, jadi ID kosong tidak akan ter-generate kalau
 *   kita tidak lakukan di sini).
 * - Cache auto-invalidate oleh CoreLib — tidak dobel.
 *
 * @param {string}  sheetName
 * @param {object}  record
 * @param {boolean} isUpdate   — true = update-ketat, false = insert-ketat
 * @param {object}  actor      — { email, role, id, ... }
 * @param {string}  [pkField='id']
 * @returns {object} record tersimpan
 */
function writeRecordNoLock_(sheetName, record, isUpdate, actor, pkField) {
  if (isSimpegSheet_(sheetName)) {
    throw new Error('Akses Ditolak: Sheet "' + sheetName + '" read-only (SIMPEG).');
  }
  if (!record || typeof record !== 'object') {
    throw new Error('Record tidak valid.');
  }
  if (!SPREADSHEET_ID) {
    throw new Error('Spreadsheet lokal tidak dapat dibuka.');
  }

  // Clone + panggil preSaveHook manual (generate ID kalau kosong).
  var rec = Object.assign({}, record);
  if (typeof localPreSaveHook_ === 'function') {
    var hookRes = localPreSaveHook_(sheetName, rec, actor);
    if (hookRes && hookRes.error) throw new Error(hookRes.error);
    if (hookRes && hookRes.record) rec = hookRes.record;
  }

  return CoreLib.writeRecordNoLock(
    SPREADSHEET_ID,
    sheetName,
    rec,
    !!isUpdate,
    actor,
    ALL_SHEET_HEADERS,
    isSimpegSheet_,           // isRefFunc — true HANYA untuk SIMPEG
    pkField || 'id'
  );
}

// ==================== §3 CACHE INVALIDATION ====================

/**
 * Invalidasi cache sheet.
 * ⚠️ Signature CoreLib: (sheetName, dbId) — perhatikan urutan argumen.
 *
 * Catatan: umumnya TIDAK perlu dipanggil manual — CoreLib.apiSave,
 * apiDelete, dan writeRecordNoLock sudah auto-invalidate. Berguna hanya
 * untuk kasus khusus (mis. setelah batch update langsung via Sheets API).
 */
function invalidateSheetCache_(sheetName) {
  try {
    CoreLib.invalidateSheetCache(sheetName, SPREADSHEET_ID);
    return true;
  } catch (e) {
    Logger.log('[invalidateSheetCache_] ' + e.message);
    return false;
  }
}

// ==================== §4 SELF-CHECK ====================

function testLocalHelpersSelfCheck() {
  Logger.log('=== 00b_LocalHelpers.gs v1.0.0 self-check ===');

  // 1. Fungsi lokal tersedia
  ['acquireLock_', 'releaseLock_', 'writeRecordNoLock_', 'invalidateSheetCache_']
    .forEach(function (fn) {
      Logger.log((typeof this[fn] === 'function' ? '✅ ' : '❌ ') + fn);
    }, this);

  // 2. Fungsi CoreLib yang dipakai si-arsip
  var requiredCoreFns = [
    'writeRecordNoLock', 'invalidateSheetCache', 'getSheetDataCached',
    'apiSave', 'apiDelete', 'todayIsoLocal', 'dateKey10', 'whitelist',
    'normId', 'normStr', 'paginate', 'matchSearch', 'dispatchAction',
    'exchangePlatformTicket', 'checkAuth', 'logoutUser'
  ];
  var missing = [];
  requiredCoreFns.forEach(function (fn) {
    var ok = (typeof CoreLib[fn] === 'function');
    Logger.log((ok ? '✅' : '❌') + ' CoreLib.' + fn);
    if (!ok) missing.push(fn);
  });
  if (missing.length) {
    Logger.log('❌ CoreLib kurang: ' + missing.join(', '));
  }

  // 3. Nilai konstanta yang diharapkan
  Logger.log('ROLE_LEVELS = ' + JSON.stringify(ROLE_LEVELS));
  Logger.log('typeof isSimpegSheet_ = ' + typeof isSimpegSheet_);
  Logger.log('isSimpegSheet_("PEGAWAI") = ' + isSimpegSheet_('PEGAWAI'));
  Logger.log('isSimpegSheet_("M_KLASIFIKASI") = ' + isSimpegSheet_('M_KLASIFIKASI'));

  // 4. Test lock
  var lock = acquireLock_(5000);
  Logger.log((lock ? '✅' : '❌') + ' acquireLock_ dapat lock');
  releaseLock_(lock);
  Logger.log('✅ releaseLock_ selesai (tanpa error)');

  // 5. Test lock timeout kecil (harus tetap dapat, timeout hanya saat lock dipegang lain)
  var lock2 = acquireLock_(1000);
  Logger.log((lock2 ? '✅' : '❌') + ' acquireLock_(1000ms) dapat lock');
  releaseLock_(lock2);

  Logger.log('=== Selesai ===');
}

// ==================== §LOGBOOK & DRIVE (v1.3, G26/G28) ====================
// T_LOGBOOK (T7) = jejak hidup setiap aksi dokumen. AUDIT_LOGS tetap
// untuk audit sistem (CoreLib); logbook = narasi bisnis per dokumen.
// catatLogbook_ TIDAK mengunci sendiri: panggil di luar lock ATAU di
// dalam lock pemanggil (writeRecordNoLock_ = append, aman).

var LOGBOOK_AKSI_VALID_ = [
  'simpan_baru', 'ubah', 'hapus', 'ubah_status',
  'arsip_auto', 'ubah_lokasi', 'upload_lampiran'
];

/** Ringkasan satu baris untuk kolom detail_sebelum/sesudah. */
function logbookRingkasanDok_(rec) {
  rec = rec || {};
  var nomor = rec.nomor_agenda_masuk || rec.nomor_surat || rec.nomor_naskah || rec.id || '';
  var perihal = rec.perihal || rec.tujuan || rec.isi || '';
  var status  = rec.status_surat || rec.status_naskah || rec.status_disposisi || '';
  var s = String(nomor);
  if (perihal) s += ' | ' + String(perihal).slice(0, 60);
  if (status)  s += ' | ' + status;
  return s;
}

/** Tulis satu baris T_LOGBOOK. Gagal ≠ aksi gagal (try/catch).
 * v1.9 rev3 fix: isUpdate=false (insert baru), sebelumnya true → "Record tidak ditemukan" di log.
 */
function catatLogbook_(dokumenId, dokumenJenis, aksi, user, sebelum, sesudah, catatan) {
  if (LOGBOOK_AKSI_VALID_.indexOf(aksi) === -1) aksi = 'ubah';
  try {
    var rec = {
      id: '',
      dokumen_id: dokumenId || '',
      dokumen_jenis: dokumenJenis || '',
      aksi: aksi,
      aktor_email: (user && user.email) || '',
      tgl_aksi: new Date().toISOString(),
      detail_sebelum: sebelum || '',
      detail_sesudah: sesudah || '',
      catatan: catatan || ''
    };
    writeRecordNoLock_('T_LOGBOOK', rec, false, user, 'id');
  } catch (e) {
    Logger.log('[catatLogbook_] ' + e.message);
  }
}

/** Folder Drive bernama `nama` (buat sekali, ID di-cache di props). */
function getDriveFolder_(nama) {
  var props = PropertiesService.getScriptProperties();
  var key = 'DRIVE_FOLDER_ID_' + String(nama).replace(/[^A-Za-z0-9]+/g, '_');
  var id = props.getProperty(key);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* jatuh ke cari */ }
  }
  var it = DriveApp.getFoldersByName(nama);
  var f = it.hasNext() ? it.next() : DriveApp.createFolder(nama);
  try { props.setProperty(key, f.getId()); } catch (e2) {}
  return f;
}
