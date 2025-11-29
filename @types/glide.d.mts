declare var GlideCommands: typeof import("../src/glide/browser/base/content/browser-commands.mts").GlideCommands;
declare var GlideHints: typeof import("../src/glide/browser/base/content/browser-hints.mts").GlideHints;
declare var GlideExcmds: typeof import("../src/glide/browser/base/content/browser-excmds.mts").GlideExcmds;
declare var GLIDE_EXCOMMANDS:
  typeof import("../src/glide/browser/base/content/browser-excmds-registry.mts").GLIDE_EXCOMMANDS;

interface GlideCommandlineCompletionOption {
  name: string;
  description: string;
  keymap?: string;
}

type Glide = typeof glide;
type Browser = typeof browser;

/**
 * The public interface of the `GlideCommandLine` XUL element
 * defined in `glide/toolkit/content/widgets/glide-commandline.ts`.
 */
declare interface GlideCommandLineInterface {
  close(): void;
  show(opts?: GlideCommandLineShowOptions): void;
  toggle(): void;

  accept_focused(): Promise<void>;
  delete_focused(): Promise<void>;

  focus_next(): void;
  focus_back(): void;
}

declare type GlideCommandLineShowOptions = { prefill?: string; sources?: GlideCompletionSource[] };

declare type GlideCommandLine = GlideCommandLineInterface & XULElement;

declare type KeyMappingIPC =
  & Omit<
    NonNullable<
      import("../src/glide/browser/base/content/utils/keys.mts").KeyMappingTrieNode["value"]
    >,
    "command"
  >
  & { command: string };

declare interface HTMLElement {
  /**
   * Indicates that the element was clicked using Glide's hint mode.
   *
   * This is a hack to workaround difficulties with setting custom properties on `Event`s.
   *
   * We can't just use `element.dispatchEvent()` as that sidesteps a bunch of custom handling
   * for `click()` in particular.
   *
   * In the future, this could be refactored to either patch the internal C++ methods to support
   * custom event flags, or just an entirely different solution for the specific use cases we need,
   * e.g. check if the mouse was moved before the click.
   */
  $glide_hack_click_from_hint?: boolean;
}

declare interface GlideCompletionContext {
  input: string;
}

declare interface GlideCompletionSource<OptionT extends GlideCompletionOption = GlideCompletionOption> {
  readonly id: string;
  readonly container: HTMLElement;

  is_enabled(ctx: GlideCompletionContext): boolean;

  resolve_options(): OptionT[];

  /**
   * Filter down the given options based on the input.
   *
   * This is mutative, each option should be updated with `option.set_hidden(true | false)`.
   */
  search(ctx: GlideCompletionContext, options: OptionT[]): void;
}

declare interface GlideCompletionOption {
  readonly element: HTMLElement;

  is_focused(): boolean;
  is_hidden(): boolean;

  set_hidden(hidden: boolean): void;
  set_focused(focused: boolean): void;

  /**
   * Invoked on <enter>
   */
  accept(ctx: GlideCompletionContext): void | Promise<void>;

  /**
   * Invoked on <C-d>
   */
  delete(ctx: GlideCompletionContext): void | Promise<void>;
}
