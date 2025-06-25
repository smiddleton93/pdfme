import { PropPanel } from '@pdfme/common';

import type { RichTextSchema } from './types.js';

export const propPanel: PropPanel<RichTextSchema> = {
  schema: () => ({}),
  defaultSchema: {
    name: '',
    type: 'richText',
    content: '',
    position: { x: 0, y: 0 },
    width: 150,
    height: 40,
  },
};
