declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  export interface RowInput {
    [key: string]: any;
  }

  export interface CellInput {
    content?: string | number;
    colSpan?: number;
    rowSpan?: number;
    styles?: Partial<Styles>;
  }

  export interface Styles {
    font?: 'helvetica' | 'times' | 'courier';
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
    overflow?: 'linebreak' | 'ellipsize' | 'visible' | 'hidden';
    fillColor?: [number, number, number] | false;
    textColor?: [number, number, number];
    cellPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    halign?: 'left' | 'center' | 'right' | 'justify';
    valign?: 'top' | 'middle' | 'bottom';
    fontSize?: number;
    cellWidth?: 'auto' | 'wrap' | number;
    minCellHeight?: number;
    minCellWidth?: number;
    lineColor?: [number, number, number];
    lineWidth?: number;
  }

  export interface UserOptions {
    head?: RowInput[];
    body?: RowInput[];
    foot?: RowInput[];
    startY?: number | false;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    pageBreak?: 'auto' | 'avoid' | 'always';
    rowPageBreak?: 'auto' | 'avoid';
    tableWidth?: 'auto' | 'wrap' | number;
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    theme?: 'striped' | 'grid' | 'plain';
    styles?: Partial<Styles>;
    headStyles?: Partial<Styles>;
    bodyStyles?: Partial<Styles>;
    footStyles?: Partial<Styles>;
    alternateRowStyles?: Partial<Styles>;
    columnStyles?: { [key: string]: Partial<Styles> };
    didParseCell?: (data: CellHookData) => void;
    willDrawCell?: (data: CellHookData) => void;
    didDrawCell?: (data: CellHookData) => void;
    didDrawPage?: (data: HookData) => void;
  }

  export interface CellHookData {
    cell: Cell;
    row: Row;
    column: Column;
    section: 'head' | 'body' | 'foot';
  }

  export interface HookData {
    pageNumber: number;
    pageCount: number;
    settings: UserOptions;
    table: Table;
    cursor: { x: number; y: number };
  }

  export interface Cell {
    raw: string | number | HTMLElement | null;
    content: string;
    styles: Styles;
    text: string[];
    section: 'head' | 'body' | 'foot';
    colSpan: number;
    rowSpan: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface Column {
    index: number;
    dataKey: string | number;
    width: number;
  }

  export interface Row {
    raw: RowInput;
    index: number;
    section: 'head' | 'body' | 'foot';
    cells: { [key: string]: Cell };
    height: number;
  }

  export interface Table {
    pageNumber: number;
    pageCount: number;
    settings: UserOptions;
    columns: Column[];
    head: Row[];
    body: Row[];
    foot: Row[];
    finalY: number;
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
