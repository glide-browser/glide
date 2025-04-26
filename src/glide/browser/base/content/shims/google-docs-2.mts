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

// Types to make the codebase more expressive
type LineText = string;
type LineElement = HTMLElement;
type DocumentLine = {
  text: LineText;
  element: LineElement;
  rect: DOMRect;
};
type CaretPosition = {
  lineIndex: number;
  charIndex: number;
  rect: DOMRect;
};
type CaretRenderStyle = "standard" | "block" | "underline";

/**
 * GoogleDocsEditor - Implements the Editor interface for Google Docs
 */
class GoogleDocsEditor implements Editor {
  #rootWindow: Window;
  #editorWindow: Window & { KeyboardEvent: typeof KeyboardEvent };
  #canvas: HTMLCanvasElement;
  caret: Caret;

  // Document state
  #documentLines: DocumentLine[] = [];
  #currentCaretPosition: CaretPosition | null = null;
  text_content: string = "";
  char_index: number = 0;

  constructor(window: Window) {
    this.#rootWindow = window;

    const canvas = window.document!.querySelector<HTMLCanvasElement>(
      "canvas.kix-canvas-tile-content"
    );
    if (!canvas) {
      throw new Error("Couldn't resolve canvas element");
    }

    this.#canvas = canvas;
    this.#editorWindow = findEditorWindow(window) as any;
    this.caret = new Caret(window, this);

    // Initial document state
    this.refresh();
  }

  /**
   * Updates the editor's internal representation of the document content and caret position
   */
  refresh(): void {
    // Get the document structure
    const docLines = getDocumentLines(this.#rootWindow.document!);
    this.#documentLines = docLines;

    // Get caret information
    const caretRect = this.caret.element.getBoundingClientRect();
    const caretPosition = resolveCaretPosition(
      caretRect,
      docLines,
      this.#canvas,
      this.font_scale_factor
    );
    this.#currentCaretPosition = caretPosition;

    // Update text content and character index
    this.text_content = docLines.map(line => line.text).join("\n");
    this.char_index = calculateGlobalCharIndex(caretPosition, docLines);

    console.log("Refreshed state:", {
      currentChar: this.text_content[this.char_index],
      caretPosition,
      content: this.text_content,
    });
  }

  get font_scale_factor(): number {
    const zoomElement = this.#rootWindow.document!.getElementById(":t")!
      .childNodes[0] as HTMLInputElement;
    const zoomMatch = zoomElement.value.match(/(\d+)/);
    return zoomMatch ? parseInt(zoomMatch[0]) / 100 : 1;
  }

  get selection(): Editor["selection"] {
    const editor = this;
    return {
      get isCollapsed(): boolean {
        return true; // TODO: Handle selections
      },
      get focusOffset(): number {
        return editor.char_index;
      },
      get focusNode() {
        return { textContent: editor.text_content };
      },
      get anchorOffset() {
        return editor.char_index;
      },
    };
  }

  deleteSelection(_action: number, _stripWrappers: number) {
    sendKeyEvent(this.#editorWindow, {
      key: "Backspace",
      code: "Backspace",
      keyCode: 8,
      charCode: 0,
    });
  }

  get selectionController(): Editor["selectionController"] {
    return {
      characterMove: (forward, extend) => {
        sendKeyEvent(this.#editorWindow, {
          key: forward ? "ArrowRight" : "ArrowLeft",
          code: forward ? "ArrowRight" : "ArrowLeft",
          keyCode: forward ? 39 : 37,
          charCode: 0,
          shiftKey: extend,
        });

        // Update internal state
        if (forward) {
          this.char_index = Math.min(
            this.char_index + 1,
            this.text_content.length
          );
        } else {
          this.char_index = Math.max(this.char_index - 1, 0);
        }

        console.log("After move:", {
          currentChar: motions.current_char(this),
          currentIndex: this.char_index,
        });
      },
      lineMove(_forward, _extend) {
        throw new Error("Not implemented: lineMove");
      },
      intraLineMove(_forward, _extend) {
        throw new Error("Not implemented: intraLineMove");
      },
    };
  }

  /**
   * Get the current line the caret is on
   */
  getCurrentLine(): DocumentLine | null {
    if (!this.#currentCaretPosition) return null;
    return this.#documentLines[this.#currentCaretPosition.lineIndex] || null;
  }
}

