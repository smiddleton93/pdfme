import {
  Schema,
  isBlankPdf,
  BasePdf,
  CommonOptions,
  getDefaultFont,
  getFallbackFontName,
  cloneDeep,
} from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';
import type {
  TableSchema,
  CellStyle,
  Styles,
  Spacing,
  TableInput,
  StylesProps,
  Section,
} from './types.js';
import { Cell, Column, Row, Table } from './classes.js';

type StyleProp =
  | 'styles'
  | 'headStyles'
  | 'bodyStyles'
  | 'alternateRowStyles'
  | 'columnStyles'
  | 'cellStyles'
  | 'rowStyles';

interface CreateTableArgs {
  schema: Schema;
  basePdf: BasePdf;
  options: CommonOptions;
  _cache: Map<string | number, unknown>;
}

interface UserOptions {
  startY: number;
  tableWidth: number;
  margin: Spacing;
  showHead: boolean;
  tableLineWidth?: number;
  tableLineColor?: string;
  head?: string[][];
  body?: string[][];
  rowStyles: {
    [key: number]: Partial<Styles> & { cells?: { [colIndex: number]: Partial<Styles> } };
  };
  styles?: Partial<Styles>;
  bodyStyles?: Partial<Styles>;
  headStyles?: Partial<Styles>;
  alternateRowStyles?: Partial<Styles>;
  columnStyles?: {
    [key: string]: Partial<Styles>;
  };
}

function parseSection(
  sectionName: Section,
  sectionRows: string[][],
  columns: Column[],
  styleProps: StylesProps,
  fallbackFontName: string,
): Row[] {
  const rowSpansLeftForColumn: { [key: string]: { left: number; times: number } } = {};
  const result = sectionRows.map((rawRow, rowIndex) => {
    let skippedRowForRowSpans = 0;
    const cells: { [key: string]: Cell } = {};

    let colSpansAdded = 0;
    let columnSpansLeft = 0;
    for (const column of columns) {
      if (
        rowSpansLeftForColumn[column.index] == null ||
        rowSpansLeftForColumn[column.index].left === 0
      ) {
        if (columnSpansLeft === 0) {
          let rawCell;
          if (Array.isArray(rawRow)) {
            rawCell = rawRow[column.index - colSpansAdded - skippedRowForRowSpans];
          } else {
            rawCell = rawRow[column.index];
          }
          const styles = cellStyles(sectionName, column, rowIndex, styleProps, fallbackFontName);
          const cell = new Cell(rawCell, styles, sectionName);
          cells[column.index] = cell;

          columnSpansLeft = 0;
          rowSpansLeftForColumn[column.index] = {
            left: 0,
            times: columnSpansLeft,
          };
        } else {
          columnSpansLeft--;
          colSpansAdded++;
        }
      } else {
        rowSpansLeftForColumn[column.index].left--;
        columnSpansLeft = rowSpansLeftForColumn[column.index].times;
        skippedRowForRowSpans++;
      }
    }
    return new Row(rawRow, rowIndex, sectionName, cells);
  });
  return result;
}

function parseContent4Table(input: TableInput, fallbackFontName: string) {
  const content = input.content;
  const columns = content.columns.map((index) => new Column(index));
  const styles = input.styles;
  return {
    columns,
    head: parseSection('head', content.head, columns, styles, fallbackFontName),
    body: parseSection('body', content.body, columns, styles, fallbackFontName),
  };
}

function cellStyles(
  sectionName: Section,
  column: Column,
  rowIndex: number,
  styles: StylesProps,
  fallbackFontName: string,
) {
  let sectionStyles;
  if (sectionName === 'head') {
    sectionStyles = styles.headStyles;
  } else if (sectionName === 'body') {
    sectionStyles = styles.bodyStyles;
  }

  const otherStyles = Object.assign({}, styles.styles, sectionStyles);

  const colStyles = styles.columnStyles[column.index] || {};

  const rowStyles =
    sectionName === 'body'
      ? Object.assign(
          {},
          rowIndex % 2 === 0 ? styles.alternateRowStyles : {},
          styles.rowStyles?.[rowIndex] || {},
          styles.cellStyles?.[rowIndex]?.[column.index] || {},
        )
      : {};

  const defaultStyle = {
    fontName: fallbackFontName,
    backgroundColor: '',
    textColor: '#000000',
    lineHeight: 1,
    characterSpacing: 0,
    alignment: 'left',
    verticalAlignment: 'middle',
    fontSize: 10,
    cellPadding: 5,
    lineColor: '#000000',
    lineWidth: 0,
    minCellHeight: 0,
    minCellWidth: 0,
  };
  return Object.assign(defaultStyle, otherStyles, rowStyles, colStyles) as Styles;
}

function mapCellStyle(style: CellStyle): Partial<Styles> {
  return {
    fontName: style.fontName,
    alignment: style.alignment,
    verticalAlignment: style.verticalAlignment,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    characterSpacing: style.characterSpacing,
    backgroundColor: style.backgroundColor,
    // ---
    textColor: style.fontColor,
    lineColor: style.borderColor,
    lineWidth: style.borderWidth,
    cellPadding: style.padding,
  };
}

function mapColumnStyles(schema: TableSchema): Record<number, Partial<Styles>> {
  const { headWidthPercentages, columnStyles } = schema;
  const columnStylesWidth = headWidthPercentages.reduce(
    (acc, cur, i) => ({ ...acc, [i]: { cellWidth: schema.width * (cur / 100) } }),
    {} as Record<number, Partial<Styles>>,
  );
  return (Object.keys(columnStyles) as (keyof Styles)[]).reduce((acc, key) => {
    const values = columnStyles[key];
    if (!values) return acc;

    Object.entries(values).forEach(([colIndexStr, value]) => {
      const colIndex = Number(colIndexStr);
      const current = acc[colIndex] || {};

      acc = {
        ...acc,
        [colIndex]: {
          ...current,
          [key]: value as Styles[typeof key],
        },
      };
    });

    return acc;
  }, columnStylesWidth);
}

