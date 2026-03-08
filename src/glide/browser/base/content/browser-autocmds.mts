/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { CONFIG_URI } = ChromeUtils.importESModule("chrome://glide/content/browser-constants.mjs");

type CleanupFunction = () => void | Promise<void>;

/**
 * Invoke registered autocmd functions.
 *
 * This will automatically call all functions in parallel and report any errors.
 */
export async function invoke<Event extends glide.AutocmdEvent>(
  event: Event,
  props: {
    args: glide.AutocmdArgs[Event];
    matches?: (pattern: glide.AutocmdPatterns[Event], args: glide.AutocmdArgs[Event]) => boolean;

    /**
     * Called when an autocmd function returns another function, so that
     * it can be registered to be called in the future.
     */
    register_cleanup: ((cleanup: CleanupFunction) => void) | null;
  },
): Promise<void> {
  const cmds = GlideBrowser.autocmds[event] ?? [];
  if (!cmds.length) {
    return;
  }

  GlideBrowser._log.debug(`[autocmds] emitting ${event}`);

  const results = await Promise.allSettled(cmds.map(cmd =>
    (async () => {
      if (props.matches && !props.matches(cmd.pattern, props.args)) {
        return;
      }

      const cleanup = await cmd.callback(props.args);
      if (typeof cleanup === "function") {
        if (!props.register_cleanup) {
          throw new Error(`${event} autocmds cannot define cleanup functions`);
        } else {
          props.register_cleanup(cleanup);
        }
      }
    })()
  ));

  for (const result of results) {
    if (result.status === "fulfilled") {
      continue;
    }

    GlideBrowser._log.error(result.reason);

    const loc = clean_stack(result.reason, "invoke/results") ?? "<unknown>";
    GlideBrowser.add_notification("glide-autocmd-error", {
      label: `Error occurred in ${event} autocmd \`${loc}\` - ${result.reason}`,
      priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
      buttons: [GlideBrowser.remove_all_notifications_button],
    });
  }
}

function clean_stack(err: unknown, up_to_func_name: string): string | null {
  return (
      typeof err === "object"
      && err != null
      && "stack" in err
      && typeof err.stack === "string"
    )
    ? err.stack
      .slice(0, err.stack.indexOf(`\n${up_to_func_name}`))
      .replace(CONFIG_URI, "glide.ts")
    : null;
}
