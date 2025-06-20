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

    switch (key) {
      case Formatter.UNDERLINE:
        editor.commands.focus();
        editor.commands.toggleUnderline();
        break;
      case Formatter.BOLD:
        editor.commands.focus();
        editor.commands.toggleBold();
        break;
      case Formatter.ITALIC:
        editor.commands.focus();
        editor.commands.toggleItalic();
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
