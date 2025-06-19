import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

let editor: Editor | null = null;

const editorMap: Record<string, Editor> = {};

export const initEditor = (id: string) => {
  editor = new Editor({
    element: document.querySelector(`#${id}`) as HTMLElement,
    extensions: [StarterKit],
    content: '<p>Hello <strong>Wor</strong>ld!</p>',
    injectCSS: false,
    editable: true,
  });
  editorMap[id] = editor;
  return editor;
};

export const getEditor = (id: string) => {
  if (!editor) {
    return initEditor(id);
  }
  return editor;
};
