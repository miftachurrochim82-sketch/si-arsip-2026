// ============================================================
// SI-ARSIP - 02_AppLogic.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Entry HTTP + Dispatcher + Registry Handler + SIMPEG + Config + Setup.
// Domain handler (Surat Masuk, Surat Keluar, Disposisi, Dashboard) ada di
// file 03, 04, 05, 09.
//
// Pola identik dengan si-kompetensi v3.0.0, si-lahar, starter-kit v2.0.1.
//
// Registry di sini WAJIB sinkron dengan actionLevels di 01_ConfigAndBridge.gs.
// ============================================================

// ==================== §1 ENTRY POINTS ====================

function doGet(e) {
  e = e || { parameter: {} };
  var ticket = (e.parameter && e.parameter.ticket) || '';

  var template = HtmlService.createTemplateFromFile('Index');
  template.ticket     = ticket;
  template.isSsoEntry = ticket ? 'true' : 'false';

  return template.evaluate()
    .setTitle(APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return CoreLib.jsonResponse({
      success: false, code: 'BAD_REQUEST',
      error: 'Format JSON payload tidak valid.'
    });
  }
  return CoreLib.jsonResponse(handleAction(body));
}

function include(filename) {
  try {
    return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
  } catch (err) {
    try {
      return HtmlService.createTemplateFromFile(filename.toLowerCase()).evaluate().getContent();
    } catch (e2) {
      Logger.log('[WARN] Error including ' + filename + ': ' + e2.message);
      return '<!-- Error loading ' + filename + ': ' + e2.message + ' -->';
    }
  }
}

// ==================== §2 DISPATCHER ====================

