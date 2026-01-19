// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule("resource://testing-common/AddonTestUtils.sys.mjs", {
  global: "current",
});
declare global {
  interface GlideGlobals {
    exit_code?: number;
    stdout?: string;
  }
}

add_task(async function test_basic() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("ls");
      glide.g.exit_code = (await proc.wait()).exit_code;
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.exit_code).is(0);
});

add_task(async function test_unknown_command() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      await glide.process.spawn("this_should_not_resolve").catch((err) => {
        glide.g.value = err;
      });
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value && String(glide.g.value)).is(
    "Error: Executable not found: this_should_not_resolve",
    "unknown commands should error at the spawn() step",
  );
});

add_task(async function test_non_zero_exit_code() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("bash", ["-c", "echo \"a bad thing happened!\"; exit 3"]);
      await proc.wait().catch((err) => {
        glide.g.value = err;
      });

      assert(glide.g.value instanceof GlideProcessError, "1");
      assert(glide.g.value.name === "GlideProcessError", "2");

      glide.g.stdout = await Array.fromAsync(glide.g.value.process.stdout.values()).then((
        chunks,
      ) => chunks.join(""));
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.stdout).is("a bad thing happened!\n");

  const err = glide.g.value as GlideProcessError;
  is(
    String(err),
    "GlideProcessError: Process exited with a non-zero code 3",
    "non-zero exit codes should result in an error",
  );
  is(err.name, "GlideProcessError");
  is(err.exit_code, 3);
  is(err.process.exit_code, 3);
});

add_task(async function test_non_zero_exit_code_check_exit_code_disables() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("bash", ["-c", "exit 3"], { check_exit_code: false });
      await proc.wait();
      glide.g.value = proc;
    });
  });

  await glide.keys.send("~");
  await waiter(() => (glide.g.value as glide.CompletedProcess)?.exit_code).is(
    3,
    "process should be returned when check_exit_code is set to false",
  );
});

add_task(async function test_non_zero_exit_code_success_codes_disables() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("bash", ["-c", "exit 3"], {
        success_codes: [0, 3],
      });
      await proc.wait();
      glide.g.value = proc;
    });
  });

  await glide.keys.send("~");
  await waiter(() => (glide.g.value as glide.CompletedProcess)?.exit_code).is(
    3,
    "process should be returned when success_codes matches the exit code",
  );
});

add_task(async function test_stdin() {
  const proc = await glide.process.spawn("/bin/cat");

  // Write
  await proc.stdin.write("Hello from stdin!\n");

  // Read
  const reader = proc.stdout.getReader();
  const { value } = await reader.read();

  is(value, "Hello from stdin!\n", "stdin write should be echoed back");

  proc.stdin.close();

  // Wait for process to exit
  const completed = await proc.wait();
  is(completed.exit_code, 0, "process should exit cleanly");
});

add_task(async function test_stdin_arraybuffer() {
  const proc = await glide.process.spawn("/bin/cat");

  // Write binary data
  const data = new TextEncoder().encode("Binary data test\n");
  await proc.stdin.write(data);

  proc.stdin.close();

  const reader = proc.stdout.getReader();
  const { value } = await reader.read();

  is(value, "Binary data test\n", "ArrayBuffer write should work");

  await proc.wait();
});

add_task(async function test_stdout() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", ["-c", "echo \"first\"; sleep 0.1; echo \"second\""]);
      glide.g.value = await Array.fromAsync(proc.stdout.values());
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(["first\n", "second\n"], "pauses in the stream should be separate chunks");
});

add_task(async function test_stderr() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", ["-c", "echo \"An error\" >&2"]);
      glide.g.value = await Array.fromAsync(proc.stderr!.values());
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(["An error\n"]);
});

add_task(async function test_stderr_stdout_simul() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", [
        "-c",
        "echo \"An error\" >&2; sleep 0.1; echo \"foo\"; sleep 0.1; echo \"Another error\" >&2;",
      ]);

      const chunks: string[] = [];
      await Promise.all([
        (async () => {
          for await (const chunk of proc.stdout) {
            chunks.push("stdout:" + chunk);
          }
        })(),
        (async () => {
          for await (const chunk of proc.stderr!) {
            chunks.push("stderr:" + chunk);
          }
        })(),
      ]);
      glide.g.value = chunks;
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson([
    "stderr:An error\n",
    "stdout:foo\n",
    "stderr:Another error\n",
  ]);
});

