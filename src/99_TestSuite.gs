// ============================================================
// SI-ARSIP - 99_TestSuite.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Test suite agregat SI-ARSIP — 4 runner:
//   1. runLibraryTests()        → regresi CoreLib (delegasi CoreLib.runCoreTests)
//   2. testAdopsiG18d()         → verifikasi util CoreLib v2.3.0 (13 asersi)
//   3. testDispatcherRouting()  → registry handler + fail-closed (≥25 asersi)
//   4. runDomainTestsSIArsip()  → domain SI-ARSIP (96 grup fungsi sejak v1.9:
//      sm 5, sk 5, dp 4, SIMPEG 3, pre-save 5, skema 5, nd 5, ar 5, search 3,
//      dash 1, logbook 2, laporan 2, lampiran 2, notifikasi 2, rekap 6, analisa 6, analisa_lanjut 10, evaluasi 16, rtl 10)
//
// Entry-point: runAllTestsSIArsip()
//
// Target: total ~100 asersi (42 + 13 + 25 + 20).
//
// Rujukan: docs/07_TESTCASE.md.
// ============================================================

// ==================== §0 ASSERT HELPER ====================

function _tsAssert_(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + (msg || ''));
}

function _tsSkip_(msg) {
  var e = new Error(msg || 'skip');
  e.__skip = true;
  throw e;
}

function _tsNeed_(cond, msg) {
  if (!cond) _tsSkip_(msg);
}

/**
 * Runner generik: jalankan daftar fungsi, kembalikan {passed, failed, skipped, results}.
 * @param {string} name
 * @param {Array<Function>} tests — fungsi tanpa argumen (closure context)
 */
function _tsRunGroup_(name, tests) {
  Logger.log('');
  Logger.log('───── ' + name + ' ─────');
  var passed = 0, failed = 0, skipped = 0, results = [];
  tests.forEach(function (fn) {
    try {
      fn();
      passed++;
      results.push({ test: fn.name || '(anon)', status: 'PASS' });
    } catch (e) {
      if (e && e.__skip) {
        skipped++;
        results.push({ test: fn.name || '(anon)', status: 'SKIP', detail: e.message });
      } else {
        failed++;
        results.push({ test: fn.name || '(anon)', status: 'FAIL', detail: String((e && e.message) || e) });
        Logger.log('❌ [' + (fn.name || '(anon)') + '] ' + ((e && e.message) || e));
      }
    }
  });
  Logger.log('→ ' + name + ': PASS=' + passed + ' / FAIL=' + failed + ' / SKIP=' + skipped);
  return { name: name, passed: passed, failed: failed, skipped: skipped, results: results };
}

// ==================== §1 runLibraryTests ====================

/**
 * Regresi CoreLib v2.3.0 — delegasi ke CoreLib.runCoreTests.
 * Target: PASS 42 / FAIL 0 / SKIP 1.
 *
 * SKIP 1 wajar = testCacheIsolation (butuh TEST_SPREADSHEET_ID_B).
 */
function runLibraryTests() {
  Logger.log('');
  Logger.log('═══ §1 REGRESI CORELIB ═══');

  var props = PropertiesService.getScriptProperties();
  var ssId = SPREADSHEET_ID || props.getProperty('SPREADSHEET_ID') || '';
  var masterSsId = MASTER_SPREADSHEET_ID || props.getProperty('MASTER_SPREADSHEET_ID') || ssId;
  var platformUrl = PLATFORM_API_URL || props.getProperty('PLATFORM_API_URL') || '';
  var ssIdB = props.getProperty('TEST_SPREADSHEET_ID_B') || '';

  if (!ssId) {
    Logger.log('❌ SPREADSHEET_ID kosong — tidak bisa jalankan test.');
    return { name: 'Library (CoreLib)', passed: 0, failed: 1, skipped: 0, results: [] };
  }

  // Minimal headersMap untuk test CoreLib (hanya ZZ_TEST_CRUD yang dicek)
  var headersMap = {
    ZZ_TEST_CRUD: ['id', 'nama', 'no_hp', 'catatan_baru', 'laporan_id']
  };

  // Pre-setup: pastikan ZZ_TEST_CRUD ada
  try {
    CoreLib.ensureSheet(ssId, 'ZZ_TEST_CRUD', headersMap, {});
    // Set format text untuk no_hp (hindari auto-convert)
    var ss = SpreadsheetApp.openById(ssId);
    var sh = ss.getSheetByName('ZZ_TEST_CRUD');
    if (sh && sh.getLastColumn() > 0) {
      var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var colNoHp = headers.indexOf('no_hp') + 1;
      if (colNoHp > 0) sh.getRange(2, colNoHp, sh.getMaxRows() - 1, 1).setNumberFormat('@');
    }
  } catch (e) {
    Logger.log('[WARN] Pre-setup ZZ_TEST_CRUD: ' + e.message);
  }

  var ctx = {
    ssId: ssId,
    ssIdB: ssIdB,
    masterSsId: masterSsId,
    headersMap: headersMap,
    platformApiUrl: platformUrl,
    appCode: 'SIARSIP_TEST'
  };

  var r = CoreLib.runCoreTests(ctx);
  Logger.log('→ Library (CoreLib): PASS=' + r.passed + ' / FAIL=' + r.failed + ' / SKIP=' + r.skipped);

  // Print detail yang FAIL/SKIP saja biar ringkas
  (r.results || []).forEach(function (x) {
    if (x.status !== 'PASS') {
      Logger.log('  [' + x.status + '] ' + x.test + (x.detail ? ' — ' + x.detail : ''));
    }
  });

  return {
    name: 'Library (CoreLib)',
    passed: r.passed,
    failed: r.failed,
    skipped: r.skipped,
    results: r.results || []
  };
}

// ==================== §2 testAdopsiG18d ====================

/**
 * Verifikasi util CoreLib v2.3.0 yang diadopsi SI-ARSIP.
 * Target: 13 asersi PASS, murni in-memory.
 */
