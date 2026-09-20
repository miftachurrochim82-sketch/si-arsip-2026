// ============================================================
// SI-ARSIP - 00_Utils.gs (v1.0.0 — CoreLib-First)
// ============================================================
// Util domain-spesifik app. Wrapper tipis ke CoreLib + audit ke SI-PLATFORM.
//
// Pola identik dengan si-kompetensi 00_Utils.gs & si-lahar 00_Utils.gs &
// starter-kit 00_Utils.gs.
//
// ⚠️ File ini WAJIB ada karena 02_AppLogic.gs memanggil audit_() di beberapa
//    tempat (save_config_item, delete_config_item, init_database, setupApp,
//    dan handler domain yang butuh audit).
//
//    Tanpa file ini → ReferenceError: audit_ is not defined.
//
// Prinsip CoreLib-First:
//   File ini HANYA memuat util yang TIDAK ADA di CoreLib.
//   Audit HTTP ke SI-PLATFORM adalah domain-spesifik ekosistem Trenggalek
//   (CoreLib hanya menulis AUDIT_LOGS lokal).
//
// Double-write by design:
//   - SI-PLATFORM: konsolidasi lintas-app (HTTP).
//   - AUDIT_LOGS lokal: offline/debug (diurus CoreLib otomatis).
// ============================================================

/**
 * Audit log — kirim HTTP ke SI-PLATFORM (konsolidasi lintas-app).
 *
 * Fire-and-forget: kegagalan HTTP TIDAK menggagalkan operasi utama.
 * Aman dipanggil dengan actor null/undefined → actor_id 'anonymous'.
 *
 * @param {Object}  actor         — {email|id|username} dari session
 * @param {string}  action        — aksi (mis. 'SAVE_CONFIG', 'INIT_DB', 'SM_SAVE')
 * @param {string}  resourceType  — tipe resource (mis. 'CONFIG', 'SURAT_MASUK', 'SYSTEM')
 * @param {string}  resourceId    — ID resource (mis. key, id, 'ALL')
 * @param {string}  result        — 'SUCCESS' | 'FAILED'
 * @param {string}  details       — pesan singkat
 */
function sendAuditLog_(actor, action, resourceType, resourceId, result, details) {
  try {
    var actorId = (actor && (actor.email || actor.id || actor.username)) || 'anonymous';
    if (!PLATFORM_API_URL) return;

    UrlFetchApp.fetch(PLATFORM_API_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'record_audit',
        data: {
          actor_id:       actorId,
          application_id: APP_CODE,
          action:         action,
          resource_type:  resourceType,
          resource_id:    resourceId,
          result:         result || 'SUCCESS',
          details:        details || ''
        }
      }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('[AUDIT LOG WARN] ' + e.message);
  }
}

/**
 * Wrapper audit_ — signature lama dipertahankan agar call-site
 * di 02_AppLogic.gs & file domain tidak perlu diubah.
 *
 * Pemetaan:
 *   audit_(actor, action, type, id, ok, msg)
 *     → sendAuditLog_(actor, action, type, id, ok ? 'SUCCESS' : 'FAILED', msg)
 */
function audit_(actor, action, type, id, ok, msg) {
  sendAuditLog_(
    actor,
    action,
    type,
    id,
    ok ? 'SUCCESS' : 'FAILED',
    msg || ''
  );
}

// ============================================================
// SELF-CHECK (opsional)
// ============================================================
/**
 * Verifikasi cepat — panggil dari editor GAS untuk memastikan
 * file ini terpasang & fungsi tersedia.
 */
function testUtilsSelfCheck() {
  Logger.log('=== 00_Utils.gs v1.0.0 self-check ===');

  Logger.log((typeof audit_           === 'function' ? '✅' : '❌') + ' audit_ tersedia');
  Logger.log((typeof sendAuditLog_    === 'function' ? '✅' : '❌') + ' sendAuditLog_ tersedia');

  var hasUrl = (typeof PLATFORM_API_URL !== 'undefined' && PLATFORM_API_URL) ? '✅' : '❌';
  Logger.log(hasUrl + ' PLATFORM_API_URL tersedia (' +
             ((typeof PLATFORM_API_URL !== 'undefined' && PLATFORM_API_URL)
               ? String(PLATFORM_API_URL).slice(0, 60) + '…'
               : '(kosong)') + ')');

  try {
    audit_({ email: 'test@example.com' }, 'SELF_CHECK', 'SYSTEM', 'ALL', true, 'Ping dari self-check');
    Logger.log('✅ audit_() tidak melempar error');
  } catch (e) {
    Logger.log('❌ audit_() melempar error: ' + e.message);
  }

  Logger.log('=== Selesai ===');
}
