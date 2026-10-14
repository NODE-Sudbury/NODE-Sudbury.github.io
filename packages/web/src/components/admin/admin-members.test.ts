import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, deepQuerySelectorAll, screen } from 'shadow-dom-testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import type { AdminMember } from '../../models/admin-member';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminMembers } from './admin-members';
import './admin-members';

const base: AdminMember = {
  id: 'm1',
  createdAt: '2026-08-29T01:11:00Z',
  email: 'ada@example.com',
  isExclusiveMember: false,
  isActive: true,
  isPublic: true,
  handle: 'ada',
  fullName: 'Ada Lovelace',
  avatarUrl: '',
  memberType: 'professional',
  jobTitle: 'Engineer',
  company: 'Analytical Engines',
  school: '',
  program: '',
};

const members: AdminMember[] = [
  base,
  {
    ...base,
    id: 'm2',
    fullName: 'Grace Hopper',
    email: 'grace@navy.example',
    handle: '',
    isPublic: false,
    isExclusiveMember: true,
    memberType: 'student',
    program: 'Computer Science',
    school: 'Vassar',
  },
];

const render = async (list: AdminMember[]) => {
  const result = await fixture<AdminMembers>(
    html`<admin-members .members="${list}"></admin-members>`,
  );
  await result.element.updateComplete;
  return result;
};

const search = async (element: AdminMembers, value: string) => {
  const field = deepQuerySelector<HbTextField>(element.shadowRoot!, 'hb-text-field')!;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await element.updateComplete;
};

describe('admin-members', () => {
  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('lists each member with email, type, public profile and when they joined', async () => {
    const { shadowRoot } = await render(members);

    expect(shadowRoot).toHaveTextContent('2 members');
    const rows = screen.getAllByShadowRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Ada Lovelace');
    expect(rows[0]).toHaveTextContent('Engineer at Analytical Engines');
    expect(rows[0]).toHaveTextContent('ada@example.com');
    expect(rows[0]).toHaveTextContent('August 2026');
    expect(screen.getByShadowRole('link', { name: '/members/ada' })).toHaveAttribute(
      'href',
      '/members/ada',
    );
    expect(rows[1]).toHaveTextContent('Student');
    expect(rows[1]).toHaveTextContent('Exclusive member');
    expect(rows[1]).toHaveTextContent('Private');
  });

  it('searches by name, email or where they work or study', async () => {
    const { element, shadowRoot } = await render(members);

    await search(element, 'hopper');
    expect(deepQuerySelectorAll(shadowRoot, 'tbody tr')).toHaveLength(1);
    expect(shadowRoot).toHaveTextContent('1 of 2 members');

    await search(element, 'ANALYTICAL engines');
    expect(screen.getAllByShadowRole('row')[1]).toHaveTextContent('Ada Lovelace');

    await search(element, 'navy.example');
    expect(screen.getAllByShadowRole('row')[1]).toHaveTextContent('Grace Hopper');
  });

  it('says so when nothing matches, or there are no members', async () => {
    const { element, shadowRoot } = await render(members);
    await search(element, 'zzz');
    expect(shadowRoot).toHaveTextContent('No members match your search.');
    expect(deepQuerySelector(shadowRoot, 'table')).toBeNull();

    litRender(nothing, document.body);
    const empty = await render([]);
    expect(empty.shadowRoot).toHaveTextContent('There are no members yet.');
  });

  describe('pagination', () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      ...base,
      id: `m${index}`,
      fullName: `Member ${String(index + 1).padStart(2, '0')}`,
      email: `member${index + 1}@example.com`,
      handle: `member-${index + 1}`,
    }));

    const rowCount = () => screen.getAllByShadowRole('row').length - 1;
    const select = (shadowRoot: ShadowRoot) =>
      deepQuerySelector<HTMLSelectElement>(shadowRoot, 'select')!;

    it('shows 10 members to a page, with the page as 1 of 3', async () => {
      const { shadowRoot } = await render(many);

      expect(rowCount()).toBe(10);
      expect(shadowRoot).toHaveTextContent('25 members');
      expect(shadowRoot).toHaveTextContent('1 of 3');
      expect(screen.getByShadowRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByShadowRole('button', { name: 'Next page' })).toBeEnabled();
    });

    it('offers 10, 30 and 50 a page, and nothing else', async () => {
      const { shadowRoot } = await render(many);

      const options = [...select(shadowRoot).options].map((option) => option.value);
      expect(options).toEqual(['10', '30', '50']);
      expect(select(shadowRoot).value).toBe('10');
    });

    it('moves between pages, and the last page has what is left', async () => {
      const { element, shadowRoot } = await render(many);

      fireEvent.click(screen.getByShadowRole('button', { name: 'Next page' }));
      await element.updateComplete;
      expect(shadowRoot).toHaveTextContent('2 of 3');
      expect(screen.getAllByShadowRole('row')[1]).toHaveTextContent('Member 11');

      fireEvent.click(screen.getByShadowRole('button', { name: 'Next page' }));
      await element.updateComplete;
      expect(rowCount()).toBe(5);
      expect(screen.getByShadowRole('button', { name: 'Next page' })).toBeDisabled();

      fireEvent.click(screen.getByShadowRole('button', { name: 'Previous page' }));
      await element.updateComplete;
      expect(shadowRoot).toHaveTextContent('2 of 3');
    });

    it('shows more at once when the page size is raised, and goes back to page 1', async () => {
      const { element, shadowRoot } = await render(many);
      fireEvent.click(screen.getByShadowRole('button', { name: 'Next page' }));
      await element.updateComplete;

      select(shadowRoot).value = '30';
      fireEvent.change(select(shadowRoot));
      await element.updateComplete;

      expect(rowCount()).toBe(25);
      expect(shadowRoot).toHaveTextContent('1 of 1');
      expect(screen.getByShadowRole('button', { name: 'Next page' })).toBeDisabled();
    });

    it('goes back to page 1 when the search changes, and pages the matches', async () => {
      const { element, shadowRoot } = await render(many);
      fireEvent.click(screen.getByShadowRole('button', { name: 'Next page' }));
      await element.updateComplete;

      await search(element, 'member 2');

      expect(shadowRoot).toHaveTextContent('1 of 1');
      // Member 02, 12, and 20 to 25: every name with a 2 in it.
      expect(rowCount()).toBe(8);
    });

    it('is 1 of 1 for a short list', async () => {
      const { shadowRoot } = await render(members);

      expect(shadowRoot).toHaveTextContent('1 of 1');
      expect(screen.getByShadowRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByShadowRole('button', { name: 'Next page' })).toBeDisabled();
    });
  });

  it('has no accessibility violations', async () => {
    const { element } = await render(members);

    await expectNoAxeViolations(element);
  });
});
