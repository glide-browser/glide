// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

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
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");

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

  const imported = import_node(target, ensure(source.documentElement)) as HTMLElement;
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

  function source_observer_callback(mutations: MutationRecord[]) {
    // prevent infinite recursion by cleaning up the other observer
    {
      const pending = state.mirror_observer.takeRecords();
      if (pending.length) {
        // make sure we don't drop mutations
        mirror_observer_callback(pending);
      }

      state.mirror_observer.disconnect();
    }

    try {
      apply_mutations(target, mutations, source_to_mirror, mirror_to_source);
    } finally {
      state.mirror_observer.observe(target, opts);
    }
  }

  function mirror_observer_callback(mutations: MutationRecord[]) {
    // prevent infinite recursion by cleaning up the other observer
    {
      const pending = state.source_observer.takeRecords();
      if (pending.length) {
        // make sure we don't drop mutations
        source_observer_callback(pending);
      }

      state.source_observer.disconnect();
    }

    try {
      apply_mutations(source, mutations, mirror_to_source, source_to_mirror);
    } finally {
      state.source_observer.observe(source, opts);
    }
  }

  const state: MirrorState = {
    source,
    mirror: target,
    source_to_mirror,
    mirror_to_source,
    source_observer: new MutationObserver(source_observer_callback),
    mirror_observer: new MutationObserver(mirror_observer_callback),
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
            const clone = import_node(to_document, node);
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

/**
 * This function behaves similarly to `document.importNode(node, true)` but it handles the case
 * where the given `Node` or any of its children are `XULElement`s, which cannot be safely imported
 * normally using `document.importNode()` as it may cause a full browser crash due to bad memory access.
 *
 * This is a very naive implementation, as it's just intended to result in a node tree that
 * generally follows the structure of the original, i.e. printing the original tree and the new
 * tree to a string, should be as close as possible. State on the nodes themselves are not transferred.
 */
function import_node(document: Document, node: Node): Node {
  const node_name = node.nodeName.toLowerCase();
  if (node_name === "browser") {
    // to avoid any weird issues with firefox code that assumes any `<browser>` element has a `browsingContext`
    // we do not copy `<browser>` elements over to the sandbox. e.g. devtools does a `querySelectorAll('browser')`
    // which caused it to crash.
    return DOM.create_element("div", { attributes: { "glide-original-node-name": node.nodeName } }, document);
  }

  if (node_name === "script") {
    // there's no point in loading scripts in the fake document, and they could cause weird behaviour.
    return DOM.create_element("div", { attributes: { "glide-original-node-name": node.nodeName } }, document);
  }

  const imported = node instanceof XULElement ? xul_to_element(document, node) : document.importNode(node);

  for (const child of node.childNodes) {
    imported.appendChild(import_node(document, child!));
  }

  return imported;
}

function xul_to_element(document: Document, element: XULElement): Node {
  const imported = document.createElement(element.localName);

  for (const attr of element.attributes) {
    imported.setAttribute(attr.name, attr.value);
  }

  return imported;
}
