import { Success } from '@abraham/remotedata';
import { fireEvent } from '@testing-library/dom';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html, nothing, render as litRender } from 'lit';
import { fixture } from '../../__tests__/helpers/fixtures';
import { expectNoAxeViolations } from '../../__tests__/helpers/axe';
import { setStoreState } from '../../__tests__/helpers/store';
import {
  fetchOwnProfile,
  HandleTakenError,
  isHandleAvailable,
  removeAvatar,
  saveOwnProfile,
  uploadAvatar,
} from '../db/member-profiles';
import type { MemberProfile } from '../models/member-profile';
import type { User } from '../models/user';
import { store } from '../store';
import type { HbTextField } from '../components/ui/hb-text-field';
import type { AccountPage } from './account-page';
import './account-page';

vi.mock('../db/member-profiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../db/member-profiles')>()),
  fetchOwnProfile: vi.fn(),
  saveOwnProfile: vi.fn(),
  isHandleAvailable: vi.fn(),
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
}));
vi.mock('../utils/avatar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/avatar')>()),
  cropToSquare: vi.fn(async () => new Blob(['square'], { type: 'image/jpeg' })),
}));
vi.mock('../utils/metadata');

const user = {
  uid: 'user-1',
  email: 'ada@example.com',
  displayName: 'Ada',
  photoURL: null,
} as User;

const own: MemberProfile = {
  id: 'user-1',
  createdAt: '2026-08-29T01:11:00Z',
  isExclusiveMember: false,
  handle: 'ada',
  fullName: 'Ada Lovelace',
  avatarUrl: '',
  memberType: 'professional',
  jobTitle: 'Engineer',
  company: 'Analytical Engines',
  school: '',
  program: '',
  bio: '',
  pronouns: '',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  discordTag: '',
  isPublic: true,
};

const field = (shadowRoot: ShadowRoot, name: string) =>
  deepQuerySelector<HbTextField>(shadowRoot, `hb-text-field[name="${name}"]`)!;

