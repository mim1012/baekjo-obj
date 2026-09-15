# Current Audit import

Run only this standalone command. It is not part of the ordinary Playwright or golden suites.
No dependency installation is needed: the installed TypeScript compiler loads the existing pure
`auditContentFromPageTexts` mapper in memory. The mapping is not copied into this command.

## Review a dry payload

```powershell
node --env-file=.env.test.local scripts/import-current-audit-cms.mjs --out audit-current.json
```

This reads the actual staging `site_settings` row with `id=page-texts`, then creates JSON. No login,
CMS save, or publish occurs. The row must exist; a read failure never becomes a default-only import.
Missing individual legacy values use the same current source defaults as the public page. Unknown
`audit.*` fields fail closed. Output files are exclusively created and never overwritten. An error
can leave an empty output file; inspect/remove it before reusing that filename.

Offline fixtures have the shape `{ "id": "page-texts", "value": { "version": 1, "values": {} },
"updated_at": "..." }` and can only prepare JSON:

```powershell
node scripts/import-current-audit-cms.mjs --fixture source-row.json
node --test scripts/cms-import/import.test.mjs scripts/cms-import/source-guard.test.mjs
```

## Apply only after Main review

```powershell
node --env-file=.env.test.local scripts/import-current-audit-cms.mjs --apply --base-url http://127.0.0.1:3120 --out audit-import-result.json
```

Required environment: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `TEST_SUPABASE_PROJECT_REF`,
`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`. Only staging ref `aeooyivfijthfcrfrnyk` is accepted.
The running localhost development server must have `LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT=1`;
its `/api/test/supabase-ref` response must independently match staging before login.

Authentication uses the real login UI in one fresh headless Chromium context. It waits for the
client `/api/page-texts` response and `networkidle` before filling either field or clicking login,
then verifies `/api/members/me` email, `role=admin`, and `status=active`. Login is attempted once.
The browser is restricted to the explicit localhost origin; API redirects and retries are disabled.
The browser session's request context performs the CAS requests. No session is forged or injected.
Credentials/cookies are not written to artifacts or logged. The planned page navigation budget is
two: login and admin. An installed Chrome is used on Windows; optionally set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. No browser or package is installed by the command.

The importer refuses any existing unpublished draft. Already managed public content is a no-op.
Otherwise it saves the fresh source snapshot with the current `expectedRevision`, checks every
source leaf against the saved response and read-back, then calls
`POST /api/admin/settings/pages/audit/import-publish` with `expectedRevision`, `sourceValue`, and
`sourceUpdatedAt`. It never uses the unguarded standard publish endpoint. Main must review and
apply additive migration `0163_cms_audit_source_guard.sql` first; applied 0162 is unchanged.
Existing history is retained by the Foundation publish function; this command never deletes or
restores any history.

Source hashes include the full source row and its timestamp. The source is read again before save,
after save and immediately before publish. CAS guards CMS revisions. Any source
change, conflicting revision, normalization loss, malformed response or transport error stops the
command without retry or rollback. A failed apply may leave a draft; inspect it manually.

The guarded RPC locks the source row and Audit CMS row, checks the expected JSON value, original
timestamp and draft revision, and calls the existing publisher in that same transaction. A source
edit committed before it acquires the lock returns conflict without publishing. An edit waiting on
the source lock can proceed only after publication; that later edit does not invalidate the completed
import. Therefore the importer does not compare the legacy source after publication. Already managed
Audit is refused by the RPC, while a repeat standalone invocation remains a no-op.
Target logs are emitted only after environment validation and contain only the safe localhost origin.
The dry payload is for review, not a frozen apply input: apply rereads the current source.
