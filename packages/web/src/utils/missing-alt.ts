import { css } from 'lit';

/**
 * Images without alt text get an outline, once `highlightMissingAlt()` turns it on. An image marked
 * `aria-hidden` is decorative on purpose, such as a photo next to a label that already names it.
 */
export const missingAlt = css`
  img:not([alt]):not([aria-hidden='true']),
  img[alt='']:not([aria-hidden='true']) {
    outline: var(--hb-missing-alt-outline, none);
    /* Inside the image, so a parent with overflow: hidden doesn't clip it. */
    outline-offset: calc(-1 * var(--hb-missing-alt-width, 0px));
  }
`;

/**
 * Outlines every image without alt text in red, so maintainers notice them. The custom properties
 * reach into components' shadow roots, and the document's sheets last across page navigations.
 */
export const highlightMissingAlt = (): void => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(
    `:root {
      --hb-missing-alt-width: 8px;
      --hb-missing-alt-outline: var(--hb-missing-alt-width) solid var(--hb-color-error);
    }
    ${missingAlt.cssText}`,
  );
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
};