// Pure function to send keyboard events to the editor window
function sendKeyEvent(
  editorWindow: Window & { KeyboardEvent: typeof KeyboardEvent },
  options: {
    key: string;
    code: string;
    keyCode: number;
    charCode: number;
    shiftKey?: boolean;
  }
) {
  const evt = new editorWindow.KeyboardEvent("keydown", {
    ...options,
    // @ts-ignore
    target: editorWindow.document!.activeElement,
  });
  editorWindow.document!.dispatchEvent(evt);
}

/**
 * Pure function to calculate the global character index from line index and character index
 */
function calculateGlobalCharIndex(
  position: CaretPosition,
  lines: DocumentLine[]
): number {
  let charIndex = 0;
  // Add lengths of all preceding lines plus newlines
  for (let i = 0; i < position.lineIndex; i++) {
    charIndex += lines[i]!.text.length + 1; // +1 for newline
  }
  // Add offset within current line
  charIndex += position.charIndex;
  return charIndex;
}

/**
 * Pure function to resolve caret position within document
 */
function resolveCaretPosition(
  caretRect: DOMRect,
  docLines: DocumentLine[],
  canvas: HTMLCanvasElement,
  fontScaleFactor: number
): CaretPosition {
  // Find which line the caret is on
  const lineIndex = getLineIndexForY(
    caretRect.y,
    docLines.map(line => line.rect)
  );
  const currentLine = docLines[lineIndex]!;

  // Get context for measuring text
  const ctx = createCanvasContext(canvas, currentLine.element);

  // Find character position within the line
  const charIndex = resolveCharIndexInLine(
    currentLine.text,
    currentLine.rect,
    caretRect,
    ctx,
    fontScaleFactor
  );

  return {
    lineIndex,
    charIndex,
    rect: caretRect,
  };
}

/**
 * Pure function to determine which character the caret is at
 */
function resolveCharIndexInLine(
  lineText: string,
  lineRect: DOMRect,
  caretRect: DOMRect,
  ctx: CanvasRenderingContext2D,
  fontScaleFactor: number
): number {
  const lineX = Math.floor(lineRect.x);
  let measuredText = "";

  for (let i = 0; i < lineText.length; i++) {
    measuredText += lineText[i]!;
    const measured = ctx.measureText(measuredText);
    const x = lineX + measured.width * fontScaleFactor;

    if (x > Math.floor(caretRect.right)) {
      return i;
    }
  }

  return lineText.length;
}

/**
 * Pure function to get document lines with text, elements, and rects
 */
function getDocumentLines(document: Document): DocumentLine[] {
  const result: DocumentLine[] = [];

  document.querySelectorAll('g[data-section-type="body"]').forEach(group => {
    const text = Array.from(group.querySelectorAll("rect"))
      .map(rect => (rect as HTMLElement).getAttribute("aria-label") || "")
      .join("");

    const element = group as HTMLElement;

    result.push({
      text,
      element,
      rect: element.getBoundingClientRect(),
    });
  });

  return result;
}

/**
 * Pure function to determine line index for a Y coordinate
 */
function getLineIndexForY(y: number, lineRects: DOMRect[]): number {
  for (let i = 0; i < lineRects.length; i++) {
    const rect = lineRects[i]!;
    if (y >= rect.top && y < rect.top + rect.height) {
      return i;
    }
  }

  // If y is above first line, return first line; if below last, return last line
  if (lineRects.length === 0) return 0;
  if (y < lineRects[0]!.top) return 0;
  return lineRects.length - 1;
}

/**
 * Pure function to create a canvas context for text measurement
 */
function createCanvasContext(
  canvas: HTMLCanvasElement,
  lineElement: HTMLElement
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const fontAttr = (lineElement.childNodes[0]! as HTMLElement).getAttribute(
    "data-font-css"
  );
  if (fontAttr) {
    ctx.font = fontAttr;
  }
  return ctx;
}

/**
 * Google Docs creates multiple frames for different purposes.
 *
 * It appears that key events are all processed in a specific `<iframe>` that only
 * handles key events. When the page canvas is focused, `document.activeElement` will
 * point to said `<iframe>`.
 *
 * So we need to send key events to just this specific `Window`.
 */
function findEditorWindow(root: Window): Window {
  for (let i = 0; i < root.length; i++) {
    const subWindow = root[i] as Window;
    if (
      !subWindow.document?.getElementById("docs-texteventtarget-descendant")
    ) {
      // Not the editor frame
      continue;
    }
    return subWindow;
  }

  throw new Error("Could not resolve editor window");
}

