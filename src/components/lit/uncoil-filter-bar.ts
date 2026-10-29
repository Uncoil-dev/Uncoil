import { LitElement, html, css, nothing } from "lit";
import "./uncoil-filter-chip";

export type FilterFieldOption = {
  field: string;
  label: string;
  kind: "select" | "text" | "range" | "dateRange";
  /** For "select" fields, the choices to offer. */
  options?: string[];
  placeholder?: string;
};

export type FilterBarFilter = {
  id: string;
  field: string;
  label: string;
  operator: string;
  value: string;
  value2?: string;
};

/**
 * A Langfuse-style filter bar: pick a field, fill in a value, add it as a
 * chip; any number of filters of different kinds can be active at once.
 * State lives on the host page — this element is controlled via the
 * `fields` and `filters` properties and communicates changes by dispatching
 * `filters-change` with the full next filter array.
 */
export class UncoilFilterBar extends LitElement {
  static properties = {
    fields: { attribute: false },
    filters: { attribute: false },
    _draftField: { state: true },
    _draftValue: { state: true },
    _draftValue2: { state: true },
  };

  declare fields: FilterFieldOption[];
  declare filters: FilterBarFilter[];
  private declare _draftField: string;
  private declare _draftValue: string;
  private declare _draftValue2: string;

  static styles = css`
    :host {
      display: block;
      font-family: var(--uncoil-font-sans, ui-sans-serif, system-ui);
      color: var(--uncoil-fg, #fff);
    }

    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      border: 1px solid var(--uncoil-border, #333);
      background: var(--uncoil-bg, #000);
      padding: 0.6rem;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .composer {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
      border-left: 1px solid var(--uncoil-border, #333);
      padding-left: 0.6rem;
      margin-left: 0.15rem;
    }

    select,
    input {
      background: var(--uncoil-input-bg, #0a0a0a);
      border: 1px solid var(--uncoil-border, #333);
      color: var(--uncoil-fg, #fff);
      font-family: var(--uncoil-font-mono, ui-monospace, monospace);
      font-size: 0.72rem;
      padding: 0.32rem 0.4rem;
      border-radius: 0;
      min-width: 0;
    }

    input {
      width: 8rem;
    }

    input.narrow {
      width: 5.5rem;
    }

    select:focus,
    input:focus {
      outline: 1px solid var(--uncoil-fg, #fff);
      outline-offset: -1px;
    }

    button.add {
      appearance: none;
      background: var(--uncoil-fg, #fff);
      color: var(--uncoil-bg, #000);
      border: 1px solid var(--uncoil-fg, #fff);
      font-family: var(--uncoil-font-mono, ui-monospace, monospace);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.32rem 0.6rem;
      cursor: pointer;
      border-radius: 0;
    }

    button.add:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    button.clear {
      appearance: none;
      background: transparent;
      color: var(--uncoil-muted, #999);
      border: 1px solid transparent;
      font-family: var(--uncoil-font-mono, ui-monospace, monospace);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.32rem 0.4rem;
      cursor: pointer;
    }

    button.clear:hover {
      color: var(--uncoil-fg, #fff);
      border-color: var(--uncoil-border, #333);
    }

    .empty {
      color: var(--uncoil-muted, #999);
      font-size: 0.72rem;
      font-family: var(--uncoil-font-mono, ui-monospace, monospace);
    }
  `;

  constructor() {
    super();
    this.fields = [];
    this.filters = [];
    this._draftField = "";
    this._draftValue = "";
    this._draftValue2 = "";
  }

  private get activeField(): FilterFieldOption | undefined {
    const field = this._draftField || this.fields[0]?.field;
    return this.fields.find((f) => f.field === field);
  }

