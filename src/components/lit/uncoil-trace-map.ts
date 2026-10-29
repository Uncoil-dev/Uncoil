import { LitElement, html, css, nothing } from "lit";

export type TraceMapSpan = {
  id: string;
  parentId: string | null;
  name: string;
  kind: "generation" | "tool" | "retrieval" | "chain" | "agent" | "error";
  startOffsetMs: number;
  durationMs: number;
  status: "ok" | "error";
  model?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  children: TraceMapSpan[];
};

const KIND_COLOR: Record<TraceMapSpan["kind"], string> = {
  generation: "#e5e5e5",
  tool: "#9a9a9a",
  retrieval: "#c7c7c7",
  chain: "#6f6f6f",
  agent: "#ffffff",
  error: "#ff4d4d",
};

function flatten(spans: TraceMapSpan[], depth = 0, out: Array<{ span: TraceMapSpan; depth: number }> = []) {
  for (const span of spans) {
    out.push({ span, depth });
    if (span.children?.length) flatten(span.children, depth + 1, out);
  }
  return out;
}

function totalDuration(spans: TraceMapSpan[]): number {
  const rows = flatten(spans);
  return rows.reduce((max, r) => Math.max(max, r.span.startOffsetMs + r.span.durationMs), 1);
}

/**
 * Renders a single trace's span tree as a waterfall / flame-graph style
 * visual map: one row per span (indented by depth), a bar sized and
 * positioned proportionally to its duration within the trace, color-coded
 * by span kind. Scrolls when the tree is tall; bar track scales to the
 * component width so it works down to phone widths.
 */
export class UncoilTraceMap extends LitElement {
  static properties = {
    spans: { attribute: false },
    selectedId: { attribute: false },
  };

  declare spans: TraceMapSpan[];
  declare selectedId: string | null;

  static styles = css`
    :host {
      display: block;
      font-family: var(--uncoil-font-mono, ui-monospace, monospace);
      color: var(--uncoil-fg, #fff);
      background: var(--uncoil-bg, #000);
    }

    .wrap {
      max-height: 26rem;
      overflow: auto;
      border: 1px solid var(--uncoil-border, #333);
    }

    .row {
      display: grid;
      grid-template-columns: 12rem 1fr 5.5rem;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.5rem;
      border-bottom: 1px solid var(--uncoil-row-border, #1a1a1a);
      cursor: pointer;
      font-size: 0.72rem;
    }

    .row:hover {
      background: var(--uncoil-row-hover, #0d0d0d);
    }

    .row.selected {
      background: var(--uncoil-row-selected, #141414);
      outline: 1px solid var(--uncoil-fg, #fff);
      outline-offset: -1px;
    }

    .name {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .dot {
      width: 0.5rem;
      height: 0.5rem;
      flex: none;
      border-radius: 999px;
    }

    .track {
      position: relative;
      height: 0.9rem;
      background: var(--uncoil-track-bg, #111);
    }

    .bar {
      position: absolute;
      top: 0;
      height: 100%;
      min-width: 2px;
    }

    .meta {
      text-align: right;
      color: var(--uncoil-muted, #999);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.5rem;
      font-size: 0.62rem;
      color: var(--uncoil-muted, #999);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-top: 1px solid var(--uncoil-border, #333);
    }

    .legend .item {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .empty {
      padding: 1rem;
      color: var(--uncoil-muted, #999);
      font-size: 0.75rem;
    }
  `;

  constructor() {
    super();
    this.spans = [];
    this.selectedId = null;
  }

  private handleSelect(id: string) {
    this.selectedId = id;
    this.dispatchEvent(
      new CustomEvent("span-select", { detail: { spanId: id }, bubbles: true, composed: true }),
    );
  }

  render() {
    if (!this.spans?.length) {
      return html`<div class="empty">No spans recorded for this trace.</div>`;
    }

    const rows = flatten(this.spans);
    const total = totalDuration(this.spans);

    return html`
      <div class="wrap" role="tree" aria-label="Trace span map">
        ${rows.map(({ span, depth }) => {
          const leftPct = (span.startOffsetMs / total) * 100;
          const widthPct = Math.max((span.durationMs / total) * 100, 0.6);
          const isSelected = span.id === this.selectedId;
          return html`
            <div
              class=${`row${isSelected ? " selected" : ""}`}
              role="treeitem"
              aria-selected=${isSelected}
              style=${`padding-left: ${0.5 + depth * 1.1}rem`}
              @click=${() => this.handleSelect(span.id)}
            >
              <span class="name" title=${span.name}>
                <span class="dot" style=${`background:${KIND_COLOR[span.kind]}`}></span>
                ${span.name}
              </span>
              <span class="track">
                <span
                  class="bar"
                  style=${`left:${leftPct}%; width:${widthPct}%; background:${KIND_COLOR[span.kind]}`}
                  title=${`${span.durationMs}ms`}
                ></span>
              </span>
              <span class="meta">${span.durationMs}ms${span.costUsd ? ` · $${span.costUsd.toFixed(4)}` : ""}</span>
            </div>
          `;
        })}
      </div>
      <div class="legend">
        ${Object.entries(KIND_COLOR).map(
          ([kind, color]) => html`
            <span class="item"><span class="dot" style=${`background:${color}; display:inline-block; width:0.5rem; height:0.5rem; border-radius:999px;`}></span>${kind}</span>
          `,
        )}
      </div>
      ${nothing}
    `;
  }
}

if (!customElements.get("uncoil-trace-map")) {
  customElements.define("uncoil-trace-map", UncoilTraceMap);
}

declare global {
  interface HTMLElementTagNameMap {
    "uncoil-trace-map": UncoilTraceMap;
  }
}
