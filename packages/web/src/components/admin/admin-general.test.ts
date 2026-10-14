import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { fetchSocialLinks, saveSocialLinks } from '../../db/admin-settings';
import { store } from '../../store';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminGeneral } from './admin-general';
import './admin-general';

vi.mock('../../db/admin-settings', () => ({
  fetchSocialLinks: vi.fn(),
  saveSocialLinks: vi.fn(),
}));

const saved = {
  social_x: 'https://x.com/nodesudbury',
  social_instagram: 'https://www.instagram.com/nodesudbury',
  social_facebook: '',
  social_linkedin: 'https://www.linkedin.com/company/node',
};

const render = async () => {
  vi.mocked(fetchSocialLinks).mockResolvedValue(saved);
  const result = await fixture<AdminGeneral>(html`<admin-general></admin-general>`);
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

const field = (shadowRoot: ShadowRoot, name: string) =>
  deepQuerySelector<HbTextField>(shadowRoot, `hb-text-field[name="${name}"]`)!;

const type = async (element: AdminGeneral, name: string, value: string) => {
  const input = field(element.shadowRoot!, name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await element.updateComplete;
};

describe('admin-general', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('shows the four saved links, and says an empty one is hidden from the footer', async () => {
    const { shadowRoot } = await render();

    expect(field(shadowRoot, 'social_x').value).toBe('https://x.com/nodesudbury');
    expect(field(shadowRoot, 'social_linkedin').value).toBe(
      'https://www.linkedin.com/company/node',
    );
    expect(field(shadowRoot, 'social_facebook').value).toBe('');
    expect(field(shadowRoot, 'social_facebook')).toHaveAttribute(
      'hint',
      'Empty: hidden from the footer.',
    );
    expect(field(shadowRoot, 'social_x')).toHaveAttribute('hint', '');
    expect(shadowRoot).toHaveTextContent('Leave a box empty to hide that network from the footer.');
  });

  it('keeps Save off until something changes, and Cancel puts the saved links back', async () => {
    const { element } = await render();
    expect(screen.getByShadowRole('button', { name: 'Save' })).toBeDisabled();

    await type(element, 'social_x', 'https://x.com/other');
    expect(screen.getByShadowRole('button', { name: 'Save' })).toBeEnabled();

    fireEvent.click(screen.getByShadowRole('button', { name: 'Cancel' }));
    await element.updateComplete;
    expect(field(element.shadowRoot!, 'social_x').value).toBe('https://x.com/nodesudbury');
    expect(screen.getByShadowRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves a changed link, and a cleared one as empty', async () => {
    vi.mocked(saveSocialLinks).mockResolvedValue();
    const dispatch = vi.spyOn(store, 'dispatch');
    const { element } = await render();
    await type(element, 'social_x', 'x.com/nodesudbury2');
    await type(element, 'social_instagram', '');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Save' }));

    await vi.waitFor(() => expect(saveSocialLinks).toHaveBeenCalled());
    expect(saveSocialLinks).toHaveBeenCalledWith({
      social_x: 'https://x.com/nodesudbury2',
      social_instagram: '',
      social_facebook: '',
      social_linkedin: 'https://www.linkedin.com/company/node',
    });
    await vi.waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload:
            'Saved. The footer shows the new links in about two minutes, once the site has rebuilt.',
        }),
      ),
    );
    await vi.waitFor(() =>
      expect(screen.getByShadowRole('button', { name: 'Save' })).toBeDisabled(),
    );
  });

  it('only takes the right site in each box', async () => {
    const { element, shadowRoot } = await render();
    await type(element, 'social_x', 'instagram.com/nodesudbury');
    await type(element, 'social_facebook', 'not a link');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Save' }));
    await element.updateComplete;

    expect(saveSocialLinks).not.toHaveBeenCalled();
    expect(field(shadowRoot, 'social_x')).toHaveAttribute(
      'error',
      'This link is for a different site.',
    );
    expect(field(shadowRoot, 'social_facebook')).toHaveAttribute(
      'error',
      'Enter a web address, such as example.com.',
    );
  });

  it('says so when the links cannot be loaded, and has no form then', async () => {
    vi.mocked(fetchSocialLinks).mockRejectedValue(new Error('down'));
    const { element, shadowRoot } = await fixture<AdminGeneral>(
      html`<admin-general></admin-general>`,
    );
    await vi.waitFor(() => expect(element['loading']).toBe(false));
    await element.updateComplete;

    expect(shadowRoot).toHaveTextContent('The links could not be loaded.');
    expect(deepQuerySelector(shadowRoot, 'form')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