add_task(async function test_stderr_as_stdout() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", [
        "-c",
        "echo \"An error\" >&2; echo \"foo\"; sleep 0.1; echo \"Another error\" >&2;",
      ], { stderr: "stdout" });
      glide.g.value = await Array.fromAsync(proc.stdout.values());
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(["An error\nfoo\n", "Another error\n"]);
});

add_task(async function test_cwd_option() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc1 = await glide.process.spawn("pwd");
      const proc2 = await glide.process.spawn("pwd", [], { cwd: glide.path.temp_dir });

      glide.g.value = {
        default: (await Array.fromAsync(proc1.stdout.values())).join("").trim(),
        specified: (await Array.fromAsync(proc2.stdout.values())).join("").trim(),
      };
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value?.default).is(glide.path.cwd, "process cwd should be the same as path.cwd");

  const result = glide.g.value as { default: string; specified: string };
  isnot(result.specified, result.default, "process should be spawned in a different directory");
});

add_task(async function test_cwd_tilde_expansion() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("pwd", [], { cwd: "~" });
      const output = (await Array.fromAsync(proc.stdout.values())).join("").trim();
      glide.g.value = output;
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).ok("process should exit");

  is(glide.g.value, glide.path.home_dir, "~ should expand to the home directory");
});

add_task(async function test_cwd_tilde_slash_expansion() {
  const original_home = Services.dirsvc.get("Home", Ci.nsIFile);

  const tmpdir = GlideTestUtils.make_temp_directory("glide", "test-home-" + Date.now());
  AddonTestUtils.registerDirectory("Home", tmpdir);

  try {
    await reload_config(function() {
      glide.keymaps.set("normal", "~", async () => {
        const test_subdir = "test_tilde_expansion";
        const expected_path = glide.path.join(glide.path.home_dir, test_subdir);

        if (!(await glide.fs.exists(expected_path))) {
          await glide.fs.mkdir(expected_path);
        }

        const proc = await glide.process.spawn("pwd", [], { cwd: `~/${test_subdir}` });
        const output = (await Array.fromAsync(proc.stdout.values())).join("").trim();
        glide.g.value = output;
      });
    });

    await glide.keys.send("~");
    const test_subdir = "test_tilde_expansion";
    const expected_path = glide.path.join(glide.path.home_dir, test_subdir);

    await waiter(() => glide.g.value).ok("process should exit");

    is(glide.g.value, expected_path, "~/path should expand to home directory + path");
  } finally {
    AddonTestUtils.registerDirectory("Home", original_home);
  }
});

add_task(async function test_cwd_no_tilde_expansion() {
  await reload_config(function() {});

  const path =
    GlideTestUtils.make_temp_directory("test-no-tilde-expansion-" + Date.now(), "with", "~", "in", "the", "middle")
      .path;

  glide.keymaps.set("normal", "~", async () => {
    const proc = await glide.process.spawn("pwd", [], { cwd: path });
    const output = (await Array.fromAsync(proc.stdout.values())).join("").trim();
    glide.g.value = output;
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).ok("process should exit");

  is(glide.g.value, path, "paths with ~ in the middle should not be expanded");
});

add_task(async function test_env() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("printenv", [], { env: { "MY_ENV_VAR": "glide!" } });
      glide.g.value = (await Array.fromAsync(proc.stdout.values())).join("").trim();
    });
  });

  Services.env.set("GLIDE_FROM_HOST", "from_outer_scope");

  try {
    await glide.keys.send("~");
    await waiter(() => glide.g.value?.includes("MY_ENV_VAR=glide!")).ok(
      "explicitly set env vars should be passed through",
    );
    ok(glide.g.value.includes("GLIDE_FROM_HOST=from_outer_scope"), "other env variables should be set as well");
  } finally {
    Services.env.set("GLIDE_FROM_HOST", "");
  }
});

