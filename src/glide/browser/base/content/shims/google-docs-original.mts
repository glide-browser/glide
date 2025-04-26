// foo

import type { Editor } from "../motions.mts";

const motions = ChromeUtils.importESModule(
  "chrome://glide/content/motions.mjs"
);
const { assert_never } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { reverse_indexof } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/strings.mjs"
);

// TODO: some off by one issues in the editor

// interface GoogleDocsEditor extends Editor {
//   refresh(): void;
// }

class GoogleDocsEditor implements Editor {
  #root_window: Window;
  #editor_window: Window & { KeyboardEvent: typeof KeyboardEvent };
  #canvas: HTMLCanvasElement;
  caret: Caret;

  // TODO: no
  text_content: string;

  constructor(window: Window) {
    this.#root_window = window;

    var canvas = window.document!.querySelector<HTMLCanvasElement>(
      "canvas.kix-canvas-tile-content"
    );
    if (!canvas) {
      throw new Error("couldnt resolve canvas element");
    }

    this.#canvas = canvas;
    this.caret = new Caret(window, this);
    this.#editor_window = find_editor_window(window) as any;

    // TODO
    this.text_content = "";
    this.refresh();
  }

  // TODO: probably better way to do this
  refresh(): void {
    // TODO: don't do this in here
    const { lines, line_elements } = get_lines(this.#root_window.document!);
    const line_rects = line_elements.map(line => line.getBoundingClientRect());
    const caret_pos = this.caret.element.getBoundingClientRect();
    const line_index = get_line_index_for_Y(caret_pos.y, line_rects);
    // TODO: different per-line
    const ctx = make_ctx(this.#canvas, line_elements[line_index]!);
    this.caret.ctx = ctx;
    const offset = this.caret.resolve_position(
      lines[line_index]!,
      line_rects[line_index]!
    );
    var char_index = lines.slice(0, line_index).length + offset.char_index;

    this.char_index = char_index;
    this.text_content = lines.join("\n");
    console.log("refresh char", this.text_content[char_index]);

    // if (!foo) {
    //   foo = ch
    // }
    console.log({
      glide_content: lines.join("\n"),
      preceding_lines: lines.slice(0, line_index),
      caret_pos,
      offset,
      current_line: lines[line_index],
    });

    //
  }

  get font_scale_factor(): number {
    // TODO: memoize?
    const zoom = (
      this.#root_window.document!.getElementById(":t")!
        .childNodes[0] as HTMLInputElement
    ).value;

    return parseInt(zoom.match(/(\d+)/)![0]) / 100;
  }

  // begin Editor interface
  // TODO: this is fucked
  // preceding_char(): string {
  //   return this.text_content[this.char_index - 1] ?? "";
  // }
  // current_char(): string {
  //   return this.text_content[this.char_index] ?? "";
  // }
  // next_char(): string {
  //   return this.text_content[this.char_index] ?? "";
  // }
  get selection(): Editor["selection"] {
    const editor = this;
    return {
      get isCollapsed(): boolean {
        // TODO
        return true;
      },
      get focusOffset(): number {
        // TODO?
        // return char_index > 0 ? char_index - 1 : char_index;
        // return char_index + 1;

        // if (true as any) {
        //   return get_caret_position(
        //     ctx,
        //     lines[line_index]!,
        //     line_rects[line_index]!,
        //     caret_pos,
        //     scale_factor
        //   ).char_index;
        // }
        // return editor.char_index + 1;
        return editor.char_index;
      },
      get focusNode() {
        // const { lines } = get_lines(window.document!);
        return { textContent: editor.text_content };
      },
      get anchorOffset() {
        // TODO
        return editor.char_index - 1;
      },
    };
  }

  deleteSelection(_action: number, _stripWrappers: number) {
    // TODO: update char index
    // TODO: how to handle non-collapsed selections

    const evt = new this.#editor_window.KeyboardEvent("keydown", {
      // TODO: need more info?
      key: "Backspace",
      code: "Backspace",
      keyCode: 8,
      // target: this.document!.activeElement,
      // TODO: shadow roots / iframes?
      // TODO: required??
      // @ts-ignore
      // target: sub_window.document!.activeElement ?? window.document,
      target: this.#editor_window.document!.activeElement,
      charCode: 0,
    });
    this.#editor_window.document!.dispatchEvent(evt);
  }

