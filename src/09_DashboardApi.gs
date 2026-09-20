// ============================================================
// SI-ARSIP - 09_DashboardApi.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Domain Dashboard — KPI + Chart + Panel Khusus.
// FR-35..FR-39 dari FRD.
//
// Handler yang diregistrasi di 02_AppLogic.gs:
//   - dashRingkas_            → FR-35 4 KPI (bulan ini)
//   - dashChartTren_          → FR-36 12 bulan trend (masuk + keluar)
//   - dashKlasifikasi_        → FR-37 top 5 kode klasifikasi
//   - dashSuratKritis_        → FR-38 10 surat kritis terbaru
//   - dashDisposisiLewatSla_  → FR-39 10 disposisi lewat SLA
//
// Rujukan: SRIKANDI, Permendagri 78/2012.
// ============================================================

// ==================== §1 HELPER ====================

/**
 * Ambil prefix bulan 'YYYY-MM' dari sebuah record berdasarkan field
 * tanggal prioritas. Contoh:
 *   _dashBulanDariRecord_({tgl_a: '2026-09-20', tgl_b: '2026-08-01'},
 *                         ['tgl_a', 'tgl_b'])
 *     → '2026-09'
 */
function _dashBulanDariRecord_(rec, fieldNames) {
  if (!rec) return '';
  for (var i = 0; i < fieldNames.length; i++) {
    var d = CoreLib.dateKey10(rec[fieldNames[i]]);
    if (d) return d.slice(0, 7);   // 'YYYY-MM'
  }
  return '';
}

/**
 * Generate array bulan untuk N bulan terakhir (termasuk bulan ini).
 * Urut lama → baru. Contoh output: ['Sep 25', 'Okt 25', ..., 'Sep 26'].
 * @returns {Array<{key: 'YYYY-MM', label: 'MMM yy'}>}
 */
function _dashGenerateMonths_(count) {
  count = Number(count) || 12;
  if (count < 1) count = 12;
  if (count > 24) count = 24;

  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var out = [];
  for (var i = count - 1; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: Utilities.formatDate(d, tz, 'yyyy-MM'),
      label: Utilities.formatDate(d, tz, 'MMM yy')
    });
  }
  return out;
}

// ==================== §2 KPI RINGKAS (FR-35) ====================

/**
 * 4 KPI ringkas bulan ini (WIB).
 * params: { periode?: 'YYYY-MM' } — default bulan berjalan.
 *
 * Return:
 *   {
 *     periode, surat_masuk_bulan_ini, surat_keluar_bulan_ini,
 *     disposisi_menunggu, disposisi_lewat_sla
 *   }
 */