function handleAction(payload) {
  try {
    var cfg = getAppConfig_();
    cfg.localHandlers = buildLocalHandlers_();
    return CoreLib.dispatchAction(payload, cfg);
  } catch (err) {
    Logger.log('[CRITICAL handleAction] ' + err.message + '\n' + err.stack);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Registry semua handler domain.
 * Setiap nama aksi di sini WAJIB ada di actionLevels (01_ConfigAndBridge.gs).
 */
function buildLocalHandlers_() {
  var h = {};

  // ---------- Health & Profil ----------
  h['ping'] = function () {
    return { success: true, data: { pong: true, app: APP_CODE, time: new Date().toISOString() } };
  };
  h['get_my_profile'] = function (d, u) { return { success: true, data: u }; };
  h['save_my_profile'] = function (d, u) {
    return CoreLib.saveMyProfile(SPREADSHEET_ID, d, u, ALL_SHEET_HEADERS, MASTER_SPREADSHEET_ID);
  };

  // ---------- Dashboard (handler di 09_DashboardApi.gs) ----------
  h['get_dashboard']            = function (d, u) { return dashRingkas_(d || {}, u); };
  h['dash_chart_tren']          = function (d, u) { return dashChartTren_(d || {}); };
  h['dash_klasifikasi']         = function (d, u) { return dashKlasifikasi_(d || {}); };
  h['dash_surat_kritis']        = function (d, u) { return dashSuratKritis_(d || {}); };
  h['dash_disposisi_lewat_sla'] = function (d, u) { return dashDisposisiLewatSla_(d || {}); };
  h['dash_chart_disposisi']     = function (d, u) { return dashChartDisposisi_(d || {}); };

  // Laporan & lampiran (v1.3: G27, G28) + v1.5 L4/L5/L11/L12 + v1.6 A3/A4/A5 + v1.7 A6-A10 + v1.8 E1-E8
  h['laporan_export_excel']     = function (d, u) { return exportExcelBulanan_(d || {}, u); };
  h['laporan_export_khas']      = function (d, u) { return exportKhasBulanan_(d || {}, u); };
  h['lap_rekap_klasifikasi']    = function (d, u) { return lapRekapKlasifikasi_(d || {}, u); };
  h['lap_rekap_unit']           = function (d, u) { return lapRekapUnit_(d || {}, u); };
  h['lap_kepatuhan_jra']        = function (d, u) { return lapKepatuhanJra_(d || {}, u); };
  h['analisa_distribusi_unit']  = function (d, u) { return analisaDistribusiUnit_(d || {}, u); };
  h['analisa_top_pengirim']     = function (d, u) { return analisaTopPengirim_(d || {}, u); };
  h['analisa_beban_pejabat']    = function (d, u) { return analisaBebanPejabat_(d || {}, u); };
  h['analisa_retensi_5th']      = function (d, u) { return analisaRetensi5Thn_(d || {}, u); };
  h['analisa_klasifikasi_unit']= function (d, u) { return analisaKlasifikasiUnit_(d || {}, u); };
  h['analisa_tte_ratio']        = function (d, u) { return analisaTteRatio_(d || {}, u); };
  h['analisa_sla_per_pejabat']  = function (d, u) { return analisaSlaPerPejabat_(d || {}, u); };
  h['analisa_kritis_bulanan']   = function (d, u) { return analisaKritisBulanan_(d || {}, u); };
  h['evaluasi_sla_disposisi']   = function (d, u) { return evaluasiSlaDisposisi_(d || {}, u); };
  h['evaluasi_sla_keluar']      = function (d, u) { return evaluasiSlaKeluar_(d || {}, u); };
  h['evaluasi_kelengkapan']     = function (d, u) { return evaluasiKelengkapan_(d || {}, u); };
  h['evaluasi_format_nomor']    = function (d, u) { return evaluasiFormatNomor_(d || {}, u); };
  h['evaluasi_jra']             = function (d, u) { return evaluasiJra_(d || {}, u); };
  h['evaluasi_musnah']          = function (d, u) { return evaluasiMusnah_(d || {}, u); };
  h['evaluasi_fisik']           = function (d, u) { return evaluasiFisik_(d || {}, u); };
  h['evaluasi_alih_media']      = function (d, u) { return evaluasiAlihMedia_(d || {}, u); };
  // RTL R1-R5 (v1.9)
  h['rtl_get_list']             = function (d, u) { return rtlGetList_(d || {}, u); };
  h['rtl_get_detail']           = function (d, u) { return rtlGetDetail_(d || {}, u); };
  h['rtl_save']                 = function (d, u) { return rtlSave_(d || {}, u); };
  h['rtl_delete']               = function (d, u) { return rtlDelete_(d || {}, u); };
  h['rtl_ubah_status']          = function (d, u) { return rtlUbahStatus_(d || {}, u); };
  h['rtl_generate']             = function (d, u) { return rtlGenerate_(d || {}, u); };
  h['lmp_upload']               = function (d, u) { return lmpUpload_(d || {}, u); };

  // Notifikasi (v1.4: G31)
  h['get_notifikasi']           = function (d, u) { return getNotifikasi_(u); };
  h['notif_read']               = function (d, u) { return notifTandaiDibaca_(u); };

  // ---------- SIMPEG read-only ----------
  h['get_simpeg_lookup']  = function () { return getSimpegLookup_(); };
  h['get_master_pegawai'] = function () { return getMasterPegawai_(); };
  h['get_master_unit']    = function () { return getMasterUnit_(); };
  h['get_master_jabatan'] = function () { return getMasterJabatan_(); };
  h['get_pegawai_list']   = function () { return getMasterPegawai_(); };
  h['get_unit_list']      = function () { return getMasterUnit_(); };
  h['get_jabatan_list']   = function () { return getMasterJabatan_(); };

  // ---------- Surat Masuk (03_SuratMasukApi.gs) ----------
  h['sm_get_list']   = function (d, u) { return smGetList_(d || {}, u); };
  h['sm_get_detail'] = function (d, u) { return smGetDetail_(d || {}, u); };
  h['sm_save']       = function (d, u) { return smSave_(d || {}, u); };
  h['sm_delete']     = function (d, u) { return smDelete_(d || {}, u); };
  h['sm_disposisi']  = function (d, u) { return smDisposisi_(d || {}, u); };

  // ---------- Surat Keluar (04_SuratKeluarApi.gs) ----------
  h['sk_get_list']    = function (d, u) { return skGetList_(d || {}, u); };
  h['sk_get_detail']  = function (d, u) { return skGetDetail_(d || {}, u); };
  h['sk_save']        = function (d, u) { return skSave_(d || {}, u); };
  h['sk_delete']      = function (d, u) { return skDelete_(d || {}, u); };
  h['sk_ubah_status'] = function (d, u) { return skUbahStatus_(d || {}, u); };

  // ---------- Disposisi (05_DisposisiApi.gs) ----------
  h['dp_get_list']   = function (d, u) { return dpGetList_(d || {}, u); };
  h['dp_get_detail'] = function (d, u) { return dpGetDetail_(d || {}, u); };
  h['dp_save']       = function (d, u) { return dpSave_(d || {}, u); };
  h['dp_teruskan']   = function (d, u) { return dpTeruskan_(d || {}, u); };
  h['dp_selesaikan'] = function (d, u) { return dpSelesaikan_(d || {}, u); };
  h['dp_delete']     = function (d, u) { return dpDelete_(d || {}, u); };

  // ---------- Master Klasifikasi ----------
  h['ref_get_list'] = function (d, u) { return masterKlasifikasiList_(d || {}); };
  h['ref_save']     = function (d, u) { return masterKlasifikasiSave_(d || {}, u); };
  h['ref_delete']   = function (d, u) { return masterKlasifikasiDelete_(d || {}, u); };

  // ---------- Master Pejabat ----------
  h['pjb_get_list'] = function (d, u) { return masterPejabatList_(d || {}); };
  h['pjb_save']     = function (d, u) { return masterPejabatSave_(d || {}, u); };
  h['pjb_delete']   = function (d, u) { return masterPejabatDelete_(d || {}, u); };

  // ---------- Master Template ----------
  h['tpl_get_list'] = function (d, u) { return masterTemplateList_(d || {}); };
  h['tpl_save']     = function (d, u) { return masterTemplateSave_(d || {}, u); };
  h['tpl_delete']   = function (d, u) { return masterTemplateDelete_(d || {}, u); };

  // ---------- Fase 2: Naskah Dinas (06_NaskahApi.gs) ----------
  h['nd_get_list']    = function (d, u) { return ndGetList_(d || {}, u); };
  h['nd_get_detail']  = function (d, u) { return ndGetDetail_(d || {}, u); };
  h['nd_save']        = function (d, u) { return ndSave_(d || {}, u); };
  h['nd_ubah_status'] = function (d, u) { return ndUbahStatus_(d || {}, u); };
  h['nd_delete']      = function (d, u) { return ndDelete_(d || {}, u); };

  // ---------- Fase 2: Kearsipan (07_KearsipanApi.gs) ----------
  h['ar_get_list']        = function (d, u) { return arGetList_(d || {}, u); };
  h['ar_get_detail']      = function (d, u) { return arGetDetail_(d || {}, u); };
  h['ar_get_akan_musnah'] = function (d, u) { return arGetAkanMusnah_(d || {}, u); };
  h['ar_ubah_lokasi']     = function (d, u) { return arUbahLokasi_(d || {}, u); };
  h['ar_tandai_musnah']   = function (d, u) { return arTandaiMusnah_(d || {}, u); };
  h['ar_tandai_serah']    = function (d, u) { return arTandaiSerah_(d || {}, u); };

  // ---------- Fase 2: Pencarian lintas (08_PencarianApi.gs) ----------
  h['search_all'] = function (d, u) { return searchAll_(d || {}, u); };

  // ---------- Konfigurasi (Script Properties) ----------
  h['get_config']         = function () { return getConfigList_(); };
  h['get_config_list']    = function () { return getConfigList_(); };
  h['save_config_item']   = function (d, u) { return saveConfigItem_(d, u); };
  h['save_config']        = function (d, u) { return saveConfigItem_(d, u); };
  h['delete_config_item'] = function (d, u) { return deleteConfigItem_(d, u); };
  h['delete_config']      = function (d, u) { return deleteConfigItem_(d, u); };

  // Aksi dinamis 'delete' → intercept KONFIGURASI
  h['delete'] = function (d, u) {
    var ent = String((d && d.entity) || '').toUpperCase();
    if (ent === 'KONFIGURASI') return deleteConfigItem_(d || {}, u);
    return { success: false, code: 'BAD_REQUEST',
             error: 'Aksi delete untuk entitas "' + ent + '" tidak dikenali.' };
  };

  // ---------- Sistem ----------
  h['init_database'] = function (d, u) { return initDatabase(u); };

  return h;
}

// ==================== §3 SIMPEG READ-ONLY LOOKUPS ====================

function getPegawaiList_() {
  try {
    var rows = getSheetData_('PEGAWAI');
    var lean = (rows || []).map(function (p) {
      return {
        pegawai_id:       p.pegawai_id || p.id,
        nip:              p.nip || '',
        nama:             p.nama || p.nama_lengkap || '',
        nama_lengkap:     p.nama_lengkap || p.nama || '',
        email:            p.email || '',
        unit_id:          p.unit_id || '',
        jabatan_id:       p.jabatan_id || '',
        pangkat_golongan: p.pangkat_golongan || p.pangkat_gol || '',
        status_pegawai:   p.status_pegawai || 'PNS'
      };
    });
    return { success: true, data: lean };
  } catch (err) {
    Logger.log('[getPegawaiList_] ' + err.message);
    return { success: false, error: 'Gagal baca PEGAWAI: ' + err.message };
  }
}

function getUnitList_() {
  try {
    return { success: true, data: getSheetData_('UNIT_KERJA') };
  } catch (err) {
    return { success: false, error: 'Gagal baca UNIT_KERJA: ' + err.message };
  }
}

function getJabatanList_() {
  try {
    return { success: true, data: getSheetData_('JABATAN') };
  } catch (err) {
    return { success: false, error: 'Gagal baca JABATAN: ' + err.message };
  }
}

function getSimpegLookup_() {
  try {
    return {
      success: true,
      data: {
        pegawai: getSheetData_('PEGAWAI'),
        unit:    getSheetData_('UNIT_KERJA'),
        jabatan: getSheetData_('JABATAN')
      }
    };
  } catch (err) {
    return { success: false, error: 'Gagal memuat SIMPEG: ' + err.message };
  }
}

function getMasterPegawai_() {
  try {
    var s = getSimpegLookup_();
    if (!s.success) return { success: false, error: s.error };
    return { success: true, data: s.data.pegawai || [] };
  } catch (e) { return { success: false, error: 'Gagal baca pegawai: ' + e.message }; }
}

function getMasterUnit_() {
  try {
    var s = getSimpegLookup_();
    if (!s.success) return { success: false, error: s.error };
    return { success: true, data: s.data.unit || [] };
  } catch (e) { return { success: false, error: 'Gagal baca unit: ' + e.message }; }
}

function getMasterJabatan_() {
  try {
    var s = getSimpegLookup_();
    if (!s.success) return { success: false, error: s.error };
    return { success: true, data: s.data.jabatan || [] };
  } catch (e) { return { success: false, error: 'Gagal baca jabatan: ' + e.message }; }
}

/**
 * Enrich list dengan data pegawai (nama lengkap, NIP, unit).
 */
function enrichWithPegawai_(list) {
  if (!list || !Array.isArray(list)) return list || [];
  try {
    var pegawaiList = getSheetData_('PEGAWAI');
    var map = {};
    pegawaiList.forEach(function (p) {
      var pid = CoreLib.normId(p.pegawai_id || p.id);
      if (pid) map[pid] = p;
      var nip = CoreLib.normId(p.nip);
      if (nip) map[nip] = p;
    });
    return list.map(function (item) {
      var out = Object.assign({}, item);
      var target = CoreLib.normId(out.pegawai_id || out.penerima_id || '');
      var p = target ? map[target] : null;
      if (p) {
        out.nama_pegawai   = p.nama_lengkap || p.nama || out.pegawai_id;
        out.nip            = p.nip || out.pegawai_id;
        out.status_pegawai = p.status_pegawai || 'PNS';
      }
      return out;
    });
  } catch (e) { return list; }
}

// ==================== §4 MASTER HANDLERS ====================

// -------------------- M_KLASIFIKASI --------------------
function masterKlasifikasiList_(params) {
  try {
    var list = getSheetData_('M_KLASIFIKASI');
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['kode_klasifikasi', 'uraian', 'keterangan']);
      });
    }
    if (params.tindakan_akhir) {
      var ta = CoreLib.normStr(params.tindakan_akhir);
      list = list.filter(function (r) { return CoreLib.normStr(r.tindakan_akhir) === ta; });
    }
    if (params.only_active) {
      list = list.filter(function (r) { return CoreLib.normStr(r.status_aktif) !== 'false'; });
    }
    list.sort(function (a, b) {
      return String(a.kode_klasifikasi || '').localeCompare(String(b.kode_klasifikasi || ''));
    });
    return { success: true, data: list, total: list.length };
  } catch (err) { return { success: false, error: err.message }; }
}

