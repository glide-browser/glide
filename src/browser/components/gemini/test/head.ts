// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

declare var NetUtil: MockedExports.KnownModules["resource://gre/modules/NetUtil.sys.mjs"]["NetUtil"];
declare var getTestFilePath: (path: string) => string;

const cert_overrides = Cc["@mozilla.org/security/certoverride;1"]!.getService(Ci.nsICertOverrideService);

let servers: nsITLSServerSocket[] = [];

async function spinup_gemini_server(responses: Record<string, string>) {
  const cert = get_test_server_certificate();
  const server = start_gemini_server(cert, responses);
  store_cert_override(server.port, cert);
  Services.prefs.setIntPref("glide.gemini.test.port", server.port);
  servers.push(server);
}

function get_test_server_certificate(): nsIX509Cert {
  const cert_db = Cc["@mozilla.org/security/x509certdb;1"]!.getService(Ci.nsIX509CertDB);
  const cert_file = Cc["@mozilla.org/file/local;1"]!.createInstance(Ci.nsIFile);
  cert_file.initWithPath(getTestFilePath("../client-cert.p12"));
  cert_db.importPKCS12File(cert_file, "password");
  for (const cert of cert_db.getCerts()) {
    if (cert.commonName == "Test End-entity") {
      return cert;
    }
  }
  throw new Error("could not find test certificate");
}

function store_cert_override(port: number, cert: nsIX509Cert) {
  cert_overrides.rememberValidityOverride("127.0.0.1", port, {}, cert, true);
}

function start_gemini_server(cert: nsIX509Cert, responses: Record<string, string>) {
  const server = Cc["@mozilla.org/network/tls-server-socket;1"]!.createInstance(Ci.nsITLSServerSocket);
  server.init(-1, true, -1);
  server.serverCert = cert;

  server.setSessionTickets(false);
  server.setRequestClientCertificate(Ci.nsITLSServerSocket.REQUEST_NEVER);

  server.asyncListen({
    onSocketAccepted(_socket, transport) {
      const input = transport.openInputStream(0, 0, 0) as nsIAsyncInputStream;
      const output = transport.openOutputStream(0, 0, 0);

      const conn_info = transport.securityCallbacks.getInterface(Ci.nsITLSServerConnectionInfo);
      conn_info.setSecurityObserver({
        onHandshakeDone() {
          input.QueryInterface!(Ci.nsIAsyncInputStream);
          input.asyncWait(
            {
              onInputStreamReady(stream: nsIInputStream) {
                try {
                  const request = NetUtil.readInputStreamToString(stream, stream.available());
                  const url = request.replace(/\r\n$/, "");
                  const body = responses[url] ?? "51 Not found\r\n";
                  output.write(body, body.length);
                } finally {
                  output.close();
                  input.close();
                }
              },
            },
            0,
            0,
            Services.tm.currentThread,
          );
        },
      });
    },
    onStopListening() {},
  });

  return server;
}

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("glide.gemini.test.port");

  const to_cleanup = servers;
  servers = [];
  for (const server of to_cleanup) {
    server.close();
  }
});

// avoid annoying "not used" warnings
if (false as any) {
  spinup_gemini_server({});
}
