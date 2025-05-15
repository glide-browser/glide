const { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);

/**
 * Fetch the given resource URI and return the string contents.
 */
export async function fetch_resource(
  uri: string,
  props:
    | { loadUsingSystemPrincipal: boolean }
    | { loadingPrincipal: nsIPrincipal }
): Promise<string> {
  return await new Promise((resolve, reject) => {
    NetUtil.asyncFetch(
      { uri, ...props },
      (inputStream: nsIInputStream, status: number) => {
        if (!Components.isSuccessCode(status)) {
          reject(new Error(`Failed to load ${uri}`));
          return;
        }
        try {
          const text = NetUtil.readInputStreamToString(
            inputStream,
            inputStream.available(),
            null
          );
          resolve(text);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}
