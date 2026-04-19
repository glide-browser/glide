// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { assert_never } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const { NetUtil } = ChromeUtils.importESModule("resource://gre/modules/NetUtil.sys.mjs");

export interface ChildMessages {}
export interface ChildQueries {
  "Glide::Query::GetContent": {
    props: { url: string };
    result: { success: false; error: string } | { success: true; content: string };
  };
}
export interface ParentMessages {}
export interface ParentQueries {}

export type GeminiProtocolChild = JSProcessActorChild<ChildMessages, ChildQueries>;

const DEFAULT_PORT = 1965;

export class GeminiProtocolParent extends JSProcessActorParent<ParentMessages, ParentQueries> {
  #log: ConsoleInstance = null as any;
  #notify_experimental: (() => void) | null = null;

  actorCreated() {
    this.#log = console.createInstance({ prefix: "GeminiProtocol[Parent]", maxLogLevelPref: "glide.gemini.loglevel" });
    this.#notify_experimental = !Services.prefs.getBoolPref("glide.gemini.notified_experimental", false)
      ? this.#_notify_expermental.bind(this)
      : null;
  }

  async receiveMessage(
    message: ActorReceiveMessage<ChildMessages, ChildQueries>,
  ) {
    this.#log.debug("receiveMessage", message.name);

    switch (message.name) {
      case "Glide::Query::GetContent": {
        return await this.get_content(message.data).then((content) => ({ success: true, content })).catch((error) => {
          this.#log.error(error);
          return { success: false, error: Error.isError(error) ? error.message : String(error) };
        });
      }

      default:
        throw assert_never(message.name);
    }
  }

  async get_content(
    props: ChildQueries["Glide::Query::GetContent"]["props"],
  ): Promise<string> {
    if (!Services.prefs.getBoolPref("glide.gemini.enabled", true)) {
      throw new Error(`Gemini protocol support has been disabled`);
    }

    const uri = Services.io.newURI(props.url);
    if (uri.scheme !== "gemini") {
      throw new Error(`Expected scheme gemini, but got ${uri.scheme}`);
    }

    if (uri.port !== -1 && uri.port !== DEFAULT_PORT) {
      throw new Error(`For security reasons, Gemini can only connect to port ${DEFAULT_PORT}`);
    }

    this.#notify_experimental?.();

    const stream = await this.#connect_to_uri(uri);
    return await this.#read_stream(stream);
  }

  #read_stream(stream: nsIInputStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];

