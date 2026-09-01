import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const workflowRoot = path.resolve('.github/workflows');

function readWorkflow(name: string): string {
  return fs.readFileSync(path.join(workflowRoot, name), 'utf8');
}

function expectPreviewReadOnlyContract(source: string): void {
  expect(source).toContain('workflow_dispatch:');
  expect(source).toContain('allow_preview_readonly:');
  expect(source).toContain("PREVIEW_QA_ACK: '1'");
  expect(source).toContain("MAX_TOP_LEVEL_NAVIGATIONS: '5'");
  expect(source).toContain("MAX_ROUTE_CALLS: '5'");
  expect(source).toContain("PLAYWRIGHT_WORKERS: '1'");
  expect(source).toContain("PLAYWRIGHT_RETRIES: '0'");
  expect(source).toContain('if [ "$budget" -gt 5 ]');
  expect(source).toContain('if [ "$selected" -gt "$budget" ]');
  expect(source).toContain('baekjo-obj\\.vercel\\.app');
  expect(source).toContain('(www\\.)?baekjo-objet\\.com');
  expect(source).toContain('--workers=1 --retries=0');
  expect(source).not.toContain('deployment_status:');
}

test.describe('Preview workflow fail-closed policy', () => {
  test('Preview app-mediated write lanes are absent', () => {
    const visual = readWorkflow('visual.yml');
    const golden = readWorkflow('golden-crud.yml');

    expect(visual).not.toContain('PAYMENTS_PREVIEW_URL');
    expect(visual).not.toContain('payment-routes.spec.ts');
    expect(golden).not.toContain('deployment_status:');
    expect(golden).not.toContain('environment_url');
    expect(golden).not.toContain('vercel.app');
    expect(golden).not.toContain('inputs.base_url');
  });

  test('real CRUD and payment write validation is localhost-only with runtime ref preflight', () => {
    const golden = readWorkflow('golden-crud.yml');

    expect(golden).toContain("E2E_BASE_URL: 'http://127.0.0.1:3000'");
    expect(golden).toContain("PAYMENTS_PREVIEW_URL: 'http://127.0.0.1:3000'");
    expect(golden).toContain("E2E_ADMIN_CRUD: '1'");
    expect(golden).toContain('TEST_SUPABASE_PROJECT_REF: ${{ secrets.TEST_SUPABASE_PROJECT_REF }}');
    expect(golden).toContain("LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT: '1'");
    expect(golden).toContain('http://127.0.0.1:3000/api/test/supabase-ref');
    expect(golden).toContain('if [ "$runtime_ref" != "$TEST_SUPABASE_PROJECT_REF" ]');
    expect(golden).toContain('--project=golden-crud --workers=1 --retries=0');
    expect(golden).toContain('tests/payments/payment-routes.spec.ts --workers=1 --retries=0');
  });

  test('golden localhost staging ref shell regex accepts a valid Supabase host', () => {
    const golden = readWorkflow('golden-crud.yml');
    const command = /actual_ref=\$\(node -e "([^"]+)"\)/.exec(golden)?.[1];

    expect(command).toBeDefined();
    if (command === undefined) return;

    const result = spawnSync(process.execPath, ['-e', command], {
      encoding: 'utf8',
      env: { ...process.env, SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('aeooyivfijthfcrfrnyk');
  });

  test('Preview read-only visual workflow has an explicit gate and enforced budget', () => {
    expectPreviewReadOnlyContract(readWorkflow('visual.yml'));
  });

  test('Preview read-only release workflow has an explicit gate and enforced budget', () => {
    const release = readWorkflow('release-qa.yml');

    expectPreviewReadOnlyContract(release);
    expect(release).not.toContain('npm run qa:release');
  });

  test('Preview baseline workflow is read-only and cannot update repository baselines', () => {
    const baselines = readWorkflow('update-baselines.yml');

    expectPreviewReadOnlyContract(baselines);
    expect(baselines).toContain('contents: read');
    expect(baselines).not.toContain('contents: write');
    expect(baselines).not.toContain('--update-snapshots');
    expect(baselines).not.toMatch(/\bgit (add|commit|push)\b/);
    expect(baselines).not.toContain('pull_request:');
  });

  test('direct staging DB tests receive the approved ref and production migration stays isolated', () => {
    const ci = readWorkflow('ci.yml');
    const dbJob = ci.slice(ci.indexOf('payments-db-spec:'));

    expect(dbJob).toContain('Fail closed on mandatory staging DB configuration');
    expect(dbJob).toContain('STAGING_SUPABASE_SECRET_KEY: ${{ secrets.STAGING_SUPABASE_SECRET_KEY }}');
    expect(dbJob).toContain('PRODUCTION_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}');
    expect(dbJob).toContain('SUPABASE_URL does not match TEST_SUPABASE_PROJECT_REF');
    expect(dbJob).toContain('staging DB tests cannot target the production Supabase project');
    expect(dbJob).not.toContain('STAGING_TEST_REF_GATE');
    expect(dbJob).not.toContain("if: ${{ env.STAGING_TEST_REF_GATE != '' }}");
    expect(dbJob.match(/TEST_SUPABASE_PROJECT_REF:/g)).toHaveLength(3);
    expect(dbJob.match(/SUPABASE_URL: \$\{\{ secrets\.SUPABASE_URL_STAGING \}\}/g)).toHaveLength(3);
    expect(dbJob).not.toContain("github.ref == 'refs/heads/main'");
    expect(ci).toContain('deploy-lane-exception: main push production migration only');
  });

  test('production release creates annotated tags with runner-local Git identity and keeps idempotent reuse', () => {
    const release = readWorkflow('production-release.yml');
    const tagStep = release.slice(release.indexOf('Create an idempotent release tag'));
    const releaseStep = release.slice(release.indexOf('Create GitHub Release'));
    const nameConfig = tagStep.indexOf('git config user.name "github-actions[bot]"');
    const emailConfig = tagStep.indexOf(
      'git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
    );
    const tagCreate = tagStep.indexOf('git tag -a "$tag" "$RELEASE_SHA"');

    expect(nameConfig).toBeGreaterThanOrEqual(0);
    expect(emailConfig).toBeGreaterThanOrEqual(0);
    expect(tagCreate).toBeGreaterThanOrEqual(0);
    expect(nameConfig).toBeLessThan(tagCreate);
    expect(emailConfig).toBeLessThan(tagCreate);
    expect(tagStep).toContain('existing_sha=$(git rev-list -n 1 "$tag")');
    expect(tagStep).toContain("git for-each-ref --format='%(refname:strip=2)' refs/tags");
    expect(tagStep).toContain('git rev-list -n 1 "$candidate"');
    expect(tagStep).toContain('existing_tag=');
    expect(tagStep).toContain('echo "created=false" >> "$GITHUB_OUTPUT"');
    expect(tagStep).toContain('suffix=$((suffix + 1))');
    expect(tagStep).toContain('git push origin "$tag"');
    expect(releaseStep).not.toContain("steps.tag.outputs.created == 'true'");
    expect(releaseStep).toContain('gh release view "$RELEASE_TAG" >/dev/null 2>&1 && exit 0');
    expect(releaseStep).toContain('gh release create "$RELEASE_TAG"');
  });

  test('CI는 production release contract를 실행한다', () => {
    const ci = readWorkflow('ci.yml');

    expect(ci).toContain('release-contract:');
    expect(ci).toContain('npx playwright test tests/security/workflow-preview-safety.spec.ts --project=security --workers=1 --retries=0 --reporter=line');
  });
});
