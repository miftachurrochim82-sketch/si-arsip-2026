// ============================================================
// SI-ARSIP - 01_ConfigAndBridge.gs (v1.0.1 — CoreLib-First)
// ============================================================
// Bridge tipis ke CoreLib v2.3.0 (pin 15) + kontrak dispatcher v2.
// Pola identik dengan si-kompetensi v6.0.1, si-lahar v2.1.0, starter-kit v2.0.1.
//
// Changelog v1.0.1 (2026-09-20):
// - FIX KRITIS #1: isRefSheet_() dihapus. Sebelumnya dipakai sebagai
//   isRefSheetFunc → isRefSheet_('M_KLASIFIKASI') = true → apiSave TOLAK
//   semua master (M_*) sebagai "sheet referensi SIMPEG" (FORBIDDEN).
//   Sekarang pakai isSimpegSheet_() yang hanya true untuk
//   PEGAWAI / JABATAN / UNIT_KERJA.
// - FIX KRITIS #2: getSheetData_() — isRefFunc: isRefSheet_ → isSimpegSheet_.
//   Sebelumnya isRefSheet_('PEGAWAI') = false → SIMPEG dibaca dari DB LOKAL
//   (bukan MASTER) → PEGAWAI/JABATAN/UNIT_KERJA selalu kosong.
// - FIX #3: ROLE_LEVELS = CoreLib.MASTER_ROLE_LEVELS → undefined (var tidak
//   diekspos library). Diganti salinan hardcode identik.
//
// ⚡ CHECKLIST MINIMUM EDIT untuk app baru:
// ────────────────────────────────────────────────────────────
//   1. APP_CODE (§1)               — sudah 'SIARSIP'
//   2. APP_TITLE (§1)              — sudah 'SI-ARSIP'
//   3. DEFAULT_SPREADSHEET_ID (§1) — isi ID spreadsheet DB
//   4. ALL_SHEET_HEADERS (§3b)     — sudah sesuai BRD
//   5. actionLevels (§7)           — sudah sesuai FRD
// ────────────────────────────────────────────────────────────
//
// ⚡ SKEMA 10 SHEET (master 3 + tabel 7):
//   Master (3): M_KLASIFIKASI, M_PEJABAT, M_TEMPLATE
//   Tabel (7):  T_SURAT_MASUK, T_SURAT_KELUAR, T_NASKAH_DINAS,
//               T_DISPOSISI, T_ARSIP, T_LAMPIRAN, T_LOGBOOK
//
// Referensi SIMPEG (PEGAWAI/JABATAN/UNIT_KERJA) & ZZ_TEST_CRUD tidak
// dihitung sebagai budget sheet bisnis.
// ============================================================

// ==================== §1 KONSTANTA GLOBAL ====================

var APP_CODE  = 'SIARSIP';
var APP_TITLE = 'SI-ARSIP — Sistem Informasi Kearsipan Dinamis';

// ID spreadsheet MASTER SIMPEG (jangan diubah)
var DEFAULT_MASTER_SPREADSHEET_ID = '1HvMXmvdtgAUZ9A0-SQHZp9QjnYv1A7Ku_oJIjbT8gT0';

// URL /exec SI-PLATFORM (SSO) — jangan diubah kecuali platform pindah
var DEFAULT_PLATFORM_URL = 'https://script.google.com/macros/s/AKfycbwh_OUVqmxLcuF81FHmPZtT33Wrm8Ce9Da1SQ3hfkSr7gM5P8ofyAlHSgW40mq3eo-PoQ/exec';

// [SESUAIKAN] ID spreadsheet database SI-ARSIP
var DEFAULT_SPREADSHEET_ID = '1pXXSXA0Hxpjw5GIjm9v25rNxrTEigNREp0Z-hmHKz_E';

// Session format v2 CoreLib: 'APP_SESSION_<APP_CODE>_'
var SESSION_PREFIX      = 'APP_SESSION_' + APP_CODE + '_';
var SESSION_TTL_SECONDS = 6 * 60 * 60;   // 6 jam = cap CoreLib (21600)
var DATA_CACHE_TTL      = 300;           // 5 menit (sheet transaksi)

