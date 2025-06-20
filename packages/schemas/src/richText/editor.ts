import { Editor } from '@tiptap/core';

import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';

const editorMap: Record<string, Editor> = {};

export const initEditor = (id: string) => {
  const editor = new Editor({
    element: document.querySelector(`.richText${id}`) as HTMLElement,
    extensions: [Document, Bold, Italic, Paragraph, Text],
    content: '<p>Hello <strong>Wor</strong>ld!</p>',
    injectCSS: false,
    editable: true,
  });
  editorMap[id] = editor;

  return editor;
};

export const getEditor = (id: string) => {
  const editor = editorMap[id];
  if (!editor || !editor.isInitialized) {
    return null;
  }
  return editorMap[id];
};
