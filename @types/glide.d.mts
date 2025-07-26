declare var GlideCommands: typeof import("../src/glide/browser/base/content/browser-commands.mts").GlideCommands;
declare var GlideExcmds: typeof import("../src/glide/browser/base/content/browser-excmds.mts").GlideExcmds;
declare var GLIDE_EXCOMMANDS: typeof import("../src/glide/browser/base/content/browser-excmds.mts").GLIDE_EXCOMMANDS;

declare type GlideCommandlineGroup =
  import("../src/glide/toolkit/content/widgets/glide-commandline.ts").GlideCommandlineGroup;

interface GlideCommandlineCompletionOption {
  name: string;
  description: string;
}

type Glide = typeof glide;
type Browser = typeof browser;

/**
 * The public interface of the `GlideCommandLine` XUL element
 * defined in `glide/toolkit/content/widgets/glide-commandline.ts`.
 */
declare interface GlideCommandLineInterface {
  prefill: string;

  show({ prefill }?: { prefill?: string }): void;
  toggle(): void;
  refresh_data(): void;

  accept_focused(): Promise<void>;

  focus_next(): void;
  focus_back(): void;

  get_active_group(): GlideCommandlineGroup;

  remove_focused_browser_tab(): void;

  set_completion_options(options: GlideCommandlineCompletionOption[]): void;
}

declare type GlideCommandLine = GlideCommandLineInterface & XULElement;

declare type GlideDirection = "left" | "right" | "up" | "down" | "endline";

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
