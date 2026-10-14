import { Success } from '@abraham/remotedata';
import { html, nothing, render as litRender } from 'lit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../__tests__/helpers/axe';
import { fixture } from '../../__tests__/helpers/fixtures';
import { setStoreState } from '../../__tests__/helpers/store';
import { fetchOwnAdminRole } from '../db/admins';
import type { AdminRole } from '../models/admin';
import type { User } from '../models/user';
import type { AdminPage } from './admin-page';
import './admin-page';

vi.mock('../db/admins', () => ({ fetchOwnAdminRole: vi.fn() }));
vi.mock('../utils/metadata');

const user = { uid: 'user-1', email: 'ada@example.com' } as User;

const render = async (role: AdminRole | undefined, signedIn = true) => {
  vi.mocked(fetchOwnAdminRole).mockResolvedValue(role);
  setStoreState(signedIn ? { user: new Success(user) } : {});
  const result = await fixture<AdminPage>(html`<admin-page></admin-page>`);
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

  it('asks a visitor who is not signed in to sign in, and does not look anything up', async () => {
    const { shadowRoot } = await render(undefined, false);

    expect(shadowRoot).toHaveTextContent('Sign in to open the admin dashboard.');
    expect(fetchOwnAdminRole).not.toHaveBeenCalled();
  });

  it('shows the dashboard to the super admin and to an admin, with their role', async () => {
    const { shadowRoot } = await render('super_admin');
    expect(shadowRoot).toHaveTextContent('Super admin');
    expect(shadowRoot).toHaveTextContent('You are signed in with admin access.');
    litRender(nothing, document.body);

    const admin = await render('admin');
    expect(admin.shadowRoot).toHaveTextContent('Admin');
    expect(admin.shadowRoot).not.toHaveTextContent('You do not have access');
  });

  it('turns away a member, and a check-in volunteer', async () => {
    const member = await render(undefined);
    expect(member.shadowRoot).toHaveTextContent('You do not have access to the admin dashboard.');
    litRender(nothing, document.body);

    const volunteer = await render('check_in_volunteer');
    expect(volunteer.shadowRoot).toHaveTextContent('You do not have access');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render('admin');

    await expectNoAxeViolations(element);
  });
});
