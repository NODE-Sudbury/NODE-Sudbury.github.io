/** How often one page was opened over a range of days. */
export interface PageViews {
  path: string;
  views: number;
}

/** How often the site's pages were opened in all, on one day. */
export interface DailyViews {
  /** The day, as `YYYY-MM-DD`. */
  day: string;
  views: number;
}
