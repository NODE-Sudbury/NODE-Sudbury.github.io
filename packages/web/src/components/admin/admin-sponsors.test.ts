import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { deleteOrganization, fetchOrganizations } from '../../db/admin-organizations';
import type { Organization, OrganizationKind } from '../../models/organization';
import { store } from '../../store';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminSponsors } from './admin-sponsors';
import './admin-sponsors';

vi.mock('../../db/admin-organizations', () => ({
  fetchOrganizations: vi.fn(),
  deleteOrganization: vi.fn(),
}));

const organization = (kind: OrganizationKind, over: Partial<Organization>): Organization => ({
  id: 'o1',
  kind,
  name: 'Acme',
  websiteUrl: 'https://www.acme.example/',
  logoPath: 'a.png',
  logoUrl: 'https://cdn.example/a.png',
  tier: kind === 'sponsor' ? 'gold' : undefined,
  sortOrder: 0,
  ...over,
});

const sponsors = [organization('sponsor', {})];
const partners = [
  organization('partner', { id: 'p1', name: 'Norcat', websiteUrl: 'https://www.norcat.org/' }),
  organization('partner', {
    id: 'p2',
    name: 'GDG Sudbury',
    websiteUrl: '',
    logoUrl: '',
    logoPath: '',
  }),
];

const render = async (search = '') => {
  window.history.pushState({}, '', `/admin/sponsors${search}`);
  vi.mocked(fetchOrganizations).mockImplementation(async (kind) =>
    kind === 'sponsor' ? sponsors : partners,
  );
  const result = await fixture<AdminSponsors>(html`<admin-sponsors></admin-sponsors>`);
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

const field = (shadowRoot: ShadowRoot) =>
  deepQuerySelector<HbTextField>(shadowRoot, 'hb-text-field[name="search"]')!;

const search = async (element: AdminSponsors, value: string) => {
  const input = field(element.shadowRoot!);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await element.updateComplete;
};

const openPartners = async (element: AdminSponsors) => {
  fireEvent.click(screen.getByShadowRole('tab', { name: /Partners/ }));
  await element.updateComplete;
};

describe('admin-sponsors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
    window.history.pushState({}, '', '/');
  });

  it('has a Sponsors tab and a Partners tab with their counts, and opens on Sponsors', async () => {
    await render();

    const tabs = screen
      .getAllByShadowRole('tab')
      .map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim());
    expect(tabs).toEqual(['Sponsors 1', 'Partners 2']);
    expect(screen.getByShadowRole('tab', { name: /Sponsors/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('tables the sponsors with their logo, site and tier, and a way to add one', async () => {
    const { shadowRoot } = await render();

    const row = screen.getAllByShadowRole('row')[1]!;
    expect(row).toHaveTextContent('Acme');
    expect(row).toHaveTextContent('acme.example/');
    expect(row).toHaveTextContent('Gold');
    expect(deepQuerySelector(shadowRoot, 'tbody img')).toHaveAttribute(
      'src',
      'https://cdn.example/a.png',
    );
    expect(shadowRoot).toHaveTextContent('1 Sponsors');
    expect(screen.getByShadowRole('link', { name: 'Add sponsor' })).toHaveAttribute(
      'href',
      '/admin/sponsors/new?kind=sponsor',
    );
    expect(screen.getByShadowRole('link', { name: 'Edit Acme' })).toHaveAttribute(
      'href',
      '/admin/sponsors/edit?kind=sponsor&id=o1',
    );
  });

  it('tables the partners, who have no tier, and a way to add one', async () => {
    const { element, shadowRoot } = await render();

    await openPartners(element);

    expect(screen.getAllByShadowRole('row')).toHaveLength(3);
    expect(shadowRoot).not.toHaveTextContent('Tier');
    expect(screen.getByShadowRole('link', { name: 'Add partner' })).toHaveAttribute(
      'href',
      '/admin/sponsors/new?kind=partner&tab=partners',
    );
    expect(screen.getByShadowRole('link', { name: 'Edit Norcat' })).toHaveAttribute(
      'href',
      '/admin/sponsors/edit?kind=partner&id=p1&tab=partners',
    );
  });

  it('opens on Partners when the address asks for it', async () => {
    await render('?tab=partners');

    expect(screen.getByShadowRole('tab', { name: /Partners/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('moves between the tabs with the arrow keys', async () => {
    const { element } = await render();

    fireEvent.keyDown(screen.getByShadowRole('tab', { name: /Sponsors/ }), { key: 'ArrowRight' });
    await element.updateComplete;

    expect(screen.getByShadowRole('tab', { name: /Partners/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('says so when there are none', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([]);
    window.history.pushState({}, '', '/admin/sponsors');
    const { element, shadowRoot } = await fixture<AdminSponsors>(
      html`<admin-sponsors></admin-sponsors>`,
    );
    await vi.waitFor(() => expect(element['loading']).toBe(false));
    await element.updateComplete;

    expect(shadowRoot).toHaveTextContent('There are no sponsors yet.');
  });

  it('searches the sponsors by name, website or tier', async () => {
    const { element, shadowRoot } = await render();

    await search(element, 'gold');
    expect(screen.getAllByShadowRole('row')).toHaveLength(2);

    await search(element, 'acme.example');
    expect(screen.getAllByShadowRole('row')).toHaveLength(2);
    expect(shadowRoot).toHaveTextContent('1 of 1 Sponsors');

    await search(element, 'zzz');
    expect(shadowRoot).toHaveTextContent('Nothing matches your search.');
    expect(deepQuerySelector(shadowRoot, 'table')).toBeNull();
  });

  it('searches the partners, and starts fresh on each tab', async () => {
    const { element, shadowRoot } = await render();
    await search(element, 'acme');
    await openPartners(element);

    expect(field(shadowRoot).value).toBe('');
    expect(screen.getAllByShadowRole('row')).toHaveLength(3);

    await search(element, 'NORCAT');
    expect(screen.getAllByShadowRole('row')).toHaveLength(2);
    expect(screen.getAllByShadowRole('row')[1]).toHaveTextContent('Norcat');
    expect(shadowRoot).toHaveTextContent('1 of 2 Partners');
  });

  it('has no search box when there is nothing to search', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([]);
    const { element, shadowRoot } = await fixture<AdminSponsors>(
      html`<admin-sponsors></admin-sponsors>`,
    );
    await vi.waitFor(() => expect(element['loading']).toBe(false));
    await element.updateComplete;

    expect(deepQuerySelector(shadowRoot, 'hb-text-field')).toBeNull();
  });

  it('asks before deleting, and then removes the row', async () => {
    vi.mocked(deleteOrganization).mockResolvedValue();
    const dispatch = vi.spyOn(store, 'dispatch');
    const { element, shadowRoot } = await render();
    await openPartners(element);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Delete Norcat' }));
    await element.updateComplete;
    expect(deepQuerySelector(shadowRoot, 'hb-dialog')).toHaveAttribute('heading', 'Delete Norcat?');
    expect(deleteOrganization).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByShadowRole('button', { name: 'Delete' }).at(-1)!);

    await vi.waitFor(() => expect(deleteOrganization).toHaveBeenCalledWith(partners[0]));
    await vi.waitFor(() => expect(screen.getAllByShadowRole('row')).toHaveLength(2));
    expect(shadowRoot).not.toHaveTextContent('Norcat');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbars/queueSnackbar',
        payload:
          'Deleted. The public site is rebuilding, and shows the change in about two minutes.',
      }),
    );
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
