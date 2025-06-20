import { getEditor } from './editor.js';
import { TextBoldIcon, TextItalicIcon, TextUnderlineIcon } from './icons/index.js';

export enum Formatter {
  UNDERLINE = 'underline',
  BOLD = 'bold',
  ITALIC = 'italic',
}

interface GroupButton {
  key: Formatter;
  icon: string;
  type: 'boolean' | 'select' | 'action';
  action?: () => void;
}

const buttonAction = (key: Formatter, id: string) => {
  return () => {
    const editor = getEditor(id);
    if (!editor) {
      console.log(`Editor not initialized for key: ${key}`);
      return () => {};
    }
    switch (key) {
      case Formatter.UNDERLINE:
        // editor.commands.toggleUnderline();
        break;
      case Formatter.BOLD:
        editor.chain().focus().toggleBold().run();
        break;
      case Formatter.ITALIC:
        editor.chain().focus().toggleItalic().run();
        break;
      default:
        break;
    }
  };
};

export function getExtraFormatterSchema(
  i18n: (key: string) => string,
  id: string,
): {
  title: string;
  widget: string;
  buttons: GroupButton[];
  span: number;
} {
  const buttons: GroupButton[] = [
    {
      key: Formatter.UNDERLINE,
      icon: TextUnderlineIcon,
      type: 'boolean',
      action: buttonAction(Formatter.UNDERLINE, id),
    },
    {
      key: Formatter.BOLD,
      icon: TextBoldIcon,
      type: 'boolean',
      action: buttonAction(Formatter.BOLD, id),
    },
    {
      key: Formatter.ITALIC,
      icon: TextItalicIcon,
      type: 'boolean',
      action: buttonAction(Formatter.ITALIC, id),
    },
  ];

  return {
    title: i18n('schemas.richText.format'),
    widget: 'ButtonGroup',
    buttons,
    span: 24,
  };
}