  // TODO: no
  char_index = 0;

  get selectionController(): Editor["selectionController"] {
    const editor = this;
    return {
      characterMove(forward, extend) {
        // TODO: keyup?
        const evt = new editor.#editor_window.KeyboardEvent("keydown", {
          // TODO: need more info?
          ...(forward ?
            { key: "ArrowRight", code: "ArrowRight", keyCode: 39 }
          : { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 }),
          // target: this.document!.activeElement,
          // TODO: shadow roots / iframes?
          // TODO: required??
          // @ts-ignore
          // target: sub_window.document!.activeElement ?? window.document,
          target: editor.#editor_window.document!.activeElement,
          charCode: 0,
          shiftKey: extend,
          // key: "a",
          // ctrlKey: true,
        });
        editor.#editor_window.document!.dispatchEvent(evt);

        // TODO: check bof/eof

        if (forward) {
          editor.char_index++;
        } else {
          editor.char_index--;
          if (editor.char_index < 0) {
            editor.char_index = 0;
          }
        }

        console.log("current char", motions.current_char(editor));
        console.log("current index", editor.char_index);

        // redundant
        // editor.#caret.on_char();

        // TODO: base event as well?
        //
      },
      lineMove(_forward, _extend) {
        throw new Error("TODO: lineMove");
      },
      intraLineMove(_forward, _extend) {
        throw new Error("TODO: intraLineMove");
      },
    };
  }
}

export function make_editor(window: Window): { editor: Editor; caret: Caret } {
  const editor = new GoogleDocsEditor(window);
  return { editor, caret: editor.caret };
}

/**
 * Google Docs creates multiple frames for different purposes.
 *
 * It appears that key events are all processed in a specific `<iframe>` that only
 * handles key events. When the page canvas is focused, `document.activeElement` will
 * point to said `<iframe>`.
 *
 * So we need to send key events to just this specific `Window`, attempting to send
 * key events to the root `Window` will not work.
 */
function find_editor_window(root: Window): Window {
  for (let i = 0; i < root.length; i++) {
    const sub_window = root[i] as Window;
    if (
      // at the time of writing (19-04-2025) this element ID only appears in the `<iframe>`
      !sub_window.document?.getElementById("docs-texteventtarget-descendant")
    ) {
      // not the editor frame
      continue;
    }

    return sub_window;
  }

  throw new Error("Could not resolve editor window");
}

// TODO: this caret should be initialised as soon as you start editing, not when you press a cmd key
export class Caret {
  window: Window;
  element: HTMLElement;
  editor: GoogleDocsEditor;
  // TODO: won't work across lines
  ctx: CanvasRenderingContext2D;
  #alpha: number;
  #mode: GlideMode;
  #x: number;
  #y: number;

  constructor(window: Window, editor: GoogleDocsEditor) {
    this.window = window;
    this.element = window.document!.getElementById(
      "kix-current-user-cursor-caret"
    ) as HTMLElement;

    this.#alpha = 0.5;
    this.#mode = "normal"; // TODO: maybe just require initialising with a mode?
    this.editor = editor;

    // TODO
    this.#x = 0;
    this.#y = 0;

    // @ts-ignore TODO
    this.ctx = null;

    // TODO: when terminate?
    if (!(this.element as any)._alphaObs) {
      (this.element as any)._alphaObs = new (
        window as any as { MutationObserver: typeof MutationObserver }
      ).MutationObserver(this.#on_dom_mutation.bind(this)).observe(
        this.element,
        {
          attributes: true,
          attributeFilter: ["style", "class"],
        }
      );
    }

    // TODO: tmp while debugging
    // window.setInterval(this.on_char.bind(this), 1000);
  }

  resolve_position(line: string, line_rect: DOMRect): { char_index: number } {
    const caret = this.rect;
    // console.log("caret x", this.right);
    var text = "";
    const line_x = Math.floor(line_rect.x); // TODO: correct?
    for (let i = 0; i < line.length; i++) {
      text = text + line[i]!;

      const measured = this.ctx.measureText(text);
      const x = line_x + measured.width * this.editor.font_scale_factor;
      console.log("x", x, text);
      if (x > Math.floor(caret.right)) {
        console.log("current char", line[i]);
        return { char_index: i };
      }
    }

    return { char_index: line.length - 1 };
  }

