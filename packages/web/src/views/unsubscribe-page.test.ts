import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../__tests__/helpers/axe';
import { fixture } from '../../__tests__/helpers/fixtures';
import type { HbTextField } from '../components/ui/hb-text-field';
import { unsubscribeEmail } from '../db/subscribers';
import type { UnsubscribePage } from './unsubscribe-page';
import './unsubscribe-page';

vi.mock('../db/subscribers', () => ({ unsubscribeEmail: vi.fn() }));
vi.mock('../utils/metadata');

const render = async (search = '') => {
  window.history.pushState({}, '', `/unsubscribe${search}`);
  const result = await fixture<UnsubscribePage>(html`<unsubscribe-page></unsubscribe-page>`);
  await result.element.updateComplete;
  return result;
};

const field = (shadowRoot: ShadowRoot) =>
  deepQuerySelector<HbTextField>(shadowRoot, 'hb-text-field[name="email"]')!;

const type = async (element: UnsubscribePage, value: string) => {
  const input = field(element.shadowRoot!);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await element.updateComplete;
};

describe('unsubscribe-page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
    window.history.pushState({}, '', '/');
  });

  it('asks for the email, with no sign-in', async () => {
    const { shadowRoot } = await render();

    expect(shadowRoot).toHaveTextContent('Stop getting updates from N.O.D.E. by email.');
    expect(field(shadowRoot)).toHaveAttribute('required');
    expect(screen.getByShadowRole('button', { name: 'Unsubscribe' })).toBeInTheDocument();
  });

  it('fills in the email from a link, so the person only confirms', async () => {
    const { shadowRoot } = await render('?email=ada%40example.com');

    expect(field(shadowRoot).value).toBe('ada@example.com');
  });

  it('unsubscribes the email and says so without saying whether it was on the list', async () => {
    vi.mocked(unsubscribeEmail).mockResolvedValue();
    const { element, shadowRoot } = await render();
    await type(element, ' ada@example.com ');
    field(shadowRoot).reportValidity = () => true;

    fireEvent.click(screen.getByShadowRole('button', { name: 'Unsubscribe' }));

    await vi.waitFor(() => expect(unsubscribeEmail).toHaveBeenCalledWith('ada@example.com'));
    await vi.waitFor(() => expect(shadowRoot).toHaveTextContent('If that email was on our list'));
    expect(field(shadowRoot)).toBeNull();
  });

  it('says so when it could not unsubscribe, and lets them try again', async () => {
    vi.mocked(unsubscribeEmail).mockRejectedValue(new Error('network'));
    const { element, shadowRoot } = await render();
    await type(element, 'ada@example.com');
    field(shadowRoot).reportValidity = () => true;

    fireEvent.click(screen.getByShadowRole('button', { name: 'Unsubscribe' }));

    await vi.waitFor(() =>
      expect(field(shadowRoot)).toHaveAttribute(
        'error',
        'Could not unsubscribe. Please try again.',
      ),
    );
  });

  it('does nothing for an email that is not valid', async () => {
    const { element, shadowRoot } = await render();
    await type(element, 'nope');
    field(shadowRoot).reportValidity = () => false;

    fireEvent.click(screen.getByShadowRole('button', { name: 'Unsubscribe' }));
    await element.updateComplete;

    expect(unsubscribeEmail).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
