// ============================================================
// SI-ARSIP - 15_AnalisaLanjutApi.gs (v1.7 — A6/A7/A8/A9/A10)
// ------------------------------------------------------------
// Domain Analisa Lanjutan — menutup 5 backlog Analisa:
//   A6 Proyeksi Retensi Habis 5 Tahun (skor 11)
//   A7 Korelasi Klasifikasi ↔ Unit (skor 12)
//   A8 Rasio TTE vs Non-TTE (skor 14, TTE belum aktif → placeholder 0%)
//   A9 Analisa Disposisi Lewat SLA per Pejabat (skor 15, PARTIAL→FULL)
//   A10 Analisa Volume Surat Kritis per Bulan (skor 15, PARTIAL→FULL)
// Handler: analisa_retensi_5th, analisa_klasifikasi_unit, analisa_tte_ratio,
//          analisa_sla_per_pejabat, analisa_kritis_bulanan
// ============================================================

// ==================== §1 HELPER ====================

function _analisaLanjutFilterTahun_(rows, fields, tahun) {
  tahun = String(tahun || '').trim();
  if (!/^\d{4}$/.test(tahun)) return rows;
  return rows.filter(function (r) {
    for (var i = 0; i < fields.length; i++) {
      var k = CoreLib.dateKey10(r[fields[i]]);
      if (k && k.slice(0, 4) === tahun) return true;
    }
    return false;
  });
}

function _analisaLanjutPejabatMap_() {
  try {
    if (typeof _lapPejabatUnitMap_ === 'function') return _lapPejabatUnitMap_();
  } catch (e) { }
  var out = {};
  try {
    getSheetData_('M_PEJABAT').forEach(function (pj) {
      out[String(pj.id)] = { nama_unit: String(pj.id), unit_id: '', pegawai_id: String(pj.pegawai_id || '') };
    });
  } catch (e) { }
  return { pejabatMap: out };
}

// ==================== §2 A6 — PROYEKSI RETENSI HABIS 5 TAHUN ====================

/**
 * A6: Proyeksi retensi habis 5 tahun ke depan — perencanaan ruang arsip.
 * params: { tahun_mulai?: 'YYYY' } default tahun berjalan WIB
 * Return: { tahun_mulai, proyeksi: [{tahun,jml_akan_musnah,jml_permanen,total}], total_5th, chart }
 */
