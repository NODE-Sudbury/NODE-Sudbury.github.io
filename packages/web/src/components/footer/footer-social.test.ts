import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { html } from 'lit';
import { screen } from 'shadow-dom-testing-library';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { mailto, organizer, socialNetwork } from '../../config/site';
import { share } from '../../utils/share';
import { FOLLOW_LABELS } from './footer-social';
import './footer-social';

vi.mock('../../utils/share');

const mockShare = vi.mocked(share);

describe('footer-social', () => {
  beforeEach(() => {
    mockShare.mockClear();
  });

  it('defines a component', () => {
    expect(customElements.get('footer-social')).toBeDefined();
  });

  it('renders share buttons that call share on click', async () => {
    await fixture(html`<footer-social data-testid="footer-social"></footer-social>`);

    expect(screen.getByTestId('footer-social')).toBeInTheDocument();

    fireEvent.click(await screen.findByShadowRole('button', { name: 'Share on Facebook' }));
    expect(mockShare).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Share on X' }));
    expect(mockShare).toHaveBeenCalledTimes(2);
  });

  it('renders a social network link for each entry', async () => {
    await fixture(html`<footer-social></footer-social>`);

    for (const { name, url } of socialNetwork.follow) {
      const link = await screen.findByShadowRole('link', { name: FOLLOW_LABELS[name] ?? name });
      expect(link).toHaveAttribute('href', url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('shows only the networks that have a link, as the admins set them', async () => {
    const { follow } = socialNetwork;
    const [first, ...others] = follow;
    expect(first).toBeDefined();
    socialNetwork.follow = [first!];

    try {
      await fixture(html`<footer-social></footer-social>`);

      expect(
        screen.getByShadowRole('link', { name: FOLLOW_LABELS[first!.name] ?? first!.name }),
      ).toHaveAttribute('href', first!.url);
      for (const { name } of others) {
        expect(
          screen.queryByShadowRole('link', { name: FOLLOW_LABELS[name] ?? name }),
        ).not.toBeInTheDocument();
      }
    } finally {
      socialNetwork.follow = follow;
    }
  });

  it('leaves out the Follow us heading when no network has a link', async () => {
    const { follow } = socialNetwork;
    socialNetwork.follow = [];

    try {
      const { shadowRoot } = await fixture(html`<footer-social></footer-social>`);

      expect(shadowRoot).not.toHaveTextContent('Follow us');
      // The rest of the footer is still there.
      expect(shadowRoot).toHaveTextContent('Share');
      expect(screen.getByShadowRole('link', { name: 'Email us' })).toBeInTheDocument();
    } finally {
      socialNetwork.follow = follow;
    }
  });

  it('renders the email link', async () => {
    await fixture(html`<footer-social></footer-social>`);

    expect(screen.getByShadowRole('link', { name: 'Email us' })).toHaveAttribute(
      'href',
      `mailto:${mailto}`,
    );
  });

  it('renders the blog link', async () => {
    await fixture(html`<footer-social></footer-social>`);

    expect(screen.getByShadowRole('link', { name: 'Blog' })).toHaveAttribute(
      'href',
      organizer.blog,
    );
  });

  it('leaves out the blog link when the organizer has no blog', async () => {
    const { blog } = organizer;
    delete (organizer as { blog?: string }).blog;

    try {
      await fixture(html`<footer-social></footer-social>`);

      expect(screen.queryByShadowRole('link', { name: 'Blog' })).not.toBeInTheDocument();
    } finally {
      organizer.blog = blog;
    }
  });
});
