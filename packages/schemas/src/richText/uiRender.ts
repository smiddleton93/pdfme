import { UIRenderProps } from '@pdfme/common';
import { RichTextSchema } from './types';

import { DEFAULT_BOLD_FONT } from './fonts';
import { initEditor } from './editor';

export const uiRender = (arg: UIRenderProps<RichTextSchema>) => {
  const { rootElement } = arg;
  console.log('uiRender', arg);
  const container = document.createElement('div');

  container.className = 'rich-text-editor';
  container.style.width = '100%';
  container.style.height = '100%';

  rootElement.appendChild(container);
  const style = document.createElement('style');
  style.textContent = `
    .tiptap {
      width: 100%;
      height: 100%;
    }
    .rich-text-editor strong { font-family: ${DEFAULT_BOLD_FONT};}
  `;
  document.head.appendChild(style);
  initEditor();
};
