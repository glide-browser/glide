{% head %}
<link rel="stylesheet" href="./index.css" />
{% /head %}

# Glide

Glide is a fork of Firefox focused on deep customizability, keyboard navigation and bringing the best parts of Vim to the browser. See the [quickstart](./quickstart.md) for more information.

## Download

{% html %}
<div class="grid">
  <div class="download-platform">
    <span class="platform-label">macOS</span>
    <div class="download-buttons">
      <a href="https://github.com/glide-browser/glide/releases/download/v0.1.27a/glide.macos-x86_64.dmg" class="download-link" target="_blank">Intel</a>
      <a href="https://github.com/glide-browser/glide/releases/download/v0.1.27a/glide.macos-aarch64.dmg" class="download-link" target="_blank">Silicon</a>
    </div>
  </div>
  <div class="download-platform">
    <span class="platform-label">Linux</span>
    <div class="download-buttons">
      <a href="https://github.com/glide-browser/glide/releases/download/v0.1.27a/glide.linux-x86_64.tar.xz" class="download-link" target="_blank">x64.tar</a>
      <a href="https://github.com/glide-browser/glide/releases/download/v0.1.27a/glide.linux-aarch64.tar.xz" class="download-link" target="_blank">aarch64.tar</a>
    </div>
  </div>
</div>
{% /html %}


## Keyboard shortcuts

{% html %}
<div id="keyboard-shortcuts-note">
{% /html %}

> *All shortcuts work in normal mode unless otherwise specified.*
>
> *The default <leader> key is <space>*

{% html %}
</div>
{% /html %}

