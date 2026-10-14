import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import {
  CardLinkTakenError,
  deleteBoardMember,
  fetchBoardMembers,
  saveBoardMember,
} from '../../db/admin-board';
import type { AdminMember } from '../../models/admin-member';
import type { BoardMember } from '../../models/board-member';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminBoards } from './admin-boards';
import './admin-boards';

vi.mock('../../db/admin-board', () => ({
  fetchBoardMembers: vi.fn(),
  saveBoardMember: vi.fn(),
  deleteBoardMember: vi.fn(),
  CardLinkTakenError: class CardLinkTakenError extends Error {},
}));

const card = (over: Partial<BoardMember>): BoardMember => ({
  id: 'b1',
  name: 'Hannan',
  title: 'Technical Lead',
  photoPath: 'h.jpg',
  photoUrl: 'https://cdn.example/h.jpg',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  userId: 'm1',
  sortOrder: 0,
  ...over,
});

const cards = [
  card({}),
  card({ id: 'b2', name: 'Dean Lupini', title: 'President', userId: undefined, photoUrl: '' }),
];

const member = (id: string, fullName: string): AdminMember => ({
  id,
  createdAt: '2026-08-29T01:11:00Z',
  email: `${id}@example.com`,
  isExclusiveMember: false,
  isActive: true,
  isPublic: true,
  handle: '',
  fullName,
  avatarUrl: '',
  memberType: 'professional',
  jobTitle: '',
  company: '',
  school: '',
  program: '',
});

const members = [member('m1', 'Hannan Max'), member('m2', 'Karan Tutlani')];

