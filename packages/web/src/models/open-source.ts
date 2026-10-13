export interface Contributor {
  login: string;
  url: string;
  contributions: number;
  /** A path on this site, saved by the GitHub sync. */
  avatar?: string;
  /** On the page that adds up every project: how many projects they contributed to. */
  projects?: number;
}

export interface ProjectLanguage {
  name: string;
  percent: number;
}

export interface WeeklyCommits {
  /** The first day of the week, as YYYY-MM-DD. */
  week: string;
  commits: number;
}

/** A public repository of the organization, as written by `npm run sync:github`. */
export interface OpenSourceProject {
  id: string;
  name: string;
  description: string;
  url: string;
  homepage?: string;
  language?: string;
  languages: ProjectLanguage[];
  topics: string[];
  license?: string;
  stars: number;
  forks: number;
  openIssues: number;
  createdAt: string;
  pushedAt: string;
  contributors: Contributor[];
  commitActivity: WeeklyCommits[];
  readme: string;
}

export interface OpenSourceData {
  org: string;
  generatedAt: string;
  projects: OpenSourceProject[];
}
