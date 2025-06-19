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

export function getExtraFormatterSchema(i18n: (key: string) => string): {
  title: string;
  widget: string;
  buttons: GroupButton[];
  span: number;
} {
  const buttons: GroupButton[] = [
    { key: Formatter.UNDERLINE, icon: TextUnderlineIcon, type: 'boolean' },
    { key: Formatter.BOLD, icon: TextBoldIcon, type: 'boolean' },
    { key: Formatter.ITALIC, icon: TextItalicIcon, type: 'boolean' },
  ];

  return {
    title: i18n('schemas.richText.format'),
    widget: 'ButtonGroup',
    buttons,
    span: 24,
  };
}
