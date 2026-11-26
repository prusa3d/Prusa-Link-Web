import { readFileSync } from 'node:fs';

/// The release a build is: PRUSALINK_VERSION (a release tag, `v` dropped), or
/// package.json's version marked `-dev` for a local build.
export function releaseVersion(
  env: Record<string, string | undefined> = process.env,
): string {
  const tag = env.PRUSALINK_VERSION?.trim();
  if (tag) return tag.replace(/^v/, '');
  const { version } = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  return version.endsWith('-dev') ? version : `${version}-dev`;
}
