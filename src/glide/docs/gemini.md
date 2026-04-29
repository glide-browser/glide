# Gemini

Glide has experimental support for the `bash:gemini://` [protocol](https://geminiprotocol.net/). A lightweight, document oriented protocol.

## Unsupported features

Not all features of the gemini protocol are supported yet:

- [Redirects](https://geminiprotocol.net/docs/protocol-specification.gmi#redirection)
- [User input](https://geminiprotocol.net/docs/protocol-specification.gmi#input-expected)
- [Authentication](https://geminiprotocol.net/docs/protocol-specification.gmi#client-certificates)

## Security

The gemini protocol specification [recommends](https://geminiprotocol.net/docs/protocol-specification.gmi#tls-server-certificate-validation) validating TLS certificates using a TOFU system. However Glide currently just treats all self-signed certificates as valid for the gemini protocol, and does not prompt or warn about certificate changes.

Additionally, Glide treats self-signed certificates as valid by adding temporary overrides to Firefox's certificate validation system.
For this reason we only support connecting through `bash:gemini://` for the default port, `1965`, so that we cannot potentially add overrides for ports that would normally be used for HTTPS connections.
The temporary overrides are cleared when the browser restarts.

We will improve this in the future.

If these security tradeoffs are undesirable, you can disable support for `bash:gemini://` by setting the `bash:glide.gemini.enabled` pref to `false`.

## Custom styles

You can override the CSS used for rendering gemini pages by setting [`glide.o.gemini_styles`](api.md#glide.o.gemini_styles) in your config:

```ts
glide.o.gemini_styles = css`
  html {
    margin: 20px;
  }
  body {
    max-width: 800px;
    font-family: serif;
    line-height: 1.6;
  }
  /* ... */
`;
```

This option is global only, buffer-specific overrides via `glide.bo` are not supported yet.

> [!NOTE]
> The page must be reloaded for changes to take effect.
