// Writes packages/config/content/open-source.json from the public repositories of a GitHub
// organization: details, contributors, languages, weekly commits and a cleaned README.
// Run it with `npm --prefix packages/web run sync:github`. A GITHUB_TOKEN raises the rate limit
// from 60 to 5000 requests an hour. Contributor avatars are saved to the site's own images.
// `--if-requested` (used by the build) does nothing unless SYNC_GITHUB=1, so tests and local builds
// never need the network. When GitHub can't be reached, the last saved data stays as it is.
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ORG = process.env.GITHUB_ORG ?? 'NODE-Sudbury';
const TOKEN = process.env.GITHUB_TOKEN;
const EXCLUDE = new Set(
  (process.env.GITHUB_EXCLUDE ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
);
const OUT = fileURLToPath(new URL('../../config/content/open-source.json', import.meta.url));
const IMAGES = fileURLToPath(new URL('../../config/public/images/github/', import.meta.url));
const API = 'https://api.github.com';

const headers = (accept = 'application/vnd.github+json') => ({
  Accept: accept,
  'User-Agent': 'node-sudbury-site-sync',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
});

const get = async (path, accept) => {
  const response = await fetch(`${API}${path}`, { headers: headers(accept) });
  if (response.status === 403 || response.status === 429) {
    throw new Error(
      `GitHub rate limit or access problem for ${path} (${response.status}). Set GITHUB_TOKEN to raise the limit.`,
    );
  }
  return response;
};

const json = async (path) => {
  const response = await get(path);
  if (!response.ok) return undefined;
  return response.json();
};

// Counts the commits of the last 52 weeks from the commit list, by week starting on Sunday. The
// statistics endpoint is not used: GitHub can answer "not ready" for a long time.
const WEEKS = 52;
const commitActivity = async (repo) => {
  const now = new Date();
  const thisWeek = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - now.getUTCDay(),
  );
  const weekMs = 7 * 24 * 3600 * 1000;
  const first = thisWeek - (WEEKS - 1) * weekMs;
  const counts = new Array(WEEKS).fill(0);
  for (let page = 1; page <= 10; page++) {
    const commits = await json(
      `/repos/${ORG}/${repo}/commits?since=${new Date(first).toISOString()}&per_page=100&page=${page}`,
    );
    if (!commits?.length) break;
    for (const { commit } of commits) {
      const when = new Date(commit.author?.date ?? commit.committer?.date).getTime();
      const index = Math.floor((when - first) / weekMs);
      if (index >= 0 && index < WEEKS) counts[index] += 1;
    }
    if (commits.length < 100) break;
  }
  return counts.map((commits, index) => ({
    week: new Date(first + index * weekMs).toISOString().slice(0, 10),
    commits,
  }));
};

// Keeps the readable text: no badges, images, HTML or comments, and links that work off GitHub.
const cleanReadme = (markdown, repo) => {
  const text = markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<\/?(p|div|span|picture|source|br|a|h[1-6]|center)[^>]*>/gi, '\n')
    .replace(
      /\]\((?!https?:|#|mailto:)([^)\s]+)\)/g,
      `](https://github.com/${ORG}/${repo}/blob/HEAD/$1)`,
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length <= 6000) return text;
  const cut = text.slice(0, 6000);
  return `${cut.slice(0, Math.max(cut.lastIndexOf('\n\n'), 3000))}\n\n[Read the full README on GitHub](https://github.com/${ORG}/${repo}#readme)`;
};

// A short summary for repositories that have no GitHub description: the README's first sentence.
const summary = (readmeText) => {
  const paragraph = readmeText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !/^[#|>`\-*\d]/.test(block) && !block.startsWith('['));
  if (!paragraph) return '';
  const text = paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentence = text.match(/^.{20,240}?[.!?](\s|$)/)?.[0].trim() ?? text.slice(0, 200);
  return sentence;
};

const saveAvatar = async (login, url) => {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}s=96`);
  if (!response.ok) return undefined;
  const extension = (response.headers.get('content-type') ?? '').includes('png') ? 'png' : 'jpg';
  mkdirSync(IMAGES, { recursive: true });
  writeFileSync(`${IMAGES}${login}.${extension}`, Buffer.from(await response.arrayBuffer()));
  return `/images/github/${login}.${extension}`;
};

const contributors = async (repo) => {
  const list = (await json(`/repos/${ORG}/${repo}/contributors?per_page=100`)) ?? [];
  const people = list
    .filter(({ type, login }) => type === 'User' && !login.endsWith('[bot]'))
    .slice(0, 20);
  return Promise.all(
    people.map(async ({ login, html_url: url, avatar_url: avatar, contributions }) => ({
      login,
      url,
      contributions,
      avatar: await saveAvatar(login, avatar),
    })),
  );
};

const languages = async (repo) => {
  const bytes = (await json(`/repos/${ORG}/${repo}/languages`)) ?? {};
  const total = Object.values(bytes).reduce((sum, value) => sum + value, 0) || 1;
  return Object.entries(bytes)
    .map(([name, size]) => ({ name, percent: Math.round((size / total) * 1000) / 10 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);
};

const readme = async (repo) => {
  const response = await get(`/repos/${ORG}/${repo}/readme`, 'application/vnd.github.raw+json');
  return response.ok ? cleanReadme(await response.text(), repo) : '';
};

const license = (value) => {
  if (!value) return undefined;
  return value.spdx_id && value.spdx_id !== 'NOASSERTION' ? value.spdx_id : 'Custom license';
};

const main = async () => {
  console.log(
    `Syncing public repositories of ${ORG}${TOKEN ? ' (with token)' : ' (no token, 60 requests an hour)'}`,
  );
  const listing = await get(`/orgs/${ORG}/repos?type=public&per_page=100`);
  if (!listing.ok)
    throw new Error(`Could not list the repositories of ${ORG} (${listing.status}).`);
  const all = await listing.json();
  const repos = all.filter(
    (repo) => !repo.private && !repo.fork && !repo.archived && !EXCLUDE.has(repo.name),
  );
  const projects = [];
  for (const repo of repos) {
    console.log(`- ${repo.name}`);
    const readmeText = await readme(repo.name);
    projects.push({
      id: repo.name,
      name: repo.name,
      description: repo.description || summary(readmeText),
      url: repo.html_url,
      homepage: repo.homepage || undefined,
      language: repo.language ?? undefined,
      languages: await languages(repo.name),
      topics: repo.topics ?? [],
      license: license(repo.license),
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      contributors: await contributors(repo.name),
      commitActivity: await commitActivity(repo.name),
      readme: readmeText,
    });
  }
  projects.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
  writeFileSync(
    OUT,
    `${JSON.stringify({ org: ORG, generatedAt: new Date().toISOString(), projects }, null, 2)}\n`,
  );
  console.log(`Wrote ${projects.length} project(s) to packages/config/content/open-source.json`);
};

if (process.argv.includes('--if-requested') && process.env.SYNC_GITHUB !== '1') {
  console.log(
    'GitHub sync skipped. Set SYNC_GITHUB=1 to refresh the open source projects before a build.',
  );
} else {
  main().catch((error) => {
    console.error(error.message);
    // A failed refresh must not break a build or erase what the site already has.
    if (existsSync(OUT)) {
      console.warn('Keeping the open source data from the last successful sync.');
      process.exit(process.argv.includes('--if-requested') ? 0 : 1);
    }
    process.exit(1);
  });
}
