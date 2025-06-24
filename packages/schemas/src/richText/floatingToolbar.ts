/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import '@simonwep/pickr/dist/themes/nano.min.css';
import Pickr from '@simonwep/pickr';

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

const bulletListSVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="5" cy="6" r="1"></circle>
  <circle cx="5" cy="12" r="1"></circle>
  <circle cx="5" cy="18" r="1"></circle>
  <line x1="9" y1="6" x2="20" y2="6"></line>
  <line x1="9" y1="12" x2="20" y2="12"></line>
  <line x1="9" y1="18" x2="20" y2="18"></line>
</svg>`;

const orderedListSVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 6h1"></path>
  <path d="M4 12h2"></path>
  <path d="M4 18h3"></path>
  <line x1="9" y1="6" x2="20" y2="6"></line>
  <line x1="9" y1="12" x2="20" y2="12"></line>
  <line x1="9" y1="18" x2="20" y2="18"></line>
</svg>`;

function getDefaultColor(editor: Editor, pickr: Pickr | null) {
  const { state } = editor;
  const { from, to } = state.selection;
  const colors = new Set<string>();

  state.doc.nodesBetween(from, to, (node) => {
    node.marks.forEach((mark) => {
      if (
        mark.type.name === 'textStyle' &&
        mark.attrs.color &&
        typeof mark.attrs.color === 'string'
      ) {
        colors.add(mark.attrs.color);
      }
    });
  });

  let color: string | null;

  if (colors.size === 1) {
    color = [...colors][0];
  } else {
    color = '#000000';
  }

  if (pickr) {
    pickr.setColor(color, true);
  }

  return color;
}

function initPickr(toolbar: HTMLDivElement, editor: Editor) {
  const pickrContainer = document.createElement('div');

  toolbar.appendChild(pickrContainer);

  const defaultColor = getDefaultColor(editor, null);

  const pickr = Pickr.create({
    el: pickrContainer,
    theme: 'nano',
    default: defaultColor,
    lockOpacity: true,
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: {
        hex: true,
        rgba: false,
        hsla: false,
        hsva: false,
        cmyk: false,
        input: true,
        save: true,
        clear: false,
      },
    },
  });

  pickr.on('init', () => {
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('pcr-button')) {
        e.preventDefault();
      }
    });
  });

  pickr.on('save', (color: Pickr.HSVaColor) => {
    const hexColor = color.toHEXA().toString();
    editor.chain().focus().setColor(hexColor).run();
    pickr.hide();
  });

  editor.on('selectionUpdate', () => {
    const selectedColor = getDefaultColor(editor, pickr);

    if (selectedColor !== defaultColor) {
      pickr.destroy();
      initPickr(toolbar, editor);
    }
  });
}

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
  toolbar.appendChild(
    createButton(bulletListSVG, () => editor.chain().focus().toggleBulletList().run()),
  );
  toolbar.appendChild(
    createButton(orderedListSVG, () => editor.chain().focus().toggleOrderedList().run()),
  );

  initPickr(toolbar, editor);

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
