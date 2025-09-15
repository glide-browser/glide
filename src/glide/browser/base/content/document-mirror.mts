/**
 * Mirror one `Document` to another, this is useful for exposing the DOM APIs for mutating
 * the `Document` that lays out the browser chrome UI itself, without exposing its `Document`
 * object itself, as that could lead to sandbox escaping where the `ChromeWindow` is exposed,
 * which we definitely don't want.
 *
 * note: this almost definitely does not cover *every* possible DOM change.
 *
 * r.e.  performance, these callbacks will be invoked *very* frequently.
 *       on my machine, while browsing around a bit in the dev build, it
 *       fluctuates a lot, with most timings being < 0.2ms, with the occasional
 *       peaks higher than that with the highest I've seen being ~1.6ms.
 *
 *       which seems acceptable, but it may be worse on lower end machines...
 *
 * todo: batch mutations per animation frame? probably better for CPU
 *
 * todo: explicit benchmarks
 */

const { ensure } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

const REGISTRY = new WeakMap<Document, MirrorState>();

/**
 * Mirror one `Document` to another, this is useful for exposing the DOM APIs for mutating
 * the `Document` that lays out the browser chrome UI itself, without exposing its `Document`
 * object itself, as that could lead to sandbox escaping where the `ChromeWindow` is exposed,
 * which we definitely don't want.
 */
export function mirror_into_document(source: Document, target: Document): MirroredDocument {
  const existing = REGISTRY.get(target);
  if (existing) {
    throw new Error("alreading mirroring, call stop_mirroring() first");
  }

  const imported = target.importNode(ensure(source.documentElement), true) as HTMLElement;
  target.replaceChild(imported, ensure(target.documentElement));

  // store weak mappings between nodes on each side of the tree, so we know what node each mutation corresponds to
  const source_to_mirror = new WeakMap<Node, Node>();
  const mirror_to_source = new WeakMap<Node, Node>();
  store_node_mappings(source.documentElement!, target.documentElement!, source_to_mirror, mirror_to_source);

  const opts: MutationObserverInit = {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  };

  const state: MirrorState = {
    source,
    mirror: target,
    source_to_mirror,
    mirror_to_source,
    source_observer: new MutationObserver((mutations) => {
      // disconnect while we're applying mutations so we don't recurse forever
      state.mirror_observer.disconnect();

      try {
        apply_mutations(target, mutations, source_to_mirror, mirror_to_source);
      } finally {
        state.mirror_observer.observe(target, opts);
      }
    }),
    mirror_observer: new MutationObserver((mutations) => {
      // disconnect while we're applying mutations so we don't recurse forever
      state.source_observer.disconnect();

      try {
        apply_mutations(source, mutations, mirror_to_source, source_to_mirror);
      } finally {
        state.source_observer.observe(source, opts);
      }
    }),
  };

  state.source_observer.observe(source, opts);
  state.mirror_observer.observe(target, opts);

  REGISTRY.set(target, state);

  Object.defineProperty(target, "$brand", { value: "mirror", enumerable: false });
  return target as MirroredDocument;
}

export function stop_mirroring(mirror: Document): void {
  const state = REGISTRY.get(mirror);
  if (!state) {
    return;
  }

  state.source_observer.disconnect();
  state.mirror_observer.disconnect();
  REGISTRY.delete(mirror);
}

type MirrorState = {
  source: Document;
  mirror: Document;
  source_to_mirror: WeakMap<Node, Node>;
  mirror_to_source: WeakMap<Node, Node>;
  source_observer: MutationObserver;
  mirror_observer: MutationObserver;
};

function apply_mutations(
  to_document: Document,
  mutations: MutationRecord[],
  from_to_map: WeakMap<Node, Node>,
  to_from_map: WeakMap<Node, Node>,
) {
  for (const mutation of mutations) {
    if (!mutation.target) {
      continue;
    }

    switch (mutation.type) {
      case "childList": {
        const to_parent = from_to_map.get(mutation.target);
        if (!to_parent) break;

        mutation.removedNodes.forEach((from_node) => {
          const node = ensure(from_node);
          const mapped = from_to_map.get(node);
          if (mapped && mapped.parentNode) {
            mapped.parentNode.removeChild(mapped);
          }
        });

        const before_node = mutation.nextSibling ? from_to_map.get(mutation.nextSibling) ?? null : null;
        mutation.addedNodes.forEach((from_node) => {
          const node = ensure(from_node);
          const existing = from_to_map.get(node);
          if (existing) {
            // node was moved
            if (existing.parentNode !== to_parent || existing.nextSibling !== before_node) {
              to_parent.insertBefore(existing, before_node);
            }
          } else {
            // new node
            const clone = to_document.importNode(node, true);
            to_parent.insertBefore(clone, before_node);
            store_node_mappings(node, clone, from_to_map, to_from_map);
          }
        });
        break;
      }

      case "attributes": {
        const from_element = mutation.target as Element;
        const to_element = from_to_map.get(mutation.target) as Element | null;
        if (!to_element) {
          break;
        }

        const name = mutation.attributeName!;
        const value = from_element.getAttribute(name);
        if (value === null) {
          to_element.removeAttribute(name);
        } else {
          to_element.setAttribute(name, value);
        }
        break;
      }

      case "characterData": {
        const to_node = from_to_map.get(mutation.target);
        if (!to_node) {
          break;
        }

        to_node.nodeValue = mutation.target.nodeValue;
        break;
      }
    }
  }
}

function store_node_mappings(
  from_root: Node,
  to_root: Node,
  from_to_map: WeakMap<Node, Node>,
  to_from_map: WeakMap<Node, Node>,
): void {
  const stack_a: Node[] = [from_root];
  const stack_b: Node[] = [to_root];

  while (stack_a.length) {
    const a = stack_a.pop()!;
    const b = stack_b.pop()!;

    from_to_map.set(a, b);
    to_from_map.set(b, a);

    const children_a = a.childNodes;
    const children_b = b.childNodes;

    for (let i = Math.min(children_a.length, children_b.length) - 1; i >= 0; i--) {
      stack_a.push(children_a[i]!);
      stack_b.push(children_b[i]!);
    }
  }
}
