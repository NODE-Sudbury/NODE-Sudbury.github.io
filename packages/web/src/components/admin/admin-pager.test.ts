import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { type AdminPager, type PageChange } from './admin-pager';
import './admin-pager';

const render = async (total: number, page = 1, pageSize = 10) => {
  const changes: PageChange[] = [];
  const result = await fixture<AdminPager>(
    html`<admin-pager
      .total="${total}"
      .page="${page}"
      .pageSize="${pageSize}"
      @pagechange="${(event: CustomEvent<PageChange>) => changes.push(event.detail)}"
    ></admin-pager>`,
  );
  await result.element.updateComplete;
  return { ...result, changes };
};

describe('admin-pager', () => {
  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('offers 10, 30 and 50 rows a page, and shows the page as 1 of 3', async () => {
    const { shadowRoot } = await render(25);

    const select = deepQuerySelector<HTMLSelectElement>(shadowRoot, 'select')!;
    expect([...select.options].map((option) => option.value)).toEqual(['10', '30', '50']);
    expect(select.value).toBe('10');
    expect(shadowRoot).toHaveTextContent('1 of 3');
    expect(screen.getByShadowRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByShadowRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('asks for the next and the previous page', async () => {
    const { changes } = await render(25, 2);

    fireEvent.click(screen.getByShadowRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByShadowRole('button', { name: 'Previous page' }));

    expect(changes).toEqual([
      { page: 3, pageSize: 10 },
      { page: 1, pageSize: 10 },
    ]);
  });

  it('goes back to page 1 when the rows per page change', async () => {
    const { shadowRoot, changes } = await render(25, 3);
    const select = deepQuerySelector<HTMLSelectElement>(shadowRoot, 'select')!;

    select.value = '30';
    fireEvent.change(select);

    expect(changes).toEqual([{ page: 1, pageSize: 30 }]);
  });

  it('is 1 of 1 for a short list, and keeps both buttons off', async () => {
    const { shadowRoot } = await render(3);

    expect(shadowRoot).toHaveTextContent('1 of 1');
    expect(screen.getByShadowRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByShadowRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('shows the last page when the list shrinks under the page', async () => {
    const { shadowRoot } = await render(12, 5);

    expect(shadowRoot).toHaveTextContent('2 of 2');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render(25);

    await expectNoAxeViolations(element);
  });
});
