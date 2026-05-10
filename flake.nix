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

        pkgs = import nixpkgs {inherit system;};
        lib = pkgs.lib;
        stdenv = pkgs.stdenv;
        pkgsCross = pkgs.pkgsCross;

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
        # This is declared here because it's used in the default value of elfhackSupport
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

            # TODO: these are probably redundant
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

            # These options are not available on MacOS, even --disable-*
            # (enableFeature alsaSupport "alsa")
            # (enableFeature jackSupport "jack")
            # (enableFeature pulseaudioSupport "pulseaudio")
            # (enableFeature sndioSupport "sndio")
          ]
          ++ lib.optionals (!buildStdenv.hostPlatform.isDarwin) [
            "--with-onnx-runtime=${lib.getLib pkgs.onnxruntime}/lib"
          ]
          ++ [
            # (enableFeature crashreporterSupport "crashreporter")
            # (enableFeature ffmpegSupport "ffmpeg")
            # (enableFeature geolocationSupport "necko-wifi")
            # (enableFeature gssSupport "negotiateauth")
            # (enableFeature jemallocSupport "jemalloc")
            # (enableFeature webrtcSupport "webrtc")
            #
            # (enableFeature debugBuild "debug")
            # (
            #   if debugBuild
            #   then "--enable-profiling"
            #   else "--enable-optimize"
            # )
            # # --enable-release adds -ffunction-sections & LTO that require a big amount
            # # of RAM, and the 32-bit memory space cannot handle that linking
            # (enableFeature (!debugBuild && !stdenv.hostPlatform.is32bit) "release")
            # (enableFeature enableDebugSymbols "debug-symbols")
          ];
        # ++ lib.optionals enableDebugSymbols [
        #   "--disable-strip"
        #   "--disable-install-strip"
        # ]

        shell =
          ''
            # Runs autoconf through ./mach configure in configurePhase
            configureScript="$(realpath ./mach) configure"

            # TODO
            # Set reproducible build date; https://bugzilla.mozilla.org/show_bug.cgi?id=885777#c21
            # export MOZ_BUILD_DATE=$(head -n1 sourcestamp.txt)

            # Set predictable directories for build and state
            export MOZ_OBJDIR=$(pwd)/engine/objdir
            export MOZBUILD_STATE_PATH=$TMPDIR/mozbuild

            # Don't try to send libnotify notifications during build
            export MOZ_NOSPAM=1

            # AS=as in the environment causes build failure
            # https://bugzilla.mozilla.org/show_bug.cgi?id=1497286
            unset AS

            # Use our own python
            export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=system

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
        devShell = pkgs.mkShell.override {stdenv = buildStdenv;} {
          buildInputs = with pkgs;
            [
              (pnpm.override {nodejs = nodejs_24;})
              nodejs_24
              autoconf
              cargo
              gnum4
              llvmPackagesBuildBuild.bintools
              makeBinaryWrapper
              nodejs
              perl
              python3
              rust-cbindgen
              rustPlatform.bindgenHook
              rustc
              unzip
              which

              bzip2
              file
              libGL
              libGLU
              libstartup_notification
              perl
              zip
              libkrb5
              gcc.cc.lib

              # crash reporter
              dump_syms
              patchelf
            ]
            ++ lib.optionals stdenv.hostPlatform.isDarwin [
              apple-sdk_26
              cups
            ]
            ++ lib.optionals (!stdenv.hostPlatform.isDarwin) [
              pkg-config
              wrapGAppsHook3
            ]
            ++ lib.optionals stdenv.hostPlatform.isDarwin [rsync]
            ++ lib.optionals stdenv.hostPlatform.isx86 [nasm]
            ++ (lib.optionals (!stdenv.hostPlatform.isDarwin) [
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
            ])
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

          shellHook =
            lib.optionalString (!stdenv.hostPlatform.isDarwin) ''
              export LD_LIBRARY_PATH="${pkgs.gcc.cc.lib}/lib:$LD_LIBRARY_PATH"
            ''
            + shell;
        };
      }
    );
}