const render = async (canManage = true) => {
  vi.mocked(fetchBoardMembers).mockResolvedValue(cards);
  const result = await fixture<AdminBoards>(
    html`<admin-boards .members="${members}" ?canManage="${canManage}"></admin-boards>`,
  );
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

const field = (shadowRoot: ShadowRoot, name: string) =>
  deepQuerySelector<HbTextField>(shadowRoot, `hb-text-field[name="${name}"]`)!;

const type = async (element: AdminBoards, name: string, value: string) => {
  const input = field(element.shadowRoot!, name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await element.updateComplete;
};

describe('admin-boards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('tables the cards with their title and linked account, and says the home page is separate', async () => {
    const { shadowRoot } = await render();

    expect(shadowRoot).toHaveTextContent('2 board members');
    const rows = screen.getAllByShadowRole('row');
    expect(rows[1]).toHaveTextContent('Hannan');
    expect(rows[1]).toHaveTextContent('Technical Lead');
    expect(rows[1]).toHaveTextContent('m1@example.com');
    expect(rows[2]).toHaveTextContent('Dean Lupini');
    expect(rows[2]).toHaveTextContent('Not linked');
    expect(shadowRoot).toHaveTextContent('The home page keeps its own board for now.');
  });

  it('searches by name, title or the linked account', async () => {
    const { element, shadowRoot } = await render();

    await type(element, 'search', 'president');
    expect(screen.getAllByShadowRole('row')).toHaveLength(2);
    expect(shadowRoot).toHaveTextContent('1 of 2 board members');

    await type(element, 'search', 'hannan max');
    expect(screen.getAllByShadowRole('row')[1]).toHaveTextContent('Technical Lead');
  });

  it('shows no buttons to change anything to someone who cannot manage the board', async () => {
    await render(false);

    expect(screen.queryByShadowRole('button', { name: 'Add board member' })).toBeNull();
    expect(screen.queryByShadowRole('button', { name: 'Edit Hannan' })).toBeNull();
    expect(screen.queryByShadowRole('button', { name: 'Delete Hannan' })).toBeNull();
  });

  it('needs a name, and links that go with their site', async () => {
    const { element, shadowRoot } = await render();
    fireEvent.click(screen.getByShadowRole('button', { name: 'Add board member' }));
    await element.updateComplete;
    await type(element, 'linkedinUrl', 'github.com/ada');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add' }));
    await element.updateComplete;

    expect(saveBoardMember).not.toHaveBeenCalled();
    expect(field(shadowRoot, 'name')).toHaveAttribute('error', 'Add a name.');
    expect(field(shadowRoot, 'linkedinUrl')).toHaveAttribute(
      'error',
      'This link is for a different site.',
    );
  });

  it('adds a card with a title, a photo and a linked account', async () => {
    vi.mocked(saveBoardMember).mockResolvedValue();
    const { element, shadowRoot } = await render();
    fireEvent.click(screen.getByShadowRole('button', { name: 'Add board member' }));
    await element.updateComplete;
    await type(element, 'name', 'Karan');
    await type(element, 'title', 'Marketing');
    const select = deepQuerySelector<HTMLSelectElement>(shadowRoot, 'select')!;
    // Hannan Max already has a card, so Karan Tutlani is the one to pick.
    expect([...select.options].map((option) => option.value)).toEqual(['', 'm2']);
    select.value = 'm2';
    fireEvent.change(select);
    const photo = new File(['jpg'], 'karan.jpg', { type: 'image/jpeg' });
    const input = deepQuerySelector<HTMLInputElement>(shadowRoot, 'input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [photo], configurable: true });
    input.dispatchEvent(new Event('change'));
    await element.updateComplete;

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add' }));

    await vi.waitFor(() => expect(saveBoardMember).toHaveBeenCalled());
    expect(saveBoardMember).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Karan', title: 'Marketing', userId: 'm2', photo }),
      undefined,
    );
    await vi.waitFor(() => expect(fetchBoardMembers).toHaveBeenCalledTimes(2));
  });

  it('changes a card, and the account it is linked to stays pickable', async () => {
    vi.mocked(saveBoardMember).mockResolvedValue();
    const { element, shadowRoot } = await render();

    fireEvent.click(screen.getByShadowRole('button', { name: 'Edit Hannan' }));
    await element.updateComplete;

    expect(field(shadowRoot, 'name').value).toBe('Hannan');
    expect(field(shadowRoot, 'title').value).toBe('Technical Lead');
    const select = deepQuerySelector<HTMLSelectElement>(shadowRoot, 'select')!;
    expect(select.value).toBe('m1');
    await type(element, 'title', 'Technical Lead and Founder');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(saveBoardMember).toHaveBeenCalled());
    const [saved, existing] = vi.mocked(saveBoardMember).mock.calls[0]!;
    expect(saved).toMatchObject({ id: 'b1', title: 'Technical Lead and Founder', userId: 'm1' });
    expect(saved).not.toHaveProperty('photo');
    expect(existing).toBe(cards[0]);
  });

  it('says so when the member picked already has a card', async () => {
    vi.mocked(saveBoardMember).mockRejectedValue(new CardLinkTakenError());
    const { element, shadowRoot } = await render();
    fireEvent.click(screen.getByShadowRole('button', { name: 'Add board member' }));
    await element.updateComplete;
    await type(element, 'name', 'Karan');

    fireEvent.click(screen.getByShadowRole('button', { name: 'Add' }));

    await vi.waitFor(() =>
      expect(shadowRoot).toHaveTextContent('That member already has a card. Choose someone else.'),
    );
  });

  it('asks before deleting, and then removes the card', async () => {
    vi.mocked(deleteBoardMember).mockResolvedValue();
    const { element, shadowRoot } = await render();

    fireEvent.click(screen.getByShadowRole('button', { name: 'Delete Dean Lupini' }));
    await element.updateComplete;
    expect(
      deepQuerySelector(shadowRoot, 'hb-dialog[heading="Delete Dean Lupini?"]'),
    ).toBeInTheDocument();
    expect(deleteBoardMember).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByShadowRole('button', { name: 'Delete' }).at(-1)!);

    await vi.waitFor(() => expect(deleteBoardMember).toHaveBeenCalledWith(cards[1]));
    await vi.waitFor(() => expect(screen.getAllByShadowRole('row')).toHaveLength(2));
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
