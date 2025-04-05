# -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

<script type="text/javascript">
import("chrome://glide/content/browser.mjs").then(
  ({ GlideBrowser }) => {
    window.GlideBrowser = GlideBrowser;
  }
);

import("chrome://glide/content/browser-commands.mjs").then(
  ({ GlideCommands }) => {
    window.GlideCommands = GlideCommands;
  }
);

import("chrome://glide/content/browser-excmds.mjs").then(
  ({ GlideExcmds, GLIDE_EXCOMMANDS }) => {
    window.GlideExcmds = GlideExcmds;
    window.GLIDE_EXCOMMANDS = GLIDE_EXCOMMANDS;
  }
);
</script>