// ─────────────────────────────────────────────────────────────
// ROLE_LEVELS — salinan identik MASTER_ROLE_LEVELS CoreLib v2.3.0.
// ⚠️ TIDAK pakai CoreLib.MASTER_ROLE_LEVELS karena di GAS variabel
//    global `var` library TIDAK diekspos (hanya fungsi). Akses
//    CoreLib.MASTER_ROLE_LEVELS = undefined.
//    Kalau CoreLib ubah skala role, WAJIB update baris ini juga.
// ─────────────────────────────────────────────────────────────
var ROLE_LEVELS = {
  viewer:      0,
  user:        1,
  verifikator: 2,
  admin:       3,
  super:       4
};

// ==================== §2 PROPERTIES & SPREADSHEET ====================
// Store MILIK APP (bukan library) — wajib dioper ke CoreLib.getEnvProperty.
function appProps_() { return PropertiesService.getScriptProperties(); }

var SPREADSHEET_ID = CoreLib.getEnvProperty('SPREADSHEET_ID', appProps_())
  || DEFAULT_SPREADSHEET_ID
  || (function () {
      try { return SpreadsheetApp.getActiveSpreadsheet().getId(); } catch (e) { return ''; }
    })();

var MASTER_SPREADSHEET_ID = CoreLib.getEnvProperty('MASTER_SPREADSHEET_ID', appProps_())
  || DEFAULT_MASTER_SPREADSHEET_ID;

var PLATFORM_API_URL = CoreLib.getEnvProperty('PLATFORM_API_URL', appProps_())
  || DEFAULT_PLATFORM_URL;

// ==================== §3 SKEMA SHEET ====================

var LOCAL_SHEETS = {
  // Master (3)
  M_KLASIFIKASI: 'M_KLASIFIKASI',
  M_PEJABAT:     'M_PEJABAT',
  M_TEMPLATE:    'M_TEMPLATE',
  // Tabel (7)
  T_SURAT_MASUK:  'T_SURAT_MASUK',
  T_SURAT_KELUAR: 'T_SURAT_KELUAR',
  T_NASKAH_DINAS: 'T_NASKAH_DINAS',
  T_DISPOSISI:    'T_DISPOSISI',
  T_ARSIP:        'T_ARSIP',
  T_LAMPIRAN:     'T_LAMPIRAN',
  T_LOGBOOK:      'T_LOGBOOK'
};

// Prefix ID per-sheet (dipakai localPreSaveHook_ P1)
var LOCAL_ID_PREFIX_ = {
  'M_KLASIFIKASI':  'ref',
  'M_PEJABAT':      'pjb',
  'M_TEMPLATE':     'tpl',
  'T_SURAT_MASUK':  'sm',
  'T_SURAT_KELUAR': 'sk',
  'T_NASKAH_DINAS': 'nd',
  'T_DISPOSISI':    'dp',
  'T_ARSIP':        'ar',
  'T_LAMPIRAN':     'lmp',
  'T_LOGBOOK':      'log'
};

// Alias nama sheet SIMPEG → kanonik (dibaca dari MASTER via CoreLib)
var SIMPEG_SHEET_ALIAS_ = {
  'PEGAWAI': 'PEGAWAI', 'M_PEGAWAI': 'PEGAWAI', 'pegawai': 'PEGAWAI',
  'UNIT_KERJA': 'UNIT_KERJA', 'M_UNIT_KERJA': 'UNIT_KERJA', 'unit_kerja': 'UNIT_KERJA', 'units': 'UNIT_KERJA',
  'JABATAN': 'JABATAN', 'M_JABATAN': 'JABATAN', 'jabatan': 'JABATAN'
};

function canonicalSimpegSheet_(sheetName) {
  var s = String(sheetName || '').trim();
  if (SIMPEG_SHEET_ALIAS_[s]) return SIMPEG_SHEET_ALIAS_[s];
  var u = s.toUpperCase();
  if (SIMPEG_SHEET_ALIAS_[u]) return SIMPEG_SHEET_ALIAS_[u];
  return null;
}

