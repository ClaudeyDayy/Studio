import { register } from "node:module"; register("./hooks.mjs", import.meta.url);
const noop = new Proxy(function () {}, { get: (t, k) => (k === "width" ? 300 : k === Symbol.toPrimitive ? () => 0 : noop), apply: () => noop, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => noop, style: {} }), createElementNS: () => ({ style: {} }) };
