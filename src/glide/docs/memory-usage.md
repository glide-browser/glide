# Memory Usage

## Introduction

Glide is generally expected to have slightly higher memory usage than Firefox. This is due to the additional functionality and customisation that Glide provides. This section discusses various ways to measure memory usage and how to interpret the results.

## Tools for Measuring Memory Usage

Since Glide is a fork of Firefox, we can use the same tools to measure memory usage. Some of the tooling relies on Firefox's memory reporting system, which is not available to Glide.

1. [`about:memory`](#about:memory)
2. [AWSY](#awsy)

## about:memory

The `about:memory` page is a powerful, built-in diagnostic tool that provides detailed measurements of Firefox’s memory usage. It allows you to view, save, load, and diff detailed measurements of Firefox’s memory usage. It provides detailed breakdowns of exactly which tabs, extensions, or background processes are consuming memory and allows you to force memory garbage collection.

To open the `about:memory` page, type `about:memory` in the address bar and press Enter.

### Generating a memory report

1. Use Glide the way you normally would.
2. When you're ready to capture memory usage, open the `about:memory` page.
3. Click the `Measure and save` button to generate a memory report.
4. This will open a file dialog that allows you to save the file (`.json.gz` suffix) at your desired location.

### Loading a memory report

On the `about:memory` page, click `Load…` and pick a saved report file (`.json.gz` suffix).

> [!NOTE]
> It's useful to compare before and after memory usage. To do this, you can use the `Load and diff…` button to load two different memory reports and compare the differences.

### Interpreting memory usage

Once you’ve generated or loaded a report, you’ll see a breakdown of where Glide’s memory is going.

The basics

- Sizes are shown in MB, KB, or sometimes raw bytes. Some entries are plain counts with no unit.
- The percentage in brackets shows how much of the parent row that entry uses.
- Reports are split by process (main browser, tabs, GPU, etc.).
- Measurements are shown as trees — click rows to expand or collapse them.

```txt
51.00 MB (100.0%) -- js-main-runtime-gc-heap-committed
├──38.29 MB (75.07%) -- used
│  ├──36.18 MB (70.94%) -- gc-things
│  │  ├──17.03 MB (33.39%) ── objects
│  │  ├───5.80 MB (11.37%) ── scripts
│  │  ├───4.81 MB (09.42%) ── strings
│  │  ├───3.67 MB (07.20%) ── property-maps
│  │  ├───3.49 MB (06.84%) ── scopes
│  │  ├───0.80 MB (01.57%) ── shapes
│  │  └───0.58 MB (01.14%) ++ (6 tiny)
│  ├───1.44 MB (02.82%) ── chunk-admin
│  └───0.67 MB (01.31%) ── arena-admin
└──12.71 MB (24.93%) -- unused
   ├──11.10 MB (21.77%) ── arenas
   ├───1.00 MB (01.96%) ── chunks
   └───0.61 MB (01.20%) ++ gc-things
```

### How to read a tree

- Bottom rows (leaf nodes) are the actual measurements.
- Parent rows are the sum of everything below them.

### What to look for

Each process has two main parts:

1. Explicit allocations — memory broken down by tabs, extensions, JavaScript, images, and other subsystems. Look for top(https://…) rows to see which tabs use the most memory.
2. Other measurements — totals across the whole browser. `resident` is the best single number for overall RAM usage.

You don’t need to understand every line. Focus on unusually large entries and compare reports with Load and diff… to see what changed.

> [!TIP]
> Hover over any button or measurement in `about:memory` for a short explanation of what it means.

For detailed information, read the [`about:memory` Firefox docs](https://firefox-source-docs.mozilla.org/performance/memory/about_colon_memory.html).

## AWSY

AWSY (Are We Slim Yet) is Firefox’s automated memory testing suite. It loads a set of web pages and tracks memory usage.

To run AWSY:

```bash
pnpm mach awsy-test
```

> [!NOTE]
> A Glide build is required before running AWSY tests.

The first AWSY run also downloads the test pages, so allow extra time and make sure you have network access. To verify everything works, start with `pnpm mach awsy-test --quick` before running a full test.

### Useful flags

| Flag         | What it does                                                         |
| ------------ | -------------------------------------------------------------------- |
| `-h`         | Show all options and AWSY-specific flags                             |
| `--quick`    | Shorter run — opens 3 pages once, with minimal waiting between steps |
| `--base`     | Run base memory usage tests                                          |
| `--headless` | Run tests in headless mode                                           |

When the run finishes, results are saved under `engine/obj-*/_tests/awsy/results/`. The log prints the exact path:

```bash
0:42.79 INFO Perfherder data written to engine/.../perfherder-data.json
```

> [!NOTE]
> Perfherder is a dashboard intended to allow monitoring and analysis of automated performance tests run against Mozilla products (currently Firefox and Firefox for Android). Glide is not supported on Perfherder, so we rely on the memory usage data from `perfherder-data.json` to analyse memory usage.

### Interpreting results

The result is a JSON file that contains the memory usage data for the run. You can open it in a text editor to view the data.

Structure of the result file:

```txt
{
  "framework": { "name": "awsy" },
  "suites": [
    {
      "name": "Explicit Memory",
      "value": 490176268,
      "unit": "bytes",
      "lowerIsBetter": true,
      "extraOptions": ["tp6", "fission"],
      "subtests": [
        { "name": "Fresh start", "value": 488051251, "unit": "bytes" },
        { "name": "After tabs open", "value": 756072339, "unit": "bytes" },
        { "name": "Tabs closed [+30s, forced GC]", "value": 339143635, "unit": "bytes" }
      ]
    }
  ]
}
```

| Field           | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `suites`        | The metrics AWSY tracks (Explicit, Resident, JS, Images, Heap Unclassified) |
| `subtests`      | Memory at each stage of the test                                            |
| `value`         | Summary score across all checkpoints for the suite                          |
| `unit`          | Unit of the value field, e.g. `bytes`                                       |
| `lowerIsBetter` | `true` if lower values are better, `false` if higher values are better      |
| `extraOptions`  | Additional options that were used to run the test                           |

#### Checkpoints

Each suite includes the same stages as the test runs:

| Checkpoint                    | What it means                            |
| ----------------------------- | ---------------------------------------- |
| Fresh start                   | Memory right after launch                |
| After tabs open               | After opening the test pages             |
| Tabs closed [+30s, forced GC] | After closing tabs and reclaiming memory |

The file includes more checkpoints (e.g. Fresh start [+30s], After tabs open [+30s, forced GC]). The table above covers the main ones.

Memory should increase when tabs open and decrease after they close. If it stays high at **Tabs closed**, that may indicate a leak.

For detailed information, read the [AWSY docs](https://firefox-source-docs.mozilla.org/testing/perfdocs/awsy.html).