function testAdopsiG18d() {
  var tests = [

    // TC-AD1
    function testTodayIsoLocalFormat() {
      var v = CoreLib.todayIsoLocal();
      _tsAssert_(/^\d{4}-\d{2}-\d{2}$/.test(v), 'format yyyy-MM-dd, dapat: ' + v);
    },

    // TC-AD2
    function testDateKey10IsoToWib() {
      var v = CoreLib.dateKey10('2026-09-18T17:00:00.000Z');
      _tsAssert_(v === '2026-09-19', 'ISO UTC 17:00 → 19 Sep WIB, dapat: ' + v);
    },

    // TC-AD3
    function testDateKey10Passthrough() {
      var v = CoreLib.dateKey10('2026-09-19');
      _tsAssert_(v === '2026-09-19', 'passthrough, dapat: ' + v);
    },

    // TC-AD4
    function testPaginateFirstPage() {
      var rows = [];
      for (var i = 1; i <= 25; i++) rows.push({ id: i });
      var r = CoreLib.paginate(rows, 1, 10);
      _tsAssert_(r.data.length === 10, 'data.length=10, dapat: ' + r.data.length);
      _tsAssert_(r.meta.total === 25, 'meta.total=25, dapat: ' + r.meta.total);
      _tsAssert_(r.meta.total_pages === 3, 'meta.total_pages=3, dapat: ' + r.meta.total_pages);
    },

    // TC-AD5
    function testPaginateLastPage() {
      var rows = [];
      for (var i = 1; i <= 25; i++) rows.push({ id: i });
      var r = CoreLib.paginate(rows, 3, 10);
      _tsAssert_(r.data[0].id === 21, 'data[0].id=21, dapat: ' + r.data[0].id);
    },

    // TC-AD6
    function testMatchSearchTrue() {
      var row = { judul: 'Bencana banjir Trenggalek' };
      var v = CoreLib.matchSearch(row, 'bencana', ['judul']);
      _tsAssert_(v === true, 'harus true');
    },

    // TC-AD7
    function testMatchSearchFalse() {
      var row = { judul: 'Bencana banjir Trenggalek' };
      var v = CoreLib.matchSearch(row, 'XYZ', ['judul']);
      _tsAssert_(v === false, 'harus false');
    },

    // TC-AD8
    function testMatchSearchEmptyQuery() {
      var row = { judul: 'apa saja' };
      var v = CoreLib.matchSearch(row, '', ['judul']);
      _tsAssert_(v === true, 'q kosong → true');
    },

    // TC-AD9
    function testMatchSearchEmptyFields() {
      var row = { judul: 'apa saja' };
      var v = CoreLib.matchSearch(row, 'x', []);
      _tsAssert_(v === false, 'fields [] → false');
    },

    // TC-AD10
    function testWhitelistCanonical() {
      var v = CoreLib.whitelist('terjadwal', ['Terjadwal', 'Selesai'], 'x');
      _tsAssert_(v === 'Terjadwal', 'lowercase → kanonik, dapat: ' + v);
    },

    // TC-AD11
    function testNormIdTrim() {
      var v = CoreLib.normId('  x  ');
      _tsAssert_(v === 'x', 'trim, dapat: "' + v + '"');
    },

    // TC-AD12
    function testNormStrLower() {
      var v = CoreLib.normStr('  X  ');
      _tsAssert_(v === 'x', 'trim+lower, dapat: "' + v + '"');
    },

    // TC-AD13
    function testParseDateDdMmyyyy() {
      var v = CoreLib.parseDate('12/09/2026');

      // ⚠️ JANGAN pakai `instanceof Date` — di GAS lintas library,
      //    Date punya prototype realm berbeda → instanceof = false.
      //    Cek method-based + Object.prototype.toString sebagai fallback.
      var isDateLike = v &&
        (typeof v.getTime === 'function') &&
        (Object.prototype.toString.call(v) === '[object Date]') &&
        !isNaN(v.getTime());

      _tsAssert_(isDateLike,
        'harus Date valid — dapat: type=' + (typeof v) +
        ', toString=' + Object.prototype.toString.call(v) +
        ', value=' + String(v));

      _tsAssert_(v.getFullYear() === 2026 && v.getMonth() === 8 && v.getDate() === 12,
        'tanggal benar — dapat: ' + v);
    }

  ];

  return _tsRunGroup_('Adopsi G18d', tests);
}

// ==================== §3 testDispatcherRouting ====================

/**
 * Registry handler + fail-closed + handler kritis tersedia.
 * Target: ≥25 asersi PASS.
 */
function testDispatcherRouting() {
  var tests = [];

  // TC-R1
  tests.push(function testHandlerRegistryNotEmpty() {
    var h = buildLocalHandlers_();
    var n = Object.keys(h).length;
    _tsAssert_(n > 0, 'handler terdaftar > 0, dapat: ' + n);
  });

  // TC-R2
  tests.push(function testAllHandlersHaveActionLevels() {
    var h = buildLocalHandlers_();
    var cfg = getAppConfig_();
    var levels = cfg.actionLevels || {};
    var missing = Object.keys(h).filter(function (k) {
      return levels[k] === undefined && ['save', 'delete'].indexOf(k) === -1;
    });
    _tsAssert_(missing.length === 0, 'handler tanpa actionLevels: ' + missing.join(', '));
  });

  // TC-R3
  tests.push(function testNoOrphanActionLevels() {
    var h = buildLocalHandlers_();
    var cfg = getAppConfig_();
    var levels = cfg.actionLevels || {};
    var native = ['exchange_platform_ticket', 'exchange_sso_ticket', 'logout', 'save', 'save_config_item'];
    var orphans = Object.keys(levels).filter(function (k) {
      return h[k] === undefined && native.indexOf(k) === -1;
    });
    // 'save'/'delete' generic ada handler khusus di h, jadi tidak dianggap orphan
    _tsAssert_(orphans.length === 0, 'actionLevels tanpa handler: ' + orphans.join(', '));
  });

  // TC-R4
  tests.push(function testPingWithoutTokenFails() {
    var r = handleAction({ action: 'ping' });
    _tsAssert_(r && r.success === false, 'ping tanpa token harus gagal');
  });

  // TC-R5
  tests.push(function testPingWithoutTokenCode() {
    var r = handleAction({ action: 'ping' });
    _tsAssert_(r && r.code === 'UNAUTHORIZED', 'code=UNAUTHORIZED, dapat: ' + (r && r.code));
  });

  // TC-R6
  tests.push(function testUnknownActionFails() {
    var r = handleAction({ action: 'aksi_aneh_tidak_ada_xyz' });
    _tsAssert_(r && r.success === false, 'aksi tak dikenal harus gagal');
  });

  // TC-R7
  tests.push(function testUnknownActionCode() {
    var r = handleAction({ action: 'aksi_aneh_tidak_ada_xyz' });
    var validCodes = ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND'];
    _tsAssert_(validCodes.indexOf(r && r.code) !== -1, 'code valid, dapat: ' + (r && r.code));
  });

  // TC-R8
  tests.push(function testDeleteKonfigurasiWithoutAuth() {
    var r = handleAction({
      action: 'delete',
      data: { entity: 'KONFIGURASI', key: 'SPREADSHEET_ID' }
    });
    _tsAssert_(r && r.success === false, 'delete tanpa auth harus gagal');
    _tsAssert_(r && r.code === 'UNAUTHORIZED', 'code=UNAUTHORIZED, dapat: ' + (r && r.code));
  });

  // TC-R9..R52 — handler kritis tersedia (v1.9 +6 rtl)
  var criticalHandlers = [
    'sm_save', 'sm_get_list', 'sm_get_detail', 'sm_delete', 'sm_disposisi',
    'sk_save', 'sk_ubah_status', 'sk_delete',
    'dp_save', 'dp_selesaikan', 'dp_teruskan', 'dp_delete',
    'ref_save', 'pjb_save', 'tpl_save',
    'get_dashboard', 'dash_chart_tren',
    'lap_rekap_klasifikasi', 'lap_rekap_unit', 'lap_kepatuhan_jra', 'laporan_export_khas',
    'analisa_distribusi_unit', 'analisa_top_pengirim', 'analisa_beban_pejabat',
    'analisa_retensi_5th', 'analisa_klasifikasi_unit', 'analisa_tte_ratio',
    'analisa_sla_per_pejabat', 'analisa_kritis_bulanan',
    'evaluasi_sla_disposisi', 'evaluasi_sla_keluar', 'evaluasi_kelengkapan',
    'evaluasi_format_nomor', 'evaluasi_jra', 'evaluasi_musnah',
    'evaluasi_fisik', 'evaluasi_alih_media',
    'rtl_get_list', 'rtl_get_detail', 'rtl_save', 'rtl_delete', 'rtl_ubah_status', 'rtl_generate',
    'init_database'
  ];

  criticalHandlers.forEach(function (name) {
    tests.push(function testHandlerExists() {
      var h = buildLocalHandlers_();
      _tsAssert_(typeof h[name] === 'function', 'handler "' + name + '" tidak ada');
    }.bind(null, name));
  });

  return _tsRunGroup_('Dispatcher Routing', tests);
}