  get rect(): DOMRect {
    return this.element.getBoundingClientRect();
  }

  #get_render_style(mode: GlideMode): "standard" | "block" | "underline" {
    // TODO: generic helper?
    switch (mode) {
      case "normal":
      case "visual":
        return "block";
      case "op-pending":
        // TODO
        return "block";
      case "hint":
      case "insert":
      case "ignore":
        return "standard";
      default:
        throw assert_never(mode);
    }
  }

  on_mode(mode: GlideMode) {
    this.#mode = mode;

    const caret = this.element;
    const style = this.#get_render_style(mode);

    // TOOD: what about multiplayer carets?

    switch (style) {
      case "block": {
        caret.style.transform = "scaleX(-1)";
        caret.style.transformOrigin = "left top";
        this.#resize();
        break;
      }
      case "underline": // TODO
      case "standard": {
        caret.style.removeProperty("transform");
        caret.style.removeProperty("transform-origin");
        caret.style.removeProperty("border-left-width");
        // TODO: also remove rgba
        break;
      }
    }
  }

  #preceding(): string {
    // TODO: probably off-by-ones here :)
    var i = reverse_indexof(
      this.editor.text_content,
      "\n",
      this.editor.char_index
    );
    if (i === -1) {
      i = 0;
    }

    return this.editor.text_content.slice(i, this.editor.char_index);
  }

  #resize() {
    const style = this.#get_render_style(this.#mode);
    switch (style) {
      case "block": {
        const char = this.editor.text_content[this.editor.char_index];
        const preceding = this.#preceding();
        console.log({ preceding, char });
        const base = this.ctx.measureText(preceding);
        const measured = this.ctx.measureText(preceding + char);
        const scaled =
          (measured.width - base.width) * this.editor.font_scale_factor;
        console.log(char, scaled, this.editor.font_scale_factor);
        this.element.style.borderLeftWidth = scaled.toString() + "px";
        break;
      }
      case "underline":
      case "standard": {
        break;
      }
      default:
        throw assert_never(style);
    }
  }

  #on_dom_mutation(mutations: MutationRecord[]) {
    const rect = this.element.getBoundingClientRect();
    if (rect.x !== this.#x || rect.y !== this.#y) {
      // TODO: update x y?
      this.editor.refresh();
      this.#resize();
    }

    const style = this.window.getComputedStyle(this.element)!;
    // style.transform
    // console.log("mutations", mutations);

    const colour = style.borderColor;
    if (colour.startsWith("rgb(") && this.#mode === "normal") {
      // ignore our own rgba write‑backs
      this.element.style.borderColor = colour.replace(
        /rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
        `rgba($1,$2,$3,${this.#alpha})`
      );
    }
  }
}

export function make_ctx(
  canvas: HTMLCanvasElement,
  // TODO: rect or not?
  line_element: HTMLElement
): CanvasRenderingContext2D {
  var ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  // @ts-ignore
  const font_attr = line_element.childNodes[0]!.getAttribute("data-font-css");
  console.log(line_element);
  ctx.font = font_attr!;
  console.log("font", ctx.font, font_attr);
  return ctx;
}

export function get_lines(element: HTMLElement | Document): {
  lines: string[];
  line_elements: HTMLElement[];
} {
  const lines: string[] = [];
  const line_elements: HTMLElement[] = [];

  element.querySelectorAll('g[data-section-type="body"]').forEach(group => {
    const text = Array.from(group.querySelectorAll("rect"))
      .map(rect => (rect as HTMLEmbedElement).getAttribute("aria-label") ?? "")
      .join("");

    // if (!lines.length) {
    //   lines.push(" " + text);
    // }
    lines.push(text);
    line_elements.push(group as HTMLElement);
  });

  return { lines, line_elements };
}

/**
 * Determine the caret index given a canvas caret (x,y) coordinate.
 */
function get_line_index_for_Y(y: number, lineRects: DOMRect[]) {
  for (let i = 0; i < lineRects.length; i++) {
    const rect = lineRects[i]!;
    if (y >= rect.top && y < rect.top + rect.height) {
      return i; // found the line index
    }
  }
  // If y is above first line, return first line; if below last, return last line
  if (y < lineRects[0]!.top) return 0;
  return lineRects.length - 1;
}
