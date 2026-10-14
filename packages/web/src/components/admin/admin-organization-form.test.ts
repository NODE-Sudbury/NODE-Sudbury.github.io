import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { fetchOrganization, saveOrganization } from '../../db/admin-organizations';
import type { Organization } from '../../models/organization';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminOrganizationForm } from './admin-organization-form';
import './admin-organization-form';

vi.mock('../../db/admin-organizations', () => ({
  fetchOrganization: vi.fn(),
  saveOrganization: vi.fn(),
}));

const assign = vi.fn();

const render = async (search = '') => {
  // The form reads the address it was opened with, and `assign` goes to the spy.
  vi.stubGlobal('location', { search, assign });
  const result = await fixture<AdminOrganizationForm>(
    html`<admin-organization-form></admin-organization-form>`,
  );
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

const field = (shadowRoot: ShadowRoot, name: string) =>
  deepQuerySelector<HbTextField>(shadowRoot, `hb-text-field[name="${name}"]`)!;

const type = async (element: AdminOrganizationForm, name: string, value: string) => {
  const input = field(element.shadowRoot!, name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await element.updateComplete;
};

const chooseLogo = async (element: AdminOrganizationForm, file: File) => {
  const input = deepQuerySelector<HTMLInputElement>(element.shadowRoot!, 'input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await element.updateComplete;
};

const existing: Organization = {
  id: 'o1',
  kind: 'sponsor',
  name: 'Acme',
  websiteUrl: 'https://acme.example/',
  logoPath: 'a.png',
  logoUrl: 'https://cdn.example/a.png',
  tier: 'silver',
  sortOrder: 0,
};

describe('admin-organization-form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    litRender(nothing, document.body);
    vi.unstubAllGlobals();
  });

  it('starts as a new sponsor, with a tier to choose', async () => {
    const { shadowRoot } = await render();

    expect(screen.getByShadowRole('radio', { name: 'Sponsor' })).toBeChecked();
    expect(screen.getByShadowRole('combobox')).toBeInTheDocument();
    expect(shadowRoot).toHaveTextContent('No logo yet');
  });

  it('starts as a new partner, with no tier, when the address says so', async () => {
    await render('?kind=partner');

    expect(screen.getByShadowRole('radio', { name: 'Partner' })).toBeChecked();
    expect(screen.queryByShadowRole('combobox')).toBeNull();
  });

  it('needs a name, and a website that is a web address', async () => {
    const { element, shadowRoot } = await render();
    await type(element, 'websiteUrl', 'not a site');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add' }));
    await element.updateComplete;

    expect(saveOrganization).not.toHaveBeenCalled();
    expect(field(shadowRoot, 'name')).toHaveAttribute('error', 'Add a name.');
    expect(field(shadowRoot, 'websiteUrl')).toHaveAttribute(
      'error',
      'Enter a web address, such as example.com.',
    );
  });

  it('refuses a logo that is not an image, or is too big', async () => {
    const { element, shadowRoot } = await render();

    await chooseLogo(element, new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    expect(shadowRoot).toHaveTextContent('Choose a JPG, PNG, WebP or SVG logo.');

    await chooseLogo(
      element,
      new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' }),
    );
    expect(shadowRoot).toHaveTextContent('That logo is over 2 MB.');
    expect(shadowRoot).toHaveTextContent('No logo yet');
  });

  it('saves a new sponsor with the logo and goes back to the list', async () => {
    vi.mocked(saveOrganization).mockResolvedValue();
    const { element } = await render();
    await type(element, 'name', ' Acme ');
    await type(element, 'websiteUrl', 'acme.example');
    const logo = new File(['png'], 'logo.png', { type: 'image/png' });
    await chooseLogo(element, logo);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add' }));

    await vi.waitFor(() => expect(saveOrganization).toHaveBeenCalled());
    expect(saveOrganization).toHaveBeenCalledWith(
      {
        kind: 'sponsor',
        name: ' Acme ',
        websiteUrl: 'https://acme.example/',
        tier: 'community',
        logo,
      },
      undefined,
    );
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/admin/sponsors'));
  });

  it('loads one to edit, keeps its logo, and goes back to the Partners tab for a partner', async () => {
    vi.mocked(fetchOrganization).mockResolvedValue({
      ...existing,
      kind: 'partner',
      tier: undefined,
    });
    vi.mocked(saveOrganization).mockResolvedValue();
    const { element, shadowRoot } = await render('?kind=partner&id=o1');

    expect(fetchOrganization).toHaveBeenCalledWith('partner', 'o1');
    expect(field(shadowRoot, 'name').value).toBe('Acme');
    expect(screen.getByShadowRole('radio', { name: 'Partner' })).toBeDisabled();
    await type(element, 'name', 'Acme Inc');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(saveOrganization).toHaveBeenCalled());
    const [input] = vi.mocked(saveOrganization).mock.calls[0]!;
    expect(input).toMatchObject({ id: 'o1', kind: 'partner', name: 'Acme Inc' });
    expect(input).not.toHaveProperty('logo');
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/admin/sponsors?tab=partners'));
  });

  it('says so when the one to edit is not there', async () => {
    vi.mocked(fetchOrganization).mockResolvedValue(undefined);
    const { shadowRoot } = await render('?kind=sponsor&id=nope');

    expect(shadowRoot).toHaveTextContent('That sponsor or partner could not be found.');
  });

  it('stays on the page when saving fails', async () => {
    vi.mocked(saveOrganization).mockRejectedValue(new Error('denied'));
    const { element } = await render();
    await type(element, 'name', 'Acme');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add' }));

    await vi.waitFor(() => expect(saveOrganization).toHaveBeenCalled());
    await vi.waitFor(() => expect(element['saving']).toBe(false));
    expect(assign).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
