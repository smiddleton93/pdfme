import { UIRenderProps } from '@pdfme/common';
import { RichTextSchema } from './types';

import { DEFAULT_BOLD_FONT } from './fonts';
import { initEditor } from './editor';
import { Editor } from '@tiptap/core';
import { createFloatingToolbar } from './floatingToolbar';

export const uiRender = (arg: UIRenderProps<RichTextSchema>): void => {
  const { rootElement, onChange, stopEditing } = arg;

  if (!arg.schema.id || typeof arg.schema.id !== 'string' || arg.schema.id === 'richText') {
    return;
  }

  const schemaId = arg.schema.id;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  rootElement.appendChild(wrapper);

  const container = document.createElement('div');

  container.className = `richText${schemaId}`;
  container.style.flex = '1';
  container.style.height = '100%';
  wrapper.appendChild(container);

  const style = document.createElement('style');
  style.textContent = `
    .tiptap { width: 100%; height: 100%; }
    .richText${schemaId} strong { font-family: ${DEFAULT_BOLD_FONT}; }
    .richText${schemaId} ul > li { list-style-type: disc; margin-left: 1.5em; }
    .richText${schemaId} ol > li { list-style-type: decimal; margin-left: 1.5em; }
  `;
  document.head.appendChild(style);

  const editor: Editor = initEditor(schemaId, arg.value);

  editor.on('create', () => {
    if (arg.mode === 'viewer') return;
    editor.commands.focus();
  });

  editor.on('focus', () => {
    const destroyFn = createFloatingToolbar(schemaId, editor, rootElement, arg.mode);
    editor.on('blur', (e) => {
      const content = editor.getHTML();
      if (content != null) {
        onChange?.({ key: 'content', value: content });
      }
      const eventSource = e.event.relatedTarget as HTMLElement | null;
      if (eventSource && eventSource.classList.contains('pcr-save')) {
        return;
      }
      destroyFn();
      stopEditing?.();
    });
  });
};
