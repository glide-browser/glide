# note: the vast majority of the code in here has been adapted from
#
# https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/build-mozilla-mach/default.nix
#
# and adapted for our use case.
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils?ref=main";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    nixpkgs,
    flake-utils,
    rust-overlay,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        inherit (lib) enableFeature;
        inherit (pkgs) lib stdenv pkgsCross;

        pkgs = import nixpkgs {
          inherit system;
          overlays = [rust-overlay.overlays.default];
        };

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

        searchfox-cli = pkgs.rustPlatform.buildRustPackage rec {
          pname = "searchfox-cli";
          version = "0.15.0";

          src = pkgs.fetchFromGitHub {
            owner = "padenot";
            repo = "searchfox-cli";
            tag = "v${version}";
            hash = "sha256-5D28uoHJcuiaC/NbLEViJ6Z9waWmBDj3o4NRLXVAxuE=";
          };

          cargoHash = "sha256-/LYstGJV3YWq3qjHn8QbiELKv4kaT4FRADGzA0u944E=";

          # The workspace also contains a pyo3-based crate that we don't need.
          buildAndTestSubdir = "searchfox-cli";

          doCheck = false;
        };

        # Firefox requires cbindgen >= 0.29.4, but nixpkgs only has 0.29.2 at the time of writing.
        rust-cbindgen = pkgs.rustPlatform.buildRustPackage (finalAttrs: {
          pname = "rust-cbindgen";
          version = "0.29.4";

          src = pkgs.fetchFromGitHub {
            owner = "mozilla";
            repo = "cbindgen";
            rev = "v${finalAttrs.version}";
            hash = "sha256-leeHOwpzXuzg2cTjXehBnCsS+dvU4eIIFtWKeCee20U=";
          };

          cargoHash = "sha256-f6YoDoiVoh0BVPYHFO1FsdI4OCsF+LY72QaD57StdIQ=";

          doCheck = false;
        });

        # Firefox requires NSS >= 3.129, but nixpkgs only has 3.124 at the time of writing.
        nss_latest = pkgs.nss_latest.overrideAttrs (old: rec {
          version = "3.129";
          src = pkgs.fetchFromGitHub {
            owner = "nss-dev";
            repo = "nss";
            rev = "NSS_${lib.replaceStrings ["."] ["_"] version}_RTM";
            hash = "sha256-cy7+nCVtogr1onk8/8OQcQZUm2AH2azNsUmVFg4ym7k=";
          };
          postPatch = (old.postPatch or "") + ''
            sed -i '/^generate_pkg_config$/d' build.sh
          '';
        });

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

        # ---------------------------------------------------------------------
        # CI / release build environment (`nix develop .#ci`)
        #
        # This shell intentionally provides *only* the host tooling that the
        # release builds need (node/pnpm for our scripts, python for mach, rust,
        # packaging utilities). Everything that ends up influencing the produced
        # binaries - clang/lld, the Linux target sysroot (Debian, glibc 2.17),
        # the wasi sysroot, cbindgen, nasm (linux), node (for the build itself),
        # pkg-config and sccache - is installed into ~/.mozbuild by
        # `mach bootstrap` from Mozilla's toolchain artifacts, which are pinned
        # by the Firefox revision in firefox.json. That is exactly what the
        # previous apt/brew based CI did, so the artifacts have the same
        # provenance and runtime requirements as before; using nixpkgs' clang
        # would instead link the binaries against nixpkgs' glibc/ld.so and
        # break them for users.
        #
        # There is deliberately no C compiler in this shell (mkShellNoCC): a
        # `CC`/`CXX` exported by a nix stdenv would take precedence over the
        # bootstrapped clang in mach's configure.
        # ---------------------------------------------------------------------

        # Must match the rust version pinned by Firefox in
        # engine/taskcluster/kinds/toolchain/rust.yml (`linux64-rust-1.xx`).
        firefoxRustVersion = "1.95.0";

        ciRustToolchainWithCC = pkgs.rust-bin.stable.${firefoxRustVersion}.minimal.override {
          # macOS release builds run on aarch64 runners and cross-compile the
          # x86_64 build, so both targets need a rust-std.
          targets = lib.optionals stdenv.hostPlatform.isDarwin [
            "aarch64-apple-darwin"
            "x86_64-apple-darwin"
          ];
        };

        # rust-overlay propagates nixpkgs' C compiler (rustc's default linker)
        # into any shell that includes the toolchain, which would export
        # `CC=gcc` and put a nix `cc` on PATH ahead of the bootstrapped clang.
        # Firefox's build system always passes its own linker to cargo, so drop
        # the propagation by re-exporting the toolchain without `nix-support`.
        ciRustToolchain = pkgs.runCommand "rust-minimal-${firefoxRustVersion}-no-cc" {} ''
          mkdir -p $out
          for entry in ${ciRustToolchainWithCC}/*; do
            if [ "$(basename "$entry")" != nix-support ]; then
              ln -s "$entry" $out/
            fi
          done
        '';

        # Use the exact pnpm version from `packageManager` in package.json (the
        # same one pnpm/action-setup used) instead of whatever nixpkgs ships.
        # When the version is bumped, the hash below needs updating too:
        #   nix hash convert --hash-algo sha256 --to sri "$(nix-prefetch-url https://registry.npmjs.org/pnpm/-/pnpm-<version>.tgz)"
        packageJson = builtins.fromJSON (builtins.readFile ./package.json);
        ciPnpmVersion = lib.removePrefix "pnpm@" packageJson.packageManager;
        ciPnpm = pkgs.pnpm_10.override {
          nodejs = pkgs.nodejs_24;
          version = ciPnpmVersion;
          hash = "sha256-vZ7FQXZBOR4KyzkSspEr1bA4VAeoLalHRKdAe1Z/208=";
        };

        # On macOS the wasi sysroot is not bootstrapped by mach, so (as before)
        # the one from the wasi-sdk 24 release is used for the RLBox sandbox.
        wasiSdkSysroot = pkgs.runCommand "wasi-sdk-24.0-sysroot" {
          src = pkgs.fetchurl {
            url = "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-24/wasi-sdk-24.0-arm64-macos.tar.gz";
            hash = "sha256-rq6Zk5bV9cqlzkGfUug8NYadX9IdQK+ArLosgPUbCzo=";
          };
        } ''
          mkdir -p $out
          tar -xzf $src -C $out --strip-components=1 wasi-sdk-24.0-arm64-macos/share/wasi-sysroot
        '';

        # mach runs under nix's python, whose dynamic loader only searches the
        # nix store. The bindgen configure check dlopen()s Mozilla's prebuilt
        # libclang.so, which needs the host's libstdc++/libz/libgcc_s, and the
        # host paths are not searched, so the check fails with a misleading
        # "libclang is too old". Fix this for the interpreter only: a wrapper
        # sets LD_LIBRARY_PATH to nix's copies of those libs (glibc captures it
        # at startup, so later dlopen() calls see it) and a sitecustomize in
        # the stdlib immediately drops it from os.environ again, so none of the
        # processes mach spawns (compiler, cargo, ...) inherit it.
        ciPython =
          if stdenv.hostPlatform.isLinux
          then let
            python = pkgs.python3;
            pyver = lib.versions.majorMinor python.version;
            libs = lib.makeLibraryPath [(lib.getLib pkgs.stdenv.cc.cc) pkgs.zlib];
          in
            pkgs.runCommand "python3-${python.version}-glide-ci" {
              nativeBuildInputs = [pkgs.makeWrapper];
            } ''
              mkdir -p $out/bin $out/lib/python${pyver}
              for entry in ${python}/*; do
                case "$(basename "$entry")" in bin | lib) ;; *) ln -s "$entry" $out/ ;; esac
              done
              for entry in ${python}/lib/*; do
                [ "$(basename "$entry")" = python${pyver} ] || ln -s "$entry" $out/lib/
              done
              for entry in ${python}/lib/python${pyver}/*; do
                ln -s "$entry" $out/lib/python${pyver}/
              done
              for entry in ${python}/bin/*; do
                ln -s "$entry" $out/bin/
              done
              rm -f $out/bin/python${pyver} $out/bin/python3 $out/bin/python

              makeWrapper ${python}/bin/python${pyver} $out/bin/python${pyver} \
                --argv0 '$0' \
                --run 'export _GLIDE_CI_ORIG_LD_LIBRARY_PATH="''${LD_LIBRARY_PATH-__unset__}"' \
                --prefix LD_LIBRARY_PATH : ${libs}
              ln -s python${pyver} $out/bin/python3
              ln -s python${pyver} $out/bin/python

              cat > $out/lib/python${pyver}/sitecustomize.py <<'EOF'
              # Installed by glide's flake.nix (devShells.ci): the interpreter wrapper
              # sets LD_LIBRARY_PATH so ctypes can dlopen() Mozilla's prebuilt libclang;
              # glibc has already captured it, so restore the environment for children.
              import os

              _orig = os.environ.pop("_GLIDE_CI_ORIG_LD_LIBRARY_PATH", None)
              if _orig == "__unset__":
                  os.environ.pop("LD_LIBRARY_PATH", None)
              elif _orig is not None:
                  os.environ["LD_LIBRARY_PATH"] = _orig
              EOF
            ''
          else pkgs.python3;

        ciShell = pkgs.mkShellNoCC {
          packages = with pkgs;
            [
              nodejs_24
              ciPnpm
              ciPython
              git
              ciRustToolchain

              # build / packaging utilities
              gnumake
              gnutar
              perl
              xz
              zip
              unzip
              which
              cacert
            ]
            ++ lib.optionals stdenv.hostPlatform.isDarwin [
              # mach bootstrap doesn't install nasm on macOS (needed for the x86_64 build)
              nasm
            ];

          env =
            {
              # Firefox's configure searches `~/.cargo/bin` before PATH for
              # rust (and the CI runner images ship a rustup toolchain there),
              # so point it at the pinned toolchain explicitly.
              RUSTC = "${ciRustToolchain}/bin/rustc";
              CARGO = "${ciRustToolchain}/bin/cargo";
            }
            // lib.optionalAttrs stdenv.hostPlatform.isDarwin {
              WASI_SYSROOT = "${wasiSdkSysroot}/share/wasi-sysroot";
            };

          shellHook = ''
            # Don't try to send libnotify notifications during build
            export MOZ_NOSPAM=1

            # nix's git/python/curl need to be told where the CA bundle is when
            # running outside of the nix sandbox.
            export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
            export NIX_SSL_CERT_FILE=$SSL_CERT_FILE

            # Keep the build environment identical to a plain shell: Firefox's
            # configure reads some of these and the nix stdenv setup sets them.
            # (mach also warns about PYTHONPATH, which nix's python hook sets.)
            unset MACOSX_DEPLOYMENT_TARGET SOURCE_DATE_EPOCH NIX_CFLAGS_COMPILE NIX_LDFLAGS PYTHONPATH
          '';
        };
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
              sccache
              unzip
              which

              # crash reporter
              dump_syms
              patchelf

              searchfox-cli
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

        devShells.ci = ciShell;
      }
    );
}
