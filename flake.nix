# note: the vast majority of the code in here has been adapted from
#
# https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/build-mozilla-mach/default.nix
#
# and adapted for our use case.
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
        inherit (lib) enableFeature;
        inherit (pkgs) lib stdenv pkgsCross;

        pkgs = import nixpkgs {inherit system;};

        # Target the LLVM version that rustc is built with for LTO.
        llvmPackages0 = pkgs.rustc.llvmPackages;
        llvmPackagesBuildBuild0 = pkgs.pkgsBuildBuild.rustc.llvmPackages;

        # Use the llvm toolchain to stay consistent with the upstream Firefox build setup (and for LTO).
        llvmPackages = llvmPackages0.override {
          bootBintoolsNoLibc = null;
          bootBintools = null;
        };
        llvmPackagesBuildBuild = llvmPackagesBuildBuild0.override {
          bootBintoolsNoLibc = null;
          bootBintools = null;
        };

        buildStdenv = pkgs.overrideCC llvmPackages.stdenv (
          llvmPackages.stdenv.cc.override {
            bintools = pkgs.stdenv.cc.bintools;
          }
        );

        # Compile the wasm32 sysroot to build the RLBox Sandbox
        # https://hacks.mozilla.org/2021/12/webassembly-and-back-again-fine-grained-sandboxing-in-firefox-95/
        # We only link c++ libs here, our compiler wrapper can find wasi libc and crt itself.
        wasiSysRoot = pkgs.runCommand "wasi-sysroot" {} ''
          mkdir -p $out/lib/wasm32-wasi
          for lib in ${pkgsCross.wasi32.llvmPackages.libcxx}/lib/*; do
            ln -s $lib $out/lib/wasm32-wasi
          done
        '';

        # Specifying --(dis|en)able-elf-hack on a platform for which it's not implemented will give `--disable-elf-hack is not available in this configuration`
        isElfhackPlatform = stdenv:
          stdenv.hostPlatform.isElf
          && (
            stdenv.hostPlatform.isi686
            || stdenv.hostPlatform.isx86_64
            || stdenv.hostPlatform.isAarch32
            || stdenv.hostPlatform.isAarch64
          );

        elfhackSupport =
          isElfhackPlatform stdenv && !(stdenv.hostPlatform.isMusl && stdenv.hostPlatform.isAarch64);

        configureFlags =
          [
            "--with-libclang-path=${lib.getLib llvmPackagesBuildBuild.libclang}/lib"
            "--with-wasi-sysroot=${wasiSysRoot}"
            # for firefox, host is buildPlatform, target is hostPlatform
            "--host=${buildStdenv.buildPlatform.config}"
            "--target=${buildStdenv.hostPlatform.config}"
          ]
          ++ lib.optional (isElfhackPlatform stdenv) (enableFeature elfhackSupport "elf-hack")
          ++ lib.optionals (!stdenv.hostPlatform.isDarwin) [
            # MacOS builds use bundled versions of libraries: https://bugzilla.mozilla.org/show_bug.cgi?id=1776255
            "--enable-system-pixman"
            "--with-system-ffi"
            # Mozilla vendors 10+ patches and ICU upstream is very slow to adopt them
            # "--with-system-icu"
            "--with-system-jpeg"
            "--with-system-libevent"
            "--with-system-libvpx"
            "--with-system-nspr"
            "--with-system-nss"
            "--with-system-png" # needs APNG support
            "--with-system-webp"
            "--with-system-zlib"
            "--with-onnx-runtime=${lib.getLib pkgs.onnxruntime}/lib"
          ];

        # note: unlike the nixpkgs build, we don't tell mach to use our python version as
        #       the firefox build system is not really set up for that, and I ran into a bunch
        #       of annoying bugs because of `MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=system`.

        shell =
          ''
            # Set predictable directories for build and state
            export MOZ_OBJDIR=$(pwd)/engine/objdir
            export MOZBUILD_STATE_PATH=$TMPDIR/mozbuild

            # Don't try to send libnotify notifications during build
            export MOZ_NOSPAM=1

            # AS=as in the environment causes build failure
            # https://bugzilla.mozilla.org/show_bug.cgi?id=1497286
            unset AS

            # RBox WASM Sandboxing
            export WASM_CC=${pkgsCross.wasi32.stdenv.cc}/bin/${pkgsCross.wasi32.stdenv.cc.targetPrefix}cc
            export WASM_CXX=${pkgsCross.wasi32.stdenv.cc}/bin/${pkgsCross.wasi32.stdenv.cc.targetPrefix}c++
          ''
          + lib.optionalString pkgs.stdenv.hostPlatform.isMusl ''
            # linking firefox hits the vm.max_map_count kernel limit with the default musl allocator
            # TODO: Default vm.max_map_count has been increased, retest without this
            export LD_PRELOAD=${pkgs.mimalloc}/lib/libmimalloc.so
          ''
          + ''
            export GLIDE_MOZCONFIG_CONTENT="${builtins.concatStringsSep "\n" (map (s: "ac_add_options " + s) configureFlags)}"
          '';
      in {
        devShells.default = pkgs.mkShell.override {stdenv = buildStdenv;} {
          nativeBuildInputs = with pkgs;
            [
              (pnpm.override {nodejs = nodejs_24;})
              nodejs_24
              autoconf
              cargo
              gnum4
              llvmPackagesBuildBuild.bintools
              makeBinaryWrapper
              perl
              python3
              rust-cbindgen
              rustPlatform.bindgenHook
              rustc
              unzip
              which

              # crash reporter
              dump_syms
              patchelf
            ]
            ++ lib.optionals (!stdenv.hostPlatform.isDarwin) [
              pkg-config
              wrapGAppsHook3
            ]
            ++ lib.optionals stdenv.hostPlatform.isDarwin [rsync]
            ++ lib.optionals stdenv.hostPlatform.isx86 [nasm];

          buildInputs = with pkgs;
            [
              bzip2
              file
              libGL
              libGLU
              libstartup_notification
              perl
              zip
              libkrb5
              gcc.cc.lib
            ]
            ++ lib.optionals stdenv.hostPlatform.isDarwin [
              apple-sdk_26
              cups
            ]
            ++ lib.optionals (!stdenv.hostPlatform.isDarwin) [
              dbus
              dbus-glib
              fontconfig
              freetype
              glib
              gtk3
              libffi
              libevent
              libjpeg
              libpng
              libvpx
              libwebp
              nspr
              pango
              libx11
              libxcursor
              libxdamage
              libxext
              libxft
              libxi
              libxrender
              libxt
              libxtst
              pixman
              xorgproto
              zlib
              nss_latest

              alsa-lib
              libjack2
              libpulseaudio # only headers are needed
              sndio
              libxkbcommon
              libdrm
            ]
            ++ lib.optional (!stdenv.hostPlatform.isMusl) jemalloc;

          env =
            {
              # if not explicitly set, wrong cc from buildStdenv would be used
              HOST_CC = "${llvmPackagesBuildBuild.stdenv.cc}/bin/cc";
              HOST_CXX = "${llvmPackagesBuildBuild.stdenv.cc}/bin/c++";
            }
            // lib.optionalAttrs stdenv.hostPlatform.isMusl {
              # Firefox relies on nonstandard behavior of the glibc dynamic linker. It re-uses
              # previously loaded libraries even though they are not in the rpath of the newly loaded binary.
              # On musl we have to explicitly set the rpath to include these libraries.
              LDFLAGS = "-Wl,-rpath,${placeholder "out"}/lib/glide";
            };

          shellHook = shell;
        };
      }
    );
}