function adjustRowStyles(
  rowStyles:
    | { [rowIndex: number]: Partial<Styles> & { cells?: { [colIndex: number]: Partial<Styles> } } }
    | undefined,
  __bodyRange: { start: number; end?: number },
):
  | { [rowIndex: number]: Partial<Styles> & { cells?: { [colIndex: number]: Partial<Styles> } } }
  | undefined {
  if (!rowStyles || __bodyRange.start === 0) return rowStyles;

  const adjusted: typeof rowStyles = {};

  for (const key in rowStyles) {
    const originalIndex = Number(key);
    const adjustedIndex = originalIndex - __bodyRange.start;
    if (adjustedIndex >= 0) {
      adjusted[adjustedIndex] = rowStyles[originalIndex];
    }
  }

  return adjusted;
}

function getTableOptions(schema: TableSchema, body: string[][]): UserOptions {
  return {
    head: [schema.head],
    body,
    showHead: schema.showHead,
    startY: schema.position.y,
    tableWidth: schema.width,
    tableLineColor: schema.tableStyles.borderColor,
    tableLineWidth: schema.tableStyles.borderWidth,
    headStyles: mapCellStyle(schema.headStyles),
    rowStyles:
      adjustRowStyles(schema.rowStyles, schema.__bodyRange || { start: 0, end: undefined }) || {},
    bodyStyles: mapCellStyle(schema.bodyStyles),
    alternateRowStyles: { backgroundColor: schema.bodyStyles.alternateBackgroundColor },
    columnStyles: mapColumnStyles(schema),
    margin: { top: 0, right: 0, left: schema.position.x, bottom: 0 },
  };
}

function parseStyles(cInput: UserOptions) {
  const styleOptions: StylesProps = {
    styles: {},
    headStyles: {},
    bodyStyles: {},
    rowStyles: {},
    alternateRowStyles: {},
    columnStyles: {},
    cellStyles: {},
  };

  for (const prop of Object.keys(styleOptions) as StyleProp[]) {
    if (prop === 'columnStyles') {
      const current = cInput[prop];
      styleOptions.columnStyles = Object.assign({}, current);
    } else if (prop === 'cellStyles' || prop === 'rowStyles') {
      const current = cInput.rowStyles || {};

      const { rowStyles, cellStyles } = Object.entries(current).reduce(
        (acc, [rowIndex, rowStyle]) => {
          const index = Number(rowIndex);
          const { cells, ...rest } = rowStyle;

          if (prop === 'cellStyles' && cells) {
            acc.cellStyles[index] = cells;
          }

          if (prop === 'rowStyles') {
            acc.rowStyles[index] = rest;
          }

          return acc;
        },
        {
          rowStyles: {} as { [rowIndex: number]: Partial<Styles> },
          cellStyles: {} as { [rowIndex: number]: { [colIndex: number]: Partial<Styles> } },
        },
      );

      styleOptions[prop] = prop === 'cellStyles' ? cellStyles : rowStyles;
    } else {
      const allOptions = [cInput];
      const styles = allOptions.map((opts) => opts[prop] || {});
      styleOptions[prop] = Object.assign({}, styles[0], styles[1], styles[2]);
    }
  }

  return styleOptions;
}

function parseContent4Input(options: UserOptions) {
  const head = options.head || [];
  const body = options.body || [];
  const columns = (head[0] || body[0] || []).map((_, index) => index);
  return { columns, head, body };
}

function parseInput(schema: TableSchema, body: string[][]): TableInput {
  const options = getTableOptions(schema, body);
  const styles = parseStyles(options);
  const settings = {
    startY: options.startY,
    margin: options.margin,
    tableWidth: options.tableWidth,
    showHead: options.showHead,
    tableLineWidth: options.tableLineWidth ?? 0,
    tableLineColor: options.tableLineColor ?? '',
  };

  const content = parseContent4Input(options);

  return { content, styles, settings };
}

export function createSingleTable(body: string[][], args: CreateTableArgs) {
  const { options, _cache, basePdf } = args;
  if (!isBlankPdf(basePdf)) {
    console.warn(
      '[@pdfme/schema/table]' +
        'When specifying a custom PDF for basePdf, ' +
        'you cannot use features such as page breaks or re-layout of other elements.' +
        'To utilize these features, please define basePdf as follows:\n' +
        '{ width: number; height: number; padding: [number, number, number, number]; }',
    );
  }

  const schema = cloneDeep(args.schema) as TableSchema;
  const { start } = schema.__bodyRange || { start: 0 };
  if (start % 2 === 1) {
    const alternateBackgroundColor = schema.bodyStyles.alternateBackgroundColor;
    schema.bodyStyles.alternateBackgroundColor = schema.bodyStyles.backgroundColor;
    schema.bodyStyles.backgroundColor = alternateBackgroundColor;
  }
  schema.showHead = schema.showHead === false ? false : !schema.__isSplit;

  const input = parseInput(schema, body);

  const font = options.font || getDefaultFont();

  const fallbackFontName = getFallbackFontName(font);

  const content = parseContent4Table(input, fallbackFontName);

  return Table.create({
    input,
    content,
    font,
    _cache: _cache as unknown as Map<string | number, FontKitFont>,
  });
}
