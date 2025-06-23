import { drawHtmlWithSchema } from './helper.js';
import type { RichTextSchema } from './types.js';
import { PDFRenderProps } from '@pdfme/common';

export const pdfRender = async (arg: PDFRenderProps<RichTextSchema>) => {
  const { value, pdfDoc, page, schema } = arg;
  if (!value) return;

  await drawHtmlWithSchema(pdfDoc, page, value, schema);
};