      const pump = Cc["@mozilla.org/network/input-stream-pump;1"]!.createInstance(Ci.nsIInputStreamPump);
      pump.init(stream, 0, 0, false);
      pump.asyncRead({
        onStartRequest() {},
        onDataAvailable(_request: any, inputStream: nsIInputStream, _offset: number, count: number) {
          chunks.push(NetUtil.readInputStreamToString(inputStream, count));
        },
        onStopRequest(_request: any, status: number) {
          if (Components.isSuccessCode(status)) {
            const bytes = chunks.join("");
            const decoder = new TextDecoder("utf-8");
            resolve(decoder.decode(new Uint8Array(Array.from(bytes, (ch) => ch.charCodeAt(0)))));
          } else {
            reject(new Error(`Stream read failed with status ${status}`));
          }
        },
      });
    });
  }

  /**
   * The gemini protocol[0] does not dictate a particular method for validating TLS server certificates, but it
   * does recommend TOFU. Additionally all gemini servers I have checked do use self-signed certificates.
   *
   * Unfortunately Firefox does not have any builtin implementation of TOFU, so for now we just disable
   * certificate validation by automatically adding exemptions for the certificate the server provides.
   *
   * We only support connecting to the 1965 port to avoid adding exemptions for any certificates that could
   * reasonably be used for non-gemini schemes.
   *
   * In the future we plan to strengthen this further, likely by implemented a proper TOFU system.
   *
   * [0]: https://geminiprotocol.net/docs/protocol-specification.gmi#tls-server-certificate-validation
   */
  async #connect_to_uri(uri: nsIURI, from_retry = false): Promise<nsIInputStream> {
    const actor = this;

    // https://geminiprotocol.net/docs/protocol-specification.gmi#requests
    // "Clients MUST NOT send a fragment as part of the request"
    const url = uri.specIgnoringRef;
    const hostname = uri.host;

    // when the browser is ran for tests we allow non-default ports so we can hit our test server
    const port = Services.prefs.getBoolPref("devtools.testing", false)
      ? Services.prefs.getIntPref("glide.gemini.test.port", 0) || DEFAULT_PORT
      : DEFAULT_PORT;

    this.#log.debug("connecting to", { url, hostname, port });

    const sts = Cc["@mozilla.org/network/socket-transport-service;1"]!.getService(Ci.nsISocketTransportService);
    const transport = sts.createTransport(["ssl"], hostname, port, /* proxyInfo */ null, /* dnsRecord */ null);

    transport.connectionFlags |= Ci.nsISocketTransport.ANONYMOUS_CONNECT;

    const output = transport.openOutputStream(0, 0, 0) as nsIAsyncOutputStream;
    const input = transport.openInputStream(0, 0, 0) as nsIAsyncInputStream;

    return new Promise((resolve, reject) => {
      let handler: nsITransportEventSink & nsIOutputStreamCallback & nsIInputStreamCallback = {
        onTransportStatus(_transport, status) {
          actor.#log.debug("transport status", status);
          if (status === Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
            actor.#log.info("connected to", uri.spec);
            output.asyncWait(handler, 0, 0, Services.tm.currentThread);
          }
        },

        onOutputStreamReady() {
          actor.#log.debug("onOutputStreamReady");

          try {
            const request = `${url}\r\n`;
            output.write(request, request.length);

            input.asyncWait(handler, 0, 0, Services.tm.currentThread);
          } catch (err) {
            reject(err);
            throw err;
          }
        },

        async onInputStreamReady(stream: nsIInputStream) {
          actor.#log.debug("onInputStreamReady");

          try {
            const error = await Promise.resolve().then(() => {
              // check if we can read the input stream to identify any potential certificate errors
              input.available();
              return null;
            }).catch((err: { result: number }) => err);

            if (is_self_signed_cert_error(error?.result)) {
              if (from_retry) {
                // should in theory be impossible as we add an override
                reject(error);
                return;
              }

              actor.#log.info("adding cert override for", uri.spec);

              const security = await transport.tlsSocketControl.asyncGetSecurityInfo();
              const certs = Cc["@mozilla.org/security/certoverride;1"]!.getService(Ci.nsICertOverrideService);
              certs.rememberValidityOverride(
                hostname,
                port,
                /* origin attributes */ {},
                security.serverCert,
                /* temporary */ true,
              );

              await actor.#connect_to_uri(uri, true).then(resolve).catch(reject);
              return;
            } else if (error != null) {
              actor.#log.debug("unexpected error", error);
              reject(error);
            } else {
              resolve(stream);
            }
          } catch (err) {
            reject(err);
            throw err;
          }
        },
      };

      transport.setEventSink(handler, Services.tm.currentThread);
    });
  }

  #_notify_expermental() {
    this.#notify_experimental = null;

    const window = Services.wm.getMostRecentWindow("navigator:browser") as typeof globalThis;
    const docs_url = "https://glide-browser.app/gemini";
    const notification_id = "glide-experimental-gemini";

    window.GlideBrowser.add_notification(notification_id, {
      label: `Support for the gemini:// protocol is experimental.`,
      priority: window.MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
      buttons: [
        {
          label: "Learn more",
          callback() {
            window.AppMenuNotifications.removeNotification(notification_id);
            window.gBrowser.addTrustedTab(docs_url, { inBackground: false });
          },
        },
        window.GlideBrowser.remove_all_notifications_button,
      ],
    });
    Services.prefs.setBoolPref("glide.gemini.notified_experimental", true);
  }
}

function is_self_signed_cert_error(error: number | null | undefined): boolean {
  if (error == null) {
    return false;
  }

  const service = Cc["@mozilla.org/nss_errors_service;1"]!.getService(Ci.nsINSSErrorsService);
  const MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT = Ci.nsINSSErrorsService.MOZILLA_PKIX_ERROR_BASE + 14;
  return service.getXPCOMFromNSSError(MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT) === error;
}
