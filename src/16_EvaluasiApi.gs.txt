// ============================================================
// SI-ARSIP - 16_EvaluasiApi.gs (v1.8 — E1-E8)
// ------------------------------------------------------------
// Domain Evaluasi — menutup 8 backlog Evaluasi:
//   E1 Kepatuhan SLA Disposisi (skor 19, PARTIAL→FULL)
//   E2 Kepatuhan SLA Surat Keluar (skor 19)
//   E3 Kelengkapan Metadata Surat (skor 14)
//   E4 Kepatuhan Format Nomor Surat (skor 12)
//   E5 Kepatuhan JRA (skor 11, mirip L11 tapi per klasifikasi)
//   E6 Kepatuhan Prosedur Pemusnahan (skor 11)
//   E7 Kondisi Fisik Arsip (skor 12, placeholder karena field belum ada)
//   E8 Progress Alih Media (skor 14)
// Handler: evaluasi_sla_disposisi, evaluasi_sla_keluar, evaluasi_kelengkapan,
//          evaluasi_format_nomor, evaluasi_jra, evaluasi_musnah, evaluasi_fisik, evaluasi_alih_media
// ============================================================

// ==================== §1 HELPER ====================

function _evalFilterTahun_(rows, fields, tahun) {
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

function _evalKlasMap_() {
  try { if (typeof _lapKlasMap_ === 'function') return _lapKlasMap_(); } catch (e) {}
  var m = {};
  try {
    getSheetData_('M_KLASIFIKASI').forEach(function (k) {
      var kode = String(k.kode_klasifikasi || '').trim();
      if (kode) m[kode] = { uraian: String(k.uraian || ''), tindakan_akhir: CoreLib.normStr(k.tindakan_akhir) };
    });
  } catch (e) {}
  return m;
}

// ==================== §2 E1 — SLA DISPOSISI ====================

/**
 * E1: Kepatuhan SLA Disposisi — % tepat waktu.
 * params: { tahun?: 'YYYY' }
 * Return: { tahun, total, selesai, tepat_waktu, lewat, pct_patuh, pct_lewat, avg_telat_hari }
 */
function evaluasiSlaDisposisi_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var dp = getSheetData_('T_DISPOSISI');
    if (/^\d{4}$/.test(tahun)) dp = _evalFilterTahun_(dp, ['tgl_disposisi'], tahun);

    var total = dp.length;
    var selesai = 0, tepat = 0, lewat = 0;
    var telatList = [];

    dp.forEach(function (d) {
      var st = CoreLib.normStr(d.status_disposisi);
      if (st === 'selesai') selesai++;
      var isLewat = dpIsLewatSla_(d);
      if (st === 'selesai') {
        // cek apakah selesai sebelum jatuh_tempo
        var jt = CoreLib.dateKey10(d.jatuh_tempo);
        var ts = CoreLib.dateKey10(d.tgl_selesai);
        if (jt && ts) {
          if (ts <= jt) tepat++;
          else {
            lewat++;
            try {
              var diff = Math.round((new Date(ts + 'T00:00:00Z') - new Date(jt + 'T00:00:00Z')) / 86400000);
              if (diff > 0 && diff < 365) telatList.push(diff);
            } catch (e) {}
          }
        } else if (jt) {
          // selesai tapi tanpa tgl_selesai → anggap lewat jika isLewat
          if (isLewat) lewat++; else tepat++;
        }
      } else {
        // belum selesai tapi lewat SLA
        if (isLewat) lewat++;
      }
    });

    var pctPatuh = total ? Math.round((tepat / (selesai || 1)) * 10000) / 100 : 0;
    // alternatif pct patuh dari total disposisi yang tidak lewat
    var pctPatuhTotal = total ? Math.round(((total - lewat) / total) * 10000) / 100 : 0;
    var avgTelat = telatList.length ? Math.round((telatList.reduce(function (a, b) { return a + b; }, 0) / telatList.length) * 10) / 10 : 0;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total: total,
        selesai: selesai,
        tepat_waktu: tepat,
        lewat: lewat,
        pct_patuh_selesai: pctPatuh,
        pct_patuh_total: pctPatuhTotal,
        pct_lewat: total ? Math.round((lewat / total) * 10000) / 100 : 0,
        avg_telat_hari: avgTelat
      }
    };
  } catch (err) {
    Logger.log('[evaluasiSlaDisposisi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §3 E2 — SLA SURAT KELUAR ====================

/**
 * E2: Kepatuhan SLA Surat Keluar — draft → terkirim.
 * SLA default 3 hari (bisa diambil dari config sla_surat_keluar_hari jika ada).
 * params: { tahun?: 'YYYY' }
 */
function evaluasiSlaKeluar_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var sk = getSheetData_('T_SURAT_KELUAR').filter(function (r) {
      return CoreLib.normStr(r.status_surat) === 'terkirim';
    });
    if (/^\d{4}$/.test(tahun)) sk = _evalFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat', 'tgl_terkirim'], tahun);

    var slaHari = 3;
    try {
      var cfg = getConfigList_();
      if (cfg && cfg.success) {
        var item = (cfg.data || []).find(function (x) { return x.key === 'sla_surat_keluar_hari'; });
        if (item && Number(item.value)) slaHari = Number(item.value);
      }
    } catch (e) {}

    var total = sk.length;
    var patuh = 0, lewat = 0;
    var telatList = [];

    sk.forEach(function (r) {
      var tBuat = CoreLib.dateKey10(r.tgl_dibuat) || CoreLib.dateKey10(r.tanggal_surat);
      var tKirim = CoreLib.dateKey10(r.tgl_terkirim) || CoreLib.dateKey10(r.tanggal_surat);
      if (!tBuat || !tKirim) return;
      try {
        var diff = Math.round((new Date(tKirim + 'T00:00:00Z') - new Date(tBuat + 'T00:00:00Z')) / 86400000);
        if (diff <= slaHari) patuh++;
        else {
          lewat++;
          telatList.push(diff - slaHari);
        }
      } catch (e) {}
    });

    var pctPatuh = total ? Math.round((patuh / total) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total: total,
        patuh: patuh,
        lewat: lewat,
        pct_patuh: pctPatuh,
        pct_lewat: total ? Math.round((lewat / total) * 10000) / 100 : 0,
        sla_hari: slaHari,
        avg_telat_hari: telatList.length ? Math.round((telatList.reduce(function (a, b) { return a + b; }, 0) / telatList.length) * 10) / 10 : 0
      }
    };
  } catch (err) {
    Logger.log('[evaluasiSlaKeluar_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 E3 — KELENGKAPAN METADATA ====================

/**
 * E3: Kelengkapan Metadata Surat — cek field wajib kosong.
 * params: { tahun?: 'YYYY' }
 * Return: { tahun, total_masuk, lengkap_masuk, tidak_lengkap_masuk, pct_lengkap_masuk, rincian: [...], total_keluar, ... }
 */
function evaluasiKelengkapan_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var sm = getSheetData_('T_SURAT_MASUK');
    var sk = getSheetData_('T_SURAT_KELUAR');
    if (/^\d{4}$/.test(tahun)) {
      sm = _evalFilterTahun_(sm, ['tanggal_terima', 'tgl_registrasi'], tahun);
      sk = _evalFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat'], tahun);
    }

    function cekMasuk(r) {
      var missing = [];
      if (!String(r.nomor_surat || '').trim()) missing.push('nomor_surat');
      if (!String(r.asal || '').trim()) missing.push('asal');
      if (!String(r.perihal || '').trim()) missing.push('perihal');
      if (!String(r.kode_klasifikasi || '').trim()) missing.push('kode_klasifikasi');
      if (!CoreLib.dateKey10(r.tanggal_terima) && !CoreLib.dateKey10(r.tgl_registrasi)) missing.push('tanggal_terima');
      return missing;
    }
    function cekKeluar(r) {
      var missing = [];
      if (!String(r.nomor_surat || '').trim()) missing.push('nomor_surat');
      if (!String(r.tujuan || '').trim()) missing.push('tujuan');
      if (!String(r.perihal || '').trim()) missing.push('perihal');
      if (!String(r.kode_klasifikasi || '').trim()) missing.push('kode_klasifikasi');
      if (!String(r.penandatangan_id || '').trim()) missing.push('penandatangan_id');
      return missing;
    }

    var smTidakLengkap = [];
    sm.forEach(function (r) {
      var miss = cekMasuk(r);
      if (miss.length) smTidakLengkap.push({ id: r.id, nomor: r.nomor_agenda_masuk || r.nomor_surat || r.id, missing: miss });
    });
    var skTidakLengkap = [];
    sk.forEach(function (r) {
      var miss = cekKeluar(r);
      if (miss.length) skTidakLengkap.push({ id: r.id, nomor: r.nomor_surat || r.id, missing: miss });
    });

    var totalMasuk = sm.length;
    var totalKeluar = sk.length;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total_masuk: totalMasuk,
        tidak_lengkap_masuk: smTidakLengkap.length,
        lengkap_masuk: totalMasuk - smTidakLengkap.length,
        pct_lengkap_masuk: totalMasuk ? Math.round(((totalMasuk - smTidakLengkap.length) / totalMasuk) * 10000) / 100 : 0,
        rincian_masuk: smTidakLengkap.slice(0, 100),
        total_keluar: totalKeluar,
        tidak_lengkap_keluar: skTidakLengkap.length,
        lengkap_keluar: totalKeluar - skTidakLengkap.length,
        pct_lengkap_keluar: totalKeluar ? Math.round(((totalKeluar - skTidakLengkap.length) / totalKeluar) * 10000) / 100 : 0,
        rincian_keluar: skTidakLengkap.slice(0, 100)
      }
    };
  } catch (err) {
    Logger.log('[evaluasiKelengkapan_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §5 E4 — FORMAT NOMOR SURAT ====================

/**
 * E4: Kepatuhan Format Nomor Surat — cek regex Permendagri 78/2012.
 * Format keluar: <kode_klas>/<urut:3>/<kode_unit>/<tahun> → regex ^[^\/]+\/\d{3}\/[^\/]+\/\d{4}$
 * Format masuk agenda: <urut:3>/<kode_unit>/<tahun> → ^\d{3}\/[^\/]+\/\d{4}$
 * params: { tahun?: 'YYYY' }
 */
function evaluasiFormatNomor_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var sm = getSheetData_('T_SURAT_MASUK');
    var sk = getSheetData_('T_SURAT_KELUAR');
    if (/^\d{4}$/.test(tahun)) {
      sm = _evalFilterTahun_(sm, ['tanggal_terima', 'tgl_registrasi'], tahun);
      sk = _evalFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat'], tahun);
    }

    var reMasuk = /^\d{3}\/[^\/]+\/\d{4}$/;
    var reKeluar = /^[^\/]+\/\d{3}\/[^\/]+\/\d{4}$/;

    var smTidakPatuh = [];
    sm.forEach(function (r) {
      var nomor = String(r.nomor_agenda_masuk || '').trim();
      if (!nomor) return; // skip jika belum ada
      if (!reMasuk.test(nomor)) smTidakPatuh.push({ id: r.id, nomor: nomor, jenis: 'agenda_masuk' });
    });
    var skTidakPatuh = [];
    sk.forEach(function (r) {
      var nomor = String(r.nomor_surat || '').trim();
      if (!nomor) return;
      if (!reKeluar.test(nomor)) skTidakPatuh.push({ id: r.id, nomor: nomor, jenis: 'surat_keluar' });
    });

    var totalMasuk = sm.filter(function (r) { return String(r.nomor_agenda_masuk || '').trim(); }).length;
    var totalKeluar = sk.filter(function (r) { return String(r.nomor_surat || '').trim(); }).length;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total_masuk: totalMasuk,
        tidak_patuh_masuk: smTidakPatuh.length,
        patuh_masuk: totalMasuk - smTidakPatuh.length,
        pct_patuh_masuk: totalMasuk ? Math.round(((totalMasuk - smTidakPatuh.length) / totalMasuk) * 10000) / 100 : 0,
        rincian_masuk: smTidakPatuh.slice(0, 100),
        total_keluar: totalKeluar,
        tidak_patuh_keluar: skTidakPatuh.length,
        patuh_keluar: totalKeluar - skTidakPatuh.length,
        pct_patuh_keluar: totalKeluar ? Math.round(((totalKeluar - skTidakPatuh.length) / totalKeluar) * 10000) / 100 : 0,
        rincian_keluar: skTidakPatuh.slice(0, 100),
        format_masuk: 'NNN/KODE_UNIT/YYYY',
        format_keluar: 'KODE_KLAS/NNN/KODE_UNIT/YYYY'
      }
    };
  } catch (err) {
    Logger.log('[evaluasiFormatNomor_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 E5 — KEPATUHAN JRA ====================

/**
 * E5: Kepatuhan JRA — per klasifikasi (lebih detail dari L11).
 * params: { tahun?: 'YYYY' }
 * Return: { tahun, total, patuh, tidak_patuh, pct_patuh, per_klasifikasi: [{kode, total, patuh, tidak_patuh, pct_patuh}], rincian_tidak_patuh }
 */
function evaluasiJra_(params, user) {
  try {
    // Reuse L11 tapi tambahkan per klasifikasi
    var r = (typeof lapKepatuhanJra_ === 'function') ? lapKepatuhanJra_(params || {}, user) : null;
    if (!r || !r.success) {
      // fallback minimal
      return r || { success: false, code: 'BAD_REQUEST', error: 'L11 dependency gagal' };
    }
    var data = r.data;
    var tahun = String((params && params.tahun) || '').trim() || data.tahun;

    // Hitung per klasifikasi dari rincian + patuh implisit
    var perKlas = {};
    // total per klas dari T_ARSIP tahun tersebut
    var arsip = getSheetData_('T_ARSIP');
    if (/^\d{4}$/.test(tahun)) arsip = _evalFilterTahun_(arsip, ['tgl_arsip'], tahun);

    arsip.forEach(function (a) {
      var kode = String(a.kode_klasifikasi || '').trim() || 'Tanpa kode';
      if (!perKlas[kode]) perKlas[kode] = { kode_klasifikasi: kode, total: 0, tidak_patuh: 0 };
      perKlas[kode].total++;
    });
    (data.rincian_tidak_patuh || []).forEach(function (x) {
      var kode = String(x.kode_klasifikasi || '').trim() || 'Tanpa kode';
      if (!perKlas[kode]) perKlas[kode] = { kode_klasifikasi: kode, total: 0, tidak_patuh: 0 };
      perKlas[kode].tidak_patuh++;
    });
    var perKlasArr = Object.keys(perKlas).map(function (k) {
      var o = perKlas[k];
      var patuh = o.total - o.tidak_patuh;
      return {
        kode_klasifikasi: o.kode_klasifikasi,
        total: o.total,
        tidak_patuh: o.tidak_patuh,
        patuh: patuh,
        pct_patuh: o.total ? Math.round((patuh / o.total) * 10000) / 100 : 0
      };
    }).sort(function (a, b) { return b.tidak_patuh - a.tidak_patuh; });

    return {
      success: true,
      data: {
        tahun: data.tahun,
        total: data.total,
        patuh: data.patuh,
        tidak_patuh: data.tidak_patuh,
        pct_patuh: data.pct_patuh,
        per_klasifikasi: perKlasArr,
        rincian_tidak_patuh: data.rincian_tidak_patuh
      }
    };
  } catch (err) {
    Logger.log('[evaluasiJra_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §7 E6 — PROSEDUR PEMUSNAHAN ====================

/**
 * E6: Kepatuhan Prosedur Pemusnahan — cek arsip musnah tanpa BA & retensi habis belum diproses.
 * params: { tahun?: 'YYYY' }
 */
function evaluasiMusnah_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var arsip = getSheetData_('T_ARSIP');
    if (/^\d{4}$/.test(tahun)) arsip = _evalFilterTahun_(arsip, ['tgl_arsip'], tahun);

    var today = CoreLib.todayIsoLocal();

    var musnahTanpaBA = [];
    var retensiHabisBelumMusnah = [];
    var totalMusnah = 0;

    arsip.forEach(function (a) {
      var st = CoreLib.normStr(a.status_arsip);
      var cat = String(a.catatan || '').trim();
      if (st === 'musnah') {
        totalMusnah++;
        if (!cat || cat.toLowerCase().indexOf('ba') === -1 && cat.length < 5) {
          musnahTanpaBA.push({ id: a.id, judul: a.judul || '', catatan: cat, tgl_retensi_habis: CoreLib.dateKey10(a.tgl_retensi_habis) });
        }
      } else if (st === 'aktif' || st === 'inaktif') {
        var th = CoreLib.dateKey10(a.tgl_retensi_habis);
        if (th && th <= today) {
          retensiHabisBelumMusnah.push({ id: a.id, judul: a.judul || '', tgl_retensi_habis: th, status_arsip: st });
        }
      }
    });

    var total = arsip.length;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total: total,
        total_musnah: totalMusnah,
        musnah_tanpa_ba: musnahTanpaBA.length,
        rincian_tanpa_ba: musnahTanpaBA.slice(0, 100),
        retensi_habis_belum_musnah: retensiHabisBelumMusnah.length,
        rincian_belum_musnah: retensiHabisBelumMusnah.slice(0, 100),
        pct_ba_lengkap: totalMusnah ? Math.round(((totalMusnah - musnahTanpaBA.length) / totalMusnah) * 10000) / 100 : 0
      }
    };
  } catch (err) {
    Logger.log('[evaluasiMusnah_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §8 E7 — KONDISI FISIK ARSIP ====================

/**
 * E7: Kondisi Fisik Arsip — placeholder karena field kondisi_fisik belum ada di skema T_ARSIP.
 * Evaluasi berdasarkan lokasi_fisik terisi vs kosong sebagai proxy.
 * params: { tahun?: 'YYYY' }
 */
function evaluasiFisik_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var arsip = getSheetData_('T_ARSIP');
    if (/^\d{4}$/.test(tahun)) arsip = _evalFilterTahun_(arsip, ['tgl_arsip'], tahun);

    var total = arsip.length;
    var adaLokasi = 0, tanpaLokasi = 0;
    var rincianTanpa = [];

    arsip.forEach(function (a) {
      var lok = String(a.lokasi_fisik || '').trim();
      if (lok) adaLokasi++;
      else {
        tanpaLokasi++;
        rincianTanpa.push({ id: a.id, judul: a.judul || '', status_arsip: CoreLib.normStr(a.status_arsip) });
      }
    });

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total: total,
        ada_lokasi: adaLokasi,
        tanpa_lokasi: tanpaLokasi,
        pct_ada_lokasi: total ? Math.round((adaLokasi / total) * 10000) / 100 : 0,
        rincian_tanpa_lokasi: rincianTanpa.slice(0, 100),
        catatan: 'Field kondisi_fisik (baik/rusak) belum ada di skema T_ARSIP — evaluasi pakai lokasi_fisik sebagai proxy. Tambahkan kolom kondisi_fisik di ALL_SHEET_HEADERS untuk E7 penuh.',
        siap_kondisi_fisik: false
      }
    };
  } catch (err) {
    Logger.log('[evaluasiFisik_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §9 E8 — ALIH MEDIA ====================

/**
 * E8: Progress Alih Media (fisik → digital) — cek T_LAMPIRAN file_drive vs total dokumen.
 * params: { tahun?: 'YYYY' }
 */
function evaluasiAlihMedia_(params, user) {
  try {
    params = params || {};
    var tahun = String(params.tahun || '').trim();

    var sm = getSheetData_('T_SURAT_MASUK');
    var sk = getSheetData_('T_SURAT_KELUAR');
    var nd = getSheetData_('T_NASKAH_DINAS');
    var ar = getSheetData_('T_ARSIP');
    var lmp = getSheetData_('T_LAMPIRAN');

    if (/^\d{4}$/.test(tahun)) {
      sm = _evalFilterTahun_(sm, ['tanggal_terima', 'tgl_registrasi'], tahun);
      sk = _evalFilterTahun_(sk, ['tanggal_surat', 'tgl_dibuat'], tahun);
      nd = _evalFilterTahun_(nd, ['tanggal', 'created_at'], tahun);
      ar = _evalFilterTahun_(ar, ['tgl_arsip'], tahun);
      // lmp tidak filter tahun karena ikut dokumen
    }

    var totalDok = sm.length + sk.length + nd.length + ar.length;

    // hitung dokumen yang sudah ada file_drive
    var dokAdaFile = {};
    lmp.forEach(function (l) {
      if (CoreLib.normStr(l.jenis_bukti) === 'file_drive' || String(l.url || '').indexOf('drive.google.com') !== -1) {
        var did = String(l.dokumen_id || '').trim();
        if (did) dokAdaFile[did] = true;
      }
    });
    var totalSudahDigital = Object.keys(dokAdaFile).length;

    // per jenis
    function hitungSudah(list) {
      var c = 0;
      list.forEach(function (r) { if (dokAdaFile[String(r.id)]) c++; });
      return c;
    }

    var smDigital = hitungSudah(sm);
    var skDigital = hitungSudah(sk);
    var ndDigital = hitungSudah(nd);
    var arDigital = hitungSudah(ar);

    var pctOverall = totalDok ? Math.round((totalSudahDigital / totalDok) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        tahun: tahun || 'semua',
        total_dokumen: totalDok,
        sudah_digital: totalSudahDigital,
        belum_digital: totalDok - totalSudahDigital,
        pct_digital: pctOverall,
        per_jenis: {
          surat_masuk: { total: sm.length, digital: smDigital, pct: sm.length ? Math.round((smDigital / sm.length) * 10000) / 100 : 0 },
          surat_keluar: { total: sk.length, digital: skDigital, pct: sk.length ? Math.round((skDigital / sk.length) * 10000) / 100 : 0 },
          naskah_dinas: { total: nd.length, digital: ndDigital, pct: nd.length ? Math.round((ndDigital / nd.length) * 10000) / 100 : 0 },
          arsip: { total: ar.length, digital: arDigital, pct: ar.length ? Math.round((arDigital / ar.length) * 10000) / 100 : 0 }
        },
        total_lampiran_file: lmp.filter(function (l) { return CoreLib.normStr(l.jenis_bukti) === 'file_drive'; }).length
      }
    };
  } catch (err) {
    Logger.log('[evaluasiAlihMedia_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §10 SELF-CHECK ====================

function testEvaluasiSelfCheck() {
  Logger.log('=== 16_EvaluasiApi.gs v1.8 self-check ===');
  var admin = { role: 'admin', email: 'test@test.com' };

  var r1 = evaluasiSlaDisposisi_({}, admin);
  Logger.log((r1 && r1.success ? '✅' : '❌') + ' E1 SLA disposisi — total=' + (r1.data ? r1.data.total : '-') + ', pct_patuh_total=' + (r1.data ? r1.data.pct_patuh_total : '-') + '%');

  var r2 = evaluasiSlaKeluar_({}, admin);
  Logger.log((r2 && r2.success ? '✅' : '❌') + ' E2 SLA keluar — total=' + (r2.data ? r2.data.total : '-') + ', pct_patuh=' + (r2.data ? r2.data.pct_patuh : '-') + '%');

  var r3 = evaluasiKelengkapan_({}, admin);
  Logger.log((r3 && r3.success ? '✅' : '❌') + ' E3 kelengkapan — masuk tidak lengkap=' + (r3.data ? r3.data.tidak_lengkap_masuk : '-') + ', keluar tidak lengkap=' + (r3.data ? r3.data.tidak_lengkap_keluar : '-'));

  var r4 = evaluasiFormatNomor_({}, admin);
  Logger.log((r4 && r4.success ? '✅' : '❌') + ' E4 format nomor — masuk patuh=' + (r4.data ? r4.data.pct_patuh_masuk : '-') + '%, keluar patuh=' + (r4.data ? r4.data.pct_patuh_keluar : '-') + '%');

  var r5 = evaluasiJra_({ tahun: '2026' }, admin);
  Logger.log((r5 && r5.success ? '✅' : '❌') + ' E5 JRA — total=' + (r5.data ? r5.data.total : '-') + ', pct_patuh=' + (r5.data ? r5.data.pct_patuh : '-') + '%');

  var r6 = evaluasiMusnah_({}, admin);
  Logger.log((r6 && r6.success ? '✅' : '❌') + ' E6 musnah — total_musnah=' + (r6.data ? r6.data.total_musnah : '-') + ', tanpa BA=' + (r6.data ? r6.data.musnah_tanpa_ba : '-'));

  var r7 = evaluasiFisik_({}, admin);
  Logger.log((r7 && r7.success ? '✅' : '❌') + ' E7 fisik — total=' + (r7.data ? r7.data.total : '-') + ', ada lokasi=' + (r7.data ? r7.data.ada_lokasi : '-') + ' (' + (r7.data ? r7.data.pct_ada_lokasi : '-') + '%)');

  var r8 = evaluasiAlihMedia_({}, admin);
  Logger.log((r8 && r8.success ? '✅' : '❌') + ' E8 alih media — total_dok=' + (r8.data ? r8.data.total_dokumen : '-') + ', digital=' + (r8.data ? r8.data.sudah_digital : '-') + ' (' + (r8.data ? r8.data.pct_digital : '-') + '%)');

  Logger.log('=== Selesai ===');
}