// ⚠️ SATU-SATUNYA fungsi "isRefFunc" yang dipakai app.
// true HANYA untuk PEGAWAI / JABATAN / UNIT_KERJA.
// JANGAN pakai fungsi lain (mis. prefix 'M_') — akan menolak master lokal.
function isSimpegSheet_(sheetName) {
  return canonicalSimpegSheet_(sheetName) !== null;
}

// [Dihapus] isRefSheet_() — sebelumnya dipakai sebagai isRefFunc, TAPI
// return true untuk M_KLASIFIKASI/M_PEJABAT/M_TEMPLATE (bukan SIMPEG) →
// apiSave menolak master lokal dengan FORBIDDEN.

// ==================== §3b HEADER MAP ====================
// Kolom audit ('created_at','updated_at','created_by','updated_by','deleted_at')
// WAJIB ada di setiap sheet — dipakai CoreLib untuk tracking.
// 'id' selalu kolom pertama.

var ALL_SHEET_HEADERS = {

  // ==================== MASTER BISNIS ====================
  M_KLASIFIKASI: [
    'id', 'kode_klasifikasi', 'uraian', 'retensi_aktif_th', 'retensi_inaktif_th',
    'tindakan_akhir', 'status_aktif', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_PEJABAT: [
    'id', 'pegawai_id', 'jabatan_id', 'urutan_hierarki', 'tanda_tangan_url',
    'aktif', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_TEMPLATE: [
    'id', 'kode_template', 'nama_template', 'jenis_naskah', 'format_default',
    'status_aktif', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],

  // ==================== TABEL BISNIS ====================
  T_SURAT_MASUK: [
    'id', 'nomor_agenda_masuk', 'nomor_surat', 'tanggal_surat', 'tanggal_terima',
    'asal', 'perihal', 'kode_klasifikasi', 'jumlah_lampiran', 'sifat', 'status_surat',
    'lampiran_link', 'catatan', 'dicatat_oleh', 'tgl_registrasi',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_SURAT_KELUAR: [
    'id', 'nomor_surat', 'tanggal_surat', 'tujuan', 'perihal', 'kode_klasifikasi',
    'jumlah_lampiran', 'sifat', 'penandatangan_id', 'status_surat',
    'lampiran_link', 'catatan', 'dibuat_oleh', 'tgl_dibuat', 'tgl_terkirim',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_NASKAH_DINAS: [
    'id', 'jenis_naskah', 'nomor_naskah', 'tanggal', 'perihal', 'tujuan', 'isi',
    'kode_klasifikasi', 'status_naskah', 'lampiran_link', 'dibuat_oleh',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_DISPOSISI: [
    'id', 'surat_id', 'dari_pejabat_id', 'ke_pejabat_id', 'instruksi', 'catatan',
    'tgl_disposisi', 'jatuh_tempo', 'status_disposisi', 'tgl_selesai',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_ARSIP: [
    'id', 'jenis_asal', 'ref_id', 'kode_klasifikasi', 'judul', 'tgl_arsip',
    'lokasi_fisik', 'status_arsip', 'tgl_retensi_habis', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_LAMPIRAN: [
    'id', 'dokumen_id', 'dokumen_jenis', 'jenis_bukti', 'url', 'nama_bukti', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_LOGBOOK: [
    'id', 'dokumen_id', 'dokumen_jenis', 'aksi', 'aktor_email', 'tgl_aksi',
    'detail_sebelum', 'detail_sesudah', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],

  // ==================== INFRA UJI (dipakai CoreLib.runCoreTests) ====================
  ZZ_TEST_CRUD: ['id', 'laporan_id', 'nama', 'no_hp', 'catatan_baru'],

  // ==================== SIMPEG (read-only — dokumentasi skema master) ====================
  PEGAWAI: [
    'pegawai_id', 'nip', 'nik', 'nama', 'gelar_depan', 'gelar_belakang',
    'jenis_kelamin', 'tanggal_lahir', 'pangkat_golongan', 'status_kepegawaian',
    'pendidikan_terakhir', 'email', 'no_hp', 'alamat', 'foto_url',
    'unit_id', 'jabatan_id', 'atasan_id', 'role', 'status',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  UNIT_KERJA: [
    'unit_id', 'kode_unit', 'nama_unit', 'kategori_unit', 'parent_unit_id', 'lokasi',
    'telepon_unit', 'kepala_nip', 'kepala_hp', 'kepala_unit_id', 'jenis_unit',
    'status_aktif', 'keterangan', 'status',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  JABATAN: [
    'jabatan_id', 'kode_jabatan', 'nama_jabatan', 'jenis_jabatan', 'rumpun_jabatan',
    'jenjang_jabatan', 'kelas_jabatan', 'unit_id', 'status_jabatan', 'plt_pegawai_id',
    'tanggal_mulai_jabatan', 'tanggal_selesai_jabatan', 'target_jp_tahunan',
    'status_aktif', 'keterangan', 'status',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ]
};

// ==================== §4 NORMALISASI DOMAIN SIMPEG ====================

function normalizeEntityId_(id) {
  var s = CoreLib.normId(id);
  if (!s) return '';
  var m = s.match(/^([A-Z]+)-0*(\d+)$/);
  if (m) {
    var prefix = m[1];
    var num = Number(m[2]);
    return prefix + '-' + ('0000' + num).slice(-4);
  }
  return s;
}

var ID_FIELDS_TO_NORMALIZE_ = [
  'pegawai_id', 'unit_id', 'jabatan_id', 'atasan_id',
  'plt_pegawai_id', 'kepala_unit_id', 'kepala_pegawai_id',
  'surat_id', 'dari_pejabat_id', 'ke_pejabat_id', 'penandatangan_id',
  'ref_id', 'dokumen_id'
];

function normalizeEntityIdFields_(obj) {
  if (!obj) return obj;
  ID_FIELDS_TO_NORMALIZE_.forEach(function (f) {
    if (obj[f] !== undefined && obj[f] !== null && obj[f] !== '') {
      obj[f] = normalizeEntityId_(obj[f]);
    }
  });
  return obj;
}

function normalizePegawai_(obj) {
  if (!obj) return obj;
  if (obj.pegawai_id && !obj.id) obj.id = obj.pegawai_id;
  if (!obj.pegawai_id && obj.id) obj.pegawai_id = obj.id;
  if (obj.nama && !obj.nama_lengkap) obj.nama_lengkap = obj.nama;
  if (obj.nama_lengkap && !obj.nama) obj.nama = obj.nama_lengkap;
  if (obj.status_kepegawaian && !obj.status_pegawai) obj.status_pegawai = obj.status_kepegawaian;
  if (obj.status_pegawai && !obj.status_kepegawaian) obj.status_kepegawaian = obj.status_pegawai;
  if (obj.pangkat_golongan && !obj.pangkat_gol) obj.pangkat_gol = obj.pangkat_golongan;
  if (obj.pangkat_gol && !obj.pangkat_golongan) obj.pangkat_golongan = obj.pangkat_gol;
  if (obj.no_hp && !obj.telepon) obj.telepon = obj.no_hp;
  if (obj.telepon && !obj.no_hp) obj.no_hp = obj.telepon;
  return obj;
}

function normalizeSimpegRecords_(sheetName, records) {
  if (!records || !records.length) return records;
  var canon = canonicalSimpegSheet_(sheetName);
  if (!canon) return records;
  return records.map(function (obj) {
    var clone = Object.assign({}, obj);
    normalizeEntityIdFields_(clone);
    if (canon === 'PEGAWAI') normalizePegawai_(clone);
    return clone;
  });
}

// ==================== §5 WRAPPER DOMAIN (TIPIS) ====================

/**
 * Baca sheet sebagai array of records.
 * - SIMPEG: baca dari MASTER + post-normalisasi alias kolom.
 * - Lokal: baca dari SPREADSHEET_ID.
 * - Soft-delete: DEFAULT filter !deleted_at; opsi includeDeleted:true untuk audit.
 * - PENGECUALIAN: T_LOGBOOK selalu tampil (audit) — tidak difilter.
 *
 * ⚠️ isRefFunc WAJIB isSimpegSheet_ (bukan isRefSheet_ / prefix 'M_').
 *    Kalau salah, SIMPEG akan dibaca dari DB LOKAL → kosong.
 */
function getSheetData_(sheetName, options) {
  options = options || {};
  var ssId = SPREADSHEET_ID;
  if (!ssId) { Logger.log('[WARN] getSheetData_ tanpa SPREADSHEET_ID.'); return []; }

  var canonicalSimpeg = canonicalSimpegSheet_(sheetName);
  var lookupName = canonicalSimpeg || sheetName;
  var coreOptions = canonicalSimpeg
    ? { masterSsId: MASTER_SPREADSHEET_ID, isRefFunc: isSimpegSheet_ }
    : { isRefFunc: isSimpegSheet_ };

  var records;
  try {
    records = CoreLib.getSheetDataCached(ssId, lookupName, ALL_SHEET_HEADERS, DATA_CACHE_TTL, coreOptions) || [];
  } catch (e) {
    Logger.log('[getSheetData_] ' + sheetName + ': ' + e.message);
    return [];
  }

  if (canonicalSimpeg) records = normalizeSimpegRecords_(sheetName, records);

  // Filter soft-delete (kecuali T_LOGBOOK yang selalu tampil untuk audit)
  var isLogbook = String(sheetName).toUpperCase() === 'T_LOGBOOK';
  if (!options.includeDeleted && !isLogbook) {
    records = records.filter(function (r) { return !r.deleted_at; });
  }

  return records;
}

/**
 * Simpan / update record (delegasi ke CoreLib.apiSave).
 * Menolak SIMPEG (read-only). Pre-save hook (P1 gen-id) selalu aktif.
 *
 * ⚠️ isRefSheetFunc WAJIB isSimpegSheet_ — kalau bukan, master lokal
 *    (M_*) akan DITOLAK FORBIDDEN.
 */
function saveRecord_(sheetName, record, actor) {
  if (isSimpegSheet_(sheetName)) {
    throw new Error('Akses Ditolak: Sheet "' + sheetName + '" read-only (SIMPEG).');
  }
  if (!record || typeof record !== 'object') {
    throw new Error('Record tidak valid.');
  }
  if (!SPREADSHEET_ID) throw new Error('Spreadsheet lokal tidak dapat dibuka.');

  var result = CoreLib.apiSave(
    SPREADSHEET_ID,
    sheetName,
    record,
    actor,
    ALL_SHEET_HEADERS,
    isSimpegSheet_,
    localPreSaveHook_,
    'id'
  );

  if (!result.success) {
    throw new Error(result.error || ('Gagal menyimpan ke ' + sheetName + '.'));
  }
  return result.data;
}

/**
 * Soft delete record (delegasi ke CoreLib.apiDelete).
 */
function softDeleteRecord_(sheetName, id, actor) {
  if (isSimpegSheet_(sheetName)) {
    throw new Error('Akses Ditolak: Sheet "' + sheetName + '" read-only (SIMPEG).');
  }
  if (!SPREADSHEET_ID) return false;

  return !!CoreLib.apiDelete(
    SPREADSHEET_ID, sheetName, id, actor,
    ALL_SHEET_HEADERS, isSimpegSheet_, 'id'
  ).success;
}

/**
 * Cari record by ID.
 */
function findRecordById_(sheetName, id) {
  var target = normalizeEntityId_(id);
  if (!target) return null;
  var rows = getSheetData_(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEntityId_(rows[i].id) === target) return rows[i];
  }
  return null;
}

// ==================== §6 PRE-SAVE HOOK (P1) ====================
// P1: id kosong → generate (cegah PK jatuh ke kolom lain = data loss).
// Prefix ID dari LOCAL_ID_PREFIX_ (10 prefix).
function localPreSaveHook_(canonical, record, actor) {
  var C = String(canonical || '').toUpperCase();

  if (!record.id || String(record.id).trim() === '') {
    var pfx = LOCAL_ID_PREFIX_[C]
           || C.replace(/^M_/, '').replace(/^T_/, '').substring(0, 3).toLowerCase();
    record.id = pfx + '-' + String(Date.now()).slice(-6);
  }

  return { record: record };
}

// ==================== §7 KONTRAK DISPATCHER v2 ====================
// actionLevels fail-closed: aksi tak dikenal = 'viewer' (default dispatcher).
// Setiap entry WAJIB punya handler di buildLocalHandlers_() (02_AppLogic.gs).

function getAppConfig_() {
  return {
    // ---- Identitas & sumber data ----
    appCode:         APP_CODE,
    spreadsheetId:   SPREADSHEET_ID,
    masterSsId:      MASTER_SPREADSHEET_ID,
    platformApiUrl:  PLATFORM_API_URL,
    sessionPrefix:   SESSION_PREFIX,
    ttlSeconds:      SESSION_TTL_SECONDS,
    roleLevels:      ROLE_LEVELS,

    // ---- Skema & hooks ----
    headersMap:      ALL_SHEET_HEADERS,
    pkFields:        {},
    isRefSheetFunc:  isSimpegSheet_,     // ⚠️ isSimpegSheet_, BUKAN isRefSheet_
    preSaveHook:     localPreSaveHook_,

    // ---- Level aksi (fail-closed) ----
    actionLevels: {
      // Konfigurasi
      'get_config':           'viewer',
      'get_config_list':      'viewer',
      'save_config_item':     'admin',
      'save_config':          'admin',
      'delete_config_item':   'admin',
      'delete_config':        'admin',

      // Self-service
      'get_my_profile':       'viewer',
      'save_my_profile':      'viewer',

      // Dashboard
      'get_dashboard':                  'viewer',
      'dash_chart_tren':                'viewer',
      'dash_klasifikasi':               'viewer',
      'dash_surat_kritis':              'viewer',
      'dash_disposisi_lewat_sla':       'viewer',

      // SIMPEG read-only
      'get_simpeg_lookup':    'viewer',
      'get_master_pegawai':   'viewer',
      'get_master_unit':      'viewer',
      'get_master_jabatan':   'viewer',
      'get_pegawai_list':     'viewer',
      'get_unit_list':        'viewer',
      'get_jabatan_list':     'viewer',

      // Surat Masuk (FR-05..FR-12)
      'sm_get_list':          'viewer',
      'sm_get_detail':        'viewer',
      'sm_save':              'user',
      'sm_delete':            'verifikator',
      'sm_disposisi':         'verifikator',

      // Surat Keluar (FR-13..FR-20)
      'sk_get_list':          'viewer',
      'sk_get_detail':        'viewer',
      'sk_save':              'user',
      'sk_delete':            'admin',
      'sk_ubah_status':       'user',  // guard per-transisi di handler

      // Disposisi (FR-21..FR-27)
      'dp_get_list':          'viewer',
      'dp_get_detail':        'viewer',
      'dp_save':              'verifikator',
      'dp_teruskan':          'user',
      'dp_selesaikan':        'verifikator',
      'dp_delete':            'admin',

      // Master Klasifikasi
      'ref_get_list':         'viewer',
      'ref_save':             'admin',
      'ref_delete':           'admin',

      // Master Pejabat
      'pjb_get_list':         'viewer',
      'pjb_save':             'admin',
      'pjb_delete':           'admin',

      // Master Template
      'tpl_get_list':         'viewer',
      'tpl_save':             'admin',
      'tpl_delete':           'admin',

      // Fase 2 — AKTIF sejak v1.1.0 (2026-09-20): Naskah, Kearsipan, Pencarian
      'nd_get_list':        'viewer',
      'nd_get_detail':      'viewer',
      'nd_save':            'user',
      'nd_delete':          'admin',
      'nd_ubah_status':     'user',
      'ar_get_list':        'viewer',
      'ar_get_detail':      'viewer',
      'ar_get_akan_musnah': 'viewer',
      'ar_ubah_lokasi':     'user',
      'ar_tandai_musnah':   'admin',
      'ar_tandai_serah':    'admin',
      'search_all':         'viewer',

      // Generic routing
      'save':                 'admin',
      'delete':               'admin',

      // Publik (dispatchAction handle sebelum auth)
      'ping':                     'viewer',
      'exchange_platform_ticket': 'viewer',
      'exchange_sso_ticket':      'viewer',
      'logout':                   'viewer',

      // Sistem
      'init_database':        'super'
    },

    entityPermissions: {},
    localHandlers: {}
  };
}

// ==================== §8 SHIM KOMPATIBILITAS ====================
function getSpreadsheetId_() { return SPREADSHEET_ID; }
