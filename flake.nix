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
        # Linux: the whole toolchain comes from nixpkgs (clang/lld/llvm tools,
        # rust, cbindgen, nasm, node, sccache, wasi sysroot), like the Firefox
        # package in nixpkgs. The only non-nix pieces are two Mozilla toolchain
        # artifacts fetched as fixed-output derivations: the Debian sysroot the
        # binaries are compiled and linked against (this is what keeps the
        # glibc 2.17 floor of the release builds - using nixpkgs' glibc would
        # produce binaries that only run on NixOS) and the prebuilt onnxruntime
        # that gets bundled. Nothing is downloaded by `mach bootstrap`.
        #
        # macOS still uses `mach bootstrap` for clang + the Xcode SDK; nix only
        # provides the host tooling there.
        #
        # There is deliberately no nix cc-wrapper in this shell (mkShellNoCC):
        # the wrapper would inject nixpkgs' glibc and dynamic linker into every
        # link, so the unwrapped clang is used with the sysroot instead.
        # ---------------------------------------------------------------------

        # Must match the rust version pinned by Firefox in
        # engine/taskcluster/kinds/toolchain/rust.yml (`linux64-rust-1.xx`).
        firefoxRustVersion = "1.95.0";

        # The clang major Firefox builds with (`linux64-clang` alias in
        # engine/taskcluster/kinds/toolchain/clang.yml). It has to match the
        # libclang taken from Mozilla's clang artifact below, since bindgen
        # parses headers with that libclang but this clang's builtin headers.
        ciLlvm = pkgs.llvmPackages_22;

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
        # `CC=gcc` and put a nix `cc` on PATH ahead of ours. Firefox's build
        # system always passes its own linker to cargo, so drop the propagation
        # by re-exporting the toolchain without `nix-support`.
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

        # Mozilla toolchain artifacts, pinned by their taskcluster index hash.
        # `task` is the toolchain task the artifact comes from and `index` the
        # hash `mach bootstrap` records in `~/.mozbuild/indices/<artifact>` for
        # the pinned Firefox revision (`./mach artifact toolchain --from-build
        # <task> --no-unpack` in engine/ also prints it); they need updating when
        # firefox.json is bumped. `hash` is the tarball's (`nix-prefetch-url <url>`).
        mozillaToolchainArtifacts = {
          "x86_64-linux" = {
            sysroot = {
              task = "sysroot-x86_64-linux-gnu";
              index = "f18eb4f18093faedb235bfa14d052234cb65568766407d95867142131994042a";
              hash = "sha256-CJ9n3YXZp91wa5vjB81KEp3SoR2fP4+kDTlKBsyJuvc=";
            };
            onnxruntime = {
              task = "onnxruntime-x86_64-linux-gnu";
              index = "de1e12235ad720fbaa369e9d8af6b3a0a6cb3288ce2b69dede3d59d203237682";
              hash = "sha256-HXoYcBr2f9uUQLrz/LA/aJ4HATC7pv13PcV/QnXv9eE=";
            };
            clang = {
              task = "linux64-clang-22";
              artifact = "clang";
              index = "a7c8168e11ab12621fb8d9f8bbfdaf3751c1322a24a80eb7862a0b1698de2b69";
              hash = "sha256-TJU7S/21W/oHwEhITaA+k+59BKxPRav7+SgzWIPOqVA=";
            };
          };
          # note: Firefox has no onnxruntime artifact for linux aarch64
          "aarch64-linux" = {
            sysroot = {
              task = "sysroot-aarch64-linux-gnu";
              index = "a563d78df955f76f46b88fc05654d24be610b7a424f881d8991c4cd30582c7d9";
              hash = "sha256-yDT7P5rRYA5id5KkVLqLjMVqf2EWovp43zoXDASiwgs=";
            };
            clang = {
              task = "linux64-aarch64-clang-22";
              artifact = "clang";
              index = "6a6430dab5a5242bf2cc45748ca7cf708f6c454f9bd66f42d13e3db5b589877c";
              hash = "sha256-HGCbE7KMJBpRoDGyBPAm/aCtpkQTy9a/ewHcYNVuQvg=";
            };
          };
          # the macOS builds (both arches) run on aarch64 runners
          "aarch64-darwin" = {
            clang = {
              task = "macosx64-aarch64-clang-22";
              artifact = "clang";
              index = "075e292765d67831f6ed157873accca894b891f974d7b9cd44fc8a3708d26101";
              hash = "sha256-FgVvIwpO8gHiLrROKOLPHS/b8kcFC/Qg26A+Cfmjqlg=";
            };
            onnxruntime = {
              task = "onnxruntime-aarch64-apple-darwin";
              index = "b1ed476d5bb19da02cd1b677f2f813d25c7533139248b0c13404029209874f79";
              hash = "sha256-y/+BDngKwK65XfAoim3BK0ShO1M9t555TtECxCrkulw=";
            };
          };
        };

        hasMozillaToolchain = key:
          (mozillaToolchainArtifacts.${stdenv.hostPlatform.system} or {}) ? ${key};

        mozillaToolchain = key: {extract ? []}: let
          platform = stdenv.hostPlatform.system;
          artifacts =
            mozillaToolchainArtifacts.${platform}
            or (throw "flake.nix: no Mozilla toolchain artifact hashes for ${platform} yet");
          spec = artifacts.${key};
          artifact = spec.artifact or spec.task;
        in
          pkgs.stdenvNoCC.mkDerivation {
            name = artifact;
            src = pkgs.fetchurl {
              url = "https://firefox-ci-tc.services.mozilla.com/api/index/v1/task/gecko.cache.level-3.toolchains.v3.${spec.task}.hash.${spec.index}/artifacts/public/build/${artifact}.tar.zst";
              inherit (spec) hash;
            };
            nativeBuildInputs = [pkgs.zstd];
            dontUnpack = true;
            dontConfigure = true;
            dontBuild = true;
            # keep the artifact byte-for-byte as Mozilla ships it (no patchelf/strip)
            dontFixup = true;
            installPhase = ''
              mkdir -p $out
              # note: not every artifact named .tar.zst is actually zstd compressed
              # (onnxruntime-aarch64-apple-darwin is a plain tar), so let tar detect it
              tar -xf $src -C $out --strip-components=1 --wildcards ${lib.escapeShellArgs extract}
            '';
          };

        linuxSysroot = mozillaToolchain "sysroot" {};
        linuxOnnxRuntime = mozillaToolchain "onnxruntime" {};

        # bindgen dlopen()s libclang from cargo build scripts. Those are host
        # programs, but without a cross-compile cargo links them with the
        # *target* linker (see the comment in config/makefiles/rust.mk), i.e.
        # against the Debian sysroot, and they run on the CI runner's system
        # glibc - which nixpkgs' libclang (built against nixpkgs' newer glibc)
        # cannot be loaded into. So take just libclang from Mozilla's clang
        # artifact (the same library today's builds use); nothing else of that
        # toolchain is used.
        mozillaLibclang = mozillaToolchain "clang" {
          # libclang is linked against the toolchain's own libLLVM
          extract = ["clang/lib/libclang.so*" "clang/lib/libLLVM.so*"];
        };

        # nixpkgs' clang has its default `-dynamic-linker` removed (purity.patch)
        # on the assumption that the cc-wrapper adds nixpkgs' one back. We want
        # the standard one, so a thin wrapper re-adds it when linking. Nothing
        # else is injected: the sysroot comes from --with-sysroot in the
        # mozconfig, exactly like Mozilla's own clang is driven.
        ciClang = let
          clang = ciLlvm.clang-unwrapped;
          fhsDynamicLinker =
            {
              x86_64 = "/lib64/ld-linux-x86-64.so.2";
              aarch64 = "/lib/ld-linux-aarch64.so.1";
            }
            .${stdenv.hostPlatform.parsed.cpu.name};
        in
          pkgs.runCommand "clang-${clang.version}-glide-ci" {} (
            ''
              mkdir -p $out/bin
            ''
            + lib.concatMapStrings (tool: ''
              cat > $out/bin/${tool} <<'EOF'
              #!${pkgs.runtimeShell}
              linking=1
              for arg in "$@"; do
                case "$arg" in
                  -c | -S | -E | -M | -MM | -r | -fsyntax-only | -### | --version | -dumpmachine | -dumpversion | -print-* | --print-* | --target=wasm*) linking=0 ;;
                esac
              done
              if [ "$linking" = 1 ]; then
                set -- "$@" -Wl,-dynamic-linker,${fhsDynamicLinker}
              fi
              exec ${clang}/bin/${tool} "$@"
              EOF
              chmod +x $out/bin/${tool}
            '') ["clang" "clang++"]
          );

        # Firefox's configure only looks for a `pkg-config` binary. Use pkgconf
        # (what Mozilla's own toolchain ships): unlike freedesktop pkg-config
        # 0.29 it keeps the transitive `Requires.private` cflags of the sysroot's
        # .pc files, which e.g. gtk+-3.0 needs to find freetype2.
        ciPkgConfig = pkgs.runCommand "pkgconf-${pkgs.pkgconf-unwrapped.version}-as-pkg-config" {} ''
          mkdir -p $out/bin
          ln -s ${pkgs.pkgconf-unwrapped}/bin/pkgconf $out/bin/pkg-config
        '';

        # Compiler for *host* tools that only run during the build (nsinstall,
        # cargo build scripts, proc macros, the elfhack linker wrapper, ...):
        # nixpkgs' regular wrapped clang, so they link against nixpkgs' glibc
        # and get RUNPATHs into the nix store. Firefox links host tools with
        # `-fuse-ld=lld`, so the wrapper needs a bintools that provides a
        # wrapped `ld.lld` (the default binutils one doesn't, and clang would
        # silently pick the unwrapped lld from PATH, losing the RUNPATH logic).
        # None of these tools end up in the package.
        ciHostClang = ciLlvm.clang.override {
          bintools = ciLlvm.bintools;
        };

        # macOS: the compiler toolchain is Mozilla's own clang artifact (what
        # `mach bootstrap` installed before; it's self-contained and includes
        # compiler-rt, libclang and the llvm tools), the SDK stays the Xcode one
        # configure finds via xcrun, and the rest of the host tooling is nix.
        mozillaClang = mozillaToolchain "clang" {};
        darwinOnnxRuntime = mozillaToolchain "onnxruntime" {};

        ciMozconfig =
          lib.optionalString stdenv.hostPlatform.isLinux (
            ''
              ac_add_options --with-sysroot=${linuxSysroot}
              ac_add_options --with-libclang-path=${mozillaLibclang}/lib
              ac_add_options --with-wasi-sysroot=${wasiSysRoot}
            ''
            + lib.optionalString (hasMozillaToolchain "onnxruntime") ''
              ac_add_options --with-onnx-runtime=${linuxOnnxRuntime}
            ''
          )
          + lib.optionalString stdenv.hostPlatform.isDarwin ''
            ac_add_options --with-libclang-path=${mozillaClang}/lib
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
            ++ lib.optionals stdenv.hostPlatform.isLinux [
              ciClang
              ciLlvm.lld
              ciLlvm.llvm # llvm-ar, llvm-nm, llvm-objcopy, llvm-strip, ...
              rust-cbindgen
              nasm
              ciPkgConfig
              # note: no sccache here on purpose. nixpkgs' 0.15 silently falls
              # back to a local (ephemeral) cache with the GitHub Actions cache
              # backend on the CI runners, so warm builds were as slow as cold
              # ones; CI puts the sccache-action's binary on PATH instead.
            ]
            ++ lib.optionals stdenv.hostPlatform.isDarwin [
              mozillaClang # clang, ld64.lld, llvm-ar/strip/otool/dsymutil, ...
              rust-cbindgen
              nasm # needed for the x86_64 build
            ];

          env =
            {
              # Firefox's configure searches `~/.cargo/bin` before PATH for
              # rust (and the CI runner images ship a rustup toolchain there),
              # so point it at the pinned toolchain explicitly.
              RUSTC = "${ciRustToolchain}/bin/rustc";
              CARGO = "${ciRustToolchain}/bin/cargo";
            }
            // lib.optionalAttrs stdenv.hostPlatform.isLinux {
              # target: unwrapped clang + the Debian sysroot (see --with-sysroot)
              CC = "${ciClang}/bin/clang";
              CXX = "${ciClang}/bin/clang++";
              # host: see ciHostClang. Also lets bindgen's build script dlopen()
              # nixpkgs' libclang, which needs a newer glibc than the runner's.
              HOST_CC = "${ciHostClang}/bin/clang";
              HOST_CXX = "${ciHostClang}/bin/clang++";
              # RLBox wasm sandboxing (same setup as the default dev shell)
              WASM_CC = "${pkgsCross.wasi32.stdenv.cc}/bin/${pkgsCross.wasi32.stdenv.cc.targetPrefix}cc";
              WASM_CXX = "${pkgsCross.wasi32.stdenv.cc}/bin/${pkgsCross.wasi32.stdenv.cc.targetPrefix}c++";
            }
            // lib.optionalAttrs stdenv.hostPlatform.isDarwin {
              CC = "${mozillaClang}/bin/clang";
              CXX = "${mozillaClang}/bin/clang++";
              HOST_CC = "${mozillaClang}/bin/clang";
              HOST_CXX = "${mozillaClang}/bin/clang++";
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

            export GLIDE_MOZCONFIG_CONTENT="${ciMozconfig}"
          ''
          + lib.optionalString stdenv.hostPlatform.isDarwin ''
            # onnxruntime only for the native aarch64 build: that is what the
            # previous `mach bootstrap` based builds ended up with (it only
            # installed the host-arch artifact, so the x86_64 build had none).
            if [ "''${GLIDE_COMPAT:-aarch64}" != x86_64 ]; then
              export GLIDE_MOZCONFIG_CONTENT="$GLIDE_MOZCONFIG_CONTENT
            ac_add_options --with-onnx-runtime=${darwinOnnxRuntime}"
            fi
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