function dashRingkas_(params, user) {
  try {
    params = params || {};
    var periode = String(params.periode || '').trim();
    if (!/^\d{4}-\d{2}$/.test(periode)) {
      periode = CoreLib.todayIsoLocal().slice(0, 7);   // 'YYYY-MM' WIB
    }

    // ---------- Surat Masuk bulan ini ----------
    var suratMasuk = getSheetData_('T_SURAT_MASUK');
    var smBulanIni = suratMasuk.filter(function (r) {
      return _dashBulanDariRecord_(r, ['tanggal_terima', 'tgl_registrasi']) === periode;
    }).length;

    // ---------- Surat Keluar bulan ini ----------
    var suratKeluar = getSheetData_('T_SURAT_KELUAR');
    var skBulanIni = suratKeluar.filter(function (r) {
      return _dashBulanDariRecord_(r, ['tanggal_surat', 'tgl_dibuat']) === periode;
    }).length;

    // ---------- Disposisi menunggu (belum selesai) ----------
    var disposisi = getSheetData_('T_DISPOSISI');
    var dpMenunggu = disposisi.filter(function (d) {
      var st = CoreLib.normStr(d.status_disposisi);
      return st === 'diteruskan' || st === 'diproses';
    }).length;

    // ---------- Disposisi lewat SLA ----------
    var dpLewatSla = disposisi.filter(function (d) {
      return dpIsLewatSla_(d);   // dari 05_DisposisiApi.gs
    }).length;

    return {
      success: true,
      data: {
        periode:                periode,
        surat_masuk_bulan_ini:  smBulanIni,
        surat_keluar_bulan_ini: skBulanIni,
        disposisi_menunggu:     dpMenunggu,
        disposisi_lewat_sla:    dpLewatSla
      }
    };
  } catch (err) {
    Logger.log('[dashRingkas_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 CHART TREN (FR-36) ====================

/**
 * Volume surat masuk + keluar per bulan, N bulan terakhir.
 * params: { bulan?: 12 } — default 12.
 *
 * Return:
 *   { labels: ['Sep 25', ...], masuk: [n, ...], keluar: [n, ...] }
 */
function dashChartTren_(params) {
  try {
    params = params || {};
    var bulanCount = Number(params.bulan) || 12;

    var months = _dashGenerateMonths_(bulanCount);

    // Init counter per bulan key
    var masukMap = {}, keluarMap = {};
    months.forEach(function (m) { masukMap[m.key] = 0; keluarMap[m.key] = 0; });

    // Tally surat masuk
    getSheetData_('T_SURAT_MASUK').forEach(function (r) {
      var b = _dashBulanDariRecord_(r, ['tanggal_terima', 'tgl_registrasi']);
      if (masukMap[b] !== undefined) masukMap[b]++;
    });

    // Tally surat keluar
    getSheetData_('T_SURAT_KELUAR').forEach(function (r) {
      var b = _dashBulanDariRecord_(r, ['tanggal_surat', 'tgl_dibuat']);
      if (keluarMap[b] !== undefined) keluarMap[b]++;
    });

    return {
      success: true,
      data: {
        labels: months.map(function (m) { return m.label; }),
        masuk:  months.map(function (m) { return masukMap[m.key]; }),
        keluar: months.map(function (m) { return keluarMap[m.key]; })
      }
    };
  } catch (err) {
    Logger.log('[dashChartTren_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 CHART KLASIFIKASI (FR-37) ====================

/**
 * Distribusi surat per kode klasifikasi (top N), dari T_SURAT_MASUK + T_SURAT_KELUAR.
 * params: { limit?: 5 } — default 5.
 *
 * Return:
 *   { labels: ['005.1', '800', ...], values: [n, ...], top: [{kode, jumlah}], total }
 */
function dashKlasifikasi_(params) {
  try {
    params = params || {};
    var limit = Number(params.limit) || 5;
    if (limit < 1) limit = 5;
    if (limit > 20) limit = 20;

    var countMap = {};
    function tally(rows) {
      rows.forEach(function (r) {
        var k = String(r.kode_klasifikasi || '').trim();
        if (!k) return;
        countMap[k] = (countMap[k] || 0) + 1;
      });
    }
    tally(getSheetData_('T_SURAT_MASUK'));
    tally(getSheetData_('T_SURAT_KELUAR'));

    // Sort desc by jumlah
    var sorted = Object.keys(countMap).map(function (k) {
      return { kode: k, jumlah: countMap[k] };
    }).sort(function (a, b) {
      return b.jumlah - a.jumlah;
    });

    var top = sorted.slice(0, limit);
    var total = sorted.reduce(function (acc, x) { return acc + x.jumlah; }, 0);

    return {
      success: true,
      data: {
        labels: top.map(function (x) { return x.kode; }),
        values: top.map(function (x) { return x.jumlah; }),
        top:    top,
        total:  total
      }
    };
  } catch (err) {
    Logger.log('[dashKlasifikasi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 PANEL SURAT KRITIS (FR-38) ====================

/**
 * 10 surat masuk terbaru dengan flag is_kritis = true.
 * params: { limit?: 10 } — default 10.
 *
 * Return: { data: [...], total }
 */
function dashSuratKritis_(params) {
  try {
    params = params || {};
    var limit = Number(params.limit) || 10;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    // Reuse smIsKritis_ dari 03_SuratMasukApi.gs
    var kritis = getSheetData_('T_SURAT_MASUK').filter(function (r) {
      return smIsKritis_(r);
    });

    // Sort: tanggal_terima desc, fallback tgl_registrasi
    kritis.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal_terima) || CoreLib.dateKey10(a.tgl_registrasi);
      var tb = CoreLib.dateKey10(b.tanggal_terima) || CoreLib.dateKey10(b.tgl_registrasi);
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    var out = kritis.slice(0, limit).map(function (r) {
      var o = Object.assign({}, r);
      o.is_kritis = true;
      return o;
    });

    return { success: true, data: out, total: kritis.length };
  } catch (err) {
    Logger.log('[dashSuratKritis_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 PANEL DISPOSISI LEWAT SLA (FR-39) ====================

/**
 * 10 disposisi dengan flag is_lewat_sla = true, urut jatuh_tempo asc.
 * params: { limit?: 10 } — default 10.
 *
 * Return: { data: [...], total }
 */
function dashDisposisiLewatSla_(params) {
  try {
    params = params || {};
    var limit = Number(params.limit) || 10;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    // Reuse dpIsLewatSla_ dari 05_DisposisiApi.gs
    var lewat = getSheetData_('T_DISPOSISI').filter(function (d) {
      return dpIsLewatSla_(d);
    });

    // Sort: jatuh_tempo asc (paling lama lewat dulu)
    lewat.sort(function (a, b) {
      var ja = CoreLib.dateKey10(a.jatuh_tempo);
      var jb = CoreLib.dateKey10(b.jatuh_tempo);
      if (ja !== jb) return ja < jb ? -1 : 1;
      return 0;
    });

    var out = lewat.slice(0, limit).map(function (r) {
      var o = Object.assign({}, r);
      o.is_lewat_sla = true;
      return o;
    });

    return { success: true, data: out, total: lewat.length };
  } catch (err) {
    Logger.log('[dashDisposisiLewatSla_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §7 SELF-CHECK ====================

function testDashboardSelfCheck() {
  Logger.log('=== 09_DashboardApi.gs v1.0.0 self-check ===');

  var admin = { role: 'admin', email: 'test@test.com', pegawai_id: 'PEG-0001' };

  // 1. KPI ringkas — data kosong tidak crash
  var kpi = dashRingkas_({}, admin);
  Logger.log((kpi && kpi.success ? '✅' : '❌') + ' dashRingkas_ — ' +
             JSON.stringify(kpi.data));

  // 2. Chart tren — 12 bulan
  var tren = dashChartTren_({ bulan: 12 });
  var trenOk = tren && tren.success &&
               tren.data.labels.length === 12 &&
               tren.data.masuk.length === 12 &&
               tren.data.keluar.length === 12;
  Logger.log((trenOk ? '✅' : '❌') + ' dashChartTren_ 12 bulan — labels[0]=' +
             (tren && tren.data ? tren.data.labels[0] : '-') + ', labels[11]=' +
             (tren && tren.data ? tren.data.labels[11] : '-'));

  // 3. Chart tren — 6 bulan (custom count)
  var tren6 = dashChartTren_({ bulan: 6 });
  Logger.log((tren6 && tren6.success && tren6.data.labels.length === 6 ? '✅' : '❌') +
             ' dashChartTren_ 6 bulan (custom)');

  // 4. Chart klasifikasi — data kosong
  var klas = dashKlasifikasi_({});
  Logger.log((klas && klas.success ? '✅' : '❌') + ' dashKlasifikasi_ — total=' +
             (klas.data ? klas.data.total : '-') + ', top=' +
             (klas.data ? klas.data.top.length : '-'));

  // 5. Panel surat kritis — data kosong
  var sk = dashSuratKritis_({});
  Logger.log((sk && sk.success ? '✅' : '❌') + ' dashSuratKritis_ — ' +
             ((sk.data || []).length) + ' baris, total=' + (sk.total || 0));

  // 6. Panel disposisi lewat SLA — data kosong
  var ds = dashDisposisiLewatSla_({});
  Logger.log((ds && ds.success ? '✅' : '❌') + ' dashDisposisiLewatSla_ — ' +
             ((ds.data || []).length) + ' baris, total=' + (ds.total || 0));

  // 7. Helper bulan — cek format
  var months = _dashGenerateMonths_(3);
  var monthsOk = months.length === 3 &&
                 /^\d{4}-\d{2}$/.test(months[0].key) &&
                 /^[A-Z][a-z]{2} \d{2}$/.test(months[0].label);
  Logger.log((monthsOk ? '✅' : '❌') + ' _dashGenerateMonths_(3) — ' +
             months.map(function (m) { return m.label + '(' + m.key + ')'; }).join(' | '));

  Logger.log('=== Selesai ===');
}