function analisaRetensi5Thn_(params, user) {
  try {
    params = params || {};
    var tahunMulai = String(params.tahun_mulai || '').trim();
    if (!/^\d{4}$/.test(tahunMulai)) tahunMulai = CoreLib.todayIsoLocal().slice(0, 4);
    var startYear = Number(tahunMulai);

    var arsip = getSheetData_('T_ARSIP').filter(function (a) {
      var st = CoreLib.normStr(a.status_arsip);
      return st === 'aktif' || st === 'inaktif';
    });

    // bucket per tahun untuk 5 tahun ke depan
    var buckets = {};
    for (var i = 0; i < 5; i++) {
      var y = String(startYear + i);
      buckets[y] = { tahun: y, jml_akan_musnah: 0, jml_permanen: 0, total: 0 };
    }

    // klasifikasi map untuk tindakan_akhir
    var klasMap = {};
    try {
      if (typeof _lapKlasMap_ === 'function') klasMap = _lapKlasMap_();
    } catch (e) { }

    arsip.forEach(function (a) {
      var th = CoreLib.dateKey10(a.tgl_retensi_habis);
      if (!th) return;
      var y = th.slice(0, 4);
      if (!buckets[y]) return; // di luar 5 tahun
      var kode = String(a.kode_klasifikasi || '').trim();
      var info = klasMap[kode];
      var ta = info ? CoreLib.normStr(info.tindakan_akhir) : CoreLib.normStr(a.status_arsip);
      // jika tindakan akhir permanen → bucket permanen, else musnah
      if (ta === 'permanen' || CoreLib.normStr(a.status_arsip) === 'permanen') {
        buckets[y].jml_permanen++;
      } else {
        buckets[y].jml_akan_musnah++;
      }
      buckets[y].total++;
    });

    var proyeksi = Object.keys(buckets).sort().map(function (k) { return buckets[k]; });
    var total5 = proyeksi.reduce(function (acc, x) { return acc + x.total; }, 0);

    return {
      success: true,
      data: {
        tahun_mulai: String(startYear),
        proyeksi: proyeksi,
        total_5th: total5,
        chart: {
          labels: proyeksi.map(function (x) { return x.tahun; }),
          musnah: proyeksi.map(function (x) { return x.jml_akan_musnah; }),
          permanen: proyeksi.map(function (x) { return x.jml_permanen; }),
          total: proyeksi.map(function (x) { return x.total; })
        }
      }
    };
  } catch (err) {
    Logger.log('[analisaRetensi5Thn_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 A7 — KORELASI KLASIFIKASI ↔ UNIT ====================

/**
 * A7: Korelasi Klasifikasi ↔ Unit — matriks heatmap.
 * params: { tahun?: 'YYYY', top_klas?: 5, top_unit?: 8 }
 * Return: { tahun, units: [nama_unit], klasifikasis: [kode], matrix: [[jumlah]], total }
 */
function analisaKlasifikasiUnit_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();
    var topKlas = Number(params.top_klas) || 5;
    var topUnit = Number(params.top_unit) || 8;
    if (topKlas < 1) topKlas = 5; if (topKlas > 20) topKlas = 20;
    if (topUnit < 1) topUnit = 8; if (topUnit > 20) topUnit = 20;

    var maps = _analisaLanjutPejabatMap_();
    var pejabatMap = maps.pejabatMap || {};

    // Surat masuk → disposisi → unit
    var smMap = {};
    try {
      getSheetData_('T_SURAT_MASUK').forEach(function (s) { smMap[String(s.id)] = s; });
    } catch (e) { }

    var dp = getSheetData_('T_DISPOSISI');
    if (/^\d{4}$/.test(tahun)) dp = _analisaLanjutFilterTahun_(dp, ['tgl_disposisi'], tahun);

    // Tally unit total untuk top unit, dan klasifikasi total untuk top klas
    var unitCount = {}; // nama_unit → total
    var klasCount = {}; // kode → total
    var pairCount = {}; // unit|kode → jumlah

    dp.forEach(function (d) {
      var surat = smMap[String(d.surat_id || '')];
      if (!surat) return;
      var kode = String(surat.kode_klasifikasi || '').trim();
      if (!kode) return;
      var ke = String(d.ke_pejabat_id || '').trim();
      var info = pejabatMap[ke];
      var namaUnit = info ? info.nama_unit : 'Tidak diketahui';
      if (!namaUnit) namaUnit = 'Tidak diketahui';

      unitCount[namaUnit] = (unitCount[namaUnit] || 0) + 1;
      klasCount[kode] = (klasCount[kode] || 0) + 1;
      var key = namaUnit + '|' + kode;
      pairCount[key] = (pairCount[key] || 0) + 1;
    });

    var topUnits = Object.keys(unitCount).map(function (k) { return { nama: k, jml: unitCount[k] }; })
      .sort(function (a, b) { return b.jml - a.jml; }).slice(0, topUnit).map(function (x) { return x.nama; });
    var topKlas = Object.keys(klasCount).map(function (k) { return { kode: k, jml: klasCount[k] }; })
      .sort(function (a, b) { return b.jml - a.jml; }).slice(0, topKlas).map(function (x) { return x.kode; });

    // matrix rows = units, cols = klasifikasi
    var matrix = topUnits.map(function (unit) {
      return topKlas.map(function (kode) {
        return pairCount[unit + '|' + kode] || 0;
      });
    });

    var total = dp.length;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        units: topUnits,
        klasifikasis: topKlas,
        matrix: matrix,
        total: total,
        unit_count: unitCount,
        klas_count: klasCount
      }
    };
  } catch (err) {
    Logger.log('[analisaKlasifikasiUnit_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 A8 — RASIO TTE vs NON-TTE ====================

/**
 * A8: Rasio Surat TTE vs Non-TTE — placeholder karena TTE belum aktif (G34/G35).
 * params: { tahun?: 'YYYY' }
 * Return: { tahun, total, tte, non_tte, pct_tte, pct_non_tte, catatan, siap_tte: false }
 * Logic: cek field tte_status / tte_id jika ada di T_SURAT_KELUAR (future-proof); saat ini 0.
 */
function analisaTteRatio_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var sk = getSheetData_('T_SURAT_KELUAR');
    if (/^\d{4}$/.test(tahun)) sk = _analisaLanjutFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat'], tahun);

    var total = sk.length;
    var tte = 0;
    // future-proof: jika ada kolom tte_status / tte_id / is_tte
    sk.forEach(function (r) {
      var s = CoreLib.normStr(r.tte_status || r.status_tte || '');
      var id = String(r.tte_id || r.id_tte || '').trim();
      var flag = String(r.is_tte || '').toLowerCase();
      if (s === 'tertte' || s === 'signed' || id || flag === 'true') tte++;
    });

    var nonTte = total - tte;
    var pctTte = total ? Math.round((tte / total) * 10000) / 100 : 0;
    var pctNon = total ? Math.round((nonTte / total) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total: total,
        tte: tte,
        non_tte: nonTte,
        pct_tte: pctTte,
        pct_non_tte: pctNon,
        siap_tte: false,
        catatan: 'TTE belum aktif (G34/G35 ROADMAP). Saat ini semua surat = non-TTE. Struktur API siap — ketika kolom tte_status/tte_id ada, rasio otomatis hidup.'
      }
    };
  } catch (err) {
    Logger.log('[analisaTteRatio_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 A9 — SLA PER PEJABAT ====================

/**
 * A9: Analisa Disposisi Lewat SLA per Pejabat — evaluasi kinerja.
 * params: { tahun?: 'YYYY' }
 * Return: { tahun, sla_per_pejabat: [{pejabat_id,nama_pejabat,nama_unit,total,lewat,pct_lewat,avg_telat_hari}], total_lewat, chart }
 */
function analisaSlaPerPejabat_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var maps = _analisaLanjutPejabatMap_();
    var pejabatMap = maps.pejabatMap || {};

    var pegawaiNameMap = {};
    try {
      getSheetData_('PEGAWAI').forEach(function (p) {
        var pid = CoreLib.normId(p.pegawai_id || p.id);
        if (pid) pegawaiNameMap[pid] = String(p.nama || p.nama_lengkap || pid);
      });
    } catch (e) { }
    var pejabatDetailMap = {};
    try {
      getSheetData_('M_PEJABAT').forEach(function (pj) {
        pejabatDetailMap[String(pj.id)] = { pegawai_id: CoreLib.normId(pj.pegawai_id || '') };
      });
    } catch (e) { }

    var dp = getSheetData_('T_DISPOSISI');
    if (/^\d{4}$/.test(tahun)) dp = _analisaLanjutFilterTahun_(dp, ['tgl_disposisi'], tahun);

    var tally = {}; // pejabat_id → {total, lewat, telat_hari_list}
    var today = CoreLib.todayIsoLocal();

    dp.forEach(function (d) {
      var ke = String(d.ke_pejabat_id || '').trim();
      if (!ke) return;
      if (!tally[ke]) tally[ke] = { total: 0, lewat: 0, telat_list: [] };
      tally[ke].total++;
      if (dpIsLewatSla_(d)) {
        tally[ke].lewat++;
        var jt = CoreLib.dateKey10(d.jatuh_tempo);
        if (jt) {
          try {
            var dJt = new Date(jt + 'T00:00:00Z');
            var dToday = new Date(today + 'T00:00:00Z');
            var diff = Math.round((dToday - dJt) / 86400000);
            if (diff > 0 && diff < 365) tally[ke].telat_list.push(diff);
          } catch (e) { }
        }
      }
    });

    var slaPerPejabat = Object.keys(tally).map(function (pejId) {
      var t = tally[pejId];
      var detail = pejabatDetailMap[pejId] || { pegawai_id: '' };
      var infoUnit = pejabatMap[pejId] || { nama_unit: 'Tidak diketahui' };
      var namaPejabat = pegawaiNameMap[detail.pegawai_id] || detail.pegawai_id || pejId;
      var avgTelat = 0;
      if (t.telat_list.length) {
        var sum = t.telat_list.reduce(function (a, b) { return a + b; }, 0);
        avgTelat = Math.round((sum / t.telat_list.length) * 10) / 10;
      }
      var pctLewat = t.total ? Math.round((t.lewat / t.total) * 10000) / 100 : 0;
      return {
        pejabat_id: pejId,
        nama_pejabat: namaPejabat,
        nama_unit: infoUnit.nama_unit || 'Tidak diketahui',
        total: t.total,
        lewat: t.lewat,
        pct_lewat: pctLewat,
        avg_telat_hari: avgTelat
      };
    });
    slaPerPejabat.sort(function (a, b) { return b.lewat - a.lewat || b.pct_lewat - a.pct_lewat; });

    var totalLewat = slaPerPejabat.reduce(function (acc, x) { return acc + x.lewat; }, 0);
    var top = slaPerPejabat.slice(0, 8);

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        sla_per_pejabat: slaPerPejabat,
        total_lewat: totalLewat,
        chart: {
          labels: top.map(function (x) { return x.nama_pejabat; }),
          lewat: top.map(function (x) { return x.lewat; }),
          pct_lewat: top.map(function (x) { return x.pct_lewat; })
        }
      }
    };
  } catch (err) {
    Logger.log('[analisaSlaPerPejabat_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 A10 — KRITIS PER BULAN ====================

/**
 * A10: Analisa Volume Surat Kritis per Bulan — kewaspadaan.
 * params: { bulan?: 12 } default 12
 * Return: { labels, values, total_kritis, chart }
 */
function analisaKritisBulanan_(params, user) {
  try {
    params = params || {};
    var bulanCount = Number(params.bulan) || 12;
    if (bulanCount < 1) bulanCount = 12;
    if (bulanCount > 24) bulanCount = 24;

    var months = (typeof _dashGenerateMonths_ === 'function') ? _dashGenerateMonths_(bulanCount) : [];
    if (!months.length) {
      // fallback generate months
      var tz = Session.getScriptTimeZone();
      var now = new Date();
      months = [];
      for (var i = bulanCount - 1; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          key: Utilities.formatDate(d, tz, 'yyyy-MM'),
          label: Utilities.formatDate(d, tz, 'MMM yy')
        });
      }
    }

    var map = {};
    months.forEach(function (m) { map[m.key] = 0; });

    getSheetData_('T_SURAT_MASUK').forEach(function (r) {
      if (!smIsKritis_(r)) return;
      var b = '';
      try {
        if (typeof _dashBulanDariRecord_ === 'function') {
          b = _dashBulanDariRecord_(r, ['tanggal_terima', 'tgl_registrasi']);
        } else {
          b = (CoreLib.dateKey10(r.tanggal_terima) || CoreLib.dateKey10(r.tgl_registrasi) || '').slice(0, 7);
        }
      } catch (e) { b = ''; }
      if (map[b] !== undefined) map[b]++;
    });

    var labels = months.map(function (m) { return m.label; });
    var values = months.map(function (m) { return map[m.key]; });
    var total = values.reduce(function (a, b) { return a + b; }, 0);

    return {
      success: true,
      data: {
        labels: labels,
        values: values,
        total_kritis: total,
        chart: { labels: labels, values: values },
        bulan_count: bulanCount
      }
    };
  } catch (err) {
    Logger.log('[analisaKritisBulanan_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §7 SELF-CHECK ====================

function testAnalisaLanjutSelfCheck() {
  Logger.log('=== 15_AnalisaLanjutApi.gs v1.7 self-check ===');
  var admin = { role: 'admin', email: 'test@test.com' };

  var r6 = analisaRetensi5Thn_({ tahun_mulai: '2026' }, admin);
  Logger.log((r6 && r6.success ? '✅' : '❌') + ' A6 retensi 5th — total=' + (r6.data ? r6.data.total_5th : '-') + ', proyeksi=' + (r6.data ? r6.data.proyeksi.length : '-'));

  var r7 = analisaKlasifikasiUnit_({ tahun: '' }, admin);
  Logger.log((r7 && r7.success ? '✅' : '❌') + ' A7 klas↔unit — units=' + (r7.data ? r7.data.units.length : '-') + ', klas=' + (r7.data ? r7.data.klasifikasis.length : '-'));

  var r8 = analisaTteRatio_({}, admin);
  Logger.log((r8 && r8.success ? '✅' : '❌') + ' A8 TTE ratio — total=' + (r8.data ? r8.data.total : '-') + ', tte=' + (r8.data ? r8.data.tte : '-') + ', pct=' + (r8.data ? r8.data.pct_tte : '-') + '%');

  var r9 = analisaSlaPerPejabat_({}, admin);
  Logger.log((r9 && r9.success ? '✅' : '❌') + ' A9 SLA per pejabat — total_lewat=' + (r9.data ? r9.data.total_lewat : '-') + ', per_pejabat=' + (r9.data ? r9.data.sla_per_pejabat.length : '-'));

  var r10 = analisaKritisBulanan_({ bulan: 12 }, admin);
  Logger.log((r10 && r10.success ? '✅' : '❌') + ' A10 kritis bulanan — total=' + (r10.data ? r10.data.total_kritis : '-') + ', labels=' + (r10.data ? r10.data.labels.length : '-'));

  Logger.log('=== Selesai ===');
}
