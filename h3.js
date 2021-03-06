/**
 * Copyright 2020 Fabio Cevasco <h3rald@h3rald.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const equal = (obj1, obj2) => {
  if (
    (obj1 === null && obj2 === null) ||
    (obj1 === undefined && obj2 === undefined)
  ) {
    return true;
  }
  if (
    (obj1 === undefined && obj2 !== undefined) ||
    (obj1 !== undefined && obj2 === undefined) ||
    (obj1 === null && obj2 !== null) ||
    (obj1 !== null && obj2 === null)
  ) {
    return false;
  }
  if (obj1.constructor !== obj2.constructor) {
    return false;
  }
  if (typeof obj1 === "function") {
    if (obj1.toString() !== obj2.toString()) {
      return false;
    }
  }
  if ([String, Number, Boolean].includes(obj1.constructor)) {
    if (obj1 !== obj2) {
    }
    return obj1 === obj2;
  }
  if (obj1.constructor === Array) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!equal(obj1[i], obj2[i])) {
        return false;
      }
    }
    return true;
  }
  function checkProperties(obj1, obj2) {
    for (const key in obj1) {
      if (!(key in obj2)) {
        return false;
      }
      if (!equal(obj1[key], obj2[key])) {
        return false;
      }
    }
    return true;
  }
  return checkProperties(obj1, obj2) && checkProperties(obj2, obj1);
};

const selectorRegex = /^([a-z0-9:_=-]+)(#[a-z0-9:_=-]+)?(\..+)?$/i;

// Virtual Node Implementation with HyperScript-like syntax
class VNode {
  constructor(...args) {
    this.type = undefined;
    this.attributes = {};
    this.data = {};
    this.id = undefined;
    this.$key = undefined;
    this.$html = undefined;
    this.style = undefined;
    this.value = undefined;
    this.children = [];
    this.classList = [];
    this.eventListeners = {};
    if (args.length === 0) {
      throw new Error("[VNode] No arguments passed to VNode constructor.");
    }
    if (args.length === 1) {
      let vnode = args[0];
      if (typeof vnode === "string") {
        // Assume empty element
        this.processSelector(vnode);
      } else if (
        typeof vnode === "function" ||
        (typeof vnode === "object" && vnode !== null)
      ) {
        // Text node
        if (vnode.type === "#text") {
          this.type = "#text";
          this.value = vnode.value;
        } else {
          this.from(this.processVNodeObject(vnode));
        }
      } else {
        throw new Error(
          "[VNode] Invalid first argument passed to VNode constructor."
        );
      }
    } else if (args.length === 2) {
      let [selector, data] = args;
      if (typeof selector !== "string") {
        throw new Error(
          "[VNode] Invalid first argument passed to VNode constructor."
        );
      }
      this.processSelector(selector);
      if (typeof data === "string") {
        // Assume single child text node
        this.children = [new VNode({ type: "#text", value: data })];
        return;
      }
      if (
        typeof data !== "function" &&
        (typeof data !== "object" || data === null)
      ) {
        throw new Error(
          "[VNode] The second argument of a VNode constructor must be an object, an array or a string."
        );
      }
      if (Array.isArray(data)) {
        // Assume 2nd argument as children
        this.processChildren(data);
      } else {
        if (data instanceof Function || data instanceof VNode) {
          this.processChildren(data);
        } else {
          // Not a VNode, assume props object
          this.processProperties(data);
        }
      }
    } else if (args.length === 3) {
      let [selector, props, children] = args;
      if (typeof selector !== "string") {
        throw new Error(
          "[VNode] Invalid first argument passed to VNode constructor."
        );
      }
      this.processSelector(selector);
      if (typeof props !== "object" || props === null) {
        throw new Error(
          "[VNode] Invalid second argument passed to VNode constructor."
        );
      }
      this.processProperties(props);
      this.processChildren(children);
    } else {
      throw new Error(
        "[VNode] Too many arguments passed to VNode constructor."
      );
    }
  }

  from(data) {
    this.value = data.value;
    this.type = data.type;
    this.id = data.id;
    this.$key = data.$key;
    this.$html = data.$html;
    this.style = data.style;
    this.data = data.data;
    this.value = data.value;
    this.eventListeners = data.eventListeners;
    this.children = data.children;
    this.attributes = data.attributes;
    this.classList = data.classList;
  }

  equal(a, b) {
    return equal(a, b === undefined ? this : b);
  }

  processProperties(attrs) {
    this.id = this.id || attrs.id;
    this.$key = attrs.$key;
    this.$html = attrs.$html;
    this.style = attrs.style;
    this.value = attrs.value;
    this.data = attrs.data || {};
    this.classList =
      attrs.classList && attrs.classList.length > 0
        ? attrs.classList
        : this.classList;
    this.attributes = attrs;
    Object.keys(attrs)
      .filter((a) => a.startsWith("on"))
      .forEach((key) => {
        if (typeof attrs[key] !== "function") {
          throw new Error(
            `[VNode] Event handler specified for ${key} event is not a function.`
          );
        }
        this.eventListeners[key.slice(2)] = attrs[key];
        delete this.attributes[key];
      });
    delete this.attributes.value;
    delete this.attributes.$key;
    delete this.attributes.$html;
    delete this.attributes.id;
    delete this.attributes.data;
    delete this.attributes.style;
    delete this.attributes.classList;
  }

  processSelector(selector) {
    if (!selector.match(selectorRegex)) {
      throw new Error(`[VNode] Invalid selector: ${selector}`);
    }
    const [, type, id, classes] = selector.match(selectorRegex);
    this.type = type;
    if (id) {
      this.id = id.slice(1);
    }
    this.classList = (classes && classes.split(".").slice(1)) || [];
  }

  processVNodeObject(arg) {
    if (arg instanceof VNode) {
      return arg;
    }
    if (arg instanceof Function) {
      let vnode = arg();
      if (typeof vnode === "string") {
        vnode = new VNode({ type: "#text", value: vnode });
      }
      if (!(vnode instanceof VNode)) {
        throw new Error("[VNode] Function argument does not return a VNode");
      }
      return vnode;
    }
    throw new Error(
      "[VNode] Invalid first argument provided to VNode constructor."
    );
  }

  processChildren(arg) {
    const children = Array.isArray(arg) ? arg : [arg];
    this.children = children.map((c) => {
      if (typeof c === "string") {
        return new VNode({ type: "#text", value: c });
      }
      if (typeof c === "function" || (typeof c === "object" && c !== null)) {
        return this.processVNodeObject(c);
      }
      throw new Error(`[VNode] Specified child is not a VNode: ${c}`);
    });
  }

  // Renders the actual DOM Node corresponding to the current Virtual Node
  render() {
    if (this.type === "#text") {
      return document.createTextNode(this.value);
    }
    const node = document.createElement(this.type);
    if (this.id) {
      node.id = this.id;
    }
    Object.keys(this.attributes).forEach((attr) => {
      // Standard attributes (unless falsy)
      if (this.attributes[attr]) {
        const a = document.createAttribute(attr);
        a.value = this.attributes[attr];
        node.setAttributeNode(a);
      }
    });
    // Event Listeners
    Object.keys(this.eventListeners).forEach((event) => {
      node.addEventListener(event, this.eventListeners[event]);
    });
    // Value
    if (this.value) {
      node.value = this.value;
    }
    // Style
    if (this.style) {
      node.style.cssText = this.style;
    }
    // Classes
    this.classList.forEach((c) => {
      node.classList.add(c);
    });
    // Data
    Object.keys(this.data).forEach((key) => {
      node.dataset[key] = this.data[key];
    });
    // Children
    this.children.forEach((c) => {
      node.appendChild(c.render());
    });
    if (this.$html) {
      node.innerHTML = this.$html;
    }
    return node;
  }

  // Updates the current Virtual Node with a new Virtual Node (and syncs the existing DOM Node)
  redraw(data) {
    let { node, vnode } = data;
    const newvnode = vnode;
    const oldvnode = this;
    if (
      oldvnode.constructor !== newvnode.constructor ||
      oldvnode.type !== newvnode.type ||
      (oldvnode.type === newvnode.type &&
        oldvnode.type === "#text" &&
        oldvnode !== newvnode)
    ) {
      node.parentNode.replaceChild(newvnode.render(), node);
      oldvnode.from(newvnode);
      return;
    }
    // ID
    if (oldvnode.id !== newvnode.id) {
      node.id = newvnode.id || "";
      oldvnode.id = newvnode.id;
    }
    // Value
    if (oldvnode.value !== newvnode.value) {
      node.value = newvnode.value || "";
      oldvnode.value = newvnode.value;
    }
    // Classes
    if (!equal(oldvnode.classList, newvnode.classList)) {
      oldvnode.classList.forEach((c) => {
        if (!newvnode.classList.includes(c)) {
          node.classList.remove(c);
        }
      });
      newvnode.classList.forEach((c) => {
        if (!oldvnode.classList.includes(c)) {
          node.classList.add(c);
        }
      });
      oldvnode.classList = newvnode.classList;
    }
    // Style
    if (oldvnode.style !== newvnode.style) {
      node.style.cssText = newvnode.style || "";
      oldvnode.style = newvnode.style;
    }
    // Data
    if (!equal(oldvnode.data, newvnode.data)) {
      Object.keys(oldvnode.data).forEach((a) => {
        if (!newvnode.data[a]) {
          delete node.dataset[a];
        } else if (newvnode.data[a] !== oldvnode.data[a]) {
          node.dataset[a] = newvnode.data[a];
        }
      });
      Object.keys(newvnode.data).forEach((a) => {
        if (!oldvnode.data[a]) {
          node.dataset[a] = newvnode.data[a];
        }
      });
      oldvnode.data = newvnode.data;
    }
    // Attributes
    if (!equal(oldvnode.attributes, newvnode.attributes)) {
      Object.keys(oldvnode.attributes).forEach((a) => {
        if (!newvnode.attributes[a]) {
          node.removeAttribute(a);
        } else if (
          newvnode.attributes[a] &&
          newvnode.attributes[a] !== oldvnode.attributes[a]
        ) {
          node.setAttribute(a, newvnode.attributes[a]);
        }
      });
      Object.keys(newvnode.attributes).forEach((a) => {
        if (!oldvnode.attributes[a] && newvnode.attributes[a]) {
          node.setAttribute(a, newvnode.attributes[a]);
        }
      });
      oldvnode.attributes = newvnode.attributes;
    }
    // Event listeners
    if (!equal(oldvnode.eventListeners, newvnode.eventListeners)) {
      Object.keys(oldvnode.eventListeners).forEach((a) => {
        if (!newvnode.eventListeners[a]) {
          node.removeEventListener(a, oldvnode.eventListeners[a]);
        } else if (
          !equal(newvnode.eventListeners[a], oldvnode.eventListeners[a])
        ) {
          node.removeEventListener(a, oldvnode.eventListeners[a]);
          node.addEventListener(a, newvnode.eventListeners[a]);
        }
      });
      Object.keys(newvnode.eventListeners).forEach((a) => {
        if (!oldvnode.eventListeners[a]) {
          node.addEventListener(a, newvnode.eventListeners[a]);
        }
      });
      oldvnode.eventListeners = newvnode.eventListeners;
    }
    // Children
    var newmap = []; // Map positions of newvnode children in relation to oldvnode children
    var oldmap = []; // Map positions of oldvnode children in relation to newvnode children
    function mapChildren(parent1, parent2) {
      const map = [];
      for (let j = 0; j < parent1.children.length; j++) {
        let found = false;
        for (let k = 0; k < parent2.children.length; k++) {
          if (parent1.children[j].equal(parent2.children[k])) {
            map.push(k);
            found = true;
            break;
          }
        }
        // node not in oldvnode
        if (!found) {
          map.push(-1);
        }
      }
      return map;
    }
    var newmap = mapChildren(newvnode, oldvnode);
    var oldmap = mapChildren(oldvnode, newvnode);
    var notFoundInOld = newmap.indexOf(-1);
    var notFoundInNew = oldmap.indexOf(-1);
    if (equal(newmap, oldmap) && (notFoundInNew >= 0 || notFoundInOld >= 0)) {
      // Something changed
      for (let i = 0; i < newmap.length; i++) {
        if (newmap[i] === -1) {
          if (oldvnode.children[i].type === "#text") {
            oldvnode.children[i] = newvnode.children[i];
            node.childNodes[i].nodeValue = newvnode.children[i].value;
          } else {
            oldvnode.children[i].redraw({
              node: node.childNodes[i],
              vnode: newvnode.children[i],
            });
          }
        }
      }
    } else {
      var notFoundInOld = newmap.indexOf(-1);
      var notFoundInNew = oldmap.indexOf(-1);
      while (notFoundInOld >= 0 || notFoundInNew >= 0) {
        // First remove children not found in new map, then add the missing ones.
        if (notFoundInNew >= 0) {
          // while there are children not found in newvnode, remove them and re-check
          node.removeChild(node.childNodes[notFoundInNew]);
          oldvnode.children.splice(notFoundInNew, 1);
          newmap = mapChildren(newvnode, oldvnode);
          oldmap = mapChildren(oldvnode, newvnode);
          notFoundInNew = oldmap.indexOf(-1);
          notFoundInOld = newmap.indexOf(-1);
        }
        if (notFoundInOld >= 0) {
          // while there are children not found in oldvnode, add them and re-check
          node.insertBefore(
            newvnode.children[notFoundInOld].render(),
            node.childNodes[notFoundInOld]
          );
          oldvnode.children.splice(
            notFoundInOld,
            0,
            newvnode.children[notFoundInOld]
          );
          newmap = mapChildren(newvnode, oldvnode);
          oldmap = mapChildren(oldvnode, newvnode);
          notFoundInNew = oldmap.indexOf(-1);
          notFoundInOld = newmap.indexOf(-1);
        }
      }
    }
    // innerHTML
    if (newvnode.$html) {
      node.innerHTML = newvnode.$html;
      oldvnode.$html = newvnode.$html;
    }
  }
}

/**
 * The code of the following class is heavily based on Storeon
 * Modified according to the terms of the MIT License
 * <https://github.com/storeon/storeon/blob/master/LICENSE>
 * Copyright 2019 Andrey Sitnik <andrey@sitnik.ru>
 */
