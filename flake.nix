{
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

        # Target the LLVM version that rustc is built with for LTO.
        llvmPackages0 = pkgs.rustc.llvmPackages;
        llvmPackagesBuildBuild0 = pkgs.pkgsBuildBuild.rustc.llvmPackages;

        # Force the use of lld and other llvm tools for LTO
        llvmPackages = llvmPackages0.override {
          bootBintoolsNoLibc = null;
          bootBintools = null;
        };
        llvmPackagesBuildBuild = llvmPackagesBuildBuild0.override {
          bootBintoolsNoLibc = null;
          bootBintools = null;
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

          shellHook = ''
            export HOST_CC="${llvmPackagesBuildBuild.stdenv.cc}/bin/cc"
            export HOST_CXX="${llvmPackagesBuildBuild.stdenv.cc}/bin/c++"
          '';
        };
      }
    );
}
