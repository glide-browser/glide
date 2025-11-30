// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare global {
  interface GlideGlobals {
    exit_code?: number;
    stdout?: string;
  }
}

add_task(async function test_basic() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("ls");
      glide.g.exit_code = (await proc.wait()).exit_code;
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.exit_code).is(0);
});

add_task(async function test_unknown_command() {
  await GlideTestUtils.reload_config(function() {
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
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("bash", ["-c", "echo \"a bad thing happened!\"; exit 3"]);
      await proc.wait().catch((err) => {
        glide.g.value = err;
      });
      glide.g.stdout = await Array.fromAsync((glide.g.value as GlideProcessError).process.stdout.values()).then((
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
  await GlideTestUtils.reload_config(function() {
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
  await GlideTestUtils.reload_config(function() {
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

add_task(async function test_stdout() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", ["-c", "echo \"first\"; sleep 0.1; echo \"second\""]);
      glide.g.value = await Array.fromAsync(proc.stdout.values());
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(["first\n", "second\n"], "pauses in the stream should be separate chunks");
});

add_task(async function test_stderr() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("sh", ["-c", "echo \"An error\" >&2"]);
      glide.g.value = await Array.fromAsync(proc.stderr!.values());
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).isjson(["An error\n"]);
});

add_task(async function test_stderr_stdout_simul() {
  await GlideTestUtils.reload_config(function() {
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
  await GlideTestUtils.reload_config(function() {
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
  await GlideTestUtils.reload_config(function() {
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

add_task(async function test_env() {
  await GlideTestUtils.reload_config(function() {
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
  await GlideTestUtils.reload_config(function() {
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
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("printenv", [], { env: {}, extend_env: false });

      glide.g.value = (await Array.fromAsync(proc.stdout.values())).join("").trim();
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is("", "env should be empty when env: {} and extend_env: false are set");

  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.spawn("printenv", [], { env: { "MY_ENV_VAR": "glide!" }, extend_env: false });
      glide.g.value = (await Array.fromAsync(proc.stdout.values())).join("").trim();
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is("MY_ENV_VAR=glide!", "only the explicitly set env var should be present");
});

add_task(async function test_execute() {
  await GlideTestUtils.reload_config(function() {
    glide.keymaps.set("normal", "~", async () => {
      const proc = await glide.process.execute("printenv");
      glide.g.value = proc.exit_code;
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is(0, "execute() should wait for the process to exit before returning");
});
