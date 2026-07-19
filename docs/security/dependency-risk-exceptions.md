# Dependency Risk Exceptions

Updated: 2026-07-19
Scope: `origin/main` at `09897a0fee87fd20754d55202ad409361aab0026`
Status: temporary accept with CI guard
Expires: 2026-08-02

This document records the only dependency audit findings that may pass CI before launch. The gate is implemented by `scripts/verify-dependency-audit.mjs` and runs inside the required `CI (drift gate)` verify job.

## Current Findings

`npm audit --omit=dev` reports five vulnerable package records:

- `nodemailer` direct dependency, installed as `7.0.13`, rolled up to high severity.
- `@auth/core` transitive through `next-auth`, affected by the same `nodemailer` tree.
- `next-auth` direct dependency, affected by `@auth/core`, `next`, and `nodemailer`.
- `next` direct dependency, affected by nested `postcss`.
- `postcss` nested under `next@16.2.10`, installed as `8.4.31`.

## Accepted Advisories

The following advisories are accepted only while the reachability assumptions below remain true:

- GHSA-c7w3-x93f-qmm8, `nodemailer`: SMTP command injection through `envelope.size`.
- GHSA-vvjj-xcjg-gr5g, `nodemailer`: CRLF injection through transport `name`.
- GHSA-268h-hp4c-crq3, `nodemailer`: List header comment injection.
- GHSA-wqvq-jvpq-h66f, `nodemailer`: `jsonTransport` bypass of file and URL access guards.
- GHSA-r7g4-qg5f-qqm2, `nodemailer`: OAuth2 token fetch TLS validation issue.
- GHSA-p6gq-j5cr-w38f, `nodemailer`: message-level `raw` bypass of file and URL access guards.
- GHSA-qx2v-qp2m-jg93, `postcss`: unescaped `</style>` in CSS stringify output.

## Reachability Assessment

`src/lib/email/mailer.ts` is the only project mailer wrapper. It creates a Gmail SMTP transport with fixed `service: 'gmail'` and password auth, and sends only these message fields: `from`, `to`, `subject`, `html`.

The application does not pass these Nodemailer features:

- `raw`
- `jsonTransport`
- `list`
- `envelope`
- `attachments`
- `alternatives`
- `watchHtml`
- `icalEvent`
- `amp`
- OAuth2 auth

The application source also does not import `postcss` directly. PostCSS is present because `next@16.2.10` depends on `postcss@8.4.31`; there is no route that accepts user CSS, stringifies it with PostCSS, and injects it into an HTML `<style>` tag.

## Rejected Fixes

- `npm audit fix --force`: rejects because npm proposes unsafe major/downgrade paths such as old `next` or old `next-auth` versions.
- `nodemailer@9` direct upgrade: rejects for now because `next-auth@5.0.0-beta.31` and `@auth/core` still resolve the optional Nodemailer 7 peer path, leaving the audit graph inconsistent.
- `nodemailer9` npm alias: rejects because it does not remove the vulnerable `nodemailer` package used by the auth tree.
- `overrides.next.postcss`: rejects because it makes the nested Next dependency graph invalid.

## Compensating Controls

- CI fails on any new advisory URL not listed here.
- CI fails after `2026-08-02` unless this exception is removed or re-approved.
- CI fails if the mailer starts using Nodemailer features that make the accepted advisories reachable.
- CI fails if application source starts importing `postcss` directly.
- GitHub Dependabot security updates are enabled for this repository as of 2026-07-19.

## Exit Criteria

Remove this exception when either condition is met:

- Stable `next` and `next-auth` versions allow upgrading away from vulnerable `postcss` and `nodemailer` without unsupported overrides.
- The app replaces direct SMTP mail with a provider/API path that removes `nodemailer` from the runtime dependency graph.
