{
  # note: this is experimental, we don't actually use this env for production builds yet.

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils?ref=main";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    rust-overlay,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        overlays = [(import rust-overlay)];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        rustToolchain = pkgs.rust-bin.beta.latest.default;
      in {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs;
            [
              (pnpm.override {nodejs = nodejs_24;})
              nodejs_24
              python314
              uv
              rustToolchain
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
              m4
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.isDarwin (with pkgs; [
              apple-sdk_26
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
              libxcb
              libXt
              xvfb-run
              dos2unix
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

            export RUSTC="${rustToolchain}/bin/rustc"
            export CARGO="${rustToolchain}/bin/cargo"
          '';
        };
      }
    );
}
