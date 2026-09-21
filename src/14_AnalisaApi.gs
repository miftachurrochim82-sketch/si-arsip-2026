// ============================================================
// SI-ARSIP - 14_AnalisaApi.gs (v1.6 — A3/A4/A5)
// ------------------------------------------------------------
// Domain Analisa — menutup 3 backlog Analisa:
//   A3 Distribusi per Unit Kerja (Pimpinan, 4×/th, 3j, skor 14)
//   A4 Top Pengirim/Penerima Surat (Staf analisa, 4×/th, 2j, skor 12)
//   A5 Beban Kerja per Pejabat (disposisi) (Pimpinan, 12×/th, 1j, skor 18)
// Handler: analisa_distribusi_unit, analisa_top_pengirim, analisa_beban_pejabat
// Level: viewer
// ============================================================

// ==================== §1 HELPER ====================

// Reuse pejabat→unit map dari 13_LaporanRekapApi.gs (global)
function _analisaPejabatMap_() {
  try {
    if (typeof _lapPejabatUnitMap_ === 'function') return _lapPejabatUnitMap_();
  } catch (e) { }
  // fallback minimal
  var out = {};
  try {
    getSheetData_('M_PEJABAT').forEach(function (pj) {
      out[String(pj.id)] = { nama_unit: String(pj.id), unit_id: '', pegawai_id: String(pj.pegawai_id || '') };
    });
  } catch (e) { }
  return { pejabatMap: out };
}

