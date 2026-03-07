{
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
      in {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs;
            [
              (pnpm.override {nodejs = nodejs_24;})
              nodejs_24
              python314
              uv
              rust-bin.beta.latest.default
              watchman
              cairo
              gnutar
              mercurial
              nasm
              rust-cbindgen
              rustPlatform.bindgenHook
              llvm
              pkg-config
              lld
              gnumake
              curl
              gcc
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
        };
      }
    );
}
