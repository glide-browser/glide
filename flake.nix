{
  # note: this is experimental, we don't actually use this env for production builds yet.

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils?ref=main";
    # rust-overlay is needed for multi-target Rust: the CI cross-compiles x86_64
    # from an aarch64 runner, which requires a rustc that has both stdlibs.
    # Standard nixpkgs rustc only has the host platform target.
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    rust-overlay,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };
        # Stable Rust with both macOS targets so cross-compilation works when
        # building x86_64 from an aarch64 runner (and vice-versa).
        rust = pkgs.rust-bin.stable.latest.default.override {
          targets = [ "aarch64-apple-darwin" "x86_64-apple-darwin" ];
        };
        # Use LLVM 22 to match Rust 1.95's bundled LLVM (22.1.2). Cross-LTO
        # (--enable-lto=cross,thin) requires that lld and rustc use the same
        # LLVM major version; mixing LLVM 21 lld with LLVM 22 Rust bitcode
        # produces "Unknown attribute kind" linker errors.
        llvmPkgs = pkgs.llvmPackages_22;
      in {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs;
            [
              (pnpm.override {nodejs = nodejs_24;})
              nodejs_24
              python314
              uv
              rust
              rust-cbindgen
              rustfmt
              watchman
              cairo
              gnutar
              mercurial
              nasm
              llvmPkgs.clang
              llvmPkgs.libclang.lib
              llvmPkgs.libclang.dev  # clang/AST/*.h etc. for the Firefox clang plugin
              llvmPkgs.llvm
              llvmPkgs.llvm.dev      # llvm/ADT/*.h etc. for the Firefox clang plugin
              llvmPkgs.bintools      # llvm-ar, llvm-nm, lld etc. needed for LTO
              pkg-config
              gnumake
              curl
              m4 # gnum4

              # from nixpkgs build-mozilla-mach nativeBuildInputs
              autoconf
              perl
              unzip
              which

              # from nixpkgs build-mozilla-mach buildInputs
              bzip2
              file
              zip
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.isDarwin (with pkgs; [
              apple-sdk_26
              cups
              rsync
            ])
            ++ pkgs.lib.optionals pkgs.stdenv.isLinux (with pkgs; [
              yasm
              gtk2
              util-linux
              alsa-lib
              dbus
              libdrm
              dbus-glib
              gtk3
              libpulseaudio
              libX11
              xorg.libXcursor
              xorg.libXdamage
              xorg.libXext
              xorg.libXft
              xorg.libXi
              xorg.libXrender
              xorg.libXtst
              libxcb
              libXt
              xvfb-run
              dos2unix

              # from nixpkgs build-mozilla-mach buildInputs
              fontconfig
              freetype
              glib
              libevent
              libffi
              libjpeg
              libpng
              libvpx
              libwebp
              nspr
              nss_latest
              pango
              pixman
              xorgproto
              zlib
              libjack2
              libxkbcommon
              libGL
              libGLU
              libstartup_notification
              jemalloc
              libkrb5
            ]);

          env = {
            LIBCLANG_PATH = "${llvmPkgs.libclang.lib}/lib";
          };

          shellHook = ''
            # Mozilla's build system breaks when AS is set to a standalone assembler;
            # without it, configure uses the C compiler's integrated assembler which
            # correctly preprocesses .S files.
            # https://bugzilla.mozilla.org/show_bug.cgi?id=1497286
            unset AS

            # Set these in shellHook (after setup hooks) so nixpkgs setup hooks
            # (e.g. llvmPackages.clang's) cannot override them back to bare "clang".
            export CC="${llvmPkgs.clang}/bin/clang"
            export CXX="${llvmPkgs.clang}/bin/clang++"
            export HOST_CC="${llvmPkgs.clang}/bin/clang"
            export HOST_CXX="${llvmPkgs.clang}/bin/clang++"
            # rust-cbindgen and rustfmt from nixpkgs have llvmPackages (LLVM 21)
            # as a transitive propagated dep, adding LLVM 21 tools to PATH before
            # LLVM 22. Pin AR/NM/RANLIB explicitly so cc-rs (used by Rust build
            # scripts like swgl) doesn't pick up LLVM 21's ar.
            export AR="${llvmPkgs.bintools}/bin/ar"
            export NM="${llvmPkgs.bintools}/bin/nm"
            export RANLIB="${llvmPkgs.bintools}/bin/ranlib"

            # Disable nix hardening flags injected by the cc-wrapper (e.g.
            # -fzero-call-used-regs=used-gpr) which are unsupported on wasm targets
            # and break mach configure's cross-compilation feature-detection tests.
            # Firefox's own build system adds appropriate hardening for release builds.
            unset NIX_HARDENING_ENABLE
            export RUSTC="${rust}/bin/rustc"
            export CARGO="${rust}/bin/cargo"
            export CBINDGEN="${pkgs.rust-cbindgen}/bin/cbindgen"
            export NODE="${pkgs.nodejs_24}/bin/node"
            export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=system

            # When cross-compiling x86_64 from an aarch64 runner, the nix
            # cc-wrapper injects -target arm64-apple-darwin as an extraBefore
            # flag. Firefox's build system overrides this for C/C++ files by
            # passing -target x86_64-apple-darwin explicitly, but NSPR's
            # Makefile-based assembly build (AS='$(CC) -x assembler-with-cpp')
            # only appends $(ASFLAGS) — so without an explicit target in
            # ASFLAGS, the arm64 default wins. os_Darwin.s then compiles empty
            # (no __x86_64__ defined) and _PR_Darwin_x86_64_AtomicIncrement is
            # never assembled, causing an undefined symbol at link time.
            if [ "''${GLIDE_COMPAT:-}" = "x86_64" ]; then
              export ASFLAGS="''${ASFLAGS:+$ASFLAGS }-target x86_64-apple-darwin"
            fi

            GLIDE_MOZCONFIG_CONTENT="ac_add_options --with-libclang-path=${llvmPkgs.libclang.lib}/lib"
            if [ -n "''${SDKROOT:-}" ]; then
              GLIDE_MOZCONFIG_CONTENT="$GLIDE_MOZCONFIG_CONTENT
ac_add_options --with-macos-sdk=$SDKROOT"
            fi
            # nix clang doesn't ship wasm32 compiler-rt builtins (libclang_rt.builtins.a
            # for wasm32-unknown-wasi), so wasm-ld can't link wasm binaries. Disable the
            # wasm sandboxing of system libraries for nix dev builds. This is the same
            # workaround Mozilla uses for their code-coverage CI builds.
            GLIDE_MOZCONFIG_CONTENT="$GLIDE_MOZCONFIG_CONTENT
ac_add_options --without-wasm-sandboxed-libraries"
            export GLIDE_MOZCONFIG_CONTENT
          '';
        };
      }
    );
}
