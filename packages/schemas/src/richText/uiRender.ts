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

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  rootElement.appendChild(wrapper);

  // Create editor container before editor init
  const container = document.createElement('div');
  container.className = `richText${arg.schema.id}`;
  container.style.flex = '1';
  container.style.height = '100%';
  wrapper.appendChild(container);

  // Apply styles BEFORE editor init
  const style = document.createElement('style');
  style.textContent = `
    .tiptap { width: 100%; height: 100%; }
    .richText${arg.schema.id} strong { font-family: ${DEFAULT_BOLD_FONT}; }
    .richText${arg.schema.id} ul > li { list-style-type: disc; margin-left: 1.5em; }
    .richText${arg.schema.id} ol > li { list-style-type: decimal; margin-left: 1.5em; }
  `;
  document.head.appendChild(style);

  // Init editor after container exists
  const editor: Editor = initEditor(arg.schema.id, arg.value);
  // <-- You may need to modify initEditor to accept container element

  createFloatingToolbar(editor, rootElement);

  editor.on('blur', (e) => {
    const content = editor.getHTML();
    console.log(content);
    if (content != null) {
      onChange?.({ key: 'content', value: content });
    }
    const eventSource = e.event.relatedTarget as HTMLElement | null;
    if (eventSource && eventSource.classList.contains('pcr-save')) {
      console.log('Save button clicked, stopping editing');
      return;
    }

    stopEditing?.();
  });
};
