import { Success } from '@abraham/remotedata';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../__tests__/helpers/axe';
import { fixture } from '../../__tests__/helpers/fixtures';
import { setStoreState } from '../../__tests__/helpers/store';
import { fetchAdminMembers, fetchSubscriberCount } from '../db/admin-members';
import { fetchOwnAdminRole } from '../db/admins';
import type { AdminRole } from '../models/admin';
import type { AdminMember } from '../models/admin-member';
import type { User } from '../models/user';
import { type AdminPage, type AdminSection, adminPath } from './admin-page';
import './admin-page';

vi.mock('../db/admins', () => ({ fetchOwnAdminRole: vi.fn() }));
vi.mock('../db/admin-members', () => ({
  fetchAdminMembers: vi.fn(),
  fetchSubscriberCount: vi.fn(),
}));
vi.mock('../utils/metadata');

const user = { uid: 'user-1', email: 'ada@example.com' } as User;

const member = (over: Partial<AdminMember>): AdminMember => ({
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
  ...over,
});

const members = [
  member({}),
  member({
    id: 'm2',
    fullName: 'Grace Hopper',
    email: 'grace@example.com',
    isPublic: false,
    handle: '',
    isExclusiveMember: true,
  }),
];

const render = async (
  role: AdminRole | undefined,
  { signedIn = true, section = 'home' as AdminSection } = {},
) => {
  vi.mocked(fetchOwnAdminRole).mockResolvedValue(role);
  vi.mocked(fetchAdminMembers).mockResolvedValue(members);
  vi.mocked(fetchSubscriberCount).mockResolvedValue(5);
  setStoreState(signedIn ? { user: new Success(user) } : {});
  const result = await fixture<AdminPage>(html`<admin-page .section="${section}"></admin-page>`);
  await vi.waitFor(() => expect(result.element['ready']).toBe(true));
  if (signedIn) await vi.waitFor(() => expect(fetchOwnAdminRole).toHaveBeenCalled());
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

describe('admin-page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('gives each section its own address', () => {
    expect(adminPath('home')).toBe('/admin');
    expect(adminPath('members')).toBe('/admin/members');
  });

  it('asks a visitor who is not signed in to sign in, and does not look anything up', async () => {
    const { shadowRoot } = await render(undefined, { signedIn: false });

    expect(shadowRoot).toHaveTextContent('Sign in to open the admin dashboard.');
    expect(fetchOwnAdminRole).not.toHaveBeenCalled();
    expect(fetchAdminMembers).not.toHaveBeenCalled();
  });

  it('turns away a member, and a check-in volunteer, without reading the members', async () => {
    const member = await render(undefined);
    expect(member.shadowRoot).toHaveTextContent('You do not have access to the admin dashboard.');
    litRender(nothing, document.body);

    const volunteer = await render('check_in_volunteer');
    expect(volunteer.shadowRoot).toHaveTextContent('You do not have access');
    expect(fetchAdminMembers).not.toHaveBeenCalled();
  });

  it('lists the sections in a side rail and marks the open one', async () => {
    const { shadowRoot } = await render('super_admin', { section: 'members' });

    for (const name of [
      'Home',
      'Analytics',
      'Events',
      'Emails',
      'Members',
      'Settings',
      'Sponsors',
    ]) {
      expect(screen.getByShadowRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.getByShadowRole('link', { name: 'Members' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByShadowRole('link', { name: 'Sponsors' })).toHaveAttribute(
      'href',
      '/admin/sponsors',
    );
    expect(shadowRoot).toHaveTextContent('Super admin');
  });

  it('shows the numbers on the home section', async () => {
    const { shadowRoot } = await render('admin');

    const numbers = [...shadowRoot.querySelectorAll('.stat')].map((stat) =>
      stat.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(numbers).toEqual([
      '2 Members',
      '1 Public profiles',
      '1 Exclusive members',
      '5 Subscribers',
    ]);
  });

  it('shows the members on the members section', async () => {
    const { shadowRoot } = await render('super_admin', { section: 'members' });

    const table = deepQuerySelector(shadowRoot, 'admin-members')!;
    expect(table).toHaveProperty('members', members);
  });

  it('says a section is coming soon when it has no tools yet', async () => {
    const { shadowRoot } = await render('super_admin', { section: 'sponsors' });

    expect(shadowRoot).toHaveTextContent('Coming soon');
    expect(shadowRoot).toHaveTextContent('Keep track of the sponsors and partners of NODE.');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render('admin');

    await expectNoAxeViolations(element);
  });
});