function masterKlasifikasiSave_(data, user) {
  try {
    var record = data.record || data;

    if (!record.kode_klasifikasi) {
      return { success: false, code: 'BAD_REQUEST', error: 'kode_klasifikasi wajib diisi.' };
    }
    if (!record.uraian) {
      return { success: false, code: 'BAD_REQUEST', error: 'uraian wajib diisi.' };
    }
    if (record.tindakan_akhir) {
      try {
        record.tindakan_akhir = CoreLib.whitelist(
          record.tindakan_akhir, ['musnah', 'permanen'], 'tindakan_akhir'
        );
      } catch (e) {
        return { success: false, code: 'BAD_REQUEST', error: e.message };
      }
    } else {
      record.tindakan_akhir = 'musnah';
    }

    record.retensi_aktif_th   = Number(record.retensi_aktif_th)   || 0;
    record.retensi_inaktif_th = Number(record.retensi_inaktif_th) || 0;

    if (record.status_aktif !== undefined) {
      record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    } else {
      record.status_aktif = 'true';
    }

    // Cek duplikat kode (kecuali diri sendiri)
    var all = getSheetData_('M_KLASIFIKASI');
    var dup = all.find(function (r) {
      return String(r.kode_klasifikasi).toUpperCase() === String(record.kode_klasifikasi).toUpperCase() &&
             String(r.id || '') !== String(record.id || '');
    });
    if (dup) return { success: false, code: 'BAD_REQUEST',
                     error: 'kode_klasifikasi "' + record.kode_klasifikasi + '" sudah dipakai.' };

    var saved = saveRecord_('M_KLASIFIKASI', record, user);
    audit_(user, record.id ? 'UPDATE_KLASIFIKASI' : 'CREATE_KLASIFIKASI',
           'M_KLASIFIKASI', saved.id, true, 'Kode: ' + saved.kode_klasifikasi);
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function masterKlasifikasiDelete_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };

    var rec = findRecordById_('M_KLASIFIKASI', data.id);
    if (!rec) return { success: false, code: 'NOT_FOUND', error: 'Klasifikasi tidak ditemukan.' };

    var kode = rec.kode_klasifikasi;
    var used = getSheetData_('T_SURAT_MASUK').some(function (r) {
      return String(r.kode_klasifikasi) === String(kode);
    }) || getSheetData_('T_SURAT_KELUAR').some(function (r) {
      return String(r.kode_klasifikasi) === String(kode);
    });
    if (used) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'Kode klasifikasi masih dipakai di surat masuk/keluar.' };
    }

    var ok = softDeleteRecord_('M_KLASIFIKASI', data.id, user);
    audit_(user, 'DELETE_KLASIFIKASI', 'M_KLASIFIKASI', data.id, ok, 'Kode: ' + kode);
    return { success: ok, message: ok ? 'Klasifikasi dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// -------------------- M_PEJABAT --------------------
function masterPejabatList_(params) {
  try {
    var list = getSheetData_('M_PEJABAT');
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, Object.keys(r)); });
    }
    list.sort(function (a, b) {
      return (Number(a.urutan_hierarki) || 99) - (Number(b.urutan_hierarki) || 99);
    });
    return { success: true, data: list, total: list.length };
  } catch (err) { return { success: false, error: err.message }; }
}