  private emitChange(next: FilterBarFilter[]) {
    this.filters = next;
    this.dispatchEvent(
      new CustomEvent<FilterBarFilter[]>("filters-change", {
        detail: next,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleAdd = () => {
    const field = this.activeField;
    if (!field || !this._draftValue) return;
    const id = `f_${Math.random().toString(36).slice(2, 9)}`;
    const next: FilterBarFilter = {
      id,
      field: field.field,
      label: field.label,
      operator: field.kind === "range" || field.kind === "dateRange" ? "between" : "eq",
      value: this._draftValue,
      value2: this._draftValue2 || undefined,
    };
    this.emitChange([...this.filters, next]);
    this._draftValue = "";
    this._draftValue2 = "";
  };

  private handleRemove(id: string) {
    this.emitChange(this.filters.filter((f) => f.id !== id));
  }

  private handleClearAll = () => {
    this.emitChange([]);
  };

  private renderValueInput() {
    const field = this.activeField;
    if (!field) return nothing;

    if (field.kind === "select") {
      return html`
        <select
          @change=${(e: Event) => (this._draftValue = (e.target as HTMLSelectElement).value)}
        >
          <option value="">select value…</option>
          ${(field.options ?? []).map((opt) => html`<option value=${opt}>${opt}</option>`)}
        </select>
      `;
    }

    if (field.kind === "range") {
      return html`
        <input
          class="narrow"
          type="number"
          placeholder="min"
          .value=${this._draftValue}
          @input=${(e: Event) => (this._draftValue = (e.target as HTMLInputElement).value)}
        />
        <span aria-hidden="true">–</span>
        <input
          class="narrow"
          type="number"
          placeholder="max"
          .value=${this._draftValue2}
          @input=${(e: Event) => (this._draftValue2 = (e.target as HTMLInputElement).value)}
        />
      `;
    }

    if (field.kind === "dateRange") {
      return html`
        <input
          type="date"
          .value=${this._draftValue}
          @input=${(e: Event) => (this._draftValue = (e.target as HTMLInputElement).value)}
        />
        <span aria-hidden="true">–</span>
        <input
          type="date"
          .value=${this._draftValue2}
          @input=${(e: Event) => (this._draftValue2 = (e.target as HTMLInputElement).value)}
        />
      `;
    }

    return html`
      <input
        type="text"
        placeholder=${field.placeholder ?? "value…"}
        .value=${this._draftValue}
        @input=${(e: Event) => (this._draftValue = (e.target as HTMLInputElement).value)}
        @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this.handleAdd()}
      />
    `;
  }

  render() {
    const canAdd = Boolean(this.activeField && this._draftValue);
    return html`
      <div class="bar">
        <div class="chips">
          ${this.filters.length === 0
            ? html`<span class="empty">No filters applied</span>`
            : this.filters.map(
                (f) => html`
                  <uncoil-filter-chip
                    filter-id=${f.id}
                    label=${f.label}
                    value=${f.value2 ? `${f.value} – ${f.value2}` : f.value}
                    @chip-remove=${(e: CustomEvent<{ filterId: string }>) => this.handleRemove(e.detail.filterId)}
                  ></uncoil-filter-chip>
                `,
              )}
          ${this.filters.length > 0
            ? html`<button class="clear" type="button" @click=${this.handleClearAll}>Clear all</button>`
            : nothing}
        </div>
        <div class="composer">
          <select
            .value=${this._draftField || this.fields[0]?.field || ""}
            @change=${(e: Event) => {
              this._draftField = (e.target as HTMLSelectElement).value;
              this._draftValue = "";
              this._draftValue2 = "";
            }}
          >
            ${this.fields.map((f) => html`<option value=${f.field}>${f.label}</option>`)}
          </select>
          ${this.renderValueInput()}
          <button class="add" type="button" ?disabled=${!canAdd} @click=${this.handleAdd}>+ Add filter</button>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("uncoil-filter-bar")) {
  customElements.define("uncoil-filter-bar", UncoilFilterBar);
}

declare global {
  interface HTMLElementTagNameMap {
    "uncoil-filter-bar": UncoilFilterBar;
  }
}