class Store {
  constructor() {
    this.events = {};
    this.state = {};
  }
  dispatch(event, data) {
    if (event !== "$log") this.dispatch("$log", { event, data });
    if (this.events[event]) {
      let changes = {};
      let changed;
      this.events[event].forEach((i) => {
        this.state = { ...this.state, ...i(this.state, data) };
      });
    }
  }

  on(event, cb) {
    (this.events[event] || (this.events[event] = [])).push(cb);

    return () => {
      this.events[event] = this.events[event].filter((i) => i !== cb);
    };
  }
}

class Route {
  constructor({ path, def, query, parts }) {
    this.path = path;
    this.def = def;
    this.query = query;
    this.parts = parts;
    this.params = {};
    if (this.query) {
      const rawParams = this.query.split("&");
      rawParams.forEach((p) => {
        const [name, value] = p.split("=");
        this.params[decodeURIComponent(name)] = decodeURIComponent(value);
      });
    }
  }
}

class Router {
  constructor({ element, routes, store, location }) {
    this.element = element;
    this.redraw = null;
    this.store = store;
    this.location = location || window.location;
    if (!routes || Object.keys(routes).length === 0) {
      throw new Error("[Router] No routes defined.");
    }
    const defs = Object.keys(routes);
    this.routes = routes;
  }

