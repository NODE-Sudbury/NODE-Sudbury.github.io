import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html, nothing, render as litRender } from 'lit';
import { fixture } from '../../__tests__/helpers/fixtures';
import { expectNoAxeViolations } from '../../__tests__/helpers/axe';
import { fetchPublicProfile } from '../db/member-profiles';
import type { PublicProfile } from '../models/member-profile';
import { updateTextMetadata } from '../utils/metadata';
import { handleFromPath, type PublicProfilePage } from './public-profile-page';
import './public-profile-page';

vi.mock('../db/member-profiles');
vi.mock('../utils/metadata');

const ada: PublicProfile = {
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

describe('handleFromPath', () => {
  it('reads the handle in the address, in lowercase', () => {
    expect(handleFromPath('/members/Ada')).toBe('ada');
    expect(handleFromPath('/members/ada/')).toBe('ada');
  });

  it('has none for the bare page or a broken address', () => {
    expect(handleFromPath('/members')).toBe('');
    expect(handleFromPath('/members/%E0%A4%A')).toBe('');
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

    expect(fetchPublicProfile).toHaveBeenCalledWith('ada');
    expect(shadowRoot.querySelector('short-markdown')).toHaveProperty(
      'content',
      'I write programs.',
    );
    const profile = shadowRoot.querySelector('speaker-profile');
    expect(profile?.speaker).toMatchObject({
      name: 'Ada Lovelace',
      title: 'Engineer at Analytical Engines',
      pronouns: 'she/her',
    });
    expect(shadowRoot.querySelector('social-links')?.socials).toEqual([
      { icon: 'linkedin', name: 'LinkedIn', link: 'https://linkedin.com/in/ada' },
    ]);
    expect(updateTextMetadata).toHaveBeenCalledWith(
      'Ada Lovelace',
      'Engineer at Analytical Engines',
    );
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