function _analisaFilterTahun_(rows, fields, tahun) {
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

// ==================== §2 A3 — DISTRIBUSI PER UNIT KERJA ====================

/**
 * A3: Distribusi per Unit Kerja — analisa beban per bidang.
 * params: { tahun?: 'YYYY' }
 * Return: { success, data: { tahun, distribusi: [{unit_id,nama_unit,jml_disposisi,jml_keluar,total,pct}], total_disposisi, total_keluar, chart: {labels, disposisi, keluar} } }
 * Beda dengan L5 (Laporan): A3 fokus evaluasi distribusi kerja (chart + pct), L5 fokus rekap administratif.
 */
function analisaDistribusiUnit_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    // Reuse L5 logic tapi output chart-ready
    var r = (typeof lapRekapUnit_ === 'function') ? lapRekapUnit_({ tahun: tahun }, user) : { success: false };
    if (!r || !r.success) {
      return { success: false, code: 'BAD_REQUEST', error: 'Gagal hitung rekap unit (L5 dependency).' };
    }
    var d = r.data;

    // Merge disposisi + keluar per unit untuk analisa total beban
    var mergeMap = {}; // nama_unit → {unit_id,nama_unit,jml_disposisi,jml_keluar,total}
    (d.disposisi_per_unit || []).forEach(function (u) {
      var key = u.unit_id || u.nama_unit;
      if (!mergeMap[key]) mergeMap[key] = { unit_id: u.unit_id, nama_unit: u.nama_unit, jml_disposisi: 0, jml_keluar: 0, total: 0 };
      mergeMap[key].jml_disposisi = u.jumlah;
    });
    (d.keluar_per_unit || []).forEach(function (u) {
      var key = u.unit_id || u.nama_unit;
      if (!mergeMap[key]) mergeMap[key] = { unit_id: u.unit_id, nama_unit: u.nama_unit, jml_disposisi: 0, jml_keluar: 0, total: 0 };
      mergeMap[key].jml_keluar = u.jumlah;
    });
    var distribusi = Object.keys(mergeMap).map(function (k) {
      var o = mergeMap[k];
      o.total = o.jml_disposisi + o.jml_keluar;
      return o;
    });
    // pct dari total beban
    var totalAll = distribusi.reduce(function (acc, x) { return acc + x.total; }, 0);
    distribusi.forEach(function (x) {
      x.pct = totalAll ? Math.round((x.total / totalAll) * 10000) / 100 : 0;
    });
    distribusi.sort(function (a, b) { return b.total - a.total; });

    // chart data top 8
    var top = distribusi.slice(0, 8);
    var chart = {
      labels: top.map(function (x) { return x.nama_unit; }),
      disposisi: top.map(function (x) { return x.jml_disposisi; }),
      keluar: top.map(function (x) { return x.jml_keluar; }),
      total: top.map(function (x) { return x.total; })
    };

    return {
      success: true,
      data: {
        tahun: d.tahun,
        distribusi: distribusi,
        total_disposisi: d.total_disposisi,
        total_keluar: d.total_keluar,
        total_all: totalAll,
        chart: chart
      }
    };
  } catch (err) {
    Logger.log('[analisaDistribusiUnit_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 A4 — TOP PENGIRIM / PENERIMA ====================

/**
 * A4: Top Pengirim / Penerima Surat — relasi antar-instansi.
 * params: { tahun?: 'YYYY', limit?: 10 }
 * Return: { success, data: { tahun, pengirim_top: [{asal,jumlah,pct}], penerima_top: [{tujuan,jumlah,pct}], total_masuk, total_keluar } }
 */
function analisaTopPengirim_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();
    var limit = Number(params.limit) || 10;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    var sm = getSheetData_('T_SURAT_MASUK');
    var sk = getSheetData_('T_SURAT_KELUAR');

    if (/^\d{4}$/.test(tahun)) {
      sm = _analisaFilterTahun_(sm, ['tanggal_terima', 'tgl_registrasi'], tahun);
      sk = _analisaFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat'], tahun);
    }

    // Tally asal
    var tallyAsal = {};
    sm.forEach(function (r) {
      var asal = String(r.asal || '').trim();
      if (!asal) asal = 'Tidak diketahui';
      tallyAsal[asal] = (tallyAsal[asal] || 0) + 1;
    });
    var totalMasuk = sm.length;
    var pengirimTop = Object.keys(tallyAsal).map(function (k) {
      return { asal: k, jumlah: tallyAsal[k], pct: totalMasuk ? Math.round((tallyAsal[k] / totalMasuk) * 10000) / 100 : 0 };
    }).sort(function (a, b) { return b.jumlah - a.jumlah; }).slice(0, limit);

    // Tally tujuan
    var tallyTujuan = {};
    sk.forEach(function (r) {
      var t = String(r.tujuan || '').trim();
      if (!t) t = 'Tidak diketahui';
      tallyTujuan[t] = (tallyTujuan[t] || 0) + 1;
    });
    var totalKeluar = sk.length;
    var penerimaTop = Object.keys(tallyTujuan).map(function (k) {
      return { tujuan: k, jumlah: tallyTujuan[k], pct: totalKeluar ? Math.round((tallyTujuan[k] / totalKeluar) * 10000) / 100 : 0 };
    }).sort(function (a, b) { return b.jumlah - a.jumlah; }).slice(0, limit);

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        pengirim_top: pengirimTop,
        penerima_top: penerimaTop,
        total_masuk: totalMasuk,
        total_keluar: totalKeluar
      }
    };
  } catch (err) {
    Logger.log('[analisaTopPengirim_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 A5 — BEBAN KERJA PER PEJABAT ====================

/**
 * A5: Beban Kerja per Pejabat (disposisi) — evaluasi rotasi/penambahan.
 * params: { tahun?: 'YYYY' }
 * Return: { success, data: { tahun, beban: [{pejabat_id,nama_pejabat,nama_jabatan,nama_unit,jml_diteruskan,jml_diproses,jml_selesai,jml_lewat_sla,total,avg_hari_selesai,pct}], total_disposisi } }
 */
function analisaBebanPejabat_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var maps = _analisaPejabatMap_();
    var pejabatMap = maps.pejabatMap || {};
    var unitNameMap = maps.unitNameMap || {};

    // Lookup nama pejabat & jabatan via SIMPEG
    var pegawaiNameMap = {};
    var jabatanNameMap = {};
    try {
      getSheetData_('PEGAWAI').forEach(function (p) {
        var pid = CoreLib.normId(p.pegawai_id || p.id);
        if (pid) pegawaiNameMap[pid] = String(p.nama || p.nama_lengkap || pid);
      });
    } catch (e) { }
    try {
      getSheetData_('JABATAN').forEach(function (j) {
        var jid = CoreLib.normId(j.jabatan_id || j.id);
        if (jid) jabatanNameMap[jid] = String(j.nama_jabatan || j.nama || jid);
      });
    } catch (e) { }
    var pejabatDetailMap = {}; // pejabat_id → {pegawai_id,jabatan_id}
    try {
      getSheetData_('M_PEJABAT').forEach(function (pj) {
        pejabatDetailMap[String(pj.id)] = { pegawai_id: CoreLib.normId(pj.pegawai_id || ''), jabatan_id: CoreLib.normId(pj.jabatan_id || '') };
      });
    } catch (e) { }

    var dp = getSheetData_('T_DISPOSISI');
    if (/^\d{4}$/.test(tahun)) {
      dp = _analisaFilterTahun_(dp, ['tgl_disposisi'], tahun);
    }

    var tally = {}; // pejabat_id → {diteruskan,diproses,selesai,lewat_sla,total, hari_selesai_list}
    dp.forEach(function (d) {
      var ke = String(d.ke_pejabat_id || '').trim();
      if (!ke) return;
      if (!tally[ke]) tally[ke] = { diteruskan: 0, diproses: 0, selesai: 0, lewat_sla: 0, total: 0, hari_list: [] };
      var st = CoreLib.normStr(d.status_disposisi) || 'diteruskan';
      if (tally[ke][st] !== undefined) tally[ke][st]++;
      else tally[ke].diteruskan++;
      tally[ke].total++;

      if (dpIsLewatSla_(d)) tally[ke].lewat_sla++;

      // avg hari selesai: tgl_selesai - tgl_disposisi
      if (st === 'selesai') {
        var t1 = CoreLib.dateKey10(d.tgl_disposisi);
        var t2 = CoreLib.dateKey10(d.tgl_selesai);
        if (t1 && t2) {
          try {
            var d1 = new Date(t1 + 'T00:00:00Z');
            var d2 = new Date(t2 + 'T00:00:00Z');
            var diff = Math.round((d2 - d1) / 86400000);
            if (diff >= 0 && diff < 365) tally[ke].hari_list.push(diff);
          } catch (e) { }
        }
      }
    });

    var totalDp = dp.length;
    var beban = Object.keys(tally).map(function (pejId) {
      var t = tally[pejId];
      var detail = pejabatDetailMap[pejId] || { pegawai_id: '', jabatan_id: '' };
      var infoUnit = pejabatMap[pejId] || { nama_unit: 'Tidak diketahui', unit_id: '' };
      var namaPejabat = pegawaiNameMap[detail.pegawai_id] || detail.pegawai_id || pejId;
      var namaJabatan = jabatanNameMap[detail.jabatan_id] || detail.jabatan_id || '';
      var avgHari = 0;
      if (t.hari_list.length) {
        var sum = t.hari_list.reduce(function (a, b) { return a + b; }, 0);
        avgHari = Math.round((sum / t.hari_list.length) * 10) / 10;
      }
      var pct = totalDp ? Math.round((t.total / totalDp) * 10000) / 100 : 0;
      return {
        pejabat_id: pejId,
        nama_pejabat: namaPejabat,
        nama_jabatan: namaJabatan,
        nama_unit: infoUnit.nama_unit || 'Tidak diketahui',
        unit_id: infoUnit.unit_id || '',
        jml_diteruskan: t.diteruskan,
        jml_diproses: t.diproses,
        jml_selesai: t.selesai,
        jml_lewat_sla: t.lewat_sla,
        total: t.total,
        avg_hari_selesai: avgHari,
        pct: pct
      };
    });
    beban.sort(function (a, b) { return b.total - a.total; });

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        beban: beban,
        total_disposisi: totalDp
      }
    };
  } catch (err) {
    Logger.log('[analisaBebanPejabat_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 SELF-CHECK ====================

function testAnalisaSelfCheck() {
  Logger.log('=== 14_AnalisaApi.gs v1.6 self-check ===');
  var admin = { role: 'admin', email: 'test@test.com' };

  var r3 = analisaDistribusiUnit_({}, admin);
  Logger.log((r3 && r3.success ? '✅' : '❌') + ' analisaDistribusiUnit_ — total_all=' + (r3.data ? r3.data.total_all : '-') + ', distribusi=' + (r3.data ? r3.data.distribusi.length : '-'));

  var r4 = analisaTopPengirim_({ limit: 5 }, admin);
  Logger.log((r4 && r4.success ? '✅' : '❌') + ' analisaTopPengirim_ — masuk=' + (r4.data ? r4.data.total_masuk : '-') + ', keluar=' + (r4.data ? r4.data.total_keluar : '-') + ', top pengirim=' + (r4.data ? r4.data.pengirim_top.length : '-'));

  var r5 = analisaBebanPejabat_({}, admin);
  Logger.log((r5 && r5.success ? '✅' : '❌') + ' analisaBebanPejabat_ — total=' + (r5.data ? r5.data.total_disposisi : '-') + ', beban=' + (r5.data ? r5.data.beban.length : '-'));

  Logger.log('=== Selesai ===');
}
