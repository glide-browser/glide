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

  // store weak mappings between nodes on each side of the tree, so we know what node each mutation corresponds to
  const source_to_mirror = new WeakMap<Node, Node>();
  const mirror_to_source = new WeakMap<Node, Node>();

  const imported = import_node(target, ensure(source.documentElement), source_to_mirror) as HTMLElement;
  target.replaceChild(imported, ensure(target.documentElement));

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
            const clone = import_node(to_document, node, from_to_map);
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
function import_node(document: Document, node: Node, from_to_map: WeakMap<Node, Node>): Node {
  const node_name = node.nodeName.toLowerCase();
  if (node_name === "browser") {
    // to avoid any weird issues with firefox code that assumes any `<browser>` element has a `browsingContext`
    // we do not copy `<browser>` elements over to the sandbox. e.g. devtools does a `querySelectorAll('browser')`
    // which caused it to crash.
    return DOM.create_element(
      "div",
      { attributes: { "glide-original-node-name": node.nodeName } },
      undefined,
      document,
    );
  }

  if (node_name === "script") {
    // there's no point in loading scripts in the fake document, and they could cause weird behaviour.
    return DOM.create_element(
      "div",
      { attributes: { "glide-original-node-name": node.nodeName } },
      undefined,
      document,
    );
  }

  const imported = node instanceof XULElement ? xul_to_element(document, node) : document.importNode(node);

  for (const child of node.childNodes) {
    imported.appendChild(
      // we may be called to import a node where some of its child nodes have *already* been imported into the document
      // in which case we should reuse the node instead of creating a new one to both avoid redundant work, and to allow
      // storing a reference to the original node, which would otherwise become stale if we replaced it.
      from_to_map.get(child!) ?? import_node(document, child!, from_to_map),
    );
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

/**
 * This function behaves similarly to `document.importNode(node, true)` but for the specific case where we have a `Node` constructed
 * in the mirrored document, *and*, we cannot insert it into the mirrored document directly for whatever reason.
 *
 * This happens in the commandline as users can render custom options however they'd like with a `render()` function, but because the commandline
 * is created in the *chrome* document, we need to manually make sure the mirroring state is correct so that when we eventually get the mutation
 * event for the commandline options, we don't try and re-import the node.
 *
 * For example:
 *
 * ```typescript
 * const node = DOM.create_element('span', { textContent: '', id: 'my-cool-span' });
 * // ... later after the node has been created in the browser chrome
 * node.textContent = 'updated value';
 * ```
 *
 * If the node was imported naively then the later mutation would actually not do *anything*, because the node that is actually in the UI
 * is an entirely different node. The correct mutation code would have to look like this, which is not intuitive at all:
 *
 * ```typescript
 * document.getElementById('my-cool-span')!.textContent = 'updated value';
 * ```
 */
export function import_mirrored_node(props: { mirror: Document; to_document: Document; node: Node }): Node {
  const mirror = REGISTRY.get(props.mirror);
  if (!mirror) {
    throw new Error("No mirror registered for the given document");
  }

  const imported = import_node(props.to_document, props.node, mirror.mirror_to_source);
  store_node_mappings(props.node, imported, mirror.mirror_to_source, mirror.source_to_mirror);
  return imported;
}

type EventType = string & {};
type ListenerObject = unknown & {};

/**
 * Constructs an observer[1] that will be called every time code in the main process
 * executes `node.addEventListener()` or `node.removeEventListener()`.
 *
 * This is then used for the mirrored document so that you can register events on nodes in
 * the mirrored window.
 *
 * This works by listening for event listener changes in the mirrored window, and for any new
 * listeners, we register a corresponding listener in the source window, and forward any events
 * it receives to the mirror window.
 *
 * [1]: https://searchfox.org/firefox-main/source/dom/events/nsIEventListenerService.idl
 */
export function make_listener_change_observer(): nsIListenerChangeListener {
  const all_state = new Map<
    // key is the *mirror* target
    EventTarget,
    Map<EventType, {
      source_listener?: ListenerObject;
      mirror_listeners: Map<ListenerObject, nsIEventListenerInfo>;
    }>
  >();
  return {
    listenersChanged(changes) {
      const seen = new Set<EventTarget>();
      for (let i = 0; i < changes.length; i++) {
        const mirror_target = changes.queryElementAt(i, Ci.nsIEventListenerChange).target;
        const target_window = mirror_target.ownerGlobal;
        if (!target_window || !target_window.document || !REGISTRY.has(target_window.document)) {
          // a listener is being added to somewhere other than a document mirror
          continue;
        }

        // if the same target has multiple change notifications then we only consider
        // the first one, as we don't actually look at any of the information on the change
        // event itself, and instead inspect the before/after state directly.
        if (seen.has(mirror_target)) {
          continue;
        }
        seen.add(mirror_target);

        const source_target = resolve_source_target(target_window, mirror_target);
        if (!source_target) {
          GlideBrowser._log.warn(`[document-mirror/listener]: could not resolve source target for node`, mirror_target);
          continue;
        }

        const state = all_state.getOrInsertComputed(mirror_target, () => new Map());
        const not_consumed = new Map(state);

        for (const info of Services.els.getListenerInfoFor(mirror_target)) {
          const type_state = state.getOrInsertComputed(info.type, () => ({ mirror_listeners: new Map() }));

          if (not_consumed.get(info.type)?.mirror_listeners.delete(info.listenerObject)) {
            GlideBrowser._log.debug(
              `[document-mirror/listener]: mirror listener for type=${info.type} has already been handled`,
              info.listenerObject,
            );
            continue;
          }
          type_state.mirror_listeners.set(info.listenerObject, info);

          // we should only ever register *one* source listener for a specific type as the source listener just calls
          // `.dispatchEvent()` which will fire the event for all mirror listeners.
          if (type_state.source_listener) {
            GlideBrowser._log.debug(
              `[document-mirror/listener]: source listener for type=${info.type} has already been registered`,
            );
            continue;
          }

          GlideBrowser._log.debug(
            `[document-mirror/listener]: adding source listener for type=${info.type} because of mirror listener`,
            info.listenerObject,
          );

          const listener = make_listener_callback(mirror_target);
          source_target.addEventListener(info.type, listener, {
            capture: info.capturing,
            mozSystemGroup: info.inSystemEventGroup,
          }, info.allowsUntrusted);
          type_state.source_listener = listener;

          // we need to cleanup all the source and mirror listeners when the config is reloaded
          // to avoid sending duplicate events
          GlideBrowser.on_reload_config(() => {
            GlideBrowser._log.debug(`[document-mirror/listener]: clearing state`);
            all_state.clear();
            mirror_target.removeEventListener(info.type, info.listenerObject);
            source_target.removeEventListener(info.type, listener);
          });
        }

        // handle removed listeners, i.e. listeners that were previously captured in our state
        // but are no longer registered on the mirror node.
        for (const [type, type_state] of not_consumed.entries()) {
          const map = state.get(type)!.mirror_listeners;
          for (const listener of type_state.mirror_listeners) {
            map.delete(listener);
          }

          // all listeners have been removed, so we should remove our source listener
          // and all associated state with this event type as it is now redundant
          const source_listener = state.get(type)?.source_listener;
          if (source_listener && !map.size) {
            source_target.removeEventListener(type, source_listener as EventListener);
            state.delete(type);
          }
        }
      }
    },
  };

  function make_listener_callback(target: EventTarget) {
    return (event: Event) => {
      if (!(event instanceof Event)) {
        GlideBrowser._log.warn(`[document-mirror/listener]: received non-Event argument`, event);
        return;
      }

      const cloned = reconstruct_event(event, GlideBrowser.sandbox_window);

      target.dispatchEvent(cloned);

      if (cloned.defaultPrevented) {
        event.preventDefault();
      }
    };
  }

  /**
   * We need to reconstruct the event in the mirrored window so that `event instanceof KeyboardEvent`
   * would be correct.
   */
  function reconstruct_event(original_event: Event, target_window: HiddenWindow) {
    const EventConstructor = (target_window[original_event.constructor.name] ?? target_window.Event) as typeof Event;

    return new EventConstructor(
      original_event.type,
      // keyboard events store their `initDict` explicitly, so we might as well pass it directly.
      //
      // for other events, the constructed `Event` should generally match the `initDict`; there may
      // be cases where they diverge, in which case we'll just handle them specially.
      (original_event as KeyboardEvent).initDict ?? original_event,
    );
  }

  function resolve_source_target(target_window: WindowProxy, target: EventTarget): EventTarget | undefined {
    return target === target_window
      ? window
      : target === target_window.document
      ? document!
      : get_source_node_from_mirror_node(target_window.document! as MirroredDocument, target as Node);
  }
}

function get_source_node_from_mirror_node(mirror: MirroredDocument, node: Node): Node | undefined {
  const state = REGISTRY.get(mirror);
  if (!state) {
    return;
  }
  return state.mirror_to_source.get(node);
}
