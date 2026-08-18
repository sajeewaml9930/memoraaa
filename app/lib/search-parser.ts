export type SearchNode =
  | { type: "term"; kind: "word"; value: string }
  | { type: "term"; kind: "phrase"; value: string }
  | { type: "term"; kind: "regex"; value: string; flags: string }
  | { type: "and"; left: SearchNode; right: SearchNode }
  | { type: "or"; left: SearchNode; right: SearchNode }
  | { type: "not"; child: SearchNode };

type Token =
  | { type: "word"; value: string }
  | { type: "phrase"; value: string }
  | { type: "regex"; value: string; flags: string }
  | { type: "and" }
  | { type: "or" }
  | { type: "not" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "eof" };

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen" });
      index += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "rparen" });
      index += 1;
      continue;
    }

    if (char === '"') {
      let value = "";
      index += 1;

      while (index < input.length && input[index] !== '"') {
        if (input[index] === "\\" && index + 1 < input.length) {
          value += input[index + 1];
          index += 2;
          continue;
        }

        value += input[index];
        index += 1;
      }

      if (index >= input.length || input[index] !== '"') {
        throw new Error("Unclosed phrase quote in advanced search query.");
      }

      tokens.push({ type: "phrase", value });
      index += 1;
      continue;
    }

    if (char === "/") {
      let pattern = "";
      let cursor = index + 1;
      let foundClosingSlash = false;

      while (cursor < input.length) {
        if (input[cursor] === "\\") {
          if (cursor + 1 < input.length) {
            pattern += input[cursor] + input[cursor + 1];
            cursor += 2;
            continue;
          }

          throw new Error("Invalid regex escape in advanced search query.");
        }

        if (input[cursor] === "/") {
          foundClosingSlash = true;
          cursor += 1;
          break;
        }

        pattern += input[cursor];
        cursor += 1;
      }

      if (!foundClosingSlash) {
        throw new Error("Invalid regex literal in advanced search query.");
      }

      let flags = "";
      while (cursor < input.length && /[a-z]/i.test(input[cursor])) {
        flags += input[cursor];
        cursor += 1;
      }

      try {
        new RegExp(pattern, flags);
      } catch {
        throw new Error(`Invalid regular expression: /${pattern}/${flags}`);
      }

      tokens.push({ type: "regex", value: pattern, flags });
      index = cursor;
      continue;
    }

    const start = index;
    while (
      index < input.length &&
      !/\s/.test(input[index]) &&
      input[index] !== "(" &&
      input[index] !== ")" &&
      input[index] !== '"' &&
      input[index] !== "/"
    ) {
      index += 1;
    }

    const value = input.slice(start, index);
    if (!value) {
      index += 1;
      continue;
    }

    const upperValue = value.toUpperCase();
    if (upperValue === "AND") {
      tokens.push({ type: "and" });
    } else if (upperValue === "OR") {
      tokens.push({ type: "or" });
    } else if (upperValue === "NOT") {
      tokens.push({ type: "not" });
    } else {
      tokens.push({ type: "word", value });
    }
  }

  tokens.push({ type: "eof" });
  return tokens;
};

class Parser {
  private tokens: Token[];
  private index = 0;

  constructor(input: string) {
    this.tokens = tokenize(input);
  }

  private peek(): Token {
    return this.tokens[this.index] ?? { type: "eof" };
  }

  private consume(expected?: Token["type"]) {
    const token = this.peek();
    if (expected && token.type !== expected) {
      throw new Error(`Expected ${expected} in advanced search query.`);
    }

    this.index += 1;
    return token;
  }

  private parsePrimary(): SearchNode {
    const token = this.peek();

    if (token.type === "lparen") {
      this.consume("lparen");
      const node = this.parseOr();
      this.consume("rparen");
      return node;
    }

    if (token.type === "phrase") {
      this.consume();
      return { type: "term", kind: "phrase", value: token.value };
    }

    if (token.type === "regex") {
      this.consume();
      return { type: "term", kind: "regex", value: token.value, flags: token.flags };
    }

    if (token.type === "word") {
      this.consume();
      return { type: "term", kind: "word", value: token.value };
    }

    throw new Error("Unexpected token in advanced search query.");
  }

  private parseNot(): SearchNode {
    if (this.peek().type === "not") {
      this.consume("not");
      return { type: "not", child: this.parseNot() };
    }

    return this.parsePrimary();
  }

  private parseAnd(): SearchNode {
    let left = this.parseNot();

    while (this.peek().type === "and") {
      this.consume("and");
      const right = this.parseNot();
      left = { type: "and", left, right };
    }

    return left;
  }

  private parseOr(): SearchNode {
    let left = this.parseAnd();

    while (this.peek().type === "or") {
      this.consume("or");
      const right = this.parseAnd();
      left = { type: "or", left, right };
    }

    return left;
  }

  parse(): SearchNode {
    const node = this.parseOr();
    if (this.peek().type !== "eof") {
      throw new Error(`Unexpected trailing input in advanced search query: ${String(this.peek())}`);
    }
    return node;
  }
}

export const looksLikeAdvancedSearch = (query: string): boolean => {
  if (!query.trim()) {
    return false;
  }

  const normalized = query.trim();
  const hasBoolean = /\b(AND|OR|NOT)\b/i.test(normalized);
  const hasPhrase = /".*"/.test(normalized);
  const hasRegex = /(^|\s)\/[^(\/)]*\/[a-z]*\s*$/i.test(normalized) || /\/[\s\S]*\//.test(normalized);

  return hasBoolean || hasPhrase || hasRegex;
};

export const parseAdvancedQuery = (query: string): SearchNode => {
  const sanitized = query.trim();
  if (!sanitized) {
    throw new Error("Advanced search query cannot be empty.");
  }

  return new Parser(sanitized).parse();
};

const testRegex = (value: string, pattern: string, flags: string): boolean => {
  try {
    const regex = new RegExp(pattern, flags);
    return regex.test(value);
  } catch {
    throw new Error(`Invalid regular expression: /${pattern}/${flags}`);
  }
};

export const evaluateAdvancedQuery = (query: string, haystacks: string[]): boolean => {
  const parsed = parseAdvancedQuery(query);
  const lookup = haystacks.join(" \n ");

  const evaluate = (node: SearchNode): boolean => {
    switch (node.type) {
      case "term": {
        const normalized = lookup.toLowerCase();

        if (node.kind === "word") {
          return normalized.includes(node.value.toLowerCase());
        }

        if (node.kind === "phrase") {
          return normalized.includes(node.value.toLowerCase());
        }

        return testRegex(normalized, node.value, node.flags);
      }
      case "and":
        return evaluate(node.left) && evaluate(node.right);
      case "or":
        return evaluate(node.left) || evaluate(node.right);
      case "not":
        return !evaluate(node.child);
      default:
        return false;
    }
  };

  return evaluate(parsed);
};
