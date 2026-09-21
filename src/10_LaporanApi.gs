// ============================================================
// SI-ARSIP - 10_LaporanApi.gs (v1.3 — G27 TUTUP, 2026-09-21)
// ------------------------------------------------------------
// Export Excel multi-sheet laporan bulanan (FR-59):
//   - laporanBulanData_(ym)      → builder MURNI (mudah diuji):
//       { ym, sheets: [{ nama, rows: [[...]] }] }
//       Sheet: Ringkasan, Surat Masuk, Surat Keluar, Disposisi.
//   - exportExcelBulanan_(d, u)  → Spreadsheet sementara → blob xlsx
//       (UrlFetchApp ke URL export + token OAuth, TANPA advanced
//       service) → simpan ke folder Drive 'SI-ARSIP Export' →
//       spreadsheet sementara di-trash → { url, nama, ukuran_kb }.
//
// Aksi: laporan_export_excel (level 'user', 01_ConfigAndBridge).
// ============================================================

/**
 * Builder murni laporan bulanan. ym = 'YYYY-MM'.
 * Filter: sm → tanggal_terima (fallback tgl_registrasi),
 *         sk → tanggal_surat (fallback tgl_dibuat),
 *         dp → tgl_disposisi.
 */
function laporanBulanData_(ym) {
  ym = String(ym || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    throw new Error('Format bulan harus YYYY-MM, dapat: "' + ym + '".');
  }

  var sm = getSheetData_('T_SURAT_MASUK').filter(function (r) {
    return (CoreLib.dateKey10(r.tanggal_terima) || CoreLib.dateKey10(r.tgl_registrasi) || '').slice(0, 7) === ym;
  });
  var sk = getSheetData_('T_SURAT_KELUAR').filter(function (r) {
    return (CoreLib.dateKey10(r.tanggal_surat) || CoreLib.dateKey10(r.tgl_dibuat) || '').slice(0, 7) === ym;
  });
  var dp = getSheetData_('T_DISPOSISI').filter(function (r) {
    return (CoreLib.dateKey10(r.tgl_disposisi) || '').slice(0, 7) === ym;
  });
  var dpSla = dp.filter(function (r) { return dpIsLewatSla_(r); });
  var smKritis = sm.filter(function (r) { return smIsKritis_(r); });

  // ---------- Sheet 1: Ringkasan ----------
  var ringkasan = [
    ['Metrik', 'Nilai'],
    ['Periode (YYYY-MM)', ym],
    ['Surat masuk terdaftar', sm.length],
    ['Surat masuk kritis', smKritis.length],
    ['Surat keluar', sk.length],
    ['Disposisi dibuat', dp.length],
    ['Disposisi lewat SLA', dpSla.length]
  ];

  // ---------- Sheet 2: Surat Masuk ----------
  var smRows = [['Agenda', 'Nomor Surat', 'Tgl Terima', 'Asal', 'Perihal', 'Klasifikasi', 'Sifat', 'Status']];
  sm.forEach(function (r) {
    smRows.push([
      r.nomor_agenda_masuk || '', r.nomor_surat || '',
      CoreLib.dateKey10(r.tanggal_terima) || '', r.asal || '', r.perihal || '',
      r.kode_klasifikasi || '', r.sifat || '', r.status_surat || ''
    ]);
  });

  // ---------- Sheet 3: Surat Keluar ----------
  var skRows = [['Nomor Surat', 'Tgl Surat', 'Tujuan', 'Perihal', 'Klasifikasi', 'Status']];
  sk.forEach(function (r) {
    skRows.push([
      r.nomor_surat || '', CoreLib.dateKey10(r.tanggal_surat) || '',
      r.tujuan || '', r.perihal || '', r.kode_klasifikasi || '', r.status_surat || ''
    ]);
  });

  // ---------- Sheet 4: Disposisi ----------
  var dpRows = [['Tgl Disposisi', 'Surat Induk', 'Pejabat Tujuan', 'Instruksi', 'Tenggat', 'Status']];
  dp.forEach(function (r) {
    dpRows.push([
      CoreLib.dateKey10(r.tgl_disposisi) || '', r.surat_id || '',
      r.ke_pejabat_id || '', r.instruksi || '',
      CoreLib.dateKey10(r.jatuh_tempo) || '', r.status_disposisi || ''
    ]);
  });

  return {
    ym: ym,
    sheets: [
      { nama: 'Ringkasan',    rows: rectRows_(ringkasan) },
      { nama: 'Surat Masuk',  rows: rectRows_(smRows) },
      { nama: 'Surat Keluar', rows: rectRows_(skRows) },
      { nama: 'Disposisi',    rows: rectRows_(dpRows) }
    ]
  };
}

/** Pad setiap baris agar persegi (syarat setValues). */
function rectRows_(rows) {
  if (!rows || !rows.length) return [['-']];
  var w = rows[0].length;
  return rows.map(function (r) {
    var out = (r || []).slice(0, w);
    while (out.length < w) out.push('');
    return out;
  });
}

/**
 * Handler laporan_export_excel: { ym } → file xlsx di Drive.
 */
function exportExcelBulanan_(data, user) {
  try {
    var ym = String((data && data.ym) || '').slice(0, 7);
    var rep = laporanBulanData_(ym);   // lempar Error bila ym buruk

    var tmp = SpreadsheetApp.create('TMP_SIARSIP_LAP_' + ym.replace('-', ''));
    try {
      rep.sheets.forEach(function (sh, i) {
        var ws = (i === 0) ? tmp.getSheets()[0] : tmp.insertSheet(sh.nama);
        ws.setName(sh.nama);
        if (sh.rows.length) {
          ws.getRange(1, 1, sh.rows.length, sh.rows[0].length).setValues(sh.rows);
        }
      });
      SpreadsheetApp.flush();

      var urlExport = 'https://docs.google.com/spreadsheets/export?id=' +
                      tmp.getId() + '&exportFormat=xlsx';
      var res = UrlFetchApp.fetch(urlExport, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) {
        return { success: false, code: 'BAD_REQUEST',
                 error: 'Export xlsx gagal: HTTP ' + res.getResponseCode() };
      }

      var nama = 'SI-ARSIP Laporan ' + ym + '.xlsx';
      var blob = res.getBlob().setName(nama);
      var folder = getDriveFolder_('SI-ARSIP Export');
      var file = folder.createFile(blob);

      audit_(user, 'EXPORT_EXCEL_BULANAN', 'T_LOGBOOK', file.getId(), true, nama);
      catatLogbook_(file.getId(), 'laporan', 'simpan_baru', user, '', nama,
                    'Export Excel bulanan ' + ym);
      return {
        success: true,
        data: {
          url: file.getUrl(),
          nama: file.getName(),
          ukuran_kb: Math.round(file.getSize() / 1024)
        }
      };
    } finally {
      try { DriveApp.getFileById(tmp.getId()).setTrashed(true); } catch (e) {}
    }
  } catch (err) {
    Logger.log('[exportExcelBulanan_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}
