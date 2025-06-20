import { PropPanel, PropPanelSchema } from '@pdfme/common';
import type { RichTextSchema } from './types.js';
import { getExtraFormatterSchema } from './extraFormatter.js';

// const DEFAULT_FONTS = {
//   [DEFAULT_FONT_NAME]: {
//     data: '',
//     fallback: true,
//   },
// }

const testText =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam nec arcu neque. In efficitur arcu vel turpis ultricies, sit amet malesuada metus molestie. Aliquam eget dui urna. Donec lacinia nibh at lectus suscipit, nec maximus augue tempor. Pellentesque scelerisque venenatis orci, vitae aliquam quam convallis eu. In cursus et ipsum.';

export const propPanel: PropPanel<RichTextSchema> = {
  schema: ({ i18n, activeSchema }) => {
    // const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };

    const textSchema: Record<string, PropPanelSchema> = {
      formatter: getExtraFormatterSchema(i18n, activeSchema.id),
    };

    return textSchema;
  },
  defaultSchema: {
    name: '',
    type: 'richText',
    content: `<p>${testText}</p>`,
    position: { x: 0, y: 0 },
    width: 100,
    height: 50,
  },
};