function masterPejabatSave_(data, user) {
  try {
    var record = data.record || data;

    if (!record.pegawai_id) {
      return { success: false, code: 'BAD_REQUEST', error: 'pegawai_id wajib diisi.' };
    }

    // Validasi pegawai exist
    var pegawaiList = getSheetData_('PEGAWAI');
    var pid = normalizeEntityId_(record.pegawai_id);
    var exists = pegawaiList.some(function (p) {
      return CoreLib.normId(p.pegawai_id || p.id) === CoreLib.normId(pid);
    });
    if (!exists) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'Pegawai tidak ditemukan di SIMPEG: ' + record.pegawai_id };
    }

    record.pegawai_id = pid;
    if (record.jabatan_id) record.jabatan_id = normalizeEntityId_(record.jabatan_id);
    record.urutan_hierarki = Number(record.urutan_hierarki) || 99;
    record.aktif = String(record.aktif || 'true').toLowerCase() === 'false' ? 'false' : 'true';

    var saved = saveRecord_('M_PEJABAT', record, user);
    audit_(user, record.id ? 'UPDATE_PEJABAT' : 'CREATE_PEJABAT',
           'M_PEJABAT', saved.id, true, 'Pegawai: ' + saved.pegawai_id);
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function masterPejabatDelete_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_('M_PEJABAT', data.id, user);
    audit_(user, 'DELETE_PEJABAT', 'M_PEJABAT', data.id, ok, '');
    return { success: ok, message: ok ? 'Pejabat dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// -------------------- M_TEMPLATE --------------------
var TEMPLATE_JENIS_NASKAH_ = ['surat_masuk', 'surat_keluar', 'nota_dinas', 'memo', 'laporan', 'lainnya'];

function masterTemplateList_(params) {
  try {
    var list = getSheetData_('M_TEMPLATE');
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['kode_template', 'nama_template', 'keterangan']);
      });
    }
    if (params.jenis_naskah) {
      var jn = CoreLib.normStr(params.jenis_naskah);
      list = list.filter(function (r) { return CoreLib.normStr(r.jenis_naskah) === jn; });
    }
    return { success: true, data: list, total: list.length };
  } catch (err) { return { success: false, error: err.message }; }
}

