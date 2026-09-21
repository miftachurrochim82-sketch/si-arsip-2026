// ============================================================
// SI-ARSIP - 13_LaporanRekapApi.gs (v1.5 — L4/L5/L11/L12)
// ------------------------------------------------------------
// Domain Laporan Rekap — menutup 4 lubang piramida Laporan:
//   L4  Rekap per Klasifikasi (tabel lengkap, bukan cuma top-5)
//   L5  Rekap per Unit (disposisi per bidang + surat keluar per unit)
//   L11 Kepatuhan JRA Tahunan (% patuh retensi + status)
//   L12 Format Khas Satpol PP (sheet tambahan di export — builder di 10_)
// Handler: lap_rekap_klasifikasi, lap_rekap_unit, lap_kepatuhan_jra
// Level: viewer (baca), export khas = user (10_LaporanApi.gs)
// ============================================================

// ==================== §1 HELPER UMUM ====================

/**
 * Filter list by tahun (YYYY) berdasarkan field tanggal prioritas.
 * @param {Array} rows
 * @param {Array<string>} fields - urutan field tanggal
 * @param {string} tahun - 'YYYY' atau '' (no filter)
 * @returns {Array}
 */
function _lapFilterTahun_(rows, fields, tahun) {
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

/**
 * Map M_KLASIFIKASI kode → {uraian, retensi_aktif, retensi_inaktif, tindakan_akhir}
 */
function _lapKlasMap_() {
  var map = {};
  try {
    getSheetData_('M_KLASIFIKASI').forEach(function (m) {
      var kode = String(m.kode_klasifikasi || '').trim();
      if (!kode) return;
      map[kode] = {
        uraian: String(m.uraian || '').trim(),
        retensi_aktif_th: Number(m.retensi_aktif_th) || 0,
        retensi_inaktif_th: Number(m.retensi_inaktif_th) || 0,
        tindakan_akhir: CoreLib.normStr(m.tindakan_akhir) || 'musnah'
      };
    });
  } catch (e) { }
  return map;
}

/**
 * Map pejabat_id → {pegawai_id, unit_id, nama_unit}
 * Butuh M_PEJABAT + SIMPEG PEGAWAI + UNIT_KERJA
 */
function _lapPejabatUnitMap_() {
  var out = {};
  var pegawaiMap = {}; // pegawai_id → unit_id
  var unitNameMap = {}; // unit_id → nama_unit
  try {
    getSheetData_('PEGAWAI').forEach(function (p) {
      var pid = CoreLib.normId(p.pegawai_id || p.id);
      var uid = CoreLib.normId(p.unit_id || '');
      if (pid && uid) pegawaiMap[pid] = uid;
    });
  } catch (e) { pegawaiMap = {}; }
  try {
    getSheetData_('UNIT_KERJA').forEach(function (u) {
      var uid = CoreLib.normId(u.unit_id || u.id);
      var nama = String(u.nama_unit || u.unit_id || '').trim();
      if (uid) unitNameMap[uid] = nama;
    });
  } catch (e) { unitNameMap = {}; }

  try {
    getSheetData_('M_PEJABAT').forEach(function (pj) {
      var id = String(pj.id || '').trim();
      if (!id) return;
      var pegawaiId = CoreLib.normId(pj.pegawai_id || '');
      var unitId = pegawaiMap[pegawaiId] || '';
      var namaUnit = unitNameMap[unitId] || (unitId ? unitId : 'Tidak diketahui');
      out[id] = {
        pegawai_id: pegawaiId,
        unit_id: unitId,
        nama_unit: namaUnit
      };
    });
  } catch (e) { }
  return { pejabatMap: out, pegawaiMap: pegawaiMap, unitNameMap: unitNameMap };
}

// ==================== §2 L4 — REKAP PER KLASIFIKASI ====================

/**
 * L4: Rekap surat per klasifikasi — tabel lengkap (bukan top-5).
 * params: { tahun?: 'YYYY', search?: string }
 * Return: { success, data: { tahun, rekap: [{kode, uraian, jml_masuk, jml_keluar, total, pct}], total_masuk, total_keluar, total_all } }
 */
function lapRekapKlasifikasi_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();
    var q = CoreLib.normStr(params.search || '');

    var klasMap = _lapKlasMap_();

    var sm = getSheetData_('T_SURAT_MASUK');
    var sk = getSheetData_('T_SURAT_KELUAR');

    if (/^\d{4}$/.test(tahun)) {
      sm = _lapFilterTahun_(sm, ['tanggal_terima', 'tgl_registrasi'], tahun);
      sk = _lapFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat'], tahun);
    }

    var tally = {}; // kode → {masuk, keluar}
    function inc(kode, jenis) {
      kode = String(kode || '').trim();
      if (!kode) return;
      if (!tally[kode]) tally[kode] = { masuk: 0, keluar: 0 };
      tally[kode][jenis]++;
    }
    sm.forEach(function (r) { inc(r.kode_klasifikasi, 'masuk'); });
    sk.forEach(function (r) { inc(r.kode_klasifikasi, 'keluar'); });

    var totalMasuk = sm.length;
    var totalKeluar = sk.length;
    var totalAll = totalMasuk + totalKeluar;

    var rekap = Object.keys(tally).map(function (kode) {
      var t = tally[kode];
      var total = t.masuk + t.keluar;
      var pct = totalAll ? Math.round((total / totalAll) * 10000) / 100 : 0;
      var info = klasMap[kode] || { uraian: '' };
      return {
        kode_klasifikasi: kode,
        uraian: info.uraian || '',
        jml_masuk: t.masuk,
        jml_keluar: t.keluar,
        total: total,
        pct: pct
      };
    });

    // filter search
    if (q) {
      rekap = rekap.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['kode_klasifikasi', 'uraian']);
      });
    }

    // sort total desc
    rekap.sort(function (a, b) { return b.total - a.total; });

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        rekap: rekap,
        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        total_all: totalAll
      }
    };
  } catch (err) {
    Logger.log('[lapRekapKlasifikasi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 L5 — REKAP PER UNIT ====================

/**
 * L5: Rekap per unit kerja — disposisi per bidang + surat keluar per unit penandatangan.
 * params: { tahun?: 'YYYY' }
 * Return: { success, data: { tahun, disposisi_per_unit: [{unit_id,nama_unit,jumlah,pct}], keluar_per_unit: [...], total_disposisi, total_keluar } }
 */
function lapRekapUnit_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var maps = _lapPejabatUnitMap_();
    var pejabatMap = maps.pejabatMap;

    var dp = getSheetData_('T_DISPOSISI');
    var sk = getSheetData_('T_SURAT_KELUAR');

    if (/^\d{4}$/.test(tahun)) {
      dp = _lapFilterTahun_(dp, ['tgl_disposisi'], tahun);
      sk = _lapFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat'], tahun);
    }

    // Tally disposisi per unit
    var tallyDp = {}; // nama_unit → jumlah
    var tallyDpById = {}; // unit_id → {nama_unit,jumlah}
    dp.forEach(function (d) {
      var ke = String(d.ke_pejabat_id || '').trim();
      var info = pejabatMap[ke];
      var unitId = info ? info.unit_id : '';
      var namaUnit = info ? info.nama_unit : 'Tidak diketahui';
      if (!namaUnit) namaUnit = 'Tidak diketahui';
      var key = unitId || namaUnit;
      if (!tallyDpById[key]) tallyDpById[key] = { unit_id: unitId, nama_unit: namaUnit, jumlah: 0 };
      tallyDpById[key].jumlah++;
      tallyDp[namaUnit] = (tallyDp[namaUnit] || 0) + 1;
    });

    // Tally surat keluar per unit penandatangan
    var tallySkById = {};
    sk.forEach(function (r) {
      var pjId = String(r.penandatangan_id || '').trim();
      var info = pejabatMap[pjId];
      var unitId = info ? info.unit_id : '';
      var namaUnit = info ? info.nama_unit : 'Tidak diketahui';
      if (!namaUnit) namaUnit = 'Tidak diketahui';
      var key = unitId || namaUnit;
      if (!tallySkById[key]) tallySkById[key] = { unit_id: unitId, nama_unit: namaUnit, jumlah: 0 };
      tallySkById[key].jumlah++;
    });

    var totalDp = dp.length;
    var totalSk = sk.length;

    function mapToSorted(objMap, total) {
      var arr = Object.keys(objMap).map(function (k) {
        var o = objMap[k];
        var pct = total ? Math.round((o.jumlah / total) * 10000) / 100 : 0;
        return { unit_id: o.unit_id || '', nama_unit: o.nama_unit, jumlah: o.jumlah, pct: pct };
      });
      arr.sort(function (a, b) { return b.jumlah - a.jumlah; });
      return arr;
    }

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        disposisi_per_unit: mapToSorted(tallyDpById, totalDp),
        keluar_per_unit: mapToSorted(tallySkById, totalSk),
        total_disposisi: totalDp,
        total_keluar: totalSk
      }
    };
  } catch (err) {
    Logger.log('[lapRekapUnit_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 L11 — KEPATUHAN JRA TAHUNAN ====================

/**
 * L11: Laporan Kepatuhan JRA Tahunan
 * params: { tahun?: 'YYYY' } — default tahun berjalan WIB
 * Return: { success, data: { tahun, total, patuh, tidak_patuh, pct_patuh, rincian_tidak_patuh: [...] } }
 */
function lapKepatuhanJra_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();
    if (!/^\d{4}$/.test(tahun)) {
      tahun = CoreLib.todayIsoLocal().slice(0, 4);
    }

    var klasMap = _lapKlasMap_();
    var arsip = getSheetData_('T_ARSIP');
    arsip = _lapFilterTahun_(arsip, ['tgl_arsip'], tahun);

    var patuh = 0;
    var tidakPatuhList = [];

    arsip.forEach(function (a) {
      var kode = String(a.kode_klasifikasi || '').trim();
      var tglArsip = CoreLib.dateKey10(a.tgl_arsip);
      var tglHabis = CoreLib.dateKey10(a.tgl_retensi_habis);
      var status = CoreLib.normStr(a.status_arsip);
      var info = klasMap[kode];

      var patuhRetensi = true;
      var patuhStatus = true;
      var catatan = [];

      if (info && tglArsip) {
        var expectedHabis = '';
        try {
          // reuse arHitungRetensiHabis_ dari 07_KearsipanApi.gs (global)
          if (typeof arHitungRetensiHabis_ === 'function') {
            expectedHabis = arHitungRetensiHabis_(tglArsip, kode);
          } else {
            var th = (Number(info.retensi_aktif_th) || 0) + (Number(info.retensi_inaktif_th) || 0);
            var d = new Date(tglArsip + 'T00:00:00Z');
            d.setUTCFullYear(d.getUTCFullYear() + th);
            expectedHabis = CoreLib.dateKey10(d);
          }
        } catch (e) { expectedHabis = ''; }
        if (expectedHabis && tglHabis && expectedHabis !== tglHabis) {
          patuhRetensi = false;
          catatan.push('Retensi habis seharusnya ' + expectedHabis + ', tercatat ' + tglHabis);
        }
      }

      if (info) {
        var ta = CoreLib.normStr(info.tindakan_akhir);
        if (ta === 'permanen' && status === 'musnah') {
          patuhStatus = false;
          catatan.push('Tindakan akhir permanen tapi status musnah');
        }
        if (ta === 'musnah' && status === 'permanen') {
          patuhStatus = false;
          catatan.push('Tindakan akhir musnah tapi status permanen');
        }
      }

      var isPatuh = patuhRetensi && patuhStatus;
      if (isPatuh) {
        patuh++;
      } else {
        tidakPatuhList.push({
          id: a.id,
          judul: a.judul || '',
          kode_klasifikasi: kode,
          tgl_arsip: tglArsip,
          tgl_retensi_habis: tglHabis,
          status_arsip: status,
          tindakan_akhir: info ? info.tindakan_akhir : '',
          alasan: catatan.join('; '),
          patuh_retensi: patuhRetensi,
          patuh_status: patuhStatus
        });
      }
    });

    var total = arsip.length;
    var tidakPatuh = total - patuh;
    var pctPatuh = total ? Math.round((patuh / total) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        tahun: tahun,
        total: total,
        patuh: patuh,
        tidak_patuh: tidakPatuh,
        pct_patuh: pctPatuh,
        rincian_tidak_patuh: tidakPatuhList.slice(0, 100) // batasi 100 untuk payload
      }
    };
  } catch (err) {
    Logger.log('[lapKepatuhanJra_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 SELF-CHECK ====================

function testLaporanRekapSelfCheck() {
  Logger.log('=== 13_LaporanRekapApi.gs v1.5 self-check ===');
  var admin = { role: 'admin', email: 'test@test.com' };

  var r1 = lapRekapKlasifikasi_({}, admin);
  Logger.log((r1 && r1.success ? '✅' : '❌') + ' lapRekapKlasifikasi_ — total=' + (r1.data ? r1.data.total_all : '-') + ', rekap=' + (r1.data ? r1.data.rekap.length : '-'));

  var r2 = lapRekapUnit_({}, admin);
  Logger.log((r2 && r2.success ? '✅' : '❌') + ' lapRekapUnit_ — disposisi=' + (r2.data ? r2.data.total_disposisi : '-') + ', keluar=' + (r2.data ? r2.data.total_keluar : '-'));

  var r3 = lapKepatuhanJra_({ tahun: '2026' }, admin);
  Logger.log((r3 && r3.success ? '✅' : '❌') + ' lapKepatuhanJra_ 2026 — total=' + (r3.data ? r3.data.total : '-') + ', patuh=' + (r3.data ? r3.data.pct_patuh + '%' : '-'));

  Logger.log('=== Selesai ===');
}