  setRedraw(vnode) {
    this.redraw = () => {
      const fn = this.routes[this.route.def];
      vnode.redraw({ node: this.element.childNodes[0], vnode: fn() });
      this.store.dispatch("$redraw");
    };
  }

  start() {
    const processPath = (data) => {
      const fragment =
        (data &&
          data.newURL &&
          data.newURL.match(/(#.+)$/) &&
          data.newURL.match(/(#.+)$/)[1]) ||
        this.location.hash;
      const path = fragment.replace(/\?.+$/, "").slice(1);
      const rawQuery = fragment.match(/\?(.+)$/);
      const query = rawQuery && rawQuery[1] ? rawQuery[1] : "";
      const pathParts = path.split("/").slice(1);
      let parts = {};
      for (let def of Object.keys(this.routes)) {
        let routeParts = def.split("/").slice(1);
        let match = true;
        let index = 0;
        parts = {};
        while (match && routeParts[index]) {
          const rP = routeParts[index];
          const pP = pathParts[index];
          if (rP.startsWith(":") && pP) {
            parts[rP.slice(1)] = pP;
          } else {
            match = rP === pP;
          }
          index++;
        }
        if (match) {
          this.route = new Route({ query, path, def, parts });
          break;
        }
      }
      if (!this.route) {
        throw new Error(`[Router] No route matches '${fragment}'`);
      }
      // Display View
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
      const vnode = this.routes[this.route.def]();
      this.element.appendChild(vnode.render());
      this.setRedraw(vnode);
      window.scrollTo(0, 0);
      this.store.dispatch("$redraw", this.route);
      this.store.dispatch("$navigation", this.route);
    };
    processPath();
    window.addEventListener("hashchange", processPath);
  }

  navigateTo(path, params) {
    let query = Object.keys(params || {})
      .map((p) => `${encodeURIComponent(p)}=${encodeURIComponent(params[p])}`)
      .join("&");
    query = query ? `?${query}` : "";
    this.location.hash = `#${path}${query}`;
  }
}

// High Level API
const h3 = (...args) => {
  return new VNode(...args);
};

let store = null;
let router = null;

h3.init = (config) => {
  let { element, routes, modules, preStart, postStart, location } = config;
  if (!routes) {
    // Assume config is a component object, define default route
    if (typeof config !== "function") {
      throw new Error(
        "[h3.init] The specified argument is not a valid configuration object or component function"
      );
    }
    routes = { "/": config };
  }
  element = element || document.body;
  if (!(element && element instanceof Element)) {
    throw new Error("[h3.init] Invalid element specified.");
  }
  // Initialize store
  store = new Store();
  (modules || []).forEach((i) => {
    i(store);
  });
  store.dispatch("$init");
  // Initialize router
  router = new Router({ element, routes, store, location });
  return Promise.resolve(preStart && preStart())
    .then(() => router.start())
    .then(() => postStart && postStart());
};

h3.navigateTo = (path, params) => {
  if (!router) {
    throw new Error(
      "[h3.navigateTo] No application initialized, unable to navigate."
    );
  }
  return router.navigateTo(path, params);
};

Object.defineProperty(h3, "route", {
  get: () => {
    if (!router) {
      throw new Error(
        "[h3.route] No application initialized, unable to retrieve current route."
      );
    }
    return router.route;
  },
});

Object.defineProperty(h3, "state", {
  get: () => {
    if (!store) {
      throw new Error(
        "[h3.state] No application initialized, unable to retrieve current state."
      );
    }
    return store.state;
  },
});

h3.on = (event, cb) => {
  if (!store) {
    throw new Error(
      "[h3.on] No application initialized, unable to listen to events."
    );
  }
  return store.on(event, cb);
};

h3.dispatch = (event, data) => {
  if (!store) {
    throw new Error(
      "[h3.dispatch] No application initialized, unable to dispatch events."
    );
  }
  return store.dispatch(event, data);
};

h3.redraw = () => {
  if (!router || !router.redraw) {
    throw new Error(
      "[h3.redraw] No application initialized, unable to update."
    );
  }
  router.redraw();
};

export default h3;
