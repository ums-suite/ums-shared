#!/usr/bin/env node
// Re-fetches ums-core's live OpenAPI document and overwrites the committed contract artifact
// (contracts/ums-core.v1.json). This is how a *future* flow refreshes the contract as more
// UMS.Modules land: bring up ums-core (ums-devops/scripts/dev-up.sh + `dotnet run --project
// src/Host`), then run `npm run contract:fetch` from this repo, review the diff, and run
// `npm run client:generate` to regenerate the TypeScript client against it. See README.md
// "Refreshing the API client" for the full one-command workflow this script is one half of.
//
// Base URL is configurable via UMS_CORE_BASE_URL (default matches ums-devops's dev-up.sh /
// appsettings.Development.json port for the Host: http://localhost:8080) so this also works
// against a docker-compose'd or CI-spun-up Host on a different port.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.UMS_CORE_BASE_URL ?? 'http://localhost:8080';
const specUrl = `${baseUrl.replace(/\/+$/, '')}/openapi/v1.json`;
const outFile = resolve(__dirname, '../contracts/ums-core.v1.json');

console.log(`Fetching OpenAPI contract from ${specUrl} ...`);

const response = await fetch(specUrl);
if (!response.ok) {
  console.error(`Failed to fetch OpenAPI document: HTTP ${response.status} ${response.statusText}`);
  console.error(
    'Is ums-core running? See ums-devops/scripts/dev-up.sh + `dotnet run --project src/Host` in ums-core.',
  );
  process.exit(1);
}

const spec = await response.json();
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');

const pathCount = Object.keys(spec.paths ?? {}).length;
console.log(`Wrote ${outFile} (${pathCount} paths, openapi ${spec.openapi}).`);
console.log(
  'Next: review the diff, then run `npm run client:generate` to regenerate the TS client.',
);
