import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { fetchBoardMembers } from '../../db/admin-board';
import { addTeamMember, fetchTeam, removeTeamMember } from '../../db/admin-team';
import type { AdminRole } from '../../models/admin';
import type { AdminMember } from '../../models/admin-member';
import type { TeamMember } from '../../models/team-member';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminTeam } from './admin-team';
import './admin-team';

vi.mock('../../db/admin-activity', () => ({ fetchActivity: vi.fn().mockResolvedValue([]) }));
vi.mock('../../db/admin-settings', () => ({
  fetchSocialLinks: vi.fn().mockResolvedValue({
    social_x: '',
    social_instagram: '',
    social_facebook: '',
    social_linkedin: '',
  }),
  saveSocialLinks: vi.fn(),
}));
vi.mock('../../db/admin-board', () => ({
  fetchBoardMembers: vi.fn(),
  saveBoardMember: vi.fn(),
  deleteBoardMember: vi.fn(),
  CardLinkTakenError: class extends Error {},
}));
vi.mock('../../db/admin-team', () => ({
  fetchTeam: vi.fn(),
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
}));

const person = (over: Partial<TeamMember>): TeamMember => ({
  userId: 'u1',
  role: 'admin',
  addedAt: '2026-09-01T00:00:00Z',
  fullName: 'Grace Hopper',
  email: 'grace@example.com',
  avatarUrl: '',
  ...over,
});

const team = [
  person({
    userId: 'boss',
    role: 'super_admin',
    fullName: 'Hannan Max',
    email: 'hannan@example.com',
  }),
  person({ userId: 'u1' }),
  person({
    userId: 'v1',
    role: 'check_in_volunteer',
    fullName: 'Vera Volunteer',
    email: 'vera@example.com',
  }),
];

const member = (id: string, fullName: string): AdminMember => ({
  id,
  createdAt: '2026-08-29T01:11:00Z',
  email: `${id}@example.com`,
  isExclusiveMember: false,
  isActive: true,
  isPublic: true,
  handle: '',
  fullName,
  avatarUrl: '',
  memberType: 'professional',
  jobTitle: '',
  company: '',
  school: '',
  program: '',
});

const members = [
  member('boss', 'Hannan Max'),
  member('u1', 'Grace Hopper'),
  member('m9', 'Ada Lovelace'),
  member('m8', 'Alan Turing'),
];