/**
 * Caret class - Manages the visual caret element
 */
export class Caret {
  window: Window;
  element: HTMLElement;
  editor: GoogleDocsEditor;
  ctx: CanvasRenderingContext2D;
  #alpha: number = 0.5;
  #mode: GlideMode = "normal";
  #lastPosition = { x: 0, y: 0 };
  #mutationObserver: MutationObserver;

  constructor(window: Window, editor: GoogleDocsEditor) {
    this.window = window;
    this.editor = editor;

    // Get caret element
    const caretElement = window.document!.getElementById(
      "kix-current-user-cursor-caret"
    );
    if (!caretElement) {
      throw new Error("Couldn't find caret element");
    }
    this.element = caretElement as HTMLElement;

    // Initialize mutation observer
    this.#mutationObserver = new (window as any).MutationObserver(
      this.#onDomMutation.bind(this)
    );
    this.#mutationObserver.observe(this.element, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Placeholder context, will be set during refresh
    this.ctx = null as unknown as CanvasRenderingContext2D;
  }

  get rect(): DOMRect {
    return this.element.getBoundingClientRect();
  }

  #getRenderStyle(mode: GlideMode): CaretRenderStyle {
    switch (mode) {
      case "normal":
      case "visual":
      case "op-pending":
        return "block";
      case "hint":
      case "insert":
      case "ignore":
        return "standard";
      default:
        throw assert_never(mode);
    }
  }

  /**
   * Updates caret styling based on the current mode
   */
  on_mode(mode: GlideMode): void {
    this.#mode = mode;
    const style = this.#getRenderStyle(mode);

    switch (style) {
      case "block": {
        this.element.style.transform = "scaleX(-1)";
        this.element.style.transformOrigin = "left top";
        this.#updateCaretSize();
        break;
      }
      case "underline":
      case "standard": {
        this.element.style.removeProperty("transform");
        this.element.style.removeProperty("transform-origin");
        this.element.style.removeProperty("border-left-width");
        break;
      }
    }
  }

  /**
   * Updates the caret size for block mode
   */
  #updateCaretSize(): void {
    if (this.#getRenderStyle(this.#mode) !== "block") return;

    const currentLine = this.editor.getCurrentLine();
    if (!currentLine || !this.ctx) return;

    const charIndex = this.editor.char_index;
    const char = this.editor.text_content[charIndex] || " ";

    // Calculate position of char in current line
    const lineStartIndex = calculateLineStartIndex(
      this.editor.text_content,
      charIndex
    );
    const precedingText = this.editor.text_content.substring(
      lineStartIndex,
      charIndex
    );

    // Measure the width of the current character
    const baseMeasure = this.ctx.measureText(precedingText);
    const withCharMeasure = this.ctx.measureText(precedingText + char);
    const charWidth =
      (withCharMeasure.width - baseMeasure.width) *
      this.editor.font_scale_factor;

    // Update caret width
    this.element.style.borderLeftWidth = `${charWidth}px`;
  }

  /**
   * Handles DOM mutations on the caret element
   */
  #onDomMutation(mutations: MutationRecord[]): void {
    const rect = this.rect;

    // If caret position changed, refresh editor state
    if (rect.x !== this.#lastPosition.x || rect.y !== this.#lastPosition.y) {
      this.#lastPosition = { x: rect.x, y: rect.y };
      this.editor.refresh();
      this.#updateCaretSize();
    }

    // Adjust caret color for visibility
    const style = this.window.getComputedStyle(this.element)!;
    const color = style.borderColor;

    if (color.startsWith("rgb(") && this.#mode === "normal") {
      this.element.style.borderColor = color.replace(
        /rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
        `rgba($1,$2,$3,${this.#alpha})`
      );
    }
  }
}

/**
 * Pure function to calculate the starting index of the current line
 */
function calculateLineStartIndex(text: string, currentIndex: number): number {
  const prevNewlineIndex = reverse_indexof(text, "\n", currentIndex);
  return prevNewlineIndex === -1 ? 0 : prevNewlineIndex + 1;
}

/**
 * Factory function for creating a Google Docs editor instance
 */
export function make_editor(window: Window): { editor: Editor; caret: Caret } {
  const editor = new GoogleDocsEditor(window);
  return { editor, caret: editor.caret };
}