const type = async (element: AccountPage, name: string, value: string) => {
  const input = field(element.shadowRoot!, name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await element.updateComplete;
};

const renderSignedIn = async (profile: MemberProfile | undefined = own) => {
  vi.mocked(fetchOwnProfile).mockResolvedValue(profile);
  setStoreState({ user: new Success(user) });
  const result = await fixture<AccountPage>(html`<account-page></account-page>`);
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await vi.waitFor(() => expect(fetchOwnProfile).toHaveBeenCalled());
  await result.element.updateComplete;
  return result;
};

const saveButton = () => screen.getByShadowRole('button', { name: 'Save profile' });

describe('account-page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
    vi.restoreAllMocks();
  });

  it('asks a visitor who is not signed in to sign in', async () => {
    const { shadowRoot } = await fixture<AccountPage>(html`<account-page></account-page>`);

    expect(shadowRoot).toHaveTextContent('Sign in to edit your profile.');
    expect(deepQuerySelector(shadowRoot, 'form')).toBeNull();
    expect(fetchOwnProfile).not.toHaveBeenCalled();
  });

  it("fills the form with the member's own profile and shows their public page", async () => {
    const { shadowRoot } = await renderSignedIn();

    expect(fetchOwnProfile).toHaveBeenCalledWith('user-1');
    expect(field(shadowRoot, 'fullName').value).toBe('Ada Lovelace');
    expect(field(shadowRoot, 'handle').value).toBe('ada');
    expect(screen.getByShadowRole('link', { name: '/members/ada' })).toHaveAttribute(
      'href',
      '/members/ada',
    );
  });

  it('asks a student for a program and school instead of a job', async () => {
    const { shadowRoot } = await renderSignedIn({ ...own, memberType: 'student' });

    expect(field(shadowRoot, 'program')).not.toBeNull();
    expect(field(shadowRoot, 'jobTitle')).toBeNull();
  });

  it('saves the profile with the links made into full addresses', async () => {
    vi.mocked(saveOwnProfile).mockResolvedValue();
    const dispatch = vi.spyOn(store, 'dispatch');
    const { element } = await renderSignedIn();
    await type(element, 'linkedinUrl', 'linkedin.com/in/ada');

    fireEvent.click(saveButton());

    await vi.waitFor(() => expect(saveOwnProfile).toHaveBeenCalled());
    expect(saveOwnProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ linkedinUrl: 'https://linkedin.com/in/ada', handle: 'ada' }),
    );
    await vi.waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'snackbars/queueSnackbar', payload: 'Profile saved.' }),
      ),
    );
  });

  it('lowercases the handle and says what is wrong with a bad one', async () => {
    const { element, shadowRoot } = await renderSignedIn();
    await type(element, 'handle', '-Bad Handle');

    fireEvent.click(saveButton());
    await element.updateComplete;

    expect(saveOwnProfile).not.toHaveBeenCalled();
    expect(field(shadowRoot, 'handle')).toHaveAttribute(
      'error',
      'Use only lowercase letters, numbers and hyphens.',
    );
  });

  it('needs a handle and a name to show the profile to everyone', async () => {
    const { element, shadowRoot } = await renderSignedIn({ ...own, handle: '', fullName: '' });

    fireEvent.click(saveButton());
    await element.updateComplete;

    expect(saveOwnProfile).not.toHaveBeenCalled();
    expect(field(shadowRoot, 'handle')).toHaveAttribute('error');
    expect(field(shadowRoot, 'fullName')).toHaveAttribute('error');
  });

  it('only takes a LinkedIn address in the LinkedIn box', async () => {
    const { element, shadowRoot } = await renderSignedIn();
    await type(element, 'linkedinUrl', 'github.com/ada');

    fireEvent.click(saveButton());
    await element.updateComplete;

    expect(saveOwnProfile).not.toHaveBeenCalled();
    expect(field(shadowRoot, 'linkedinUrl')).toHaveAttribute(
      'error',
      'This link is for a different site.',
    );
  });

  it('says when the handle is taken', async () => {
    vi.mocked(saveOwnProfile).mockRejectedValue(new HandleTakenError());
    const { element, shadowRoot } = await renderSignedIn();

    fireEvent.click(saveButton());

    await vi.waitFor(() =>
      expect(field(shadowRoot, 'handle').getAttribute('error')).toContain('is taken'),
    );
    await element.updateComplete;
  });

  it('shows when they joined and their exclusive membership', async () => {
    const { shadowRoot } = await renderSignedIn({ ...own, isExclusiveMember: true });

    expect(shadowRoot).toHaveTextContent('Member since August 2026');
    expect(shadowRoot).toHaveTextContent('Exclusive member');
  });

  it('points a member with no handle to the address older links use', async () => {
    await renderSignedIn({ ...own, handle: '' });

    expect(screen.getByShadowRole('link', { name: '/profile/user-1' })).toHaveAttribute(
      'href',
      '/profile/user-1',
    );
  });

  it('checks that a new handle is free and says so', async () => {
    vi.mocked(isHandleAvailable).mockResolvedValue(true);
    const { element, shadowRoot } = await renderSignedIn();

    await type(element, 'handle', 'ada-l');

    await vi.waitFor(() => expect(isHandleAvailable).toHaveBeenCalledWith('ada-l'));
    await vi.waitFor(() =>
      expect(field(shadowRoot, 'handle').getAttribute('hint')).toContain('ada-l is available'),
    );
  });

  it('says a handle is taken and does not save it', async () => {
    vi.mocked(isHandleAvailable).mockResolvedValue(false);
    const { element, shadowRoot } = await renderSignedIn();
    await type(element, 'handle', 'taken-one');
    await vi.waitFor(() =>
      expect(field(shadowRoot, 'handle').getAttribute('error')).toContain('is taken'),
    );

    fireEvent.click(saveButton());
    await element.updateComplete;

    expect(saveOwnProfile).not.toHaveBeenCalled();
  });

  it('does not look up a handle that is invalid, or the one they already have', async () => {
    const { element } = await renderSignedIn();

    await type(element, 'handle', 'ada');
    await type(element, 'handle', 'Bad Handle');
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(isHandleAvailable).not.toHaveBeenCalled();
  });

  it('saves a chosen photo, cut to a square', async () => {
    vi.mocked(uploadAvatar).mockResolvedValue('https://example.com/new.jpg?v=1');
    const { element, shadowRoot } = await renderSignedIn();
    const input = deepQuerySelector<HTMLInputElement>(shadowRoot, 'input[type="file"]')!;
    const photo = new File(['photo'], 'me.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [photo], configurable: true });

    input.dispatchEvent(new Event('change'));

    await vi.waitFor(() => expect(uploadAvatar).toHaveBeenCalledWith('user-1', expect.any(Blob)));
    await vi.waitFor(() =>
      expect(element['form'].avatarUrl).toBe('https://example.com/new.jpg?v=1'),
    );
  });

  it('refuses a file that is not a photo', async () => {
    const dispatch = vi.spyOn(store, 'dispatch');
    const { shadowRoot } = await renderSignedIn();
    const input = deepQuerySelector<HTMLInputElement>(shadowRoot, 'input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'cv.pdf', { type: 'application/pdf' })],
      configurable: true,
    });

    input.dispatchEvent(new Event('change'));

    await vi.waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: 'Choose a JPG, PNG or WebP photo.' }),
      ),
    );
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('removes the photo', async () => {
    vi.mocked(removeAvatar).mockResolvedValue();
    const { element } = await renderSignedIn({ ...own, avatarUrl: 'https://example.com/a.jpg' });

    fireEvent.click(screen.getByShadowRole('button', { name: 'Remove photo' }));

    await vi.waitFor(() => expect(removeAvatar).toHaveBeenCalledWith('user-1'));
    await vi.waitFor(() => expect(element['form'].avatarUrl).toBe(''));
  });

  it('has no accessibility violations', async () => {
    const { element } = await renderSignedIn();

    await expectNoAxeViolations(element);
  });
});
