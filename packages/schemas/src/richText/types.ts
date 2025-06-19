import type { Schema } from '@pdfme/common';

export interface RichTextSchema extends Schema {
  fontName?: string;
  boldFontName?: string;
  italicFontName?: string;
}
