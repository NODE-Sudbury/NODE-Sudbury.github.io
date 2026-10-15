import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SiteConfig } from './resolve-config';
import { withSiteSettings } from './site-settings';
import { templateRenderer } from './vite-plugin-site';

// The real FAQ of the site, which this test renders as the build does. The tests run from the
// package or from the repository root.
const faqPath = ['../config/content/faq.md', 'packages/config/content/faq.md']
  .map((path) => resolve(process.cwd(), path))
  .find((path) => fs.existsSync(path));
const faq = fs.readFileSync(faqPath ?? '', 'utf8');

/** The networks in the site file, in the order the footer lists them. */
const config = {
  site: {
    social: {
      follow: ['x', 'instagram', 'facebook', 'linkedin'].map((name) => ({
        name,
        url: `https://${name}.example/node`,
      })),
    },
  },
  resources: {},
} as unknown as SiteConfig;

/** The "How do I stay informed?" answer, for N.O.D.E.'s social links set as given. */
const answer = (rows: { key: string; value: string }[]) => {
  const rendered = templateRenderer(withSiteSettings(config, rows))(faq);
  const [, text] = /### How do I stay informed\?\n\n(.*)\n/.exec(rendered) ?? [];
  return text;
};

describe('the FAQ answer about staying informed', () => {
  it('names every network that has a link, with its link', () => {
    expect(
      answer([
        { key: 'social_x', value: 'https://x.com/nodesudbury' },
        { key: 'social_instagram', value: 'https://www.instagram.com/nodesudbury' },
        { key: 'social_facebook', value: 'https://www.facebook.com/nodesudbury' },
        { key: 'social_linkedin', value: 'https://www.linkedin.com/company/node' },
      ]),
    ).toBe(
      'Follow N.O.D.E. on [X](https://x.com/nodesudbury), [Instagram](https://www.instagram.com/nodesudbury), [Facebook](https://www.facebook.com/nodesudbury) and [LinkedIn](https://www.linkedin.com/company/node), or use the subscribe form on the home page.',
    );
  });

  it('leaves out a network whose link is empty', () => {
    const text = answer([
      { key: 'social_x', value: '' },
      { key: 'social_instagram', value: '' },
      { key: 'social_facebook', value: '' },
      { key: 'social_linkedin', value: 'https://www.linkedin.com/company/node' },
    ]);

    expect(text).toBe(
      'Follow N.O.D.E. on [LinkedIn](https://www.linkedin.com/company/node), or use the subscribe form on the home page.',
    );
    expect(text).not.toMatch(/x\.com|instagram|facebook/i);
  });

  it('joins two networks with "and"', () => {
    expect(
      answer([
        { key: 'social_x', value: 'https://x.com/nodesudbury' },
        { key: 'social_instagram', value: '' },
        { key: 'social_facebook', value: '' },
        { key: 'social_linkedin', value: 'https://www.linkedin.com/company/node' },
      ]),
    ).toBe(
      'Follow N.O.D.E. on [X](https://x.com/nodesudbury) and [LinkedIn](https://www.linkedin.com/company/node), or use the subscribe form on the home page.',
    );
  });

  it('only points to the subscribe form when no network has a link', () => {
    expect(
      answer(
        ['social_x', 'social_instagram', 'social_facebook', 'social_linkedin'].map((key) => ({
          key,
          value: '',
        })),
      ),
    ).toBe('Use the subscribe form on the home page.');
  });
});