{% html %}
<div class="shortcuts-container">
  <div class="shortcut-section">
    <h3>Navigation & Scrolling</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">h</span>
      <span class="shortcut-desc">Move caret left</span>
      <span class="shortcut-key">j</span>
      <span class="shortcut-desc">Move caret down</span>
      <span class="shortcut-key">k</span>
      <span class="shortcut-desc">Move caret up</span>
      <span class="shortcut-key">l</span>
      <span class="shortcut-desc">Move caret right</span>
      <span class="shortcut-key">gg</span>
      <span class="shortcut-desc">Scroll to top of page</span>
      <span class="shortcut-key">G</span>
      <span class="shortcut-desc">Scroll to bottom of page</span>
      <span class="shortcut-key">&lt;C-d&gt;</span>
      <span class="shortcut-desc">Scroll page down</span>
      <span class="shortcut-key">&lt;C-u&gt;</span>
      <span class="shortcut-desc">Scroll page up</span>
      <span class="shortcut-key">&lt;C-h&gt;</span>
      <span class="shortcut-desc">Go back in history</span>
      <span class="shortcut-key">&lt;C-l&gt;</span>
      <span class="shortcut-desc">Go forward in history</span>
      <span class="shortcut-key">&lt;C-o&gt;</span>
      <span class="shortcut-desc">Jump back in jumplist</span>
      <span class="shortcut-key">&lt;C-i&gt;</span>
      <span class="shortcut-desc">Jump forward in jumplist</span>
    </div>
  </div>

  <div class="shortcut-section">
    <h3>Links & Hints</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">f</span>
      <span class="shortcut-desc">Follow link (hint mode)</span>
      <span class="shortcut-key">F</span>
      <span class="shortcut-desc">Follow link in new tab</span>
      <span class="shortcut-key">&lt;leader&gt;f</span>
      <span class="shortcut-desc">Hint browser UI elements</span>
      <span class="shortcut-key">gi</span>
      <span class="shortcut-desc">Focus last input field</span>
    </div>
    <h3>Page Actions</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">&lt;leader&gt;r</span>
      <span class="shortcut-desc">Reload page</span>
      <span class="shortcut-key">&lt;leader&gt;R</span>
      <span class="shortcut-desc">Hard reload page</span>
      <span class="shortcut-key">yy</span>
      <span class="shortcut-desc">Copy current URL</span>
      <span class="shortcut-key">u</span>
      <span class="shortcut-desc">Undo</span>
      <span class="shortcut-key">.</span>
      <span class="shortcut-desc">Repeat last command</span>
    </div>
  </div>

  <div class="shortcut-section">
    <h3>Tabs</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">&lt;leader&gt;d</span>
      <span class="shortcut-desc">Close tab</span>
      <span class="shortcut-key">&lt;C-j&gt;</span>
      <span class="shortcut-desc">Next tab</span>
      <span class="shortcut-key">&lt;C-k&gt;</span>
      <span class="shortcut-desc">Previous tab</span>
    </div>
  </div>

  <div class="shortcut-section">
    <h3>Commandline</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">:</span>
      <span class="shortcut-desc">Open command line</span>
      <span class="shortcut-key">&lt;leader&gt;&lt;leader&gt;</span>
      <span class="shortcut-desc">Search open tabs</span>
      <span class="shortcut-key">&lt;Tab&gt;</span>
      <span class="shortcut-desc">Next completion [command]</span>
      <span class="shortcut-key">&lt;S-Tab&gt;</span>
      <span class="shortcut-desc">Previous completion [command]</span>
      <span class="shortcut-key">&lt;Enter&gt;</span>
      <span class="shortcut-desc">Execute command [command]</span>
      <span class="shortcut-key">&lt;C-d&gt;</span>
      <span class="shortcut-desc">Delete tab [command]</span>
    </div>
  </div>

  <div class="shortcut-section">
    <h3>Mode Switching</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">i</span>
      <span class="shortcut-desc">Enter insert mode (cursor left)</span>
      <span class="shortcut-key">a</span>
      <span class="shortcut-desc">Enter insert mode (after cursor)</span>
      <span class="shortcut-key">A</span>
      <span class="shortcut-desc">Enter insert mode (end of line)</span>
      <span class="shortcut-key">v</span>
      <span class="shortcut-desc">Enter visual mode</span>
      <span class="shortcut-key">&lt;Esc&gt;</span>
      <span class="shortcut-desc">Exit to normal mode</span>
      <span class="shortcut-key">&lt;S-Esc&gt;</span>
      <span class="shortcut-desc">Toggle ignore mode</span>
    </div>
  </div>

  <div class="shortcut-section">
    <h3>Text Editing</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">d</span>
      <span class="shortcut-desc">Delete (operator)</span>
      <span class="shortcut-key">c</span>
      <span class="shortcut-desc">Change (operator)</span>
      <span class="shortcut-key">x</span>
      <span class="shortcut-desc">Delete character</span>
      <span class="shortcut-key">r</span>
      <span class="shortcut-desc">Replace character</span>
      <span class="shortcut-key">o</span>
      <span class="shortcut-desc">Open new line below</span>
    </div>
  </div>

  <div class="shortcut-section">
    <h3>Motions</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">w</span>
      <span class="shortcut-desc">Next word</span>
      <span class="shortcut-key">W</span>
      <span class="shortcut-desc">Next WORD</span>
      <span class="shortcut-key">b</span>
      <span class="shortcut-desc">Previous word</span>
      <span class="shortcut-key">B</span>
      <span class="shortcut-desc">Previous WORD</span>
      <span class="shortcut-key">0</span>
      <span class="shortcut-desc">Start of line</span>
      <span class="shortcut-key">$</span>
      <span class="shortcut-desc">End of line</span>
      <span class="shortcut-key">{</span>
      <span class="shortcut-desc">Previous paragraph</span>
      <span class="shortcut-key">}</span>
      <span class="shortcut-desc">Next paragraph</span>
    </div>
  </div>

  <div class="shortcut-section">
    <h3>Visual Mode</h3>
    <div class="shortcut-grid">
      <span class="shortcut-key">h</span>
      <span class="shortcut-desc">Extend selection left</span>
      <span class="shortcut-key">l</span>
      <span class="shortcut-desc">Extend selection right</span>
      <span class="shortcut-key">d</span>
      <span class="shortcut-desc">Delete selection</span>
      <span class="shortcut-key">y</span>
      <span class="shortcut-desc">Copy selection</span>
    </div>
  </div>
</div>
{% /html %}
