import { afterEach, describe, expect, it, vi } from 'vitest';
import { html, nothing, render } from 'lit';
import { fixture } from '../../__tests__/helpers/fixtures';
import { expectNoAxeViolations } from '../../__tests__/helpers/axe';
import { privacy, terms } from '../data/legal';
import { updateTextMetadata } from '../utils/metadata';
import type { LegalPage } from './legal-page';
import './legal-page';

vi.mock('../utils/metadata');

describe('legal-page', () => {
  afterEach(() => {
    render(nothing, document.body);
  });

  it.each([privacy, terms])('shows $title, its date and every section', async (document) => {
    const { shadowRoot } = await fixture<LegalPage>(
      html`<legal-page .document="${document}"></legal-page>`,
    );

    expect(shadowRoot.querySelector('h1')).toHaveTextContent(document.title);
    expect(shadowRoot).toHaveTextContent(`Last updated ${document.updated}`);
    expect(shadowRoot.querySelectorAll('h2')).toHaveLength(document.sections.length);
    expect(updateTextMetadata).toHaveBeenCalledWith(document.title, document.description);
  });

  it('shows nothing without a document', async () => {
    const { shadowRoot } = await fixture<LegalPage>(html`<legal-page></legal-page>`);

    expect(shadowRoot.querySelector('h1')).toBeNull();
  });

  it('tells people how to reach us, and has no accessibility violations', async () => {
    const { element, shadowRoot } = await fixture<LegalPage>(
      html`<legal-page .document="${privacy}"></legal-page>`,
    );

    expect(shadowRoot).toHaveTextContent('admin@nodesudbury.com');
    await expectNoAxeViolations(element);
  });
});
