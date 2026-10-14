import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html, nothing, render as litRender } from 'lit';
import { fixture } from '../../__tests__/helpers/fixtures';
import { expectNoAxeViolations } from '../../__tests__/helpers/axe';
import { fetchPublicProfile } from '../db/member-profiles';
import type { PublicProfile } from '../models/member-profile';
import { updateTextMetadata } from '../utils/metadata';
import { profileKeyFromPath, type PublicProfilePage } from './public-profile-page';
import './public-profile-page';

vi.mock('../db/member-profiles');
vi.mock('../utils/metadata');

const ada: PublicProfile = {
  id: 'cea1bd28-92ce-42ef-98b0-0c1967f1355a',
  createdAt: '2026-08-29T01:11:00Z',
  isExclusiveMember: true,
  handle: 'ada',
  fullName: 'Ada Lovelace',
  avatarUrl: 'https://example.com/ada.jpg',
  memberType: 'professional',
  jobTitle: 'Engineer',
  company: 'Analytical Engines',
  school: '',
  program: '',
  bio: 'I write programs.',
  pronouns: 'she/her',
  linkedinUrl: 'https://linkedin.com/in/ada',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
};

const render = async (path: string) => {
  window.history.pushState({}, '', path);
  const result = await fixture<PublicProfilePage>(
    html`<public-profile-page></public-profile-page>`,
  );
  // The profile loads after the first render.
  await vi.waitFor(() => expect(result.element['load']).not.toBe('loading'));
  await result.element.updateComplete;
  return result;
};

describe('profileKeyFromPath', () => {
  it('reads the handle in a /members address, in lowercase', () => {
    expect(profileKeyFromPath('/members/Ada')).toEqual({ handle: 'ada' });
    expect(profileKeyFromPath('/members/ada/')).toEqual({ handle: 'ada' });
  });

  it('reads the id in an older /profile address', () => {
    expect(profileKeyFromPath('/profile/CEA1BD28-92CE-42EF-98B0-0C1967F1355A')).toEqual({
      id: 'cea1bd28-92ce-42ef-98b0-0c1967f1355a',
    });
  });

  it('has none for the bare page, a broken address or an id that is not one', () => {
    expect(profileKeyFromPath('/members')).toBeUndefined();
    expect(profileKeyFromPath('/members/%E0%A4%A')).toBeUndefined();
    expect(profileKeyFromPath('/profile/not-an-id')).toBeUndefined();
  });
});

describe('public-profile-page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
    window.history.pushState({}, '', '/');
  });

  it('shows the member, their headline, links and bio', async () => {
    vi.mocked(fetchPublicProfile).mockResolvedValue(ada);

    const { shadowRoot } = await render('/members/ada');

    expect(fetchPublicProfile).toHaveBeenCalledWith({ handle: 'ada' });
    expect(shadowRoot.querySelector('short-markdown')).toHaveProperty(
      'content',
      'I write programs.',
    );
    expect(shadowRoot.querySelector('h1')).toHaveTextContent('Ada Lovelace');
    expect(shadowRoot.querySelector('.headline')).toHaveTextContent(
      'Engineer at Analytical Engines',
    );
    expect(shadowRoot.querySelector('.pronouns')).toHaveTextContent('she/her');
    const links = [...shadowRoot.querySelectorAll('a.link')];
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://linkedin.com/in/ada');
    expect(links[0]).toHaveTextContent('LinkedIn');
    expect(updateTextMetadata).toHaveBeenCalledWith(
      'Ada Lovelace',
      'Engineer at Analytical Engines',
    );
  });

  it('shows who they are: type, exclusive membership and when they joined', async () => {
    vi.mocked(fetchPublicProfile).mockResolvedValue(ada);

    const { shadowRoot } = await render('/members/ada');

    expect(shadowRoot).toHaveTextContent('Professional');
    expect(shadowRoot).toHaveTextContent('Exclusive member');
    expect(shadowRoot).toHaveTextContent('Member since August 2026');
  });

  it('opens an older /profile/<id> link and moves it to the handle address', async () => {
    vi.mocked(fetchPublicProfile).mockResolvedValue(ada);
    const replace = vi.spyOn(window.history, 'replaceState');

    await render(`/profile/${ada.id}`);

    expect(fetchPublicProfile).toHaveBeenCalledWith({ id: ada.id });
    expect(replace).toHaveBeenCalledWith(null, '', '/members/ada');
  });

  it('keeps the older address for a member who has no handle', async () => {
    vi.mocked(fetchPublicProfile).mockResolvedValue({ ...ada, handle: '' });
    const replace = vi.spyOn(window.history, 'replaceState');

    await render(`/profile/${ada.id}`);

    expect(replace).not.toHaveBeenCalledWith(null, '', expect.stringContaining('/members/'));
  });

  it('says when the profile is private or there is no such handle', async () => {
    vi.mocked(fetchPublicProfile).mockResolvedValue(undefined);

    const { shadowRoot } = await render('/members/nobody');

    expect(shadowRoot.querySelector('h1')).toHaveTextContent('Profile not found');
    expect(shadowRoot).toHaveTextContent('private, or there is no member');
  });

  it('does not look anything up for the bare page', async () => {
    const { shadowRoot } = await render('/members');

    expect(fetchPublicProfile).not.toHaveBeenCalled();
    expect(shadowRoot.querySelector('h1')).toHaveTextContent('Profile not found');
  });

  it('says so when loading fails', async () => {
    vi.mocked(fetchPublicProfile).mockRejectedValue(new Error('offline'));

    const { shadowRoot } = await render('/members/ada');

    expect(shadowRoot).toHaveTextContent('An error has occurred');
  });

  it('has no accessibility violations', async () => {
    vi.mocked(fetchPublicProfile).mockResolvedValue(ada);

    const { element } = await render('/members/ada');

    await expectNoAxeViolations(element);
  });
});
