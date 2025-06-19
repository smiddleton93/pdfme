import { DEFAULT_FONT_NAME, PropPanel, PropPanelSchema, getFallbackFontName } from '@pdfme/common';
import type { RichTextSchema } from './types.js';
import { formatterWidget } from './formatterWidget.js';

// const DEFAULT_FONTS = {
//   [DEFAULT_FONT_NAME]: {
//     data: '',
//     fallback: true,
//   },
// }

export const propPanel: PropPanel<RichTextSchema> = {
  schema: ({ options, i18n }) => {
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font);

    const textSchema: Record<string, PropPanelSchema> = {
      fontName: {
        title: i18n('schemas.richText.fontName'),
        type: 'string',
        widget: 'select',
        default: fallbackFontName,
        placeholder: fallbackFontName,
        props: { options: fontNames.map((name) => ({ label: name, value: name })) },
        span: 12,
      },
      optionsContainer: {
        title: 'Formatting',
        type: 'string',
        widget: 'Card',
        span: 24,
        properties: { options: { widget: 'formatterWidget', span: 24 } },
      },
    };

    return textSchema;
  },
  widgets: { formatterWidget },
  defaultSchema: {
    name: '',
    type: 'richText',
    content: '',
    position: { x: 0, y: 0 },
    width: 100,
    height: 50,
  },
};
