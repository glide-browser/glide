/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { AppUpdater } = ChromeUtils.importESModule("resource://gre/modules/AppUpdater.sys.mjs", {});
const { DownloadUtils } = ChromeUtils.importESModule("resource://gre/modules/DownloadUtils.sys.mjs", {
  global: "current",
});

export function format_download_progress(progress: number, progressMax: number): string {
  const transfer = DownloadUtils.getTransferTotal(progress, progressMax);
  const pct = progressMax > 0 ? Math.round((progress / progressMax) * 100) : 0;
  return `Downloading update… ${pct}% (${transfer})`;
}

export function is_actionable(STATUS: typeof AppUpdater.STATUS, status: number): boolean {
  return status === STATUS.DOWNLOAD_AND_INSTALL || status === STATUS.READY_FOR_RESTART;
}

export function get_action_label(
  STATUS: typeof AppUpdater.STATUS,
  status: number,
  update: nsIUpdate | null,
): string {
  if (status === STATUS.DOWNLOAD_AND_INSTALL) {
    const version = update?.displayVersion ?? "";
    return version ? `Download and install ${version}` : "Download and install";
  }
  if (status === STATUS.READY_FOR_RESTART) {
    return "Restart to apply update";
  }
  return "";
}

export interface UpdateOption extends GlideCompletionOption {
  kind: "status" | "action";
}

export function get_status_text(STATUS: typeof AppUpdater.STATUS, status: number, update: nsIUpdate | null): string {
  switch (status) {
    case STATUS.NEVER_CHECKED:
      return "Ready to check for updates…";
    case STATUS.CHECKING:
      return "Checking for updates…";
    case STATUS.CHECKING_FAILED:
      return "Failed to check for updates";
    case STATUS.NO_UPDATES_FOUND:
      return "Glide is up to date";
    case STATUS.NO_UPDATER:
      return "Update system is not available";
    case STATUS.UPDATE_DISABLED_BY_POLICY:
      return "Updates are disabled by policy";
    case STATUS.OTHER_INSTANCE_HANDLING_UPDATES:
      return "Another instance is handling updates";
    case STATUS.UNSUPPORTED_SYSTEM:
      return "Updates are not supported on this system";
    case STATUS.MANUAL_UPDATE:
      return "Please download the update manually";
    case STATUS.DOWNLOAD_AND_INSTALL: {
      const version = update?.displayVersion ?? "unknown";
      return `Update ${version} available`;
    }
    case STATUS.DOWNLOADING:
      return "Downloading update…";
    case STATUS.DOWNLOAD_FAILED:
      return "Download failed";
    case STATUS.STAGING:
      return "Applying update…";
    case STATUS.READY_FOR_RESTART:
      return "Update ready — restart to apply";
    case STATUS.INTERNAL_ERROR:
      return "An internal error occurred";
    default:
      return "Unknown update state";
  }
}
