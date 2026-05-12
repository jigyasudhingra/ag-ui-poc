/**
 * Prepare assistant text so KaTeX (via remark-math / rehype-katex) can render it.
 * Models often emit LaTeX in non-standard wrappers or use `$` for currency inside math.
 */
export function preprocessForMath(markdown: string): string {
  let s = wrapBracketDisplayLatex(markdown);
  s = escapeCurrencyInMathDelimiters(s);
  return s;
}

/**
 * Turns `[ \\text{...} ... \\times ... ]` (common LLM pattern) into `$$ ... $$`.
 * Requires at least one `\\letter` LaTeX command so we skip plain `[links](url)`-like text.
 */
function wrapBracketDisplayLatex(text: string): string {
  const bracketBlock =
    /\[\s*((?:[^[\]\\]|\\.)*?\\[a-zA-Z]+\*?(?:[^[\]\\]|\\.)*)\s*\]/g;
  return text.replace(bracketBlock, (_, inner: string) => {
    const trimmed = inner.trim();
    return `\n\n$$\n${trimmed}\n$$\n\n`;
  });
}

/**
 * In `$$ ... $$`, bare `$123` is parsed as nested math delimiter. Currency → `\\$123`.
 */
function escapeCurrencyInMathDelimiters(text: string): string {
  return text.replace(/\$\$([\s\S]*?)\$\$/g, (_, body: string) => {
    const fixed = body.replace(/\$(\d[\d,.]*)/g, (_, n) => `\\$${n}`);
    return `$$${fixed}$$`;
  });
}
