// ============================================================
// SI-ARSIP - 08_PencarianApi.gs (v1.1.0 — CoreLib-First, Fase 2)
// ============================================================
// FR-34: search_all — pencarian lintas T_SURAT_MASUK,
// T_SURAT_KELUAR, T_NASKAH_DINAS, T_ARSIP dengan CoreLib.matchSearch
// pada field relevan. Filter jenis/tahun/kode_klasifikasi,
// sort tanggal desc, limit 50.
// ============================================================

function searchAll_(params, user) {
  try {
    params = params || {};
    var q     = CoreLib.normStr(params.q || params.search);
    var jenis = CoreLib.normStr(params.jenis);      // '' = semua
    var tahun = String(params.tahun || '').trim();
    var kode  = String(params.kode_klasifikasi || '').trim();

    if (!q && !jenis && !tahun && !kode) {
      return { success: true, data: [], total: 0,
               message: 'Isi kata kunci atau filter untuk mencari.' };
    }

    var rows = [];

    function push(jenisKey, r, tanggal, judul, keterangan, kodeKlas, status) {
      if (jenis && jenis !== jenisKey) return;
      var kunciTgl = CoreLib.dateKey10(tanggal) || '';
      if (tahun && kunciTgl.slice(0, 4) !== tahun) return;
      if (kode && String(kodeKlas || '').trim() !== kode) return;
      rows.push({
        jenis: jenisKey,
        id: r.id,
        tanggal: kunciTgl,
        judul: judul || '',
        keterangan: keterangan || '',
        kode_klasifikasi: kodeKlas || '',
        status: status || ''
      });
    }

    // T1 — surat masuk
    getSheetData_('T_SURAT_MASUK').forEach(function (r) {
      if (q && !CoreLib.matchSearch(r, q, ['nomor_agenda_masuk', 'nomor_surat', 'asal', 'perihal', 'catatan'])) return;
      push('surat_masuk', r, r.tanggal_terima || r.tgl_registrasi,
           r.perihal, (r.asal || '') + ' · ' + (r.nomor_agenda_masuk || ''), r.kode_klasifikasi, r.status_surat);
    });

    // T2 — surat keluar
    getSheetData_('T_SURAT_KELUAR').forEach(function (r) {
      if (q && !CoreLib.matchSearch(r, q, ['nomor_surat', 'tujuan', 'perihal', 'catatan'])) return;
      push('surat_keluar', r, r.tanggal_surat || r.tgl_dibuat,
           r.perihal, (r.tujuan || '') + ' · ' + (r.nomor_surat || ''), r.kode_klasifikasi, r.status_surat);
    });

    // T3 — naskah dinas
    getSheetData_('T_NASKAH_DINAS').forEach(function (r) {
      if (q && !CoreLib.matchSearch(r, q, ['nomor_naskah', 'perihal', 'tujuan', 'isi'])) return;
      push('naskah_dinas', r, r.tanggal,
           r.perihal, (r.jenis_naskah || '') + ' · ' + (r.nomor_naskah || ''), r.kode_klasifikasi, r.status_naskah);
    });

    // T5 — arsip
    getSheetData_('T_ARSIP').forEach(function (r) {
      if (q && !CoreLib.matchSearch(r, q, ['judul', 'kode_klasifikasi', 'lokasi_fisik', 'catatan'])) return;
      push('arsip', r, r.tgl_arsip,
           r.judul, (r.jenis_asal || '') + ' · ' + (r.lokasi_fisik || 'tanpa lokasi'), r.kode_klasifikasi, r.status_arsip);
    });

    rows.sort(function (a, b) { return b.tanggal < a.tanggal ? -1 : (b.tanggal > a.tanggal ? 1 : 0); });
    rows = rows.slice(0, 50);
    return { success: true, data: rows, total: rows.length };
  } catch (err) {
    Logger.log('[searchAll_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function testPencarianSelfCheck() {
  Logger.log('=== 08_PencarianApi.gs v1.1.0 self-check ===');
  var r = searchAll_({ q: 'a' }, { role: 'viewer' });
  Logger.log((r && r.success ? '✅' : '❌') + ' search_all q="a" — ' + ((r.data || []).length) + ' baris (limit 50)');
  var kosong = searchAll_({}, { role: 'viewer' });
  Logger.log((kosong && kosong.success && kosong.data.length === 0 ? '✅' : '❌') + ' tanpa param = kosong (tidak membocorkan semua isi)');
  Logger.log('=== Selesai ===');
}
