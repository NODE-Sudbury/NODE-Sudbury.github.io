import { Success } from '@abraham/remotedata';
import { msg } from '@lit/localize';
import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { fromStore } from '../../controllers/from-store';
import type { Member } from '../../models/member';
import { band } from '../../styles/band';
import { selectTeamsAndMembers } from '../../store/teams-members/selectors';
import type { initialTeamsMembersState } from '../../store/teams-members/state';
import '../shared/node-icon';
import '../shared/speaker-card';
import { isPlaceholderMember, memberCardSpeaker, memberPath } from '../../utils/members';
import { ThemedComponent } from '../themed-component';
import '../ui/hb-button';

/** The board: every member of the first team, in order, and a link to the team page. */
@customElement('board-block')
export class BoardBlock extends ThemedComponent {
  static override styles = [
    band,
    css`
      .board {
        container-type: inline-size;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(min(100%, calc(17rem * var(--hb-card-scale, 1))), 1fr)
        );
        gap: var(--hb-space-5);
      }

      .grid > li {
        display: grid;
      }

      @container (width < 480px) {
        .grid {
          grid-template-columns: minmax(0, 1fr);
          gap: var(--hb-space-3);
        }
      }
    `,
  ];

  @fromStore((state) => selectTeamsAndMembers(state))
  accessor teamsMembers!: typeof initialTeamsMembersState;

  override render() {
    return html`
      <div class="inner">
        <div class="band-header">
          <h2 class="band-title">${msg('Board Members', { id: 'home.board-block.title' })}</h2>
          <hb-button variant="outlined" class="cta-button" href="/team" trailing-icon>
            ${msg('Meet the Board', { id: 'home.board-block.cta' })}
            <node-icon slot="icon" name="arrow-right-circle"></node-icon>
          </hb-button>
        </div>

        <div class="board">
          <ul class="grid plain">
            ${this.members.map(
              (member) =>
                html`<li>
                  <speaker-card
                    .speaker="${memberCardSpeaker(member)}"
                    href="${memberPath(member)}"
                    .linked="${!isPlaceholderMember(member)}"
                  ></speaker-card>
                </li>`,
            )}
          </ul>
        </div>
      </div>
    `;
  }

  get members(): Member[] {
    if (!(this.teamsMembers instanceof Success)) return [];
    const [board] = this.teamsMembers.data;
    return [...(board?.members ?? [])].sort((a, b) => a.order - b.order);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'board-block': BoardBlock;
  }
}