add_task(async function test_deleting_env() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("printenv", [], { env: { "MY_ENV_VAR": null } });
      glide.g.value = (await Array.fromAsync(proc.stdout.values())).join("").trim();
    });
  });

  Services.env.set("MY_ENV_VAR", "glide!");

  try {
    await glide.keys.send("~");
    await waiter(() => typeof glide.g.value === "string").ok();
    notok(glide.g.value.includes("MY_ENV_VAR=glide!"), "env vars set with null should be deleted");
  } finally {
    Services.env.set("MY_ENV_VAR", "");
  }
});

add_task(async function test_minimal_env() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("printenv", [], { env: {}, extend_env: false });

      glide.g.value = (await Array.fromAsync(proc.stdout.values())).join("").trim();
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is("", "env should be empty when env: {} and extend_env: false are set");

  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("printenv", [], { env: { "MY_ENV_VAR": "glide!" }, extend_env: false });
      glide.g.value = (await Array.fromAsync(proc.stdout.values())).join("").trim();
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is("MY_ENV_VAR=glide!", "only the explicitly set env var should be present");
});

add_task(async function test_execute() {
  await reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.execute("printenv");
      glide.g.value = proc.exit_code;
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is(0, "execute() should wait for the process to exit before returning");
});

add_task(async function test_stdout_text() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("echo", ["hello world"]);
      glide.g.value = await proc.stdout.text();
      glide.g.value2 = await proc.stdout.text().catch((e) => e);
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is("hello world\n", "stdout.text() should return all stdout as a string");

  const error = await until(() => glide.g.value2, "consuming multiple times should error");
  is(String(error), "TypeError: stdout pipe has already been read");
});

add_task(async function test_stdout_text_iterator() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", ["-c", "echo first; sleep 0.1; echo second"]);
      const chunks: string[] = [];
      for await (const chunk of proc.stdout.text()) {
        chunks.push(chunk);
      }
      glide.g.value = chunks;

      try {
        for await (const _ of proc.stdout.text()) {}
      } catch (error) {
        glide.g.value2 = error;
      }
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(["first\n", "second\n"], "stdout.text() iterator should yield chunks");

  const error = await until(() => glide.g.value2, "consuming multiple times should error");
  is(String(error), "TypeError: stdout pipe has already been read");
});

add_task(async function test_stdout_lines() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", ["-c", "echo first; echo second; echo third"]);
      glide.g.value = await proc.stdout.lines();
      glide.g.value2 = await proc.stdout.lines().catch((e) => e);
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(
    ["first", "second", "third"],
    "stdout.lines() should return lines as an array",
  );

  const error = await until(() => glide.g.value2, "consuming multiple times should error");
  is(String(error), "TypeError: stdout pipe has already been read");
});

add_task(async function test_stdout_lines_iterator() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", ["-c", "echo first; sleep 0.1; echo second"]);
      const lines: string[] = [];
      for await (const line of proc.stdout.lines()) {
        lines.push(line);
      }
      glide.g.value = lines;

      try {
        for await (const _ of proc.stdout.lines()) {}
      } catch (error) {
        glide.g.value2 = error;
      }
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(
    ["first", "second"],
    "stdout.lines() iterator should yield individual lines",
  );

  const error = await until(() => glide.g.value2, "consuming multiple times should error");
  is(String(error), "TypeError: stdout pipe has already been read");
});

add_task(async function test_stderr_text() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      console.log("-");
      const proc = await glide.process.spawn("sh", [
        "-c",
        "echo \"hello world\" >&2; echo \"from stdout\"",
      ]);
      console.log("2");
      glide.g.value = await proc.stderr!.text();
      glide.g.value2 = await proc.stdout!.text();
      console.log("4");
    });
  });

  await glide.keys.send("~");

  const stderr = await until(() => glide.g.value);
  is(stderr, "hello world\n", "stderr.text() should return all stdout as a string");

  const stdout = await until(() => glide.g.value2);
  is(stdout, "from stdout\n", "stdout.text() should return all stdout as a string");
});
