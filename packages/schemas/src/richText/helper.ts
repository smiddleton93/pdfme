/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { parseDocument, DomUtils } from 'htmlparser2';
import { PDFDocument, PDFFont, PDFPage, rgb, RGB } from '@pdfme/pdf-lib';

import { type ChildNode as Node, type Element } from 'domhandler';
import { RichTextSchema } from './types';
import * as richTextFonts from './fonts';
import { DEFAULT_FONT_NAME, Font, getDefaultFont, mm2pt } from '@pdfme/common';
import { convertForPdfLayoutProps } from '../utils';

type Style = {
  fontSize?: number;
  color?: RGB;
  underline?: boolean;
  bold?: boolean;
  italic?: boolean;
  fonwt?: Font;
  fontName?: string;
};

type TextRun = {
  text: string;
  style: Style;
};

type Block = {
  runs: TextRun[];
  type: 'paragraph' | 'list-item';
};

const embedAndGetFontObj = async (arg: {
  pdfDoc: PDFDocument;
  font: Font;
  _cache: Map<PDFDocument, { [key: string]: PDFFont }>;
}) => {
  const { pdfDoc, font, _cache } = arg;
  if (_cache.has(pdfDoc)) {
    return _cache.get(pdfDoc) as { [key: string]: PDFFont };
  }

  const fontValues = await Promise.all(
    Object.values(font).map(async (v) => {
      let fontData = v.data;
      if (typeof fontData === 'string' && fontData.startsWith('http')) {
        fontData = await fetch(fontData).then((res) => res.arrayBuffer());
      }
      return pdfDoc.embedFont(fontData, {
        subset: typeof v.subset === 'undefined' ? true : v.subset,
      });
    }),
  );

  const fontObj = Object.keys(font).reduce(
    (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
    {} as { [key: string]: PDFFont },
  );

  _cache.set(pdfDoc, fontObj);
  return fontObj;
};

function parseInlineStyles(styleString: string): Partial<Style> {
  const result: Partial<Style> = {};

  const declarations = styleString.split(';');
  for (const decl of declarations) {
    const [property, value] = decl.split(':').map((s) => s.trim().toLowerCase());
    if (!property || !value) continue;

    if (property === 'font-size' && value.endsWith('px')) {
      result.fontSize = parseFloat(value);
    }
    if (property === 'color') {
      const colorMatch = value.match(/^#([0-9a-f]{3,6})$/i);
      if (colorMatch) {
        const hex = colorMatch[1];
        if (hex.length === 3) {
          result.color = rgb(
            parseInt(hex[0] + hex[0], 16) / 255,
            parseInt(hex[1] + hex[1], 16) / 255,
            parseInt(hex[2] + hex[2], 16) / 255,
          );
        } else if (hex.length === 6) {
          result.color = rgb(
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255,
          );
        }
      }
    }
  }

  return result;
}
const fonts: Font = {
  [richTextFonts.DEFAULT_BOLD_FONT]: {
    data: richTextFonts.DEFAULT_BOLD_FONT_DATA,
  },
  [richTextFonts.DEFAULT_ITALIC_FONT]: {
    data: richTextFonts.DEFAULT_ITALIC_FONT_DATA,
  },
  [richTextFonts.DEFAULT_BOLD_ITALIC_FONT]: {
    data: richTextFonts.DEFAULT_BOLD_ITALIC_DATA,
  },
  ...getDefaultFont(),
};

export async function drawHtmlWithSchema(
  pdfDoc: PDFDocument,
  page: PDFPage,
  htmlString: string,
  schema: RichTextSchema,
): Promise<void> {
  const defaultFontSize = 13;

  const _cache = new Map();

  const pageHeight = page.getHeight();

  const {
    width,
    position: { x },
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

  const [pdfFontObj] = await Promise.all([
    embedAndGetFontObj({
      pdfDoc,
      font: fonts,
      _cache,
    }),
  ]);

  const htmlTree = parseDocument(htmlString);

  const getFontName = (style: Style): string => {
    if (style.bold && style.italic) return richTextFonts.DEFAULT_BOLD_ITALIC_FONT;
    if (style.bold) return richTextFonts.DEFAULT_BOLD_FONT;
    if (style.italic) return richTextFonts.DEFAULT_ITALIC_FONT;
    return DEFAULT_FONT_NAME;
  };

  async function parseNode(
    node: Node,
    inheritedStyle: Style = {},
    parentTag: string | null = null,
    listType: 'ul' | 'ol' | null = null,
    listIndex: number = 1,
  ): Promise<Block[]> {
    if (node.type === 'text') {
      return [
        {
          runs: [{ text: node.data ?? '', style: { ...inheritedStyle } }],
          type: parentTag === 'li' ? 'list-item' : 'paragraph',
        },
      ];
    }

    if (DomUtils.isTag(node)) {
      const element = node as Element;
      const newStyle: Style = { ...inheritedStyle };

      if (element.name === 'u') newStyle.underline = true;
      if (element.name === 'strong') newStyle.bold = true;
      if (element.name === 'em') newStyle.italic = true;
      newStyle.fontName = getFontName(newStyle);

      if (element.attribs?.style) {
        const inlineStyles = parseInlineStyles(element.attribs.style);
        Object.assign(newStyle, inlineStyles);
      }

      if (element.name === 'ul' || element.name === 'ol') {
        const blocks: Block[] = [];
        let index = 1;
        for (const child of element.children) {
          if (child.type === 'tag' && child.name === 'li') {
            const bullet = element.name === 'ul' ? '• ' : `${index}. `;
            const childBlocks = await parseNode(child, newStyle, 'li', element.name, index);
            if (childBlocks.length > 0) {
              childBlocks[0].runs.unshift({
                text: bullet,
                style: newStyle,
              });
              blocks.push(...childBlocks);
            }
            index++;
          }
        }
        return blocks;
      }

      let blocks: Block[] = [];
      for (const child of element.children) {
        const childBlocks = parseNode(child, newStyle, element.name, listType, listIndex);
        blocks = mergeBlocks(blocks, await childBlocks, parentTag);
      }
      return blocks;
    }

    return [];
  }

  function mergeBlocks(existing: Block[], incoming: Block[], parentTag: string | null): Block[] {
    if (existing.length === 0) return incoming;
    if (incoming.length === 0) return existing;

    if (
      parentTag !== 'li' &&
      existing[existing.length - 1].type === 'paragraph' &&
      incoming[0].type === 'paragraph'
    ) {
      existing[existing.length - 1].runs.push(...incoming[0].runs);
      return existing.concat(incoming.slice(1));
    }
    return existing.concat(incoming);
  }

  const blocksNested: Block[][] = await Promise.all(
    htmlTree.children.map((node) => parseNode(node)),
  );
  const blocks: Block[] = blocksNested.flat();

  const startY = pageHeight - mm2pt(schema.position.y);
  let cursorY = startY;

  for (const block of blocks) {
    cursorY = wrapAndDrawBlock(block.runs, cursorY, block.type === 'list-item' ? 8 : 0);
    cursorY -= 8;
  }

  function wrapAndDrawBlock(runs: TextRun[], startY: number, leftIndent: number): number {
    let currentLine: TextRun[] = [];
    let currentLineWidth = 0;
    let cursorY = startY;

    for (const run of runs) {
      const words = run.text.split(/(\s+)/).filter((w) => w.trim() !== '' || w === ' ');

      for (const word of words) {
        const fontSize = run.style.fontSize ?? defaultFontSize;
        const fontName = getFontName(run.style);
        const font = pdfFontObj && pdfFontObj[fontName];

        const safeWord = word;
        const wordWidth = font.widthOfTextAtSize(safeWord, fontSize);

        if (currentLineWidth + wordWidth > width - leftIndent) {
          drawLine(currentLine, cursorY, leftIndent);
          cursorY -= fontSize + 4;
          currentLine = [];
          currentLineWidth = 0;
        }

        currentLine.push({ text: word, style: run.style });
        currentLineWidth += wordWidth;
      }
    }

    if (currentLine.length > 0) {
      drawLine(currentLine, cursorY, leftIndent);
      cursorY -= defaultFontSize + 4;
    }

    return cursorY;
  }

  function drawLine(line: TextRun[], y: number, leftIndent: number) {
    let cursorX = x + leftIndent;

    for (const run of line) {
      const fontSize = run.style.fontSize ?? defaultFontSize;
      const fontName = getFontName(run.style);

      const font = pdfFontObj && pdfFontObj[fontName];
      const color = run.style.color ?? rgb(0, 0, 0);

      page.drawText(run.text, {
        x: cursorX,
        y,
        size: fontSize,
        font,
        color,
      });
      const textWidth = font.widthOfTextAtSize(run.text, fontSize);

      if (run.style.underline) {
        page.drawLine({
          start: { x: cursorX, y: y - 1 },
          end: { x: cursorX + textWidth, y: y - 1 },
          thickness: 0.5,
          color,
        });
      }

      cursorX += textWidth;
    }
  }
}
