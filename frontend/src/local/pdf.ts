import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import fontUrl from '../generated/DejaVuSansMono.ttf?url';

const PAGE_WIDTH = 595.27563;
const PAGE_HEIGHT = 841.8898;
const MARGIN = 50;
const FONT_SIZE = 9.5;
const LEADING = 13;

export const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / LEADING);

let fontBytes: Uint8Array | null = null;

async function loadFont(): Promise<Uint8Array> {
  if (fontBytes === null) {
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error('Не удалось загрузить шрифт для документов');
    }
    fontBytes = new Uint8Array(await response.arrayBuffer());
  }
  return fontBytes;
}

export async function writePdf(text: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await loadFont(), { subset: true });

  const charWidth = font.widthOfTextAtSize('0', FONT_SIZE);
  const maxChars = Math.max(20, Math.floor((PAGE_WIDTH - 2 * MARGIN) / charWidth));
  const supported = new Set(font.getCharacterSet());
  const lines = layout(text, maxChars, (line) => sanitize(line, supported));

  for (let start = 0; start < Math.max(1, lines.length); start += LINES_PER_PAGE) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    for (let i = start; i < Math.min(lines.length, start + LINES_PER_PAGE); i += 1) {
      page.drawText(lines[i], {
        x: MARGIN,
        y: PAGE_HEIGHT - MARGIN - (i - start) * LEADING,
        size: FONT_SIZE,
        font,
      });
    }
  }

  return pdf.save();
}

export function layout(
  text: string,
  maxChars: number,
  clean: (line: string) => string = (line) => line,
): string[] {
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    wrap(clean(raw), maxChars, lines);
  }
  return lines;
}

function wrap(line: string, maxChars: number, into: string[]): void {
  if (line.length <= maxChars) {
    into.push(line);
    return;
  }
  let rest = line;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars);
    if (cut <= 0) {
      cut = maxChars;
    }
    into.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\s+/, '');
  }
  into.push(rest);
}

export function sanitize(line: string, supported: Set<number>): string {
  let safe = '';
  for (const character of line) {
    const codePoint = character.codePointAt(0);
    safe += codePoint !== undefined && supported.has(codePoint) ? character : '?';
  }
  return safe;
}
