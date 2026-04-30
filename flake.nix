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
              watchman
              cairo
              gnutar
              mercurial
              nasm
              rust-cbindgen
              llvmPackages.clang
              llvmPackages.libclang.lib
              llvm
              pkg-config
              lld
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
          '';
        };
      }
    );
}
