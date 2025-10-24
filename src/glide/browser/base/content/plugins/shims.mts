// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * This file defines any site-specific overrides that are needed to improve default functionality.
 *
 * We'll only generally consider including functionality here as a last resort and for very popular websites.
 */

import type { Sandbox } from "../sandbox.mts";

declare var document: Document;

export function init(sandbox: Sandbox) {
  youtube(sandbox);
}

/**
 * 1. YouTube use a custom video player which means our more general support for "enter insert mode on video focus"
 *    doesn't work. At the time of writing they also do not expose any generic properties we could use to determine
 *    that their video element is acting as a <video> (e.g. `role`) so we just hardcode this check based on an
 *    element ID.
 */
function youtube(sandbox: Sandbox) {
  const { glide } = sandbox;

  const messenger = glide.messengers.create<{
    "yt.video_focused": never;
  }>((message) => {
    switch (message.name) {
      case "yt.video_focused": {
        if (glide.ctx.mode !== "ignore") {
          void glide.excmds.execute("mode_change insert");
        }

        break;
      }
      default: {
        ((_: never) => {})(message.name);
        throw new Error(`unexpected message ${message.name}`);
      }
    }
  });

  glide.autocmds.create("UrlEnter", { hostname: "www.youtube.com" }, ({ tab_id }) => {
    messenger.content.execute((messenger) => {
      document.addEventListener("focusin", (event: Event) => {
        if ((event.target as HTMLElement)?.id === "movie_player") {
          messenger.send("yt.video_focused");
        }
      });
      // note: we don't need to handle blur as Glide will already handle that for us
    }, { tab_id });
  });
}
