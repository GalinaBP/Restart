type Node =
  | { kind: 'text'; text: string }
  | { kind: 'variable'; name: string }
  | { kind: 'partial'; name: string; indent: string }
  | { kind: 'section'; name: string; inverted: boolean; children: Node[] };

const STANDALONE_LINE = /^[ \t]*\{\{[!#^/][^}]*\}\}[ \t]*\r?\n/gm;
const STANDALONE_AT_END = /(^|\n)[ \t]*(\{\{[!#^/][^}]*\}\})[ \t]*$/;

export function render(
  template: string,
  view: unknown,
  partials: Record<string, string>,
): string {
  return renderNodes(parse(template), [view], partials);
}

function parse(template: string): Node[] {
  const tokens = tokenize(stripStandaloneTagLines(template));
  const [nodes, rest] = build(tokens, null);
  if (rest.length > 0) {
    throw new Error(`Unbalanced mustache section: ${JSON.stringify(rest[0])}`);
  }
  return standalonePartials(nodes);
}

function stripStandaloneTagLines(template: string): string {
  return template
    .replace(STANDALONE_LINE, tagOnly)
    .replace(STANDALONE_AT_END, '$1$2');
}

function tagOnly(line: string): string {
  const match = line.match(/\{\{[^}]*\}\}/);
  return match ? match[0] : line;
}

interface Token {
  kind: 'text' | 'tag';
  value: string;
}

function tokenize(template: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  while (cursor < template.length) {
    const open = template.indexOf('{{', cursor);
    if (open < 0) {
      tokens.push({ kind: 'text', value: template.slice(cursor) });
      break;
    }
    if (open > cursor) {
      tokens.push({ kind: 'text', value: template.slice(cursor, open) });
    }
    const close = template.indexOf('}}', open);
    if (close < 0) {
      throw new Error('Unclosed mustache tag');
    }
    tokens.push({ kind: 'tag', value: template.slice(open + 2, close).trim() });
    cursor = close + 2;
  }
  return tokens;
}

function build(tokens: Token[], closing: string | null): [Node[], Token[]] {
  const nodes: Node[] = [];
  let rest = tokens;
  while (rest.length > 0) {
    const [token, ...remaining] = rest;
    rest = remaining;
    if (token.kind === 'text') {
      nodes.push({ kind: 'text', text: token.value });
      continue;
    }
    const sigil = token.value[0];
    const name = token.value.slice(1).trim();
    if (sigil === '!') {
      continue;
    }
    if (sigil === '>') {
      nodes.push({ kind: 'partial', name, indent: '' });
      continue;
    }
    if (sigil === '#' || sigil === '^') {
      const [children, remainder] = build(rest, name);
      nodes.push({ kind: 'section', name, inverted: sigil === '^', children });
      rest = remainder;
      continue;
    }
    if (sigil === '/') {
      if (name !== closing) {
        throw new Error(`Mustache section ${closing ?? '(none)'} closed by ${name}`);
      }
      return [nodes, rest];
    }
    nodes.push({ kind: 'variable', name: token.value });
  }
  if (closing !== null) {
    throw new Error(`Mustache section ${closing} is never closed`);
  }
  return [nodes, rest];
}

function standalonePartials(nodes: Node[]): Node[] {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.kind === 'section') {
      node.children = standalonePartials(node.children);
      continue;
    }
    if (node.kind !== 'partial') {
      continue;
    }
    const before = nodes[i - 1];
    const after = nodes[i + 1];
    if (before === undefined || before.kind !== 'text') {
      continue;
    }
    const indent = before.text.match(/\n([ \t]*)$/)?.[1];
    if (indent === undefined) {
      continue;
    }
    const trailing = after !== undefined && after.kind === 'text'
      ? after.text.match(/^[ \t]*\r?\n/)
      : null;
    if (after !== undefined && trailing === null) {
      continue;
    }
    node.indent = indent;
    if (after !== undefined && after.kind === 'text' && trailing !== null) {
      after.text = after.text.slice(trailing[0].length);
    }
  }
  return nodes;
}

function renderNodes(
  nodes: Node[],
  stack: unknown[],
  partials: Record<string, string>,
): string {
  let out = '';
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        out += node.text;
        break;
      case 'variable': {
        const value = lookup(stack, node.name);
        out += value === undefined || value === null ? '' : String(value);
        break;
      }
      case 'partial': {
        const source = partials[node.name];
        if (source === undefined) {
          throw new Error(`Template partial missing: ${node.name}`);
        }
        const content = renderNodes(parse(source), stack, partials);
        out += node.indent === ''
          ? content
          : content.replace(/\n(?!$)/g, `\n${node.indent}`);
        break;
      }
      case 'section': {
        const value = lookup(stack, node.name);
        if (node.inverted) {
          if (isFalsy(value)) {
            out += renderNodes(node.children, stack, partials);
          }
          break;
        }
        if (isFalsy(value)) {
          break;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            out += renderNodes(node.children, [...stack, item], partials);
          }
        } else if (typeof value === 'object') {
          out += renderNodes(node.children, [...stack, value], partials);
        } else {
          out += renderNodes(node.children, stack, partials);
        }
        break;
      }
    }
  }
  return out;
}

function isFalsy(value: unknown): boolean {
  return value === undefined || value === null || value === false
    || (Array.isArray(value) && value.length === 0);
}

function lookup(stack: unknown[], name: string): unknown {
  const [head, ...rest] = name.split('.');
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const frame = stack[i];
    if (frame !== null && typeof frame === 'object' && head in (frame as object)) {
      return resolve((frame as Record<string, unknown>)[head], rest);
    }
  }
  return undefined;
}

function resolve(value: unknown, path: string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
