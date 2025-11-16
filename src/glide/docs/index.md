{% head %}

<link rel="stylesheet" href="./index.css?v=" />
{% /head %}

# Glide

An [extensible](config.md) and [keyboard-focused](hints.md) web browser.

Features:

- [Navigate](hints.md) the web with just a keyboard
- Modal based [keymaps](keys.md)
- TypeScript [config](config.md)
- Web extensions [API](extensions.md) support
- Fuzzy tab manager (try it with `<space><space>`)
- Site specific [settings](cookbook.md#set-a-pref-for-a-specific-website) / [keymaps](cookbook.md#override-a-keymap-for-a-specific-website)
- ... and more

{% html %}
<video
id="demo-video"
width="690"
height="497"
thumb="./demo-thumb.webp"
controls
autoplay
loop
title="Demo video showing Glide features including keyboard navigation and config editing"

<source src="./demo.webm" type="video/webm" />
<source src="./demo.mp4" type="video/mp4" />
</video>
{% /html %}

## Download

{% html %}

<div class="grid">
  <div class="download-platform">
    <span class="platform-label">macOS</span>
    <div class="download-buttons">
      <a href="https://github.com/glide-browser/glide/releases/download/0.1.54a/glide.macos-aarch64.dmg" class="download-link" target="_blank" rel="noopener">Apple Silicon</a>
      <a href="https://github.com/glide-browser/glide/releases/download/0.1.54a/glide.macos-x86_64.dmg" class="download-link" target="_blank" rel="noopener">Intel</a>
    </div>
  </div>
  <div class="download-platform">
    <span class="platform-label">Linux</span>
    <div class="download-buttons">
      <a href="https://github.com/glide-browser/glide/releases/download/0.1.54a/glide.linux-x86_64.tar.xz" class="download-link" target="_blank" rel="noopener">x64.tar</a>
      <a href="https://github.com/glide-browser/glide/releases/download/0.1.54a/glide.linux-aarch64.tar.xz" class="download-link" target="_blank" rel="noopener">aarch64.tar</a>
    </div>
  </div>
</div>
{% /html %}

## Default keymappings

{% html %}

<div id="default-keymappings-note">
{% /html %}

> _All mappings work in normal mode unless otherwise specified._
>
> _The default <leader> key is <space>_

{% html %}

</div>
{% /html %}

{% html %}

<div class="keymaps-container">
  <div class="keymap-section">
    <a href="#navigation"><h3 id="navigation">Navigation & Scrolling</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">h</span>
      <span class="keymap-desc">Move caret left</span>
      <span class="keymap-key">j</span>
      <span class="keymap-desc">Move caret down</span>
      <span class="keymap-key">k</span>
      <span class="keymap-desc">Move caret up</span>
      <span class="keymap-key">l</span>
      <span class="keymap-desc">Move caret right</span>
      <span class="keymap-key">gg</span>
      <span class="keymap-desc">Scroll to top of page</span>
      <span class="keymap-key">G</span>
      <span class="keymap-desc">Scroll to bottom of page</span>
      <span class="keymap-key">&lt;C-d&gt;</span>
      <span class="keymap-desc">Scroll page down</span>
      <span class="keymap-key">&lt;C-u&gt;</span>
      <span class="keymap-desc">Scroll page up</span>
      <span class="keymap-key">&lt;C-h&gt;</span>
      <span class="keymap-desc">Go back in history</span>
      <span class="keymap-key">&lt;C-l&gt;</span>
      <span class="keymap-desc">Go forward in history</span>
      <span class="keymap-key">&lt;C-o&gt;</span>
      <span class="keymap-desc">Jump back in jumplist</span>
      <span class="keymap-key">&lt;C-i&gt;</span>
      <span class="keymap-desc">Jump forward in jumplist</span>
    </div>
  </div>

<div class="keymap-section">
    <a href="#links"><h3 id="links">Links & Hints</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">f</span>
      <span class="keymap-desc">Follow link (hint mode)</span>
      <span class="keymap-key">F</span>
      <span class="keymap-desc">Follow link in new tab</span>
      <span class="keymap-key">&lt;leader&gt;f</span>
      <span class="keymap-desc">Hint browser UI elements</span>
      <span class="keymap-key">gi</span>
      <span class="keymap-desc">Focus last input field</span>
      <span class="keymap-key">gI</span>
      <span class="keymap-desc">Focus the biggest editable element</span>
      <span class="keymap-key">&lt;C-,&gt;</span>
      <span class="keymap-desc">Move focus back to the page</span>
    </div>
    <h3>Page Actions</h3>
    <div class="keymap-grid">
      <span class="keymap-key">&lt;leader&gt;r</span>
      <span class="keymap-desc">Reload page</span>
      <span class="keymap-key">&lt;leader&gt;R</span>
      <span class="keymap-desc">Hard reload page</span>
      <span class="keymap-key">yy</span>
      <span class="keymap-desc">Copy current URL</span>
      <span class="keymap-key">u</span>
      <span class="keymap-desc">Undo</span>
      <span class="keymap-key">.</span>
      <span class="keymap-desc">Repeat last command</span>
    </div>
  </div>

<div class="keymap-section">
    <a href="#tabs"><h3 id="tabs">Tabs</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">&lt;leader&gt;d</span>
      <span class="keymap-desc">Close tab</span>
      <span class="keymap-key">&lt;C-j&gt;</span>
      <span class="keymap-desc">Next tab</span>
      <span class="keymap-key">&lt;C-k&gt;</span>
      <span class="keymap-desc">Previous tab</span>
    </div>
  </div>

<div class="keymap-section">
    <a href="#commandline"><h3 id="commandline">Commandline</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">:</span>
      <span class="keymap-desc">Open command line</span>
      <span class="keymap-key">&lt;leader&gt;&lt;leader&gt;</span>
      <span class="keymap-desc">Search open tabs</span>
      <span class="keymap-key">&lt;Tab&gt;</span>
      <span class="keymap-desc">Next completion [command]</span>
      <span class="keymap-key">&lt;S-Tab&gt;</span>
      <span class="keymap-desc">Previous completion [command]</span>
      <span class="keymap-key">&lt;Enter&gt;</span>
      <span class="keymap-desc">Execute command [command]</span>
      <span class="keymap-key">&lt;C-d&gt;</span>
      <span class="keymap-desc">Delete tab [command]</span>
    </div>
  </div>

<div class="keymap-section">
    <a href="#modes"><h3 id="modes">Mode Switching</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">i</span>
      <span class="keymap-desc">Enter insert mode (cursor left)</span>
      <span class="keymap-key">a</span>
      <span class="keymap-desc">Enter insert mode (after cursor)</span>
      <span class="keymap-key">A</span>
      <span class="keymap-desc">Enter insert mode (end of line)</span>
      <span class="keymap-key">v</span>
      <span class="keymap-desc">Enter visual mode</span>
      <span class="keymap-key">&lt;Esc&gt;</span>
      <span class="keymap-desc">Exit to normal mode</span>
      <span class="keymap-key">&lt;S-Esc&gt;</span>
      <span class="keymap-desc">Toggle ignore mode</span>
    </div>
  </div>

<div class="keymap-section">
    <a href="#text-editing"><h3 id="text-editing">Text Editing</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">d</span>
      <span class="keymap-desc">Delete (operator)</span>
      <span class="keymap-key">c</span>
      <span class="keymap-desc">Change (operator)</span>
      <span class="keymap-key">x</span>
      <span class="keymap-desc">Delete character</span>
      <span class="keymap-key">X</span>
      <span class="keymap-desc">Delete character & move backwards</span>
      <span class="keymap-key">s</span>
      <span class="keymap-desc">Delete character & enter insert mode</span>
      <span class="keymap-key">r</span>
      <span class="keymap-desc">Replace character</span>
      <span class="keymap-key">o</span>
      <span class="keymap-desc">Open new line below</span>
    </div>
  </div>

<div class="keymap-section">
    <a href="#motions"><h3 id="motions">Motions</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">w</span>
      <span class="keymap-desc">Next word</span>
      <span class="keymap-key">W</span>
      <span class="keymap-desc">Next WORD</span>
      <span class="keymap-key">e</span>
      <span class="keymap-desc">End of word</span>
      <span class="keymap-key">b</span>
      <span class="keymap-desc">Previous word</span>
      <span class="keymap-key">B</span>
      <span class="keymap-desc">Previous WORD</span>
      <span class="keymap-key">0</span>
      <span class="keymap-desc">Start of line</span>
      <span class="keymap-key">$</span>
      <span class="keymap-desc">End of line</span>
      <span class="keymap-key">{</span>
      <span class="keymap-desc">Previous paragraph</span>
      <span class="keymap-key">}</span>
      <span class="keymap-desc">Next paragraph</span>
    </div>
  </div>

<div class="keymap-section">
    <a href="#visual-mode"><h3 id="visual-mode">Visual Mode</h3></a>
    <div class="keymap-grid">
      <span class="keymap-key">h</span>
      <span class="keymap-desc">Extend selection left</span>
      <span class="keymap-key">l</span>
      <span class="keymap-desc">Extend selection right</span>
      <span class="keymap-key">d</span>
      <span class="keymap-desc">Delete selection</span>
      <span class="keymap-key">y</span>
      <span class="keymap-desc">Copy selection</span>
    </div>
  </div>
</div>
{% /html %}
