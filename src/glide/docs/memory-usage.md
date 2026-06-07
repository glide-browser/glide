# Memory Usage

## Introduction

Glide is generally expected to have slightly higher memory usage than Firefox. This is due to the additional functionality and customisation that Glide provides. This section discuss various ways to measure memory usage, how to interpret the results, and making sure Glide memory usage is within acceptable limits.

## Tools for Measuring Memory Usage

Since Glide is a fork of Firefox, we can use the same tools to measure memory usage. Some of the tooling rely on Firefox's memory reporting system, which is not available to Glide.

1. [`about:memory`](#about:memory)

## about:memory

`about:memory` page is a powerful, built-in diagnostic tool that provides detailed measurements of Firefox’s memory usage. It allows you to view, save, load, and diff detailed measurements of Firefox’s memory usage. It provides detailed breakdowns of exactly which tabs, extensions or background processes are consuming memory and allows you to force memory garbage collection.

To open the `about:memory` page, type `about:memory` in the address bar and press Enter.

### Generating a memory report

1. Use Glide the way you normally would.
2. When you're ready to capture memory usage, open the `about:memory` page.
3. Click on `Measure and save` button to generate a memory report.
4. This will open a file dialog that allows you to save the file(`.json.gz` suffix) at your desired location.

### Loading a memory report

On the `about:memory` page. Click `Load…` and pick a saved report file (`.json.gz` suffix). The report opens on the page so you can review it.

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

- Bottom rows(Leaf nodes) are the actual measurements.
- Parent rows are the sum of everything below them.

### What to look for

Each process has two main parts:

1. Explicit allocations — memory broken down by tabs, extensions, JavaScript, images, and other subsystems. Look for top(https://…) rows to see which tabs use the most memory.
2. Other measurements — totals across the whole browser. resident is the best single number for overall RAM usage.

You don’t need to understand every line. Focus on unusually large entries and compare reports with Load and diff… to see what changed.

> [!TIP]
> Hover over any button or measurement in `about:memory` for a short explanation of what it means.

For detailed information, read the [`about:memory` Firefox docs](https://firefox-source-docs.mozilla.org/performance/memory/about_colon_memory.html).
