/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { GeminiProtocolChild } from "../../../glide/browser/actors/GeminiProtocolParent.sys.mjs";

const Strings = ChromeUtils.importESModule("chrome://glide/content/utils/strings.mjs");

export class GeminiProtocolHandler implements nsIProtocolHandler {
  /**
   * The protocol scheme handled by this handler.
   */
  scheme = "glide";

  #log: ConsoleInstance = console.createInstance
    ? console.createInstance({ prefix: "GeminiProtocol", maxLogLevelPref: "glide.gemini.loglevel" })
    // createInstance isn't defined in tests
    : (console as any);

  /**
   * Creates a new channel for handling gemini:// URLs.
   */
  newChannel(uri: nsIURI, load_info: nsILoadInfo): nsIChannel {
    this.#log.debug("newChannel:", uri.spec);

    // https://geminiprotocol.net/docs/protocol-specification.gmi#requests
    // "If a client is making a request with an empty path, the client SHOULD add a trailing '/' to the request"
    if (uri.host !== 'config') {
      // throw
      this.#log.debug("adding a trailing slash:", uri.spec);
    }

    const stream_channel = Cc["@mozilla.org/network/input-stream-channel;1"]!.createInstance(Ci.nsIInputStreamChannel);
    const inner_channel = stream_channel.QueryInterface!(Ci.nsIChannel);

    stream_channel.setURI(uri);
    inner_channel.loadInfo = load_info;
    inner_channel.contentType = "text/javascript"; // TODO
    inner_channel.contentCharset = "UTF-8";
    inner_channel.originalURI = uri;

    // `DocumentChannel` calls `newChannel()` in the parent process to determine the content
    // type for process-switching, then creates a second channel in the content process via
    // `RecvRedirectToRealChannel`.
    //
    // The parent channel's data is just discarded so to avoid making two separate network requests
    // we just provide empty content in the parent process.
    // if (Services.appinfo.processType === Services.appinfo.PROCESS_TYPE_DEFAULT) {
    //   this.#log.debug("skipping fetch in parent process");
    //   this.#write_to_channel("", stream => {
    //     stream_channel.contentStream = stream;
    //   });
    //   return inner_channel;
    // }

    const suspended_channel = Services.io.newSuspendableChannelWrapper(inner_channel);
    suspended_channel.suspend();

    Promise.resolve()
      .then(() => this.#connect_and_read_stream(uri))
      .then(({ content }) => {
        this.#write_to_channel(content, stream => {
          stream_channel.contentStream = stream;
          suspended_channel.resume();
        });
      })
      .catch(error => {
        this.#log.error(error);
        const content = '// Error: ' + (Error.isError(error) ? error.message : String(error));

        this.#write_to_channel(content, stream => {
          stream_channel.contentStream = stream;
          suspended_channel.resume();
        });
      });

    return suspended_channel;
  }

  /**
   * Determines whether a given port is allowed for this protocol.
   */
  allowPort(port: number, _scheme: string) {
    // see `src/glide/browser/actors/GeminiProtocolParent.sys.mts:#connect_to_uri` for details on connection handling.
    return false;  // port === 1965;
  }

  async #connect_and_read_stream(uri: nsIURI): Promise<{ content: string }> {
    const actor = this.#get_actor();
    if (!actor) {
      throw new Error("The GeminiProtocol process actor is unavailable.");
    }

    const result = await actor.sendQuery("Glide::Query::GetContent", { url: uri.spec });
    if (!result.success) {
      throw new Error(result.error || "Could not connect or read the server response");
    }

    return { content: result.content };
  }

  #get_actor(): GeminiProtocolChild | null {
    try {
      return ChromeUtils.domProcessChild!.getActor("GeminiProtocol") as any as GeminiProtocolChild;
    } catch {
      return null;
    }
  }

  #write_to_channel(content: string, callback: (stream: nsIInputStream) => void) {
    const sis = Cc["@mozilla.org/io/string-input-stream;1"]!.createInstance(Ci.nsIStringInputStream);
    sis.setUTF8Data(content);
    callback(sis);
  }

  // #render_gemtext(gemtext: string): string {
  //   return `
  //     <head>
  //       <style>${this.#styles()}</style>
  //       <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
  //     </head>
  //     <body><article class="gemini">
  //   ` + gemtext_to_html(gemtext)
  //     + `</article></body>`;
  // }

  // #render_error_page(title: string, body_html: string): string {
  //   return `
  //     <head>
  //       <style>${this.#styles()}</style>
  //     </head>
  //     <body class="gemini">
  //       <h1>${escape_html(title)}</h1>
  //       ${body_html}
  //     </body>
  //   `;
  // }

  // #styles() {
  //   if (Services.prefs.prefHasUserValue("glide.gemini.css")) {
  //     return Services.prefs.getStringPref("glide.gemini.css");
  //   }
  //   return STYLES;
  // }

  QueryInterface = ChromeUtils.generateQI(["nsIProtocolHandler"]);
}

function escape_html(s: unknown): string {
  // note: firefox does vendor `lit` but we can't use that here as it depends on a `window` being available
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const STYLES = `
  html {
    margin: 20px;
  }
  
  body {
    margin: auto;
    max-width: 800px;
    -webkit-text-size-adjust: 100%;
  }
  
  div {
    margin-bottom: 0.6em;
  }
  
  img {
    max-width: 300px;
  }
  
  details {
    margin-top: 1em;
  }
  
  details summary {
    font-style: italic;
  }
  
  .gemini {
    margin-top: 1em;
    margin-bottom: 1em;
  }
  
  .gemini > * {
    margin: 0;
  }
  
  .gemini > p {
    white-space: pre-wrap;
  }
  
  .gemini span {
    font-size: smaller;
  }
  
  .gemini > pre {
    padding: 5px;
    width: 100%;
    box-sizing: border-box;
    overflow-x: scroll;
  }
  
  .gemini :not(pre) > code {
    border: solid 1px;
    padding: 1px 2px;
    margin: 1px 2px;
  }
  
  .gemini a {
    line-height: 1.5em;
  }
  
  .gemini > blockquote {
    white-space: pre-wrap;
    font-style: italic;
    border-left: 1px solid;
    padding-left: 10px;
  }
  
  .gemini > h1 {
    font-size: 1.5em;
  }
  
  .gemini > h2 {
    font-size: 1.25em;
  }
  
  .gemini > h3 {
    font-size: 1.1em;
  }
  
  .gemini > ul {
    padding-left: 1em;
  }
  
  .gemini > figure {
    margin-bottom: 1em;
  }
`;
