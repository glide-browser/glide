# Security

Evaluating user-defined code in the main browser process introduces a large attack surface, as such Glide has taken the following precautions:

1. The config is evaluated inside a [sandbox](config.md#config-evaluation) with its own JS [realm](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model#realms).
2. Browser UI DOM [modifications](config.md#browser-ui) are supported through a bi-directional `Document` mirror, meaning the config is never given the original `Document` that renders the browser UI.

These two factors mean that the config evaluation is isolated from the code running in the main process powering the rest of the browser preventing it from modifying any internal state.

## Reporting issues

Please email [security@glide-browser.app](mailto:security@glide-browser.app).
