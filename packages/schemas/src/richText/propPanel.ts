import { DEFAULT_FONT_NAME, PropPanel, PropPanelSchema, getFallbackFontName } from '@pdfme/common';
import type { RichTextSchema } from './types.js';
import { getExtraFormatterSchema } from './extraFormatter.js';

// const DEFAULT_FONTS = {
//   [DEFAULT_FONT_NAME]: {
//     data: '',
//     fallback: true,
//   },
// }

export const propPanel: PropPanel<RichTextSchema> = {
  schema: ({ options, i18n, activeSchema }) => {
    // const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };

    const textSchema: Record<string, PropPanelSchema> = {
      formatter: getExtraFormatterSchema(i18n, activeSchema.id),
    };

    return textSchema;
  },
  defaultSchema: {
    name: '',
    type: 'richText',
    content: '',
    position: { x: 0, y: 0 },
    width: 100,
    height: 50,
  },
};
