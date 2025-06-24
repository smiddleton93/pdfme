/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Editor } from '@tiptap/core';

const boldSVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 4h8a4 4 0 0 1 0 8H6z"></path>
  <path d="M6 12h9a4 4 0 0 1 0 8H6z"></path>
</svg>`;

const italicSVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="19" y1="4" x2="10" y2="4"></line>
  <line x1="14" y1="20" x2="5" y2="20"></line>
  <line x1="15" y1="4" x2="9" y2="20"></line>
</svg>`;

const underlineSVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 4v6a6 6 0 0 0 12 0V4"></path>
  <line x1="4" y1="20" x2="20" y2="20"></line>
</svg>`;

export function createFloatingToolbar(editor: Editor, rootElement: HTMLElement): HTMLDivElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'floating-toolbar';
  toolbar.contentEditable = 'false';
  toolbar.style.position = 'fixed';
  toolbar.style.zIndex = '9999';
  toolbar.style.background = '#ffffff';
  toolbar.style.border = '1px solid #ddd';
  toolbar.style.borderRadius = '8px';
  toolbar.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
  toolbar.style.padding = '4px';
  toolbar.style.display = 'flex';
  toolbar.style.alignItems = 'center';
  toolbar.style.gap = '0px';

  // Helper to create buttons
  function createButton(icon: string, onExecute: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = icon;
    button.style.padding = '8px 12px';
    button.style.border = 'none';
    button.style.borderRight = '1px solid #ddd';
    button.style.background = 'transparent';
    button.style.cursor = 'pointer';
    button.style.fontSize = '18px';

    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.addEventListener('click', () => onExecute());

    return button;
  }

  toolbar.appendChild(
    createButton(underlineSVG, () => editor.chain().focus().toggleUnderline().run()),
  );
  toolbar.appendChild(createButton(boldSVG, () => editor.chain().focus().toggleBold().run()));
  toolbar.appendChild(createButton(italicSVG, () => editor.chain().focus().toggleItalic().run()));

  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.style.marginLeft = '8px';
  colorPicker.style.border = 'none';
  colorPicker.style.width = '32px';
  colorPicker.style.height = '32px';
  colorPicker.style.cursor = 'pointer';
  colorPicker.style.background = 'transparent';
  colorPicker.style.padding = '0';

  colorPicker.addEventListener('mousedown', (e) => e.preventDefault());
  colorPicker.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement | null;
    const color = target?.value;
    if (color) {
      editor.chain().focus().setColor(color).run();
    }
  });

  toolbar.appendChild(colorPicker);

  document.body.appendChild(toolbar);

  function updatePosition() {
    const rect = rootElement.getBoundingClientRect();
    const verticalOffset = 10;
    toolbar.style.left = `${rect.left}px`;
    toolbar.style.top = `${rect.top - toolbar.offsetHeight - verticalOffset}px`;
  }

  // Position after first render
  requestAnimationFrame(updatePosition);

  // Handle window resize & scroll
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition);

  // Observe mutations in case of drag/move
  const observer = new MutationObserver(updatePosition);
  observer.observe(rootElement, { attributes: true, childList: true, subtree: true });

  return toolbar;
}
