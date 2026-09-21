// ============================================================
// SI-ARSIP - 11_LampiranApi.gs (v1.3 — G28 TUTUP, 2026-09-21)
// ------------------------------------------------------------
// Upload file biner lampiran ke Drive (FR-60), ganti link manual:
//   - validasiLampiranFile_(file) → { ok, error } (MURNI, diuji suite)
//   - namaFileDrive_(nama, ymd, dokumenId) → nama sanitasi (MURNI)
//   - lmpUpload_(data, user) → decode base64 → file di folder Drive
//     'SI-ARSIP Lampiran' → baris T_LAMPIRAN (jenis_bukti file_drive)
//     → logbook 'upload_lampiran'.
//
// Payload aksi lmp_upload (level 'user'):
//   { dokumen_jenis, dokumen_id, nama, mime, base64, keterangan }
// Batasan: ≤ 5 MB, mime whitelist (payload google.script.run).
// ============================================================

var LAMPIRAN_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB (batas aman RPC)

var LAMPIRAN_MIME_VALID_ = [
  'application/pdf',
  'image/png', 'image/jpeg',
  'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip'
];

var LAMPIRAN_DOKUMEN_SHEET_ = {
  'surat_masuk':  'T_SURAT_MASUK',
  'surat_keluar': 'T_SURAT_KELUAR',
  'naskah_dinas': 'T_NASKAH_DINAS',
  'disposisi':    'T_DISPOSISI',
  'arsip':        'T_ARSIP'
};

/** Validasi murni payload file lampiran. */
function validasiLampiranFile_(file) {
  if (!file || typeof file !== 'object') {
    return { ok: false, error: 'Payload file tidak valid.' };
  }
  var nama = String(file.nama || '').trim();
  if (!nama) return { ok: false, error: 'Nama file wajib diisi.' };

  var mime = String(file.mime || '').toLowerCase();
  if (LAMPIRAN_MIME_VALID_.indexOf(mime) === -1) {
    return { ok: false, error: 'Jenis file tidak diizinkan: ' + (mime || '(kosong)') +
            '. Yang diizinkan: PDF, gambar PNG/JPG, dokumen Office, TXT/CSV, ZIP.' };
  }
  var b64 = String(file.base64 || '');
  if (!b64) return { ok: false, error: 'Isi file (base64) kosong.' };
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) {
    return { ok: false, error: 'Base64 tidak valid.' };
  }
  var ukuran = Math.floor(b64.length * 3 / 4);
  if (ukuran > LAMPIRAN_MAX_BYTES) {
    return { ok: false, error: 'File terlalu besar (' + Math.round(ukuran / 1024 / 1024) +
            ' MB). Maksimal 5 MB.' };
  }
  return { ok: true, ukuran: ukuran };
}

/** Nama file Drive: 'YYYY-MM-DD_dokid-nama-sanitasi.ext'. */
function namaFileDrive_(nama, ymd, dokumenId) {
  var n = String(nama || 'lampiran').trim();
  var ext = '';
  var dot = n.lastIndexOf('.');
  if (dot > 0) { ext = n.slice(dot).toLowerCase(); n = n.slice(0, dot); }
  n = n.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  if (!n) n = 'lampiran';
  if (n.length > 60) n = n.slice(0, 60);
  var id = String(dokumenId || '').replace(/[^A-Za-z0-9]+/g, '').slice(-8) || 'dok';
  return (ymd || CoreLib.todayIsoLocal()) + '_' + id + '_' + n + ext;
}

/** Handler lmp_upload. */
function lmpUpload_(data, user) {
  try {
    data = data || {};
    var jenis = String(data.dokumen_jenis || '').trim();
    var sheetDok = LAMPIRAN_DOKUMEN_SHEET_[jenis];
    if (!sheetDok) {
      return { success: false, code: 'BAD_REQUEST',
               error: 'dokumen_jenis tidak dikenal: ' + jenis };
    }
    var dokumenId = String(data.dokumen_id || '').trim();
    if (!dokumenId) return { success: false, code: 'BAD_REQUEST', error: 'dokumen_id wajib.' };
    var dok = findRecordById_(sheetDok, dokumenId);
    if (!dok) return { success: false, code: 'NOT_FOUND', error: 'Dokumen induk tidak ditemukan.' };

    var v = validasiLampiranFile_(data);
    if (!v.ok) return { success: false, code: 'BAD_REQUEST', error: v.error };

    var bytes = Utilities.base64Decode(String(data.base64).replace(/\s/g, ''));
    var namaDrive = namaFileDrive_(data.nama, CoreLib.todayIsoLocal(), dokumenId);
    var blob = Utilities.newBlob(bytes, String(data.mime).toLowerCase(), namaDrive);

    var folder = getDriveFolder_('SI-ARSIP Lampiran');
    var file = folder.createFile(blob);

    var rec = {
      id: '',
      dokumen_id: dokumenId,
      dokumen_jenis: jenis,
      jenis_bukti: 'file_drive',
      url: file.getUrl(),
      nama_bukti: String(data.nama || '').trim(),
      keterangan: (String(data.keterangan || '').trim() +
                   ' · ' + Math.round(v.ukuran / 1024) + ' KB · Drive').replace(/^ · /, '')
    };
    var saved = saveRecord_('T_LAMPIRAN', rec, user);

    audit_(user, 'UPLOAD_LAMPIRAN', sheetDok, dokumenId, true, namaDrive);
    catatLogbook_(dokumenId, jenis, 'upload_lampiran', user, '',
                  namaDrive, 'File lampiran baru di Drive');

    return {
      success: true,
      data: { id: saved.id, url: file.getUrl(), nama: namaDrive,
              ukuran_kb: Math.round(v.ukuran / 1024) }
    };
  } catch (err) {
    Logger.log('[lmpUpload_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}
