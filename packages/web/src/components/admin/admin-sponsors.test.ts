import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelectorAll, screen } from 'shadow-dom-testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import type { AdminPartner } from '../../models/admin-partner';
import type { AdminSponsors } from './admin-sponsors';
import './admin-sponsors';

const partners: AdminPartner[] = [
  {
    id: 'p1',
    name: 'Norcat',
    websiteUrl: 'https://www.norcat.org/',
    logoUrl: 'https://cdn.example/norcat.jpg',
    sortOrder: 0,
  },
  { id: 'p2', name: 'GDG Sudbury', websiteUrl: '', logoUrl: '', sortOrder: 1 },
];

const render = async (list: AdminPartner[] = partners) => {
  const result = await fixture<AdminSponsors>(
    html`<admin-sponsors .partners="${list}"></admin-sponsors>`,
  );
  await result.element.updateComplete;
  return result;
};

describe('admin-sponsors', () => {
  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('has a Sponsors tab and a Partners tab, and opens on Sponsors', async () => {
    const { shadowRoot } = await render();

    const tabs = screen.getAllByShadowRole('tab');
    expect(tabs.map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Sponsors',
      'Partners 2',
    ]);
    expect(screen.getByShadowRole('tab', { name: 'Sponsors' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(shadowRoot).toHaveTextContent('There are no sponsors yet.');
  });

  it('lists the partners with their logos and sites on the Partners tab', async () => {
    const { element, shadowRoot } = await render();

    fireEvent.click(screen.getByShadowRole('tab', { name: /Partners/ }));
    await element.updateComplete;

    const cards = deepQuerySelectorAll(shadowRoot, '.partner');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Norcat');
    expect(deepQuerySelectorAll(shadowRoot, 'img')[0]).toHaveAttribute(
      'src',
      'https://cdn.example/norcat.jpg',
    );
    expect(screen.getByShadowRole('link', { name: 'norcat.org/' })).toHaveAttribute(
      'href',
      'https://www.norcat.org/',
    );
    expect(deepQuerySelectorAll(shadowRoot, 'img')).toHaveLength(1);
  });

  it('moves between the tabs with the arrow keys', async () => {
    const { element } = await render();

    fireEvent.keyDown(screen.getByShadowRole('tab', { name: 'Sponsors' }), { key: 'ArrowRight' });
    await element.updateComplete;

    expect(screen.getByShadowRole('tab', { name: /Partners/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('says so when there are no partners', async () => {
    const { element, shadowRoot } = await render([]);

    fireEvent.click(screen.getByShadowRole('tab', { name: /Partners/ }));
    await element.updateComplete;

    expect(shadowRoot).toHaveTextContent('There are no partners yet.');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