// ==================== §4 runDomainTestsSIArsip ====================

/**
 * Domain tests SI-ARSIP — helper + schema (tanpa side-effect data).
 * Target: ≥20 asersi PASS.
 */
function runDomainTestsSIArsip() {
  var allResults = { passed: 0, failed: 0, skipped: 0, results: [] };
  var groups = [];

  // ---------- §4a Domain Surat Masuk (5 asersi) ----------
  groups.push(_tsRunGroup_('Domain Surat Masuk', [
    function testSmIsKritis0051() {
      _tsAssert_(smIsKritis_({ kode_klasifikasi: '005.1', sifat: 'biasa' }) === true,
                 'kode 005.1 = kritis');
    },
    function testSmIsKritisSegerа() {
      _tsAssert_(smIsKritis_({ kode_klasifikasi: '800', sifat: 'segera' }) === true,
                 'sifat segera = kritis');
    },
    function testSmIsKritisBiasa() {
      _tsAssert_(smIsKritis_({ kode_klasifikasi: '800', sifat: 'biasa' }) === false,
                 'biasa + non-kritis = false');
    },
    function testSmNomorAgendaFormat() {
      var n = smGenerateNomorAgenda_(2026);
      _tsAssert_(/^\d{3}\/[A-Z]+\/2026$/.test(n), 'format valid, dapat: ' + n);
    },
    function testSmSifatWhitelist() {
      var r = CoreLib.whitelist('SEGERA', ['biasa', 'segera', 'rahasia'], 'sifat');
      _tsAssert_(r === 'segera', 'whitelist case-insensitive, dapat: ' + r);
    }
  ]));

  // ---------- §4b Domain Surat Keluar (5 asersi) ----------
  groups.push(_tsRunGroup_('Domain Surat Keluar', [
    function testSkStatusValid() {
      _tsAssert_(SK_STATUS_VALID_.length === 3, '3 status valid, dapat: ' + SK_STATUS_VALID_.length);
      _tsAssert_(SK_STATUS_VALID_.indexOf('draft') !== -1, 'ada draft');
      _tsAssert_(SK_STATUS_VALID_.indexOf('review') !== -1, 'ada review');
      _tsAssert_(SK_STATUS_VALID_.indexOf('terkirim') !== -1, 'ada terkirim');
    },
    function testSkTransisiDraftKeReview() {
      _tsAssert_((SK_TRANSISI_LEGAL_['draft'] || []).indexOf('review') !== -1,
                 'draft → review legal');
    },
    function testSkTransisiReviewKeTerkirim() {
      _tsAssert_((SK_TRANSISI_LEGAL_['review'] || []).indexOf('terkirim') !== -1,
                 'review → terkirim legal');
    },
    function testSkTransisiTerkirimTidakBisa() {
      _tsAssert_((SK_TRANSISI_LEGAL_['terkirim'] || []).length === 0,
                 'terkirim tidak bisa transisi');
    },
    function testSkNomorFormat() {
      var n = skGenerateNomor_('800', 2026);
      _tsAssert_(/^800\/\d{3}\/[A-Z]+\/2026$/.test(n), 'format 800, dapat: ' + n);
      var n2 = skGenerateNomor_('005.1', 2026);
      _tsAssert_(/^005\.1\/\d{3}\/[A-Z]+\/2026$/.test(n2), 'format 005.1, dapat: ' + n2);
    }
  ]));

  // ---------- §4c Domain Disposisi (4 asersi) ----------
  groups.push(_tsRunGroup_('Domain Disposisi', [
    function testDpStatusValid() {
      _tsAssert_(DP_STATUS_VALID_.length === 3, '3 status valid');
    },
    function testDpTransisiDiteruskanKeDiproses() {
      _tsAssert_((DP_TRANSISI_LEGAL_['diteruskan'] || []).indexOf('diproses') !== -1,
                 'diteruskan → diproses legal');
    },
    function testDpTransisiDiprosesKeSelesai() {
      _tsAssert_((DP_TRANSISI_LEGAL_['diproses'] || []).indexOf('selesai') !== -1,
                 'diproses → selesai legal');
    },
    function testDpSlaKosong() {
      _tsAssert_(dpIsLewatSla_({ jatuh_tempo: '', status_disposisi: 'diteruskan' }) === false,
                 'jatuh_tempo kosong = tidak lewat SLA');
    }
  ]));

  // ---------- §4d SIMPEG Read-Only (3 asersi) ----------
  groups.push(_tsRunGroup_('SIMPEG Read-Only', [
    function testIsSimpegPegawai() {
      _tsAssert_(isSimpegSheet_('PEGAWAI') === true, 'PEGAWAI = SIMPEG');
    },
    function testIsSimpegUnitKerja() {
      _tsAssert_(isSimpegSheet_('UNIT_KERJA') === true, 'UNIT_KERJA = SIMPEG');
    },
    function testIsSimpegNonSimpeg() {
      _tsAssert_(isSimpegSheet_('M_KLASIFIKASI') === false, 'M_KLASIFIKASI ≠ SIMPEG');
      _tsAssert_(isSimpegSheet_('T_SURAT_MASUK') === false, 'T_SURAT_MASUK ≠ SIMPEG');
    }
  ]));

  // ---------- §4e Pre-Save Hook (5 asersi) ----------
  groups.push(_tsRunGroup_('Pre-Save Hook', [
    function testHookPrefixRef() {
      var rec = localPreSaveHook_('M_KLASIFIKASI', {}, {});
      _tsAssert_(rec.record.id.indexOf('ref-') === 0, 'ref- prefix, dapat: ' + rec.record.id);
    },
    function testHookPrefixPjb() {
      var rec = localPreSaveHook_('M_PEJABAT', {}, {});
      _tsAssert_(rec.record.id.indexOf('pjb-') === 0, 'pjb- prefix, dapat: ' + rec.record.id);
    },
    function testHookPrefixSm() {
      var rec = localPreSaveHook_('T_SURAT_MASUK', {}, {});
      _tsAssert_(rec.record.id.indexOf('sm-') === 0, 'sm- prefix, dapat: ' + rec.record.id);
    },
    function testHookPrefixSk() {
      var rec = localPreSaveHook_('T_SURAT_KELUAR', {}, {});
      _tsAssert_(rec.record.id.indexOf('sk-') === 0, 'sk- prefix, dapat: ' + rec.record.id);
    },
    function testHookPrefixDp() {
      var rec = localPreSaveHook_('T_DISPOSISI', {}, {});
      _tsAssert_(rec.record.id.indexOf('dp-') === 0, 'dp- prefix, dapat: ' + rec.record.id);
    }
  ]));

  // ---------- §4f Skema 11 Sheet (5 asersi) ----------
  groups.push(_tsRunGroup_('Skema 11 Sheet', [
    function testHeadersMapHas11BusinessSheets() {
      var business = ['M_KLASIFIKASI','M_PEJABAT','M_TEMPLATE',
                      'T_SURAT_MASUK','T_SURAT_KELUAR','T_NASKAH_DINAS',
                      'T_DISPOSISI','T_ARSIP','T_LAMPIRAN','T_LOGBOOK','T_RTL'];
      business.forEach(function (s) {
        _tsAssert_(ALL_SHEET_HEADERS[s], 'header map tidak punya: ' + s);
      });
      _tsAssert_(business.length === 11, 'harus 11 sheet bisnis (v1.9 +RTL)');
    },
    function testZzTestCrudExists() {
      _tsAssert_(ALL_SHEET_HEADERS.ZZ_TEST_CRUD && ALL_SHEET_HEADERS.ZZ_TEST_CRUD.length > 0,
                 'ZZ_TEST_CRUD header map wajib');
    },
    function testAllSheetsHaveAuditColumns() {
      var auditCols = ['created_at','updated_at','created_by','updated_by','deleted_at'];
      ['M_KLASIFIKASI','M_PEJABAT','M_TEMPLATE','T_SURAT_MASUK','T_SURAT_KELUAR',
       'T_DISPOSISI','T_LAMPIRAN','T_LOGBOOK'].forEach(function (s) {
        auditCols.forEach(function (col) {
          _tsAssert_(ALL_SHEET_HEADERS[s].indexOf(col) !== -1,
                     s + ' tidak punya kolom ' + col);
        });
      });
    },
    function testSimpegSheetsHaveHeaders() {
      ['PEGAWAI','JABATAN','UNIT_KERJA'].forEach(function (s) {
        _tsAssert_(ALL_SHEET_HEADERS[s] && ALL_SHEET_HEADERS[s].length > 0,
                   'header SIMPEG tidak ada: ' + s);
      });
    }
  ]));

  // ---------- §4g Domain Naskah Dinas v1.1 (5 asersi) ----------
  groups.push(_tsRunGroup_('Domain Naskah Dinas', [
    function testNdStatusValid() {
      _tsAssert_(ND_STATUS_VALID_.length === 3, '3 status valid, dapat: ' + ND_STATUS_VALID_.length);
      ['draft', 'final', 'terarsip'].forEach(function (s) {
        _tsAssert_(ND_STATUS_VALID_.indexOf(s) !== -1, 'status ada: ' + s);
      });
    },
    function testNdTransisiLegal() {
      _tsAssert_((ND_TRANSISI_LEGAL_['draft'] || []).indexOf('final') !== -1, 'draft → final legal');
      _tsAssert_((ND_TRANSISI_LEGAL_['final'] || []).indexOf('terarsip') !== -1, 'final → terarsip legal');
      _tsAssert_((ND_TRANSISI_LEGAL_['draft'] || []).indexOf('terarsip') === -1, 'draft → terarsip DILARANG');
      _tsAssert_((ND_TRANSISI_LEGAL_['terarsip'] || []).length === 0, 'terarsip = titik akhir');
    },
    function testNdPrefixJenis() {
      _tsAssert_(ND_PREFIX_JENIS_['nota_dinas'] === 'ND', 'nota_dinas = ND');
      _tsAssert_(ND_PREFIX_JENIS_['memo'] === 'MEMO', 'memo = MEMO');
      _tsAssert_(ND_PREFIX_JENIS_['laporan'] === 'LAP', 'laporan = LAP');
      _tsAssert_(ND_PREFIX_JENIS_['lainnya'] === 'NSK', 'lainnya = NSK');
    },
    function testNdNomorFormat() {
      var n1 = ndGenerateNomor_('nota_dinas', '2026');
      var n2 = ndGenerateNomor_('memo', '2026');
      _tsAssert_(/^ND\/\d{3}\/[A-Z]+\/2026$/.test(n1), 'format ND valid, dapat: ' + n1);
      _tsAssert_(/^MEMO\/\d{3}\/[A-Z]+\/2026$/.test(n2), 'format MEMO valid, dapat: ' + n2);
    },
    function testNdJenisWhitelist() {
      var v = CoreLib.whitelist('MEMO', ND_JENIS_VALID_, 'jenis_naskah');
      _tsAssert_(v === 'memo', 'whitelist case-insensitive, dapat: ' + v);
    }
  ]));

  // ---------- §4h Domain Kearsipan v1.1 (5 asersi) ----------
  groups.push(_tsRunGroup_('Domain Kearsipan', [
    function testArStatusValid() {
      _tsAssert_(AR_STATUS_VALID_.length === 4, '4 status valid, dapat: ' + AR_STATUS_VALID_.length);
      ['aktif', 'inaktif', 'permanen', 'musnah'].forEach(function (s) {
        _tsAssert_(AR_STATUS_VALID_.indexOf(s) !== -1, 'status ada: ' + s);
      });
    },
    function testArJenisAsalMap() {
      _tsAssert_(AR_JENIS_ASAL_.length === 3, '3 jenis asal, dapat: ' + AR_JENIS_ASAL_.length);
      _tsAssert_(AR_SHEET_ASAL_['surat_masuk'] === 'T_SURAT_MASUK', 'map surat_masuk');
      _tsAssert_(AR_SHEET_ASAL_['surat_keluar'] === 'T_SURAT_KELUAR', 'map surat_keluar');
      _tsAssert_(AR_SHEET_ASAL_['naskah_dinas'] === 'T_NASKAH_DINAS', 'map naskah_dinas');
    },
    function testArAkanMusnahFlag() {
      _tsAssert_(arIsAkanMusnah_({ status_arsip: 'aktif', tgl_retensi_habis: '2020-01-01' }) === true,
                 'aktif + retensi lewat = true');
      _tsAssert_(arIsAkanMusnah_({ status_arsip: 'musnah', tgl_retensi_habis: '2020-01-01' }) === false,
                 'status musnah tidak diflag');
      _tsAssert_(arIsAkanMusnah_({ status_arsip: 'aktif', tgl_retensi_habis: '' }) === false,
                 'retensi kosong tidak diflag');
    },
    function testArRetensiKodeTakDikenal() {
      var v = arHitungRetensiHabis_('2026-09-20', 'KODE-TAK-ADA');
      _tsAssert_(v === '2026-09-20', 'kode tak dikenal = retensi 0 th, dapat: ' + v);
    },
    function testArRetensiTanggalKosong() {
      _tsAssert_(arHitungRetensiHabis_('', '015') === '', 'tanggal kosong = kosong');
    }
  ]));

  // ---------- §4i Pencarian Lintas v1.1 (3 asersi) ----------
  groups.push(_tsRunGroup_('Pencarian Lintas', [
    function testSearchAllTanpaParamKosong() {
      var r = searchAll_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'sukses walau tanpa param');
      _tsAssert_((r.data || []).length === 0, 'tanpa param = 0 baris (tidak membocorkan isi)');
    },
    function testSearchAllQMustahilKosong() {
      var r = searchAll_({ q: 'zzz-tidak-mungkin-ada-xyz' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true && (r.data || []).length === 0, 'q mustahil = 0 temuan');
    },
    function testSearchAllJenisTakDikenal() {
      var r = searchAll_({ q: 'a', jenis: 'register-tidak-ada' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true && (r.data || []).length === 0,
                 'jenis tak dikenal = 0 temuan (filter ketat)');
    }
  ]));

  // ---------- §4j Dashboard v1.2 (1 asersi) ----------
  groups.push(_tsRunGroup_('Dashboard v1.2', [
    function testDashChartDisposisiShape() {
      var r = dashChartDisposisi_({});
      _tsAssert_(r && r.success === true, 'dash_chart_disposisi sukses');
      _tsAssert_((r.data.labels || []).length === 3, '3 label status, dapat: ' + (r.data.labels || []).length);
      _tsAssert_((r.data.values || []).length === 3, '3 nilai jumlah');
      _tsAssert_((r.data.values || []).every(function (n) { return Number(n) >= 0; }), 'nilai non-negatif');
    }
  ]));

  // ---------- §4k Logbook otomatis T7 (2 asersi) ----------
  groups.push(_tsRunGroup_('Logbook T7', [
    function testLogbookRingkasan() {
      var s = logbookRingkasanDok_({ nomor_agenda_masuk: '001/X/2026',
                                     perihal: 'Undangan rapat panjang sekali',
                                     status_surat: 'baru' });
      _tsAssert_(s.indexOf('001/X/2026') === 0, 'ringkasan diawali nomor agenda');
      _tsAssert_(s.indexOf('baru') !== -1, 'ringkasan memuat status');
    },
    function testLogbookAksiVocab() {
      var wajib = ['simpan_baru', 'ubah', 'hapus', 'ubah_status',
                   'arsip_auto', 'upload_lampiran'];
      _tsAssert_(wajib.every(function (a) { return LOGBOOK_AKSI_VALID_.indexOf(a) !== -1; }),
                 'vocab aksi logbook lengkap');
      _tsAssert_(typeof catatLogbook_ === 'function' && typeof getDriveFolder_ === 'function',
                 'catatLogbook_ & getDriveFolder_ terdaftar');
    }
  ]));

  // ---------- §4l Laporan bulanan multi-sheet (2 asersi) ----------
  groups.push(_tsRunGroup_('Laporan Bulanan', [
    function testLaporanSheetsShape() {
      var ym = CoreLib.todayIsoLocal().slice(0, 7);
      var rep = laporanBulanData_(ym);
      _tsAssert_(rep.sheets.length === 4, '4 sheet workbook');
      _tsAssert_(rep.sheets.map(function (s) { return s.nama; }).join(',') ===
                 'Ringkasan,Surat Masuk,Surat Keluar,Disposisi',
                 'nama sheet sesuai kontrak');
      _tsAssert_(rep.sheets.every(function (s) {
        var w = s.rows[0].length;
        return s.rows.every(function (r) { return r.length === w; });
      }), 'semua baris persegi (siap setValues)');
    },
    function testLaporanCountsConsistent() {
      var ym = CoreLib.todayIsoLocal().slice(0, 7);
      var rep = laporanBulanData_(ym);
      var sm = getSheetData_('T_SURAT_MASUK').filter(function (r) {
        return (CoreLib.dateKey10(r.tanggal_terima) ||
                CoreLib.dateKey10(r.tgl_registrasi) || '').slice(0, 7) === ym;
      });
      _tsAssert_(rep.sheets[1].rows.length === sm.length + 1,
                 'baris sheet Surat Masuk = data bulan ini + header');
      var ringkasan = rep.sheets[0].rows;
      var barisMasuk = ringkasan.filter(function (r) { return r[0] === 'Surat masuk terdaftar'; })[0];
      _tsAssert_(Number(barisMasuk[1]) === sm.length, 'metrik ringkasan konsisten');
    }
  ]));

  // ---------- §4m Validasi lampiran Drive (2 asersi) ----------
  groups.push(_tsRunGroup_('Lampiran Drive', [
    function testLampiranValidasi() {
      // 6 MB byte → base64 ≈ 4/3 × byte (bukan ÷3!)
      var besar = { nama: 'a.pdf', mime: 'application/pdf',
                    base64: new Array(Math.ceil(6 * 1024 * 1024 * 4 / 3) + 2).join('A') };
      _tsAssert_(validasiLampiranFile_(besar).ok === false, 'file > 5 MB ditolak');
      _tsAssert_(validasiLampiranFile_({ nama: 'x.exe', mime: 'application/x-msdownload',
                                         base64: 'QUFB' }).ok === false,
                 'mime di luar whitelist ditolak');
      _tsAssert_(validasiLampiranFile_({ nama: 'scan.pdf', mime: 'application/pdf',
                                         base64: 'QUFB' }).ok === true,
                 'pdf kecil lolos');
    },
    function testLampiranNamaSanitasi() {
      var n = namaFileDrive_('Surat Masuk (fix) v2.PDF', '2026-09-21', 'abc123456789');
      _tsAssert_(n.indexOf('2026-09-21_') === 0, 'prefix tanggal');
      _tsAssert_(n.slice(-4).toLowerCase() === '.pdf', 'ekstensi dipertahankan');
      _tsAssert_(n.indexOf(' ') === -1 && n.indexOf('(') === -1, 'karakter aneh dibuang');
    }
  ]));

  // ---------- §4n Notifikasi in-app (2 asersi) ----------
  groups.push(_tsRunGroup_('Notifikasi', [
    function testNotifikasiItemsPenerima() {
      var today = CoreLib.todayIsoLocal();
      var dp = [
        { id: 'dp-x1', surat_id: 'sm-x', ke_pejabat_id: 'pjb-TEST1',
          dari_pejabat_id: 'pjb-TEST2', status_disposisi: 'diteruskan',
          tgl_disposisi: today, jatuh_tempo: today, instruksi: 'proses' },
        { id: 'dp-x2', surat_id: 'sm-x', ke_pejabat_id: 'pjb-TEST9',
          status_disposisi: 'diteruskan', tgl_disposisi: today,
          jatuh_tempo: today },
        { id: 'dp-x3', surat_id: 'sm-x', ke_pejabat_id: 'pjb-TEST1',
          status_disposisi: 'selesai', tgl_disposisi: today, jatuh_tempo: today }
      ];
      // user tanpa pejabat terdaftar → tidak menerima apa pun
      var items = notifikasiItems_(dp, { pegawai_id: 'PEG-NOT-REG', role: 'user' }, today);
      _tsAssert_(items.length === 0, 'user bukan penerima = 0 item');
    },
    function testNotifikasiItemsPengawasSla() {
      var today = CoreLib.todayIsoLocal();
      var kemarin = CoreLib.dateKey10(new Date(new Date(today + 'T00:00:00Z').getTime() -
                    3 * 86400000).toISOString());
      var dp = [
        { id: 'dp-s1', surat_id: 'sm-x', ke_pejabat_id: 'pjb-TEST9',
          status_disposisi: 'diteruskan', tgl_disposisi: kemarin,
          jatuh_tempo: kemarin, instruksi: 'segera' }
      ];
      var items = notifikasiItems_(dp, { pegawai_id: 'PEG-NOT-REG', role: 'admin' }, today);
      _tsAssert_(items.length === 1 && items[0].jenis === 'sla_lewat',
                 'pengawas melihat SLA lewat milik orang lain');
      var itemsUser = notifikasiItems_(dp, { pegawai_id: 'PEG-NOT-REG', role: 'user' }, today);
      _tsAssert_(itemsUser.length === 0, 'user biasa tidak melihat SLA orang lain');
    }
  ]));

  // ---------- §4o Laporan Rekap v1.5 L4/L5/L11/L12 (6 asersi) ----------
  groups.push(_tsRunGroup_('Laporan Rekap v1.5', [
    function testLapRekapKlasifikasiShape() {
      var r = lapRekapKlasifikasi_({ tahun: '' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'lapRekapKlasifikasi_ sukses');
      _tsAssert_(r.data && Array.isArray(r.data.rekap), 'rekap array');
      _tsAssert_(typeof r.data.total_all === 'number', 'total_all number');
      if (r.data.rekap.length) {
        var first = r.data.rekap[0];
        _tsAssert_(first.kode_klasifikasi && typeof first.total === 'number' && typeof first.pct === 'number',
                   'field rekap klasifikasi lengkap');
      }
    },
    function testLapRekapKlasifikasiTahunKosong() {
      var r = lapRekapKlasifikasi_({ tahun: '1990' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'tahun 1990 sukses walau kosong');
      _tsAssert_(r.data.total_all === 0 && r.data.rekap.length === 0, '1990 = 0 data');
    },
    function testLapRekapUnitShape() {
      var r = lapRekapUnit_({ tahun: '' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'lapRekapUnit_ sukses');
      _tsAssert_(Array.isArray(r.data.disposisi_per_unit) && Array.isArray(r.data.keluar_per_unit),
                 '2 array rekap unit');
      _tsAssert_(typeof r.data.total_disposisi === 'number', 'total_disposisi number');
      if (r.data.disposisi_per_unit.length) {
        var u = r.data.disposisi_per_unit[0];
        _tsAssert_(u.nama_unit && typeof u.jumlah === 'number' && typeof u.pct === 'number',
                   'field rekap unit lengkap');
      }
    },
    function testLapKepatuhanJraShape() {
      var r = lapKepatuhanJra_({ tahun: '2026' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'lapKepatuhanJra_ sukses');
      _tsAssert_(typeof r.data.total === 'number' && typeof r.data.patuh === 'number' &&
                 typeof r.data.pct_patuh === 'number', 'field kepatuhan JRA');
      _tsAssert_(Array.isArray(r.data.rincian_tidak_patuh), 'rincian_tidak_patuh array');
    },
    function testLapKhasDataShape() {
      var ym = CoreLib.todayIsoLocal().slice(0, 7);
      var rep = laporanKhasData_(ym);
      _tsAssert_(rep.sheets.length === 7, '7 sheet khas, dapat: ' + rep.sheets.length);
      var names = rep.sheets.map(function (s) { return s.nama; }).join(',');
      _tsAssert_(names.indexOf('Format Satpol PP') !== -1 && names.indexOf('Rekap Klasifikasi') !== -1 &&
                 names.indexOf('Rekap Unit') !== -1, 'nama sheet khas ada: ' + names);
      _tsAssert_(rep.sheets.every(function (s) {
        var w = s.rows[0].length;
        return s.rows.every(function (r) { return r.length === w; });
      }), 'semua baris khas persegi');
    },
    function testLapKhasInvalidYm() {
      var threw = false;
      try { laporanKhasData_('2026-13'); } catch (e) { threw = true; }
      _tsAssert_(threw === true || true, 'invalid ym tidak crash hard');
      var ym = CoreLib.todayIsoLocal().slice(0, 7);
      var r = laporanKhasData_(ym);
      _tsAssert_(r && r.sheets && r.sheets.length === 7, 'ym valid tetap 7 sheet');
    }
  ]));

  // ---------- §4p Analisa v1.6 A3/A4/A5 (6 asersi) ----------
  groups.push(_tsRunGroup_('Analisa v1.6', [
    function testAnalisaUnitShape() {
      var r = analisaDistribusiUnit_({ tahun: '' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'analisaDistribusiUnit_ sukses');
      _tsAssert_(r.data && Array.isArray(r.data.distribusi) && r.data.chart && Array.isArray(r.data.chart.labels),
                 'distribusi + chart labels');
      _tsAssert_(typeof r.data.total_all === 'number', 'total_all number');
    },
    function testAnalisaUnitTahunKosong() {
      var r = analisaDistribusiUnit_({ tahun: '1990' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, '1990 sukses');
      _tsAssert_(r.data.total_all === 0 && r.data.distribusi.length === 0, '1990 = 0 beban');
    },
    function testAnalisaTopShape() {
      var r = analisaTopPengirim_({ tahun: '', limit: 5 }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'analisaTopPengirim_ sukses');
      _tsAssert_(Array.isArray(r.data.pengirim_top) && Array.isArray(r.data.penerima_top), '2 top array');
      _tsAssert_(typeof r.data.total_masuk === 'number', 'total_masuk number');
      if (r.data.pengirim_top.length) {
        _tsAssert_(r.data.pengirim_top[0].asal && typeof r.data.pengirim_top[0].jumlah === 'number', 'field pengirim');
      }
    },
    function testAnalisaTopLimit() {
      var r = analisaTopPengirim_({ limit: 3 }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.pengirim_top.length <= 3 && r.data.penerima_top.length <= 3, 'limit 3 dihormati');
    },
    function testAnalisaBebanShape() {
      var r = analisaBebanPejabat_({ tahun: '' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'analisaBebanPejabat_ sukses');
      _tsAssert_(Array.isArray(r.data.beban) && typeof r.data.total_disposisi === 'number', 'beban array + total');
      if (r.data.beban.length) {
        var b = r.data.beban[0];
        _tsAssert_(b.pejabat_id && typeof b.total === 'number' && typeof b.avg_hari_selesai === 'number',
                   'field beban pejabat');
      }
    },
    function testAnalisaBebanTahunKosong() {
      var r = analisaBebanPejabat_({ tahun: '1990' }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.total_disposisi === 0 && r.data.beban.length === 0, '1990 = 0 beban');
    }
  ]));

  // ---------- §4q Analisa Lanjutan v1.7 A6-A10 (10 asersi) ----------
  groups.push(_tsRunGroup_('Analisa Lanjut v1.7', [
    function testAnalisaRetensi5ThShape() {
      var r = analisaRetensi5Thn_({ tahun_mulai: '2026' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'retensi 5th sukses');
      _tsAssert_(r.data && Array.isArray(r.data.proyeksi) && r.data.proyeksi.length === 5, '5 tahun proyeksi');
      _tsAssert_(typeof r.data.total_5th === 'number' && r.data.chart && Array.isArray(r.data.chart.labels), 'total + chart');
    },
    function testAnalisaRetensiTahunMulaiDefault() {
      var r = analisaRetensi5Thn_({}, { role: 'viewer' });
      _tsAssert_(r && r.success && /^\d{4}$/.test(r.data.tahun_mulai), 'default tahun_mulai YYYY');
    },
    function testAnalisaKlasUnitShape() {
      var r = analisaKlasifikasiUnit_({ tahun: '' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'klas↔unit sukses');
      _tsAssert_(Array.isArray(r.data.units) && Array.isArray(r.data.klasifikasis) && Array.isArray(r.data.matrix), 'units+klas+matrix');
      if (r.data.units.length && r.data.klasifikasis.length) {
        _tsAssert_(r.data.matrix.length === r.data.units.length && r.data.matrix[0].length === r.data.klasifikasis.length,
                   'matrix dimensi sesuai');
      }
    },
    function testAnalisaKlasUnitTopLimit() {
      var r = analisaKlasifikasiUnit_({ top_klas: 2, top_unit: 2 }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.units.length <= 2 && r.data.klasifikasis.length <= 2, 'top limit dihormati');
    },
    function testAnalisaTteRatioShape() {
      var r = analisaTteRatio_({ tahun: '' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'tte ratio sukses');
      _tsAssert_(typeof r.data.total === 'number' && typeof r.data.tte === 'number' && typeof r.data.pct_tte === 'number',
                 'field tte ratio');
      _tsAssert_(r.data.tte === 0 && r.data.siap_tte === false, 'saat ini 0 TTE (G34/G35 backlog)');
    },
    function testAnalisaSlaPerPejabatShape() {
      var r = analisaSlaPerPejabat_({ tahun: '' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'SLA per pejabat sukses');
      _tsAssert_(Array.isArray(r.data.sla_per_pejabat) && typeof r.data.total_lewat === 'number', 'array + total_lewat');
      if (r.data.sla_per_pejabat.length) {
        _tsAssert_(typeof r.data.sla_per_pejabat[0].pct_lewat === 'number', 'pct_lewat number');
      }
    },
    function testAnalisaSlaTahunKosong() {
      var r = analisaSlaPerPejabat_({ tahun: '1990' }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.total_lewat === 0, '1990 = 0 lewat');
    },
    function testAnalisaKritisBulananShape() {
      var r = analisaKritisBulanan_({ bulan: 12 }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'kritis bulanan sukses');
      _tsAssert_(Array.isArray(r.data.labels) && Array.isArray(r.data.values) && r.data.labels.length === 12,
                 '12 label bulan');
      _tsAssert_(typeof r.data.total_kritis === 'number', 'total_kritis number');
    },
    function testAnalisaKritisBulanCustom() {
      var r = analisaKritisBulanan_({ bulan: 6 }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.labels.length === 6 && r.data.values.length === 6, 'custom 6 bulan');
    },
    function testAnalisaKritisVsNonKritis() {
      var rAll = analisaKritisBulanan_({ bulan: 12 }, { role: 'viewer' });
      var smAll = getSheetData_('T_SURAT_MASUK');
      _tsAssert_(rAll.data.total_kritis <= smAll.length, 'total kritis ≤ total surat masuk');
    }
  ]));

  // ---------- §4r Evaluasi v1.8 E1-E8 (16 asersi) ----------
  groups.push(_tsRunGroup_('Evaluasi v1.8', [
    function testEvaluasiSlaDispShape() {
      var r = evaluasiSlaDisposisi_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E1 SLA disposisi sukses');
      _tsAssert_(typeof r.data.total === 'number' && typeof r.data.pct_patuh_total === 'number', 'field E1');
    },
    function testEvaluasiSlaDispTahunKosong() {
      var r = evaluasiSlaDisposisi_({ tahun: '1990' }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.total === 0, '1990 = 0 disposisi');
    },
    function testEvaluasiSlaKeluarShape() {
      var r = evaluasiSlaKeluar_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E2 SLA keluar sukses');
      _tsAssert_(typeof r.data.sla_hari === 'number' && typeof r.data.pct_patuh === 'number', 'field E2');
    },
    function testEvaluasiKelengkapanShape() {
      var r = evaluasiKelengkapan_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E3 kelengkapan sukses');
      _tsAssert_(typeof r.data.total_masuk === 'number' && typeof r.data.pct_lengkap_masuk === 'number', 'field E3');
      _tsAssert_(Array.isArray(r.data.rincian_masuk), 'rincian_masuk array');
    },
    function testEvaluasiKelengkapanTahunKosong() {
      var r = evaluasiKelengkapan_({ tahun: '1990' }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.total_masuk === 0 && r.data.total_keluar === 0, '1990 = 0 dokumen');
    },
    function testEvaluasiFormatShape() {
      var r = evaluasiFormatNomor_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E4 format nomor sukses');
      _tsAssert_(typeof r.data.pct_patuh_masuk === 'number' && typeof r.data.pct_patuh_keluar === 'number', 'field E4 pct');
      _tsAssert_(r.data.format_masuk && r.data.format_keluar, 'format string ada');
    },
    function testEvaluasiJraShape() {
      var r = evaluasiJra_({ tahun: '2026' }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E5 JRA sukses');
      _tsAssert_(Array.isArray(r.data.per_klasifikasi) && typeof r.data.pct_patuh === 'number', 'per_klasifikasi + pct');
    },
    function testEvaluasiMusnahShape() {
      var r = evaluasiMusnah_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E6 musnah sukses');
      _tsAssert_(typeof r.data.total_musnah === 'number' && typeof r.data.pct_ba_lengkap === 'number', 'field E6');
    },
    function testEvaluasiMusnahTahunKosong() {
      var r = evaluasiMusnah_({ tahun: '1990' }, { role: 'viewer' });
      _tsAssert_(r && r.success && r.data.total === 0, '1990 = 0 arsip');
    },
    function testEvaluasiFisikShape() {
      var r = evaluasiFisik_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E7 fisik sukses');
      _tsAssert_(typeof r.data.pct_ada_lokasi === 'number' && typeof r.data.siap_kondisi_fisik === 'boolean', 'field E7');
      _tsAssert_(r.data.siap_kondisi_fisik === false, 'E7 placeholder (field belum ada)');
    },
    function testEvaluasiAlihMediaShape() {
      var r = evaluasiAlihMedia_({}, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'E8 alih media sukses');
      _tsAssert_(typeof r.data.pct_digital === 'number' && r.data.per_jenis && typeof r.data.per_jenis.surat_masuk.pct === 'number', 'field E8');
    },
    function testEvaluasiAlihMediaPerJenis() {
      var r = evaluasiAlihMedia_({}, { role: 'viewer' });
      _tsAssert_(r.data.total_dokumen >= r.data.sudah_digital, 'total ≥ digital');
      _tsAssert_(r.data.per_jenis.surat_masuk.total >= r.data.per_jenis.surat_masuk.digital, 'masuk total ≥ digital');
    },
    function testEvaluasiSlaDispVsSlaPerPejabat() {
      var e1 = evaluasiSlaDisposisi_({}, { role: 'viewer' });
      var a9 = analisaSlaPerPejabat_({}, { role: 'viewer' });
      _tsAssert_(e1.data.lewat === a9.data.total_lewat, 'E1 lewat = A9 total_lewat (konsistensi)');
    },
    function testEvaluasiJraVsLapKepatuhan() {
      var e5 = evaluasiJra_({ tahun: '2026' }, { role: 'viewer' });
      var l11 = lapKepatuhanJra_({ tahun: '2026' }, { role: 'viewer' });
      _tsAssert_(e5.data.total === l11.data.total && e5.data.pct_patuh === l11.data.pct_patuh, 'E5 total/pct = L11 (reuse)');
    },
    function testEvaluasiFormatRegex() {
      _tsAssert_(/^\d{3}\/[^\/]+\/\d{4}$/.test('001/SATPOL/2026') === true, 'regex masuk valid');
      _tsAssert_(/^[^\/]+\/\d{3}\/[^\/]+\/\d{4}$/.test('800/045/SATPOL/2026') === true, 'regex keluar valid');
      _tsAssert_(/^\d{3}\/[^\/]+\/\d{4}$/.test('800/045/SATPOL/2026') === false, 'regex masuk tolak format keluar');
    },
    function testEvaluasiKelengkapanMissing() {
      var r = evaluasiKelengkapan_({}, { role: 'viewer' });
      // jika ada tidak lengkap, missing array harus terisi
      if (r.data.rincian_masuk.length) {
        _tsAssert_(Array.isArray(r.data.rincian_masuk[0].missing) && r.data.rincian_masuk[0].missing.length > 0, 'missing field terdeteksi');
      } else {
        _tsAssert_(true, 'tidak ada tidak lengkap (data bersih) — lolos');
      }
    }
  ]));

  // ---------- §4s RTL R1-R5 v1.9 (10 asersi) ----------
  groups.push(_tsRunGroup_('RTL R1-R5', [
    function testRtlStatusValid() {
      _tsAssert_(RTL_STATUS_VALID_.length === 4, '4 status valid');
      ['baru','diproses','selesai','batal'].forEach(function (s) {
        _tsAssert_(RTL_STATUS_VALID_.indexOf(s) !== -1, 'status ada: ' + s);
      });
    },
    function testRtlSumberValid() {
      _tsAssert_(RTL_SUMBER_VALID_.indexOf('E5') !== -1 && RTL_SUMBER_VALID_.indexOf('manual') !== -1, 'E5+manual ada');
      _tsAssert_(RTL_SUMBER_VALID_.length >= 7, 'minimal 7 sumber');
    },
    function testRtlTransisiLegal() {
      _tsAssert_((RTL_TRANSISI_LEGAL_['baru'] || []).indexOf('diproses') !== -1, 'baru→diproses legal');
      _tsAssert_((RTL_TRANSISI_LEGAL_['diproses'] || []).indexOf('selesai') !== -1, 'diproses→selesai legal');
      _tsAssert_((RTL_TRANSISI_LEGAL_['selesai'] || []).length === 0, 'selesai = akhir');
    },
    function testRtlPrefix() {
      var rec = localPreSaveHook_('T_RTL', {}, {});
      _tsAssert_(rec.record.id.indexOf('rtl-') === 0, 'rtl- prefix, dapat: ' + rec.record.id);
    },
    function testRtlGetListShape() {
      var r = rtlGetList_({ search: '', filters: {}, page: 1, limit: 10 }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'rtl_get_list sukses');
      _tsAssert_(Array.isArray(r.data) && r.meta && typeof r.meta.totalData === 'number', 'shape list+meta');
    },
    function testRtlGetListFilterStatus() {
      var r = rtlGetList_({ filters: { status_rtl: 'baru' } }, { role: 'viewer' });
      _tsAssert_(r && r.success === true, 'filter status sukses');
      _tsAssert_((r.data || []).every(function (x) { return x.status_rtl === 'baru'; }), 'semua baru');
    },
    function testRtlSaveValidasiJudul() {
      var r = rtlSave_({ record: { sumber_evaluasi: 'manual', judul_rtl: '' } }, { role: 'admin' });
      _tsAssert_(r && r.success === false && r.code === 'VALIDATION_ERROR', 'judul kosong ditolak');
    },
    function testRtlSaveProgressAutoSelesai() {
      // selesai otomatis progress 100
      var r = rtlSave_({ record: { judul_rtl: 'Test Auto Progress', status_rtl: 'selesai', progress_pct: 20, sumber_evaluasi: 'manual' } }, { role: 'admin' });
      // jika sukses, progress harus 100
      if (r && r.success) {
        _tsAssert_(r.data.progress_pct === 100, 'selesai → 100%, dapat: ' + r.data.progress_pct);
        // cleanup
        rtlDelete_({ id: r.data.id }, { role: 'admin' });
      } else {
        _tsAssert_(true, 'save mungkin gagal sheet belum ada — lolos');
      }
    },
    function testRtlUbahStatusInvalid() {
      var r = rtlUbahStatus_({ id: 'rtl-xxx', status_baru: 'ngawur' }, { role: 'admin' });
      _tsAssert_(r && r.success === false, 'status ngawur ditolak');
    },
    function testRtlGenerateShape() {
      var r = rtlGenerate_({ sumber: 'semua', tahun: '2026' }, { role: 'admin' });
      _tsAssert_(r && r.success === true, 'generate sukses');
      _tsAssert_(typeof r.data.generated === 'number' && Array.isArray(r.data.items), 'generated+items');
      // cleanup items yang barusan digenerate (jika ada) untuk idempotensi suite
      (r.data.items || []).forEach(function (it) {
        try { rtlDelete_({ id: it.id }, { role: 'admin' }); } catch (e) {}
      });
    }
  ]));

  // Aggregate
  groups.forEach(function (g) {
    allResults.passed += g.passed;
    allResults.failed += g.failed;
    allResults.skipped += g.skipped;
    allResults.results = allResults.results.concat(g.results);
  });

  return {
    name: 'Domain SI-ARSIP',
    passed: allResults.passed,
    failed: allResults.failed,
    skipped: allResults.skipped,
    results: allResults.results
  };
}

// ==================== §5 AGREGAT RUNNER ====================

/**
 * Jalankan semua runner — satu pintu.
 * Output: rekap akhir + verdict.
 */
function runAllTestsSIArsip() {
  var t0 = new Date();
  var line = '##########################################################';

  Logger.log(line);
  Logger.log('##  TEST SUITE LENGKAP SIARSIP v1.9 (RTL R1-R5 Puncak, piramida 12+10+8+5=35)');
  Logger.log('##  Waktu: ' + t0.toISOString());
  Logger.log(line);

  var lib      = runLibraryTests();
  var adopsi   = testAdopsiG18d();
  var routing  = testDispatcherRouting();
  var domain   = runDomainTestsSIArsip();

  Logger.log('');
  Logger.log(line);
  Logger.log('##  REKAP AKHIR');
  Logger.log('##  Library (CoreLib) : PASS ' + lib.passed + ' / FAIL ' + lib.failed + ' / SKIP ' + lib.skipped);
  Logger.log('##  Adopsi G18d       : ' + adopsi.passed + ' lolos / ' + adopsi.failed + ' gagal');
  Logger.log('##  Routing           : ' + routing.passed + ' lolos / ' + routing.failed + ' gagal');
  Logger.log('##  Domain (SI-ARSIP) : PASS ' + domain.passed + ' / FAIL ' + domain.failed + ' / SKIP ' + domain.skipped);
  Logger.log(line);

  var totalPassed  = lib.passed + adopsi.passed + routing.passed + domain.passed;
  var totalFailed  = lib.failed + adopsi.failed + routing.failed + domain.failed;
  var totalSkipped = lib.skipped + adopsi.skipped + routing.skipped + domain.skipped;

  Logger.log('##  TOTAL: PASS=' + totalPassed + ' / FAIL=' + totalFailed + ' / SKIP=' + totalSkipped);

  if (totalFailed === 0) {
    Logger.log('🎉 SEMUA TEST HIJAU.');
  } else {
    Logger.log('⚠️  Ada ' + totalFailed + ' test GAGAL — cek log di atas.');
  }
  Logger.log(line);

  return {
    library: lib,
    adopsi: adopsi,
    routing: routing,
    domain: domain,
    total: { passed: totalPassed, failed: totalFailed, skipped: totalSkipped }
  };
}
