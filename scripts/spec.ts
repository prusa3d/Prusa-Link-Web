import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// The PrusaLink OpenAPI spec is pinned in spec/source.json and kept in
// spec/openapi.yaml, so a build is reproducible and works offline.
//
//   sync    make spec/openapi.yaml match the pin (download only on mismatch)
//   update  move the pin to the newest commit of the source branch
//   check   fail if the source branch has a newer spec than the pin (CI)

interface Source {
  repo: string;
  branch: string;
  path: string;
  commit: string;
  sha256: string;
}

const sourceUrl = new URL('../spec/source.json', import.meta.url);
const specUrl = new URL('../spec/openapi.yaml', import.meta.url);

const readSource = () => JSON.parse(readFileSync(sourceUrl, 'utf8')) as Source;
const sha256 = (data: Buffer | string) =>
  createHash('sha256').update(data).digest('hex');

function localSpec(): Buffer | undefined {
  try {
    return readFileSync(specUrl);
  } catch {
    return undefined;
  }
}

async function github(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': 'prusalink-web-spec-sync',
  };
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url}: HTTP ${String(res.status)}`);
  return res;
}

async function latestCommit(source: Source): Promise<string> {
  const res = await github(
    `https://api.github.com/repos/${source.repo}/commits?sha=${source.branch}&path=${source.path}&per_page=1`,
  );
  const [commit] = (await res.json()) as { sha: string }[];
  if (!commit)
    throw new Error(`no commit touches ${source.path} on ${source.branch}`);
  return commit.sha;
}

async function download(source: Source, commit: string): Promise<Buffer> {
  const res = await github(
    `https://raw.githubusercontent.com/${source.repo}/${commit}/${source.path}`,
  );
  return Buffer.from(await res.arrayBuffer());
}

async function sync() {
  const source = readSource();
  const local = localSpec();
  if (local && sha256(local) === source.sha256) return;
  const spec = await download(source, source.commit);
  if (sha256(spec) !== source.sha256) {
    throw new Error(
      `spec at ${source.commit} does not match the pinned sha256`,
    );
  }
  writeFileSync(specUrl, spec);
  console.log(`spec: synced ${source.repo}@${source.commit.slice(0, 10)}`);
}

async function update() {
  const source = readSource();
  const commit = await latestCommit(source);
  const spec = await download(source, commit);
  writeFileSync(specUrl, spec);
  const next = { ...source, commit, sha256: sha256(spec) };
  writeFileSync(sourceUrl, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    commit === source.commit
      ? `spec: already at ${commit.slice(0, 10)}`
      : `spec: ${source.commit.slice(0, 10)} -> ${commit.slice(0, 10)}`,
  );
}

async function check() {
  const source = readSource();
  const commit = await latestCommit(source);
  if (commit !== source.commit) {
    console.error(
      `spec: ${source.repo}/${source.branch} has ${commit.slice(0, 10)}, pinned ${source.commit.slice(0, 10)}. Run \`make spec-update\`.`,
    );
    process.exit(1);
  }
  console.log(`spec: up to date (${commit.slice(0, 10)})`);
}

const commands: Record<string, () => Promise<void>> = { sync, update, check };
const command = commands[process.argv[2] ?? ''];
if (!command) {
  console.error('usage: spec.ts sync|update|check');
  process.exit(2);
}
await command();
