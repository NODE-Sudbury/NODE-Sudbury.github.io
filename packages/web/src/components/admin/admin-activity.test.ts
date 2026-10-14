import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { fetchActivity } from '../../db/admin-activity';
import type { ActivityEntry } from '../../models/activity';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminActivity } from './admin-activity';
import './admin-activity';

vi.mock('../../db/admin-activity', () => ({ fetchActivity: vi.fn() }));

const entry = (over: Partial<ActivityEntry>): ActivityEntry => ({
  id: 1,
  at: '2026-10-14T01:30:00Z',
  actorEmail: 'ada@example.com',
  actorRole: 'super_admin',
  action: 'insert',
  table: 'partners',
  summary: 'Norcat',
  changes: { name: 'Norcat', website_url: '' },
  ...over,
});

const entries = [
  entry({}),
  entry({
    id: 2,
    action: 'update',
    table: 'board_members',
    summary: 'Hannan Max',
    actorEmail: 'grace@example.com',
    actorRole: 'admin',
    changes: { title: { from: 'Lead', to: 'Technical Lead' } },
  }),
  entry({ id: 3, action: 'delete', table: 'sponsors', summary: 'Acme', changes: { name: 'Acme' } }),
];

const render = async (list: ActivityEntry[] = entries) => {
  vi.mocked(fetchActivity).mockResolvedValue(list);
  const result = await fixture<AdminActivity>(html`<admin-activity></admin-activity>`);
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

const pick = async (element: AdminActivity, name: string, value: string) => {
  const select = deepQuerySelector<HTMLSelectElement>(
    element.shadowRoot!,
    `select[name="${name}"]`,
  )!;
  select.value = value;
  fireEvent.change(select);
  await element.updateComplete;
};

describe('admin-activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('lists who did what, newest first, with the role they had', async () => {
    const { shadowRoot } = await render();

    expect(shadowRoot).toHaveTextContent('3 of 3 entries');
    const rows = screen.getAllByShadowRole('row');
    expect(rows[1]).toHaveTextContent('ada@example.com');
    expect(rows[1]).toHaveTextContent('super_admin');
    expect(rows[1]).toHaveTextContent('Added');
    expect(rows[1]).toHaveTextContent('Partner: Norcat');
    expect(rows[2]).toHaveTextContent('Changed');
    expect(rows[2]).toHaveTextContent('Board card: Hannan Max');
    expect(rows[3]).toHaveTextContent('Deleted');
    expect(shadowRoot).toHaveTextContent('Nobody can change or delete it.');
  });

  it('shows what a change was, from and to', async () => {
    const { shadowRoot } = await render();

    expect(shadowRoot).toHaveTextContent('title: Lead -> Technical Lead');
    expect(shadowRoot).toHaveTextContent('website_url: (empty)');
  });

  it('filters by what was touched and by the action, and searches the people', async () => {
    const { element, shadowRoot } = await render();

    await pick(element, 'table', 'sponsors');
    expect(screen.getAllByShadowRole('row')).toHaveLength(2);
    expect(shadowRoot).toHaveTextContent('1 of 3 entries');

    await pick(element, 'table', '');
    await pick(element, 'action', 'update');
    expect(screen.getAllByShadowRole('row')[1]).toHaveTextContent('Hannan Max');

    await pick(element, 'action', '');
    const search = deepQuerySelector<HbTextField>(shadowRoot, 'hb-text-field[name="search"]')!;
    search.value = 'grace';
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await element.updateComplete;
    expect(screen.getAllByShadowRole('row')).toHaveLength(2);
  });

  it('pages the entries 10, 30 or 50 at a time', async () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      entry({ id: index + 1, summary: `Row ${index + 1}` }),
    );
    const { element, shadowRoot } = await render(many);

    expect(screen.getAllByShadowRole('row')).toHaveLength(11);
    expect(shadowRoot).toHaveTextContent('1 of 3');
    expect(
      [...deepQuerySelector<HTMLSelectElement>(shadowRoot, '.size select')!.options].map(
        (o) => o.value,
      ),
    ).toEqual(['10', '30', '50']);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Next page' }));
    await element.updateComplete;
    expect(shadowRoot).toHaveTextContent('2 of 3');
  });

  it('says so when the log is empty, or cannot be read', async () => {
    const empty = await render([]);
    expect(empty.shadowRoot).toHaveTextContent('Nothing has been logged yet.');
    litRender(nothing, document.body);

    vi.mocked(fetchActivity).mockRejectedValue(new Error('denied'));
    const { element, shadowRoot } = await fixture<AdminActivity>(
      html`<admin-activity></admin-activity>`,
    );
    await vi.waitFor(() => expect(element['loading']).toBe(false));
    await element.updateComplete;
    expect(shadowRoot).toHaveTextContent('The activity could not be loaded.');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
