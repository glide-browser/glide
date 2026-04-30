{
  # note: this is experimental, we don't actually use this env for production builds yet.

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils?ref=main";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
        };
      in {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs;
            [
              (pnpm.override {nodejs = nodejs_24;})
              nodejs_24
              python314
              uv
              rustc
              cargo
              rustfmt
              watchman
              cairo
              gnutar
              mercurial
              nasm
              rust-cbindgen
              llvmPackages.clang
              llvmPackages.libclang.lib
              llvmPackages.libclang.dev  # clang/AST/*.h etc. for the Firefox clang plugin
              llvm
              llvmPackages.llvm.dev      # llvm/ADT/*.h etc. for the Firefox clang plugin
              llvmPackages.bintools      # llvm-ar, llvm-nm, lld etc. needed for LTO
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
            LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
          };

          shellHook = ''
            # Mozilla's build system breaks when AS is set to a standalone assembler;
            # without it, configure uses the C compiler's integrated assembler which
            # correctly preprocesses .S files.
            # https://bugzilla.mozilla.org/show_bug.cgi?id=1497286
            unset AS

            # Set these in shellHook (after setup hooks) so nixpkgs setup hooks
            # (e.g. llvmPackages.clang's) cannot override them back to bare "clang".
            export CC="${pkgs.llvmPackages.clang}/bin/clang"
            export CXX="${pkgs.llvmPackages.clang}/bin/clang++"
            export HOST_CC="${pkgs.llvmPackages.clang}/bin/clang"
            export HOST_CXX="${pkgs.llvmPackages.clang}/bin/clang++"

            # Disable nix hardening flags injected by the cc-wrapper (e.g.
            # -fzero-call-used-regs=used-gpr) which are unsupported on wasm targets
            # and break mach configure's cross-compilation feature-detection tests.
            # Firefox's own build system adds appropriate hardening for release builds.
            unset NIX_HARDENING_ENABLE
            export RUSTC="${pkgs.rustc}/bin/rustc"
            export CARGO="${pkgs.cargo}/bin/cargo"
            export CBINDGEN="${pkgs.rust-cbindgen}/bin/cbindgen"
            export NODE="${pkgs.nodejs_24}/bin/node"
            export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=system

            GLIDE_MOZCONFIG_CONTENT="ac_add_options --with-libclang-path=${pkgs.llvmPackages.libclang.lib}/lib"
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