function masterTemplateSave_(data, user) {
  try {
    var record = data.record || data;

    if (!record.kode_template) {
      return { success: false, code: 'BAD_REQUEST', error: 'kode_template wajib diisi.' };
    }
    if (!record.nama_template) {
      return { success: false, code: 'BAD_REQUEST', error: 'nama_template wajib diisi.' };
    }
    if (record.jenis_naskah) {
      try {
        record.jenis_naskah = CoreLib.whitelist(
          record.jenis_naskah, TEMPLATE_JENIS_NASKAH_, 'jenis_naskah'
        );
      } catch (e) {
        return { success: false, code: 'BAD_REQUEST', error: e.message };
      }
    } else {
      return { success: false, code: 'BAD_REQUEST', error: 'jenis_naskah wajib diisi.' };
    }

    if (record.status_aktif !== undefined) {
      record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    } else {
      record.status_aktif = 'true';
    }

    var all = getSheetData_('M_TEMPLATE');
    var dup = all.find(function (r) {
      return String(r.kode_template).toLowerCase() === String(record.kode_template).toLowerCase() &&
             String(r.id || '') !== String(record.id || '');
    });
    if (dup) return { success: false, code: 'BAD_REQUEST',
                     error: 'kode_template "' + record.kode_template + '" sudah dipakai.' };

    var saved = saveRecord_('M_TEMPLATE', record, user);
    audit_(user, record.id ? 'UPDATE_TEMPLATE' : 'CREATE_TEMPLATE',
           'M_TEMPLATE', saved.id, true, 'Template: ' + saved.kode_template);
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function masterTemplateDelete_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_('M_TEMPLATE', data.id, user);
    audit_(user, 'DELETE_TEMPLATE', 'M_TEMPLATE', data.id, ok, '');
    return { success: ok, message: ok ? 'Template dihapus.' : 'Gagal hapus.' };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 CONFIG (Script Properties) ====================

function getConfigList_() {
  var defaults = [
    { key: 'app_title',             value: APP_TITLE,        keterangan: 'Nama aplikasi' },
    { key: 'app_version',           value: 'v1.0.0',         keterangan: 'Versi rilis' },
    { key: 'instansi',              value: 'Satpol PP & Damkar Kab. Trenggalek', keterangan: 'Instansi' },
    { key: 'kode_unit_singkat',     value: 'SATPOL',         keterangan: 'Kode unit singkat untuk nomor surat' },
    { key: 'format_nomor_surat',    value: '<kode_klas>/<urut:3>/<kode_unit>/<tahun>', keterangan: 'Format nomor surat keluar' },
    { key: 'sla_disposisi_hari',    value: '2',              keterangan: 'SLA disposisi (hari kerja)' }
  ];

  var stored = {};
  try { stored = appProps_().getProperties() || {}; } catch (e) { stored = {}; }

  var list = defaults.map(function (d) {
    if (stored[d.key] !== undefined) d.value = stored[d.key];
    return d;
  });

  Object.keys(stored).forEach(function (k) {
    if (!CoreLib.isAllowedConfigKey(k, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS'])) return;
    if (!list.find(function (i) { return i.key === k; })) {
      list.push({ key: k, value: stored[k], keterangan: 'Parameter Kustom' });
    }
  });

  return { success: true, data: list };
}

function saveConfigItem_(payload, actor) {
  try {
    payload = payload || {};
    var key   = payload.key   !== undefined ? payload.key   : (payload.record && payload.record.key);
    var value = payload.value !== undefined ? payload.value : (payload.record && payload.record.value);
    if (!key) return { success: false, code: 'BAD_REQUEST', error: 'Key parameter wajib diisi.' };

    if (!CoreLib.isAllowedConfigKey(key, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS'])) {
      audit_(actor, 'SAVE_CONFIG_DENIED', 'CONFIG', key, false, 'Key tidak diizinkan');
      return { success: false, code: 'FORBIDDEN',
               error: 'Parameter "' + key + '" tidak diizinkan diubah dari sini.' };
    }

    appProps_().setProperty(String(key), String(value));
    audit_(actor, 'SAVE_CONFIG', 'CONFIG', key, true, 'Set: ' + key);
    return { success: true, message: 'Parameter ' + key + ' berhasil disimpan.' };
  } catch (e) { return { success: false, code: 'BAD_REQUEST', error: e.message }; }
}

function deleteConfigItem_(payload, actor) {
  try {
    payload = payload || {};
    var key = payload.key || (payload.record && payload.record.key) || payload.id;
    if (!key) return { success: false, code: 'BAD_REQUEST', error: 'Key wajib disertakan.' };

    if (!CoreLib.isAllowedConfigKey(key, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS'])) {
      audit_(actor, 'DELETE_CONFIG_DENIED', 'CONFIG', key, false, 'Key tidak diizinkan');
      return { success: false, code: 'FORBIDDEN',
               error: 'Parameter "' + key + '" tidak boleh dihapus dari sini.' };
    }

    appProps_().deleteProperty(String(key));
    audit_(actor, 'DELETE_CONFIG', 'CONFIG', key, true, 'Delete: ' + key);
    return { success: true, message: 'Parameter ' + key + ' berhasil dihapus.' };
  } catch (e) { return { success: false, code: 'BAD_REQUEST', error: e.message }; }
}

// ==================== §6 SETUP ====================

function initDatabase(actor) {
  try {
    if (!SPREADSHEET_ID) {
      var errMsg = 'Spreadsheet lokal tidak dapat dibuka. Cek SPREADSHEET_ID di Script Properties.';
      Logger.log('[ERROR] ' + errMsg);
      audit_(actor, 'INIT_DB', 'SYSTEM', 'ALL', false, errMsg);
      return { success: false, error: errMsg };
    }

    var result = CoreLib.initDatabase(SPREADSHEET_ID, ALL_SHEET_HEADERS, isSimpegSheet_);

    try {
      var ss = CoreLib.getDb(SPREADSHEET_ID);
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
      if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (e) { Logger.log('[WARN] Gagal hapus Sheet1: ' + e.message); }

    var summary = 'Inisialisasi database ' + APP_CODE + ' selesai. 11 sheet bisnis (3 master + 8 tabel incl T_RTL) + ZZ_TEST_CRUD — v1.9 35/35.';
    Logger.log('✅ ' + summary);
    audit_(actor, 'INIT_DB', 'SYSTEM', 'ALL', true, summary);
    return { success: true, message: summary, corelib: result };
  } catch (err) {
    Logger.log('[initDatabase] ' + err.message);
    return { success: false, error: err.message };
  }
}

function setupApp(actor) {
  try {
    Logger.log('🚀 Memulai Setup ' + APP_CODE + '...');

    var defaultConfigs = [
      { key: 'app_title',          value: APP_TITLE,     keterangan: 'Nama aplikasi' },
      { key: 'app_version',        value: 'v1.0.0',      keterangan: 'Versi rilis' },
      { key: 'instansi',           value: 'Satpol PP & Damkar Kab. Trenggalek', keterangan: 'Instansi' },
      { key: 'kode_unit_singkat',  value: 'SATPOL',      keterangan: 'Kode unit singkat' },
      { key: 'format_nomor_surat', value: '<kode_klas>/<urut:3>/<kode_unit>/<tahun>', keterangan: 'Format nomor' },
      { key: 'sla_disposisi_hari', value: '2',           keterangan: 'SLA disposisi (hari)' }
    ];

    var result = CoreLib.executeAppSetup({
      appCode:        APP_CODE,
      appTitle:       APP_TITLE,
      spreadsheetId:  SPREADSHEET_ID,
      masterSsId:     MASTER_SPREADSHEET_ID,
      platformApiUrl: PLATFORM_API_URL,
      headersMap:     ALL_SHEET_HEADERS,
      defaultConfigs: defaultConfigs,
      isRefSheetFunc: isSimpegSheet_,
      props:          appProps_()
    });

    if (result && result.success) {
      audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', true,
        'Setup selesai. Warnings: ' + ((result.warnings || []).length));
    } else {
      audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', false,
        (result && result.error) || 'Setup gagal');
    }
    return result;
  } catch (err) {
    Logger.log('[setupApp] ' + err.message);
    return { success: false, error: err.message };
  }
}

// ==================== §7 HEALTH CHECK ====================

function testAppLogicSelfCheck() {
  Logger.log('=== 02_AppLogic.gs v1.0.0 self-check ===');

  if (typeof CoreLib === 'undefined') {
    Logger.log('❌ CoreLib tidak terpasang!');
    return;
  }
  Logger.log('✅ CoreLib terdeteksi.');

  var h = buildLocalHandlers_();
  var actions = Object.keys(h);
  Logger.log('📋 localHandlers: ' + actions.length + ' aksi terdaftar');

  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};
  var missing = actions.filter(function (k) {
    return actionLevels[k] === undefined && ['save', 'delete'].indexOf(k) === -1;
  });
  Logger.log((missing.length === 0 ? '✅' : '❌') +
    ' Semua handler punya actionLevels' +
    (missing.length ? ' — MISSING: ' + missing.join(', ') : ''));

  var ping = handleAction({ action: 'ping' });
  Logger.log((ping && ping.success ? '✅' : '❌') + ' ping via dispatcher');

  var aneh = handleAction({ action: 'aksi_aneh_xyz' });
  Logger.log((aneh && aneh.success === false ? '✅' : '❌') +
    ' aksi tak dikenal DITOLAK (code=' + (aneh && aneh.code) + ')');

  Logger.log('=== Selesai ===');
}
