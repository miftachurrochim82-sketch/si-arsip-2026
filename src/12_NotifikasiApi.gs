// ============================================================
// SI-ARSIP - 12_NotifikasiApi.gs (v1.4 — G31 TUTUP, 2026-09-21)
// ------------------------------------------------------------
// Notifikasi in-app (FR-63):
//   - notifikasiItems_(dpRows, user, today) → MURNI (diuji suite):
//       * 'disposisi_baru' : disposisi status diteruskan untuk penerima
//         (ke_pejabat = pejabat milik user), umur ≤ 14 hari.
//       * 'sla_lewat'      : disposisi lewat tenggat, untuk penerima DAN
//         untuk role verifikator/admin/super (pengawas).
//   - getNotifikasi_(user) → { items, unread } (unread vs marker baca
//     di Script Properties, key NOTIF_READ_<email>).
//   - notifTandaiDibaca_(user) → marker = sekarang.
// Aksi: get_notifikasi / notif_read (level viewer).
// ============================================================

var NOTIF_UMUR_HARI = 14;

/**
 * Builder murni daftar notifikasi untuk satu user.
 * dpRows: baris T_DISPOSISI (sudah tanpa soft-delete).
 * user: { pegawai_id, role, email }.
 */
function notifikasiItems_(dpRows, user, today) {
  today = today || CoreLib.todayIsoLocal();
  var batas = CoreLib.dateKey10(new Date(new Date(today + 'T00:00:00Z').getTime() -
                NOTIF_UMUR_HARI * 86400000).toISOString()) || today;
  var role = String((user && user.role) || 'viewer').toLowerCase();
  var isPengawas = ['verifikator', 'admin', 'super'].indexOf(role) !== -1;

  // Peta pejabat → pegawai_id (untuk cocokkan penerima)
  var pejabatMap = {};
  getSheetData_('M_PEJABAT').forEach(function (p) {
    pejabatMap[normalizeEntityId_(p.id)] = p;
  });
  // Peta surat untuk judul
  var suratMap = {};
  getSheetData_('T_SURAT_MASUK').forEach(function (s) {
    suratMap[normalizeEntityId_(s.id)] = s;
  });

  var userPjbId = '';
  if (user && user.pegawai_id) {
    var pjb = dpFindPejabatByPegawaiId_(user.pegawai_id);
    if (pjb) userPjbId = normalizeEntityId_(pjb.id);
  }

  var items = [];
  (dpRows || []).forEach(function (d) {
    if (CoreLib.normStr(d.status_disposisi) === 'selesai') return;
    var tgl = CoreLib.dateKey10(d.tgl_disposisi) || CoreLib.dateKey10(d.created_at) || '';
    if (tgl && tgl < batas) return;                    // terlalu lama
    var keId = normalizeEntityId_(d.ke_pejabat_id);
    var isPenerima = !!userPjbId && keId === userPjbId;
    var lewat = dpIsLewatSla_(d);
    var surat = suratMap[normalizeEntityId_(d.surat_id)] || {};
    var judulSurat = (surat.nomor_agenda_masuk || '') + ' ' + (surat.perihal || '');
    var namaKe = (pejabatMap[keId] || {}).nama || d.ke_pejabat_id || '—';

    if (lewat && (isPenerima || isPengawas)) {
      items.push({
        jenis: 'sla_lewat',
        judul: 'SLA lewat: ' + namaKe,
        isi: (judulSurat || d.surat_id || 'Disposisi') + ' — tenggat ' +
             (CoreLib.dateKey10(d.jatuh_tempo) || '-') + ' (' + d.status_disposisi + ')',
        tanggal: tgl,
        ref_id: d.id || ''
      });
    } else if (!lewat && isPenerima && CoreLib.normStr(d.status_disposisi) === 'diteruskan') {
      items.push({
        jenis: 'disposisi_baru',
        judul: 'Disposisi baru untuk Anda',
        isi: (judulSurat || d.surat_id || 'Disposisi') + ' — instruksi: ' +
             (d.instruksi || '-'),
        tanggal: tgl,
        ref_id: d.id || ''
      });
    }
  });

  items.sort(function (a, b) { return a.tanggal < b.tanggal ? 1 : -1; });
  return items;
}

/** Handler get_notifikasi. */
function getNotifikasi_(user) {
  try {
    var items = notifikasiItems_(getSheetData_('T_DISPOSISI'), user || {},
                                 CoreLib.todayIsoLocal());
    var marker = notifBacaMarker_((user && user.email) || '');
    var unread = items.filter(function (i) { return (i.tanggal || '') >= marker; }).length;
    if (!marker) unread = items.length;   // belum pernah membaca = semua baru
    return { success: true, data: { items: items.slice(0, 20), unread: unread } };
  } catch (err) {
    Logger.log('[getNotifikasi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/** Handler notif_read: set marker = sekarang. */
function notifTandaiDibaca_(user) {
  try {
    var email = (user && user.email) || '';
    PropertiesService.getScriptProperties()
      .setProperty('NOTIF_READ_' + email, CoreLib.todayIsoLocal());
    return { success: true, data: { marker: CoreLib.todayIsoLocal() } };
  } catch (err) {
    Logger.log('[notifTandaiDibaca_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function notifBacaMarker_(email) {
  try {
    return PropertiesService.getScriptProperties().getProperty('NOTIF_READ_' + email) || '';
  } catch (e) {
    return '';
  }
}
