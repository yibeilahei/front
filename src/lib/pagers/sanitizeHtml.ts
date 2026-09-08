/**
 * EPUB HTML cleanup before the pager lays out a section.
 *
 * Complex <ruby><rb>…</rb><rt>…</rt><rb>…</rb><rt>…</rt></ruby> (Kindle / JIS)
 * makes Blink paint several bases and readings in one cell. Split to simple
 * ruby and pad when the reading is longer than the base so ふりがな does not
 * cover the next glyph.
 */

export type RubyChild = { tag: string | null; text: string };
export type RubySeg = { base: string; rt: string };

const RT_EM = 0.5;

export function rubySegmentsFromItems(items: RubyChild[]): RubySeg[] {
  const segs: RubySeg[] = [];
  let base = "";
  const flush = (rt: string) => {
    const b = base.replace(/\s+/g, "");
    if (b || rt) segs.push({ base: b, rt });
    base = "";
  };
  for (const item of items) {
    const tag = item.tag ? item.tag.toUpperCase() : null;
    if (tag === "RT" || tag === "RTC") flush((item.text || "").trim());
    else if (tag === "RP") continue;
    else base += item.text || "";
  }
  if (base.replace(/\s+/g, "")) flush("");
  return segs;
}

/** Extra inline-end em so a 0.5em <rt> longer than the base does not hang over the next glyph. */
export function rubyInlinePadEm(baseLen: number, rtLen: number, rtEm = RT_EM): number {
  const extra = rtLen * rtEm - Math.max(baseLen, 1);
  return extra > 0.05 ? extra : 0;
}

function childrenOf(ruby: Element): RubyChild[] {
  return Array.from(ruby.childNodes).map((node) => {
    if (node.nodeType === 1) {
      const el = node as Element;
      return { tag: el.tagName, text: el.textContent || "" };
    }
    return { tag: null, text: node.textContent || "" };
  });
}

export function normalizeRuby(root: ParentNode) {
  const rubies = Array.from(root.querySelectorAll("ruby"));
  for (const ruby of rubies) {
    const segs = rubySegmentsFromItems(childrenOf(ruby));
    if (!segs.length) continue;
    const doc = ruby.ownerDocument;
    const parent = ruby.parentNode;
    if (!doc || !parent) continue;
    // EPUB is XHTML. createElement("ruby") in an XML document is not in the
    // XHTML namespace, so Blink treats it as an unknown inline and the
    // ふりがな paints on top of the next glyph.
    const ns = ruby.namespaceURI || doc.documentElement.namespaceURI || "http://www.w3.org/1999/xhtml";
    for (const seg of segs) {
      const next = doc.createElementNS(ns, "ruby") as HTMLElement;
      next.append(seg.base);
      if (seg.rt) {
        const rt = doc.createElementNS(ns, "rt");
        rt.textContent = seg.rt;
        next.append(rt);
        const pad = rubyInlinePadEm([...seg.base].length, [...seg.rt].length);
        if (pad) next.style.paddingInlineEnd = `${pad.toFixed(2)}em`;
      }
      parent.insertBefore(next, ruby);
    }
    ruby.remove();
  }
}