const render = async (viewerRole: AdminRole | undefined) => {
  vi.mocked(fetchTeam).mockResolvedValue(team);
  vi.mocked(fetchBoardMembers).mockResolvedValue([]);
  const result = await fixture<AdminTeam>(
    html`<admin-team .viewerRole="${viewerRole}" .members="${members}"></admin-team>`,
  );
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

const openAdmins = async (element: AdminTeam) => {
  fireEvent.click(screen.getByShadowRole('tab', { name: /Dashboard admins/ }));
  await element.updateComplete;
};

const openVolunteers = async (element: AdminTeam) => {
  fireEvent.click(screen.getByShadowRole('tab', { name: /Volunteers/ }));
  await element.updateComplete;
};

describe('admin-team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('has General, Boards, Dashboard admins, Volunteers and, for the super admin, Activity, and opens on General', async () => {
    const { element, shadowRoot } = await render('super_admin');

    const tabs = screen
      .getAllByShadowRole('tab')
      .map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim());
    expect(tabs).toEqual(['General', 'Boards', 'Dashboard admins 2', 'Volunteers 1', 'Activity']);
    expect(screen.getByShadowRole('tab', { name: 'General' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(deepQuerySelector(shadowRoot, 'admin-general')).toBeInTheDocument();

    fireEvent.click(screen.getByShadowRole('tab', { name: 'Boards' }));
    await element.updateComplete;
    expect(deepQuerySelector(shadowRoot, 'admin-boards')).toBeInTheDocument();
  });

  it('lists the super admin first on the dashboard admins tab, who cannot be removed', async () => {
    const { element } = await render('super_admin');
    await openAdmins(element);

    const rows = screen.getAllByShadowRole('row');
    expect(rows[1]).toHaveTextContent('Hannan Max');
    expect(rows[1]).toHaveTextContent('Super admin');
    expect(rows[2]).toHaveTextContent('Grace Hopper');
    expect(rows[2]).toHaveTextContent('Dashboard admin');
    expect(screen.queryByShadowRole('button', { name: 'Remove Hannan Max' })).toBeNull();
    expect(screen.getByShadowRole('button', { name: 'Remove Grace Hopper' })).toBeInTheDocument();
  });

  it('lets the super admin add and remove dashboard admins and volunteers', async () => {
    const { element } = await render('super_admin');
    await openAdmins(element);

    expect(screen.getByShadowRole('button', { name: 'Add dashboard admin' })).toBeInTheDocument();
    await openVolunteers(element);
    expect(screen.getByShadowRole('button', { name: 'Add volunteer' })).toBeInTheDocument();
    expect(screen.getByShadowRole('button', { name: 'Remove Vera Volunteer' })).toBeInTheDocument();
  });

  it('lets an admin add and remove volunteers, but not dashboard admins', async () => {
    const { element, shadowRoot } = await render('admin');
    await openAdmins(element);

    expect(screen.queryByShadowRole('button', { name: 'Add dashboard admin' })).toBeNull();
    expect(screen.queryByShadowRole('button', { name: /^Remove \S/ })).toBeNull();
    expect(shadowRoot).toHaveTextContent(
      'Only the super admin can add or remove dashboard admins.',
    );

    await openVolunteers(element);
    expect(screen.getByShadowRole('button', { name: 'Add volunteer' })).toBeInTheDocument();
    expect(screen.getByShadowRole('button', { name: 'Remove Vera Volunteer' })).toBeInTheDocument();
    expect(shadowRoot).not.toHaveTextContent('Only the super admin');
  });

  it('searches the team', async () => {
    const { element, shadowRoot } = await render('super_admin');
    await openAdmins(element);
    const search = deepQuerySelector<HbTextField>(shadowRoot, 'hb-text-field[name="search"]')!;

    search.value = 'grace';
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await element.updateComplete;

    expect(screen.getAllByShadowRole('row')).toHaveLength(2);
    expect(shadowRoot).toHaveTextContent('1 of 2 Dashboard admins');
  });

  it('adds a member from the dialog, who is not on the team yet', async () => {
    vi.mocked(addTeamMember).mockResolvedValue();
    const { element, shadowRoot } = await render('super_admin');
    await openAdmins(element);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add dashboard admin' }));
    await element.updateComplete;

    expect(screen.queryByShadowRole('button', { name: 'Add Hannan Max' })).toBeNull();
    expect(screen.queryByShadowRole('button', { name: 'Add Grace Hopper' })).toBeNull();
    const pick = deepQuerySelector<HbTextField>(shadowRoot, 'hb-text-field[name="pick"]')!;
    pick.value = 'turing';
    pick.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await element.updateComplete;
    expect(screen.queryByShadowRole('button', { name: 'Add Ada Lovelace' })).toBeNull();

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add Alan Turing' }));

    await vi.waitFor(() => expect(addTeamMember).toHaveBeenCalledWith('m8', 'admin'));
    await vi.waitFor(() => expect(fetchTeam).toHaveBeenCalledTimes(2));
  });

  it('adds a volunteer with the volunteer role', async () => {
    vi.mocked(addTeamMember).mockResolvedValue();
    const { element } = await render('admin');
    await openVolunteers(element);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add volunteer' }));
    await element.updateComplete;
    fireEvent.click(screen.getByShadowRole('button', { name: 'Add Ada Lovelace' }));

    await vi.waitFor(() => expect(addTeamMember).toHaveBeenCalledWith('m9', 'check_in_volunteer'));
  });

  it('asks before removing, and then removes them', async () => {
    vi.mocked(removeTeamMember).mockResolvedValue();
    const { element, shadowRoot } = await render('super_admin');
    await openAdmins(element);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Remove Grace Hopper' }));
    await element.updateComplete;
    expect(
      deepQuerySelector(shadowRoot, 'hb-dialog[heading="Remove Grace Hopper?"]'),
    ).toBeInTheDocument();
    expect(removeTeamMember).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByShadowRole('button', { name: 'Remove' }).at(-1)!);

    await vi.waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('u1'));
    await vi.waitFor(() => expect(screen.getAllByShadowRole('row')).toHaveLength(2));
  });

  it('gives the super admin an Activity tab, and nobody else', async () => {
    const boss = await render('super_admin');
    expect(screen.getByShadowRole('tab', { name: 'Activity' })).toBeInTheDocument();
    fireEvent.click(screen.getByShadowRole('tab', { name: 'Activity' }));
    await boss.element.updateComplete;
    expect(deepQuerySelector(boss.shadowRoot, 'admin-activity')).toBeInTheDocument();
    litRender(nothing, document.body);

    await render('admin');
    expect(screen.queryByShadowRole('tab', { name: 'Activity' })).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { element } = await render('super_admin');

    await expectNoAxeViolations(element);
  });
});
