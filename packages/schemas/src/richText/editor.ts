import { Editor } from '@tiptap/core';

import Bold from '@tiptap/extension-bold';
import Color from '@tiptap/extension-color';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';

const editorMap: Record<string, Editor> = {};

export const initEditor = (id: string, content: string) => {
  const editor = new Editor({
    element: document.querySelector(`.richText${id}`) as HTMLElement,
    extensions: [
      Document,
      Bold,
      Italic,
      Paragraph,
      Text,
      Underline,
      TextStyle.configure({ mergeNestedSpanStyles: true }),
      Color,
      BulletList,
      OrderedList,
      ListItem,
    ],
    content: content,
    injectCSS: false,
    editable: true,
  });
  editorMap[id] = editor;

  return editor;
};

export type InitEdit = ReturnType<typeof initEditor>;

export const getEditor = (id: string) => {
  const editor = editorMap[id];

  if (!editor) {
    return initEditor(id, '');
  }
  if (!editor.isInitialized) {
    setTimeout(() => {}, 50);
  }
  return editorMap[id];
};
