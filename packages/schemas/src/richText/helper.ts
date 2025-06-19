/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { parseDocument, DomUtils } from 'htmlparser2';
import { PDFDocument, PDFPage, StandardFonts, PDFFont, rgb, RGB } from '@pdfme/pdf-lib';

import { type ChildNode as Node, type Element } from 'domhandler';
import { RichTextSchema } from './types';

// --- Types ---

type Style = {
  fontSize?: number;
  color?: RGB;
  underline?: boolean;
  bold?: boolean;
  italic?: boolean;
  font?: PDFFont; // this will be assigned after resolving
};

type TextRun = {
  text: string;
  style: Style;
};

type Block = {
  runs: TextRun[];
  type: 'paragraph' | 'list-item';
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

// --- Main Function ---

export async function drawHtmlWithSchema(
  pdfDoc: PDFDocument,
  page: PDFPage,
  htmlString: string,
  schema: RichTextSchema,
): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  function resolveFont(style: Style): PDFFont {
    if (style.bold && style.italic) return fontBoldItalic;
    if (style.bold) return fontBold;
    if (style.italic) return fontItalic;
    return fontRegular;
  }

  const defaultFontSize = 12;

  const htmlTree = parseDocument(htmlString);

  function parseNode(
    node: Node,
    inheritedStyle: Style = {},
    parentTag: string | null = null,
    listType: 'ul' | 'ol' | null = null,
    listIndex: number = 1,
  ): Block[] {
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

      // const schemaStyle = schema.styles[element.name];
      // if (schemaStyle?.fontSize) newStyle.fontSize = schemaStyle.fontSize;
      // if (schemaStyle?.color) newStyle.color = schemaStyle.color;
      if (element.name === 'u') newStyle.underline = true;
      if (element.name === 'strong') newStyle.bold = true;
      if (element.name === 'em') newStyle.italic = true;

      newStyle.font = resolveFont(newStyle);

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
            const childBlocks = parseNode(child, newStyle, 'li', element.name, index);
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

      // Handle normal tags
      let blocks: Block[] = [];
      for (const child of element.children) {
        const childBlocks = parseNode(child, newStyle, element.name, listType, listIndex);
        blocks = mergeBlocks(blocks, childBlocks, parentTag);
      }
      return blocks;
    }

    return [];
  }

  // Merge adjacent inline nodes into same block when appropriate
  function mergeBlocks(existing: Block[], incoming: Block[], parentTag: string | null): Block[] {
    if (existing.length === 0) return incoming;
    if (incoming.length === 0) return existing;

    if (
      parentTag !== 'li' &&
      existing[existing.length - 1].type === 'paragraph' &&
      incoming[0].type === 'paragraph'
    ) {
      // Merge runs into same paragraph
      existing[existing.length - 1].runs.push(...incoming[0].runs);
      return existing.concat(incoming.slice(1));
    }
    return existing.concat(incoming);
  }

  const blocks: Block[] = htmlTree.children.flatMap((node) => parseNode(node));

  // --- Render blocks one by one ---

  let cursorY = schema.position.y;

  for (const block of blocks) {
    cursorY = wrapAndDrawBlock(block.runs, cursorY, block.type === 'list-item' ? 8 : 0);
    cursorY -= 8; // vertical gap between blocks
  }

  // --- Rendering functions ---

  function wrapAndDrawBlock(runs: TextRun[], startY: number, leftIndent: number): number {
    let currentLine: TextRun[] = [];
    let currentLineWidth = 0;
    let cursorY = startY;

    for (const run of runs) {
      const words = run.text.split(/(\s+)/).filter((w) => w.trim() !== '' || w === ' ');

      for (const word of words) {
        const fontSize = run.style.fontSize ?? defaultFontSize;
        const font = run.style.font ?? fontRegular;
        const safeWord = word;
        const wordWidth = font.widthOfTextAtSize(safeWord, fontSize);

        if (currentLineWidth + wordWidth > schema.width - leftIndent) {
          // Draw current line
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
    let cursorX = schema.position.x + leftIndent;

    for (const run of line) {
      const fontSize = run.style.fontSize ?? defaultFontSize;
      const font = run.style.font ?? fontRegular;
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
