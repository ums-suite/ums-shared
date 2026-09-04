#!/usr/bin/env node
// Regenerates the TypeScript Angular API client from the committed OpenAPI contract
// (contracts/ums-core.v1.json) using @openapitools/openapi-generator-cli with the
// `typescript-angular` generator. Output lands in
// projects/shared/src/lib/api/generated/ (committed -- see that directory's own README.md for
// why, and DO NOT hand-edit anything under it; re-run this script instead).
//
// This is the *real, one-command* regeneration workflow for every future flow that adds a new
// UMS.Modules surface: `npm run contract:fetch` (refresh the spec against a running ums-core)
// then `npm run client:generate` (regenerate the client from the committed spec) -- never a
// manual one-off edit.

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const specFile = resolve(repoRoot, 'contracts/ums-core.v1.json');
const outDir = resolve(repoRoot, 'projects/shared/src/lib/api/generated');

if (!existsSync(specFile)) {
  console.error(`Contract not found at ${specFile}. Run \`npm run contract:fetch\` first.`);
  process.exit(1);
}

console.log(`Regenerating TypeScript Angular client from ${specFile} into ${outDir} ...`);

// Wipe and regenerate rather than merge -- the generated tree must always be a pure, reproducible
// function of the committed spec, never a mix of old and new generator output.
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

const generatorArgs = [
  '@openapitools/openapi-generator-cli',
  'generate',
  '-i',
  specFile,
  '-g',
  'typescript-angular',
  '-o',
  outDir,
  '--additional-properties',
  [
    'ngVersion=22.1.0',
    'providedInRoot=true',
    'withInterfaces=true',
    'serviceSuffix=ApiService',
    'fileNaming=kebab-case',
  ].join(','),
  '--skip-validate-spec',
];

execFileSync('npx', generatorArgs, { stdio: 'inherit', cwd: repoRoot });

console.log('Done. Review the generated diff, then update src/lib/api/index.ts re-exports if a');
console.log('new module surfaced new API/model classes, and run `npm run build` + `npm test`.');
