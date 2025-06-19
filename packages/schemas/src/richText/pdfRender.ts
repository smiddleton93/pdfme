import { drawHtmlWithSchema } from './helper.js';
import type { RichTextSchema } from './types.js';
import { PDFRenderProps } from '@pdfme/common';

// const embedAndGetFontObj = async (arg: {
//   pdfDoc: PDFDocument;
//   font: Font;
//   _cache: Map<PDFDocument, { [key: string]: PDFFont }>;
// }) => {
//   const { pdfDoc, font, _cache } = arg;
//   if (_cache.has(pdfDoc)) {
//     return _cache.get(pdfDoc) as { [key: string]: PDFFont };
//   }

//   const fontValues = await Promise.all(
//     Object.values(font).map(async (v) => {
//       let fontData = v.data;
//       if (typeof fontData === 'string' && fontData.startsWith('http')) {
//         fontData = await fetch(fontData).then((res) => res.arrayBuffer());
//       }
//       return pdfDoc.embedFont(fontData, {
//         subset: typeof v.subset === 'undefined' ? true : v.subset,
//       });
//     }),
//   );

//   const fontObj = Object.keys(font).reduce(
//     (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
//     {} as { [key: string]: PDFFont },
//   );

//   _cache.set(pdfDoc, fontObj);
//   return fontObj;
// };

export const pdfRender = async (arg: PDFRenderProps<RichTextSchema>) => {
  const { value, pdfDoc, page, schema } = arg;
  if (!value) return;

  await drawHtmlWithSchema(pdfDoc, page, value, schema);
};
