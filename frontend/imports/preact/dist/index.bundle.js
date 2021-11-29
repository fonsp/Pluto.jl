var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __reExport = (target, module, desc) => {
  if (module && typeof module === "object" || typeof module === "function") {
    for (let key of __getOwnPropNames(module))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module[key], enumerable: !(desc = __getOwnPropDesc(module, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module) => {
  return __reExport(__markAsModule(__defProp(module != null ? __create(__getProtoOf(module)) : {}, "default", module && module.__esModule && "default" in module ? { get: () => module.default, enumerable: true } : { value: module, enumerable: true })), module);
};

// node_modules/undom/dist/undom.js
var require_undom = __commonJS({
  "node_modules/undom/dist/undom.js"(exports, module) {
    (function(global, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.undom = factory();
    })(exports, function() {
      function assign(obj, props) {
        for (var i4 in props)
          obj[i4] = props[i4];
      }
      function toLower(str) {
        return String(str).toLowerCase();
      }
      function splice(arr, item, add, byValueOnly) {
        var i4 = arr ? findWhere(arr, item, true, byValueOnly) : -1;
        if (~i4)
          add ? arr.splice(i4, 0, add) : arr.splice(i4, 1);
        return i4;
      }
      function findWhere(arr, fn, returnIndex, byValueOnly) {
        var i4 = arr.length;
        while (i4--)
          if (typeof fn === "function" && !byValueOnly ? fn(arr[i4]) : arr[i4] === fn)
            break;
        return returnIndex ? i4 : arr[i4];
      }
      function createAttributeFilter(ns, name) {
        return function(o4) {
          return o4.ns === ns && toLower(o4.name) === toLower(name);
        };
      }
      function undom2() {
        function isElement(node) {
          return node.nodeType === 1;
        }
        var Node = function Node2(nodeType, nodeName) {
          this.nodeType = nodeType;
          this.nodeName = nodeName;
          this.childNodes = [];
        };
        var prototypeAccessors = { nextSibling: {}, previousSibling: {}, firstChild: {}, lastChild: {} };
        prototypeAccessors.nextSibling.get = function() {
          var p3 = this.parentNode;
          if (p3)
            return p3.childNodes[findWhere(p3.childNodes, this, true) + 1];
        };
        prototypeAccessors.previousSibling.get = function() {
          var p3 = this.parentNode;
          if (p3)
            return p3.childNodes[findWhere(p3.childNodes, this, true) - 1];
        };
        prototypeAccessors.firstChild.get = function() {
          return this.childNodes[0];
        };
        prototypeAccessors.lastChild.get = function() {
          return this.childNodes[this.childNodes.length - 1];
        };
        Node.prototype.appendChild = function appendChild(child) {
          this.insertBefore(child);
          return child;
        };
        Node.prototype.insertBefore = function insertBefore(child, ref) {
          child.remove();
          child.parentNode = this;
          !ref ? this.childNodes.push(child) : splice(this.childNodes, ref, child);
          return child;
        };
        Node.prototype.replaceChild = function replaceChild(child, ref) {
          if (ref.parentNode === this) {
            this.insertBefore(child, ref);
            ref.remove();
            return ref;
          }
        };
        Node.prototype.removeChild = function removeChild(child) {
          splice(this.childNodes, child);
          return child;
        };
        Node.prototype.remove = function remove() {
          if (this.parentNode)
            this.parentNode.removeChild(this);
        };
        Object.defineProperties(Node.prototype, prototypeAccessors);
        var Text = function(Node2) {
          function Text2(text) {
            Node2.call(this, 3, "#text");
            this.nodeValue = text;
          }
          if (Node2)
            Text2.__proto__ = Node2;
          Text2.prototype = Object.create(Node2 && Node2.prototype);
          Text2.prototype.constructor = Text2;
          var prototypeAccessors$1 = { textContent: {} };
          prototypeAccessors$1.textContent.set = function(text) {
            this.nodeValue = text;
          };
          prototypeAccessors$1.textContent.get = function() {
            return this.nodeValue;
          };
          Object.defineProperties(Text2.prototype, prototypeAccessors$1);
          return Text2;
        }(Node);
        var Element = function(Node2) {
          function Element2(nodeType, nodeName) {
            var this$1 = this;
            Node2.call(this, nodeType || 1, nodeName);
            this.attributes = [];
            this.__handlers = {};
            this.style = {};
            Object.defineProperty(this, "className", {
              set: function(val) {
                this$1.setAttribute("class", val);
              },
              get: function() {
                return this$1.getAttribute("class");
              }
            });
            Object.defineProperty(this.style, "cssText", {
              set: function(val) {
                this$1.setAttribute("style", val);
              },
              get: function() {
                return this$1.getAttribute("style");
              }
            });
          }
          if (Node2)
            Element2.__proto__ = Node2;
          Element2.prototype = Object.create(Node2 && Node2.prototype);
          Element2.prototype.constructor = Element2;
          var prototypeAccessors$2 = { children: {} };
          prototypeAccessors$2.children.get = function() {
            return this.childNodes.filter(isElement);
          };
          Element2.prototype.setAttribute = function setAttribute(key, value) {
            this.setAttributeNS(null, key, value);
          };
          Element2.prototype.getAttribute = function getAttribute(key) {
            return this.getAttributeNS(null, key);
          };
          Element2.prototype.removeAttribute = function removeAttribute(key) {
            this.removeAttributeNS(null, key);
          };
          Element2.prototype.setAttributeNS = function setAttributeNS(ns, name, value) {
            var attr = findWhere(this.attributes, createAttributeFilter(ns, name));
            if (!attr)
              this.attributes.push(attr = { ns, name });
            attr.value = String(value);
          };
          Element2.prototype.getAttributeNS = function getAttributeNS(ns, name) {
            var attr = findWhere(this.attributes, createAttributeFilter(ns, name));
            return attr && attr.value;
          };
          Element2.prototype.removeAttributeNS = function removeAttributeNS(ns, name) {
            splice(this.attributes, createAttributeFilter(ns, name));
          };
          Element2.prototype.addEventListener = function addEventListener(type, handler) {
            (this.__handlers[toLower(type)] || (this.__handlers[toLower(type)] = [])).push(handler);
          };
          Element2.prototype.removeEventListener = function removeEventListener(type, handler) {
            splice(this.__handlers[toLower(type)], handler, 0, true);
          };
          Element2.prototype.dispatchEvent = function dispatchEvent(event) {
            var t3 = event.target = this, c4 = event.cancelable, l4, i4;
            do {
              event.currentTarget = t3;
              l4 = t3.__handlers && t3.__handlers[toLower(event.type)];
              if (l4)
                for (i4 = l4.length; i4--; ) {
                  if ((l4[i4].call(t3, event) === false || event._end) && c4) {
                    event.defaultPrevented = true;
                  }
                }
            } while (event.bubbles && !(c4 && event._stop) && (t3 = t3.parentNode));
            return l4 != null;
          };
          Object.defineProperties(Element2.prototype, prototypeAccessors$2);
          return Element2;
        }(Node);
        var Document = function(Element2) {
          function Document2() {
            Element2.call(this, 9, "#document");
          }
          if (Element2)
            Document2.__proto__ = Element2;
          Document2.prototype = Object.create(Element2 && Element2.prototype);
          Document2.prototype.constructor = Document2;
          return Document2;
        }(Element);
        var Event = function Event2(type, opts) {
          this.type = type;
          this.bubbles = !!(opts && opts.bubbles);
          this.cancelable = !!(opts && opts.cancelable);
        };
        Event.prototype.stopPropagation = function stopPropagation() {
          this._stop = true;
        };
        Event.prototype.stopImmediatePropagation = function stopImmediatePropagation() {
          this._end = this._stop = true;
        };
        Event.prototype.preventDefault = function preventDefault() {
          this.defaultPrevented = true;
        };
        function createElement(type) {
          return new Element(null, String(type).toUpperCase());
        }
        function createElementNS(ns, type) {
          var element = createElement(type);
          element.namespace = ns;
          return element;
        }
        function createTextNode(text) {
          return new Text(text);
        }
        function createDocument() {
          var document2 = new Document();
          assign(document2, document2.defaultView = { document: document2, Document, Node, Text, Element, SVGElement: Element, Event });
          assign(document2, { createElement, createElementNS, createTextNode });
          document2.appendChild(document2.documentElement = createElement("html"));
          document2.documentElement.appendChild(document2.head = createElement("head"));
          document2.documentElement.appendChild(document2.body = createElement("body"));
          return document2;
        }
        return createDocument();
      }
      return undom2;
    });
  }
});

// node_modules/preact/dist/preact.module.js
var n;
var l;
var u;
var i;
var t;
var r;
var o;
var f;
var e = {};
var c = [];
var s = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
function a(n3, l4) {
  for (var u4 in l4)
    n3[u4] = l4[u4];
  return n3;
}
function h(n3) {
  var l4 = n3.parentNode;
  l4 && l4.removeChild(n3);
}
function v(l4, u4, i4) {
  var t3, r4, o4, f4 = {};
  for (o4 in u4)
    o4 == "key" ? t3 = u4[o4] : o4 == "ref" ? r4 = u4[o4] : f4[o4] = u4[o4];
  if (arguments.length > 2 && (f4.children = arguments.length > 3 ? n.call(arguments, 2) : i4), typeof l4 == "function" && l4.defaultProps != null)
    for (o4 in l4.defaultProps)
      f4[o4] === void 0 && (f4[o4] = l4.defaultProps[o4]);
  return y(l4, f4, t3, r4, null);
}
function y(n3, i4, t3, r4, o4) {
  var f4 = { type: n3, props: i4, key: t3, ref: r4, __k: null, __: null, __b: 0, __e: null, __d: void 0, __c: null, __h: null, constructor: void 0, __v: o4 == null ? ++u : o4 };
  return o4 == null && l.vnode != null && l.vnode(f4), f4;
}
function d(n3) {
  return n3.children;
}
function _(n3, l4) {
  this.props = n3, this.context = l4;
}
function k(n3, l4) {
  if (l4 == null)
    return n3.__ ? k(n3.__, n3.__.__k.indexOf(n3) + 1) : null;
  for (var u4; l4 < n3.__k.length; l4++)
    if ((u4 = n3.__k[l4]) != null && u4.__e != null)
      return u4.__e;
  return typeof n3.type == "function" ? k(n3) : null;
}
function b(n3) {
  var l4, u4;
  if ((n3 = n3.__) != null && n3.__c != null) {
    for (n3.__e = n3.__c.base = null, l4 = 0; l4 < n3.__k.length; l4++)
      if ((u4 = n3.__k[l4]) != null && u4.__e != null) {
        n3.__e = n3.__c.base = u4.__e;
        break;
      }
    return b(n3);
  }
}
function m(n3) {
  (!n3.__d && (n3.__d = true) && t.push(n3) && !g.__r++ || o !== l.debounceRendering) && ((o = l.debounceRendering) || r)(g);
}
function g() {
  for (var n3; g.__r = t.length; )
    n3 = t.sort(function(n4, l4) {
      return n4.__v.__b - l4.__v.__b;
    }), t = [], n3.some(function(n4) {
      var l4, u4, i4, t3, r4, o4;
      n4.__d && (r4 = (t3 = (l4 = n4).__v).__e, (o4 = l4.__P) && (u4 = [], (i4 = a({}, t3)).__v = t3.__v + 1, j(o4, t3, i4, l4.__n, o4.ownerSVGElement !== void 0, t3.__h != null ? [r4] : null, u4, r4 == null ? k(t3) : r4, t3.__h), z(u4, t3), t3.__e != r4 && b(t3)));
    });
}
function w(n3, l4, u4, i4, t3, r4, o4, f4, s4, a4) {
  var h4, v4, p3, _3, b3, m4, g4, w3 = i4 && i4.__k || c, A = w3.length;
  for (u4.__k = [], h4 = 0; h4 < l4.length; h4++)
    if ((_3 = u4.__k[h4] = (_3 = l4[h4]) == null || typeof _3 == "boolean" ? null : typeof _3 == "string" || typeof _3 == "number" || typeof _3 == "bigint" ? y(null, _3, null, null, _3) : Array.isArray(_3) ? y(d, { children: _3 }, null, null, null) : _3.__b > 0 ? y(_3.type, _3.props, _3.key, null, _3.__v) : _3) != null) {
      if (_3.__ = u4, _3.__b = u4.__b + 1, (p3 = w3[h4]) === null || p3 && _3.key == p3.key && _3.type === p3.type)
        w3[h4] = void 0;
      else
        for (v4 = 0; v4 < A; v4++) {
          if ((p3 = w3[v4]) && _3.key == p3.key && _3.type === p3.type) {
            w3[v4] = void 0;
            break;
          }
          p3 = null;
        }
      j(n3, _3, p3 = p3 || e, t3, r4, o4, f4, s4, a4), b3 = _3.__e, (v4 = _3.ref) && p3.ref != v4 && (g4 || (g4 = []), p3.ref && g4.push(p3.ref, null, _3), g4.push(v4, _3.__c || b3, _3)), b3 != null ? (m4 == null && (m4 = b3), typeof _3.type == "function" && _3.__k === p3.__k ? _3.__d = s4 = x(_3, s4, n3) : s4 = P(n3, _3, p3, w3, b3, s4), typeof u4.type == "function" && (u4.__d = s4)) : s4 && p3.__e == s4 && s4.parentNode != n3 && (s4 = k(p3));
    }
  for (u4.__e = m4, h4 = A; h4--; )
    w3[h4] != null && (typeof u4.type == "function" && w3[h4].__e != null && w3[h4].__e == u4.__d && (u4.__d = k(i4, h4 + 1)), N(w3[h4], w3[h4]));
  if (g4)
    for (h4 = 0; h4 < g4.length; h4++)
      M(g4[h4], g4[++h4], g4[++h4]);
}
function x(n3, l4, u4) {
  for (var i4, t3 = n3.__k, r4 = 0; t3 && r4 < t3.length; r4++)
    (i4 = t3[r4]) && (i4.__ = n3, l4 = typeof i4.type == "function" ? x(i4, l4, u4) : P(u4, i4, i4, t3, i4.__e, l4));
  return l4;
}
function P(n3, l4, u4, i4, t3, r4) {
  var o4, f4, e3;
  if (l4.__d !== void 0)
    o4 = l4.__d, l4.__d = void 0;
  else if (u4 == null || t3 != r4 || t3.parentNode == null)
    n:
      if (r4 == null || r4.parentNode !== n3)
        n3.appendChild(t3), o4 = null;
      else {
        for (f4 = r4, e3 = 0; (f4 = f4.nextSibling) && e3 < i4.length; e3 += 2)
          if (f4 == t3)
            break n;
        n3.insertBefore(t3, r4), o4 = r4;
      }
  return o4 !== void 0 ? o4 : t3.nextSibling;
}
function C(n3, l4, u4, i4, t3) {
  var r4;
  for (r4 in u4)
    r4 === "children" || r4 === "key" || r4 in l4 || H(n3, r4, null, u4[r4], i4);
  for (r4 in l4)
    t3 && typeof l4[r4] != "function" || r4 === "children" || r4 === "key" || r4 === "value" || r4 === "checked" || u4[r4] === l4[r4] || H(n3, r4, l4[r4], u4[r4], i4);
}
function $(n3, l4, u4) {
  l4[0] === "-" ? n3.setProperty(l4, u4) : n3[l4] = u4 == null ? "" : typeof u4 != "number" || s.test(l4) ? u4 : u4 + "px";
}
function H(n3, l4, u4, i4, t3) {
  var r4;
  n:
    if (l4 === "style")
      if (typeof u4 == "string")
        n3.style.cssText = u4;
      else {
        if (typeof i4 == "string" && (n3.style.cssText = i4 = ""), i4)
          for (l4 in i4)
            u4 && l4 in u4 || $(n3.style, l4, "");
        if (u4)
          for (l4 in u4)
            i4 && u4[l4] === i4[l4] || $(n3.style, l4, u4[l4]);
      }
    else if (l4[0] === "o" && l4[1] === "n")
      r4 = l4 !== (l4 = l4.replace(/Capture$/, "")), l4 = l4.toLowerCase() in n3 ? l4.toLowerCase().slice(2) : l4.slice(2), n3.l || (n3.l = {}), n3.l[l4 + r4] = u4, u4 ? i4 || n3.addEventListener(l4, r4 ? T : I, r4) : n3.removeEventListener(l4, r4 ? T : I, r4);
    else if (l4 !== "dangerouslySetInnerHTML") {
      if (t3)
        l4 = l4.replace(/xlink[H:h]/, "h").replace(/sName$/, "s");
      else if (l4 !== "href" && l4 !== "list" && l4 !== "form" && l4 !== "tabIndex" && l4 !== "download" && l4 in n3)
        try {
          n3[l4] = u4 == null ? "" : u4;
          break n;
        } catch (n4) {
        }
      typeof u4 == "function" || (u4 != null && (u4 !== false || l4[0] === "a" && l4[1] === "r") ? n3.setAttribute(l4, u4) : n3.removeAttribute(l4));
    }
}
function I(n3) {
  this.l[n3.type + false](l.event ? l.event(n3) : n3);
}
function T(n3) {
  this.l[n3.type + true](l.event ? l.event(n3) : n3);
}
function j(n3, u4, i4, t3, r4, o4, f4, e3, c4) {
  var s4, h4, v4, y3, p3, k3, b3, m4, g4, x4, A, P2 = u4.type;
  if (u4.constructor !== void 0)
    return null;
  i4.__h != null && (c4 = i4.__h, e3 = u4.__e = i4.__e, u4.__h = null, o4 = [e3]), (s4 = l.__b) && s4(u4);
  try {
    n:
      if (typeof P2 == "function") {
        if (m4 = u4.props, g4 = (s4 = P2.contextType) && t3[s4.__c], x4 = s4 ? g4 ? g4.props.value : s4.__ : t3, i4.__c ? b3 = (h4 = u4.__c = i4.__c).__ = h4.__E : ("prototype" in P2 && P2.prototype.render ? u4.__c = h4 = new P2(m4, x4) : (u4.__c = h4 = new _(m4, x4), h4.constructor = P2, h4.render = O), g4 && g4.sub(h4), h4.props = m4, h4.state || (h4.state = {}), h4.context = x4, h4.__n = t3, v4 = h4.__d = true, h4.__h = []), h4.__s == null && (h4.__s = h4.state), P2.getDerivedStateFromProps != null && (h4.__s == h4.state && (h4.__s = a({}, h4.__s)), a(h4.__s, P2.getDerivedStateFromProps(m4, h4.__s))), y3 = h4.props, p3 = h4.state, v4)
          P2.getDerivedStateFromProps == null && h4.componentWillMount != null && h4.componentWillMount(), h4.componentDidMount != null && h4.__h.push(h4.componentDidMount);
        else {
          if (P2.getDerivedStateFromProps == null && m4 !== y3 && h4.componentWillReceiveProps != null && h4.componentWillReceiveProps(m4, x4), !h4.__e && h4.shouldComponentUpdate != null && h4.shouldComponentUpdate(m4, h4.__s, x4) === false || u4.__v === i4.__v) {
            h4.props = m4, h4.state = h4.__s, u4.__v !== i4.__v && (h4.__d = false), h4.__v = u4, u4.__e = i4.__e, u4.__k = i4.__k, u4.__k.forEach(function(n4) {
              n4 && (n4.__ = u4);
            }), h4.__h.length && f4.push(h4);
            break n;
          }
          h4.componentWillUpdate != null && h4.componentWillUpdate(m4, h4.__s, x4), h4.componentDidUpdate != null && h4.__h.push(function() {
            h4.componentDidUpdate(y3, p3, k3);
          });
        }
        h4.context = x4, h4.props = m4, h4.state = h4.__s, (s4 = l.__r) && s4(u4), h4.__d = false, h4.__v = u4, h4.__P = n3, s4 = h4.render(h4.props, h4.state, h4.context), h4.state = h4.__s, h4.getChildContext != null && (t3 = a(a({}, t3), h4.getChildContext())), v4 || h4.getSnapshotBeforeUpdate == null || (k3 = h4.getSnapshotBeforeUpdate(y3, p3)), A = s4 != null && s4.type === d && s4.key == null ? s4.props.children : s4, w(n3, Array.isArray(A) ? A : [A], u4, i4, t3, r4, o4, f4, e3, c4), h4.base = u4.__e, u4.__h = null, h4.__h.length && f4.push(h4), b3 && (h4.__E = h4.__ = null), h4.__e = false;
      } else
        o4 == null && u4.__v === i4.__v ? (u4.__k = i4.__k, u4.__e = i4.__e) : u4.__e = L(i4.__e, u4, i4, t3, r4, o4, f4, c4);
    (s4 = l.diffed) && s4(u4);
  } catch (n4) {
    u4.__v = null, (c4 || o4 != null) && (u4.__e = e3, u4.__h = !!c4, o4[o4.indexOf(e3)] = null), l.__e(n4, u4, i4);
  }
}
function z(n3, u4) {
  l.__c && l.__c(u4, n3), n3.some(function(u5) {
    try {
      n3 = u5.__h, u5.__h = [], n3.some(function(n4) {
        n4.call(u5);
      });
    } catch (n4) {
      l.__e(n4, u5.__v);
    }
  });
}
function L(l4, u4, i4, t3, r4, o4, f4, c4) {
  var s4, a4, v4, y3 = i4.props, p3 = u4.props, d4 = u4.type, _3 = 0;
  if (d4 === "svg" && (r4 = true), o4 != null) {
    for (; _3 < o4.length; _3++)
      if ((s4 = o4[_3]) && "setAttribute" in s4 == !!d4 && (d4 ? s4.localName === d4 : s4.nodeType === 3)) {
        l4 = s4, o4[_3] = null;
        break;
      }
  }
  if (l4 == null) {
    if (d4 === null)
      return document.createTextNode(p3);
    l4 = r4 ? document.createElementNS("http://www.w3.org/2000/svg", d4) : document.createElement(d4, p3.is && p3), o4 = null, c4 = false;
  }
  if (d4 === null)
    y3 === p3 || c4 && l4.data === p3 || (l4.data = p3);
  else {
    if (o4 = o4 && n.call(l4.childNodes), a4 = (y3 = i4.props || e).dangerouslySetInnerHTML, v4 = p3.dangerouslySetInnerHTML, !c4) {
      if (o4 != null)
        for (y3 = {}, _3 = 0; _3 < l4.attributes.length; _3++)
          y3[l4.attributes[_3].name] = l4.attributes[_3].value;
      (v4 || a4) && (v4 && (a4 && v4.__html == a4.__html || v4.__html === l4.innerHTML) || (l4.innerHTML = v4 && v4.__html || ""));
    }
    if (C(l4, p3, y3, r4, c4), v4)
      u4.__k = [];
    else if (_3 = u4.props.children, w(l4, Array.isArray(_3) ? _3 : [_3], u4, i4, t3, r4 && d4 !== "foreignObject", o4, f4, o4 ? o4[0] : i4.__k && k(i4, 0), c4), o4 != null)
      for (_3 = o4.length; _3--; )
        o4[_3] != null && h(o4[_3]);
    c4 || ("value" in p3 && (_3 = p3.value) !== void 0 && (_3 !== y3.value || _3 !== l4.value || d4 === "progress" && !_3) && H(l4, "value", _3, y3.value, false), "checked" in p3 && (_3 = p3.checked) !== void 0 && _3 !== l4.checked && H(l4, "checked", _3, y3.checked, false));
  }
  return l4;
}
function M(n3, u4, i4) {
  try {
    typeof n3 == "function" ? n3(u4) : n3.current = u4;
  } catch (n4) {
    l.__e(n4, i4);
  }
}
function N(n3, u4, i4) {
  var t3, r4;
  if (l.unmount && l.unmount(n3), (t3 = n3.ref) && (t3.current && t3.current !== n3.__e || M(t3, null, u4)), (t3 = n3.__c) != null) {
    if (t3.componentWillUnmount)
      try {
        t3.componentWillUnmount();
      } catch (n4) {
        l.__e(n4, u4);
      }
    t3.base = t3.__P = null;
  }
  if (t3 = n3.__k)
    for (r4 = 0; r4 < t3.length; r4++)
      t3[r4] && N(t3[r4], u4, typeof n3.type != "function");
  i4 || n3.__e == null || h(n3.__e), n3.__e = n3.__d = void 0;
}
function O(n3, l4, u4) {
  return this.constructor(n3, u4);
}
function S(u4, i4, t3) {
  var r4, o4, f4;
  l.__ && l.__(u4, i4), o4 = (r4 = typeof t3 == "function") ? null : t3 && t3.__k || i4.__k, f4 = [], j(i4, u4 = (!r4 && t3 || i4).__k = v(d, null, [u4]), o4 || e, e, i4.ownerSVGElement !== void 0, !r4 && t3 ? [t3] : o4 ? null : i4.firstChild ? n.call(i4.childNodes) : null, f4, !r4 && t3 ? t3 : o4 ? o4.__e : i4.firstChild, r4), z(f4, u4);
}
function q(n3, l4) {
  S(n3, l4, q);
}
function B(l4, u4, i4) {
  var t3, r4, o4, f4 = a({}, l4.props);
  for (o4 in u4)
    o4 == "key" ? t3 = u4[o4] : o4 == "ref" ? r4 = u4[o4] : f4[o4] = u4[o4];
  return arguments.length > 2 && (f4.children = arguments.length > 3 ? n.call(arguments, 2) : i4), y(l4.type, f4, t3 || l4.key, r4 || l4.ref, null);
}
function D(n3, l4) {
  var u4 = { __c: l4 = "__cC" + f++, __: n3, Consumer: function(n4, l5) {
    return n4.children(l5);
  }, Provider: function(n4) {
    var u5, i4;
    return this.getChildContext || (u5 = [], (i4 = {})[l4] = this, this.getChildContext = function() {
      return i4;
    }, this.shouldComponentUpdate = function(n5) {
      this.props.value !== n5.value && u5.some(m);
    }, this.sub = function(n5) {
      u5.push(n5);
      var l5 = n5.componentWillUnmount;
      n5.componentWillUnmount = function() {
        u5.splice(u5.indexOf(n5), 1), l5 && l5.call(n5);
      };
    }), n4.children;
  } };
  return u4.Provider.__ = u4.Consumer.contextType = u4;
}
n = c.slice, l = { __e: function(n3, l4) {
  for (var u4, i4, t3; l4 = l4.__; )
    if ((u4 = l4.__c) && !u4.__)
      try {
        if ((i4 = u4.constructor) && i4.getDerivedStateFromError != null && (u4.setState(i4.getDerivedStateFromError(n3)), t3 = u4.__d), u4.componentDidCatch != null && (u4.componentDidCatch(n3), t3 = u4.__d), t3)
          return u4.__E = u4;
      } catch (l5) {
        n3 = l5;
      }
  throw n3;
} }, u = 0, i = function(n3) {
  return n3 != null && n3.constructor === void 0;
}, _.prototype.setState = function(n3, l4) {
  var u4;
  u4 = this.__s != null && this.__s !== this.state ? this.__s : this.__s = a({}, this.state), typeof n3 == "function" && (n3 = n3(a({}, u4), this.props)), n3 && a(u4, n3), n3 != null && this.__v && (l4 && this.__h.push(l4), m(this));
}, _.prototype.forceUpdate = function(n3) {
  this.__v && (this.__e = true, n3 && this.__h.push(n3), m(this));
}, _.prototype.render = d, t = [], r = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, g.__r = 0, f = 0;

// node_modules/preact/hooks/dist/hooks.module.js
var t2;
var u2;
var r2;
var o2 = 0;
var i2 = [];
var c2 = l.__b;
var f2 = l.__r;
var e2 = l.diffed;
var a2 = l.__c;
var v2 = l.unmount;
function m2(t3, r4) {
  l.__h && l.__h(u2, t3, o2 || r4), o2 = 0;
  var i4 = u2.__H || (u2.__H = { __: [], __h: [] });
  return t3 >= i4.__.length && i4.__.push({}), i4.__[t3];
}
function l2(n3) {
  return o2 = 1, p(w2, n3);
}
function p(n3, r4, o4) {
  var i4 = m2(t2++, 2);
  return i4.t = n3, i4.__c || (i4.__ = [o4 ? o4(r4) : w2(void 0, r4), function(n4) {
    var t3 = i4.t(i4.__[0], n4);
    i4.__[0] !== t3 && (i4.__ = [t3, i4.__[1]], i4.__c.setState({}));
  }], i4.__c = u2), i4.__;
}
function y2(r4, o4) {
  var i4 = m2(t2++, 3);
  !l.__s && k2(i4.__H, o4) && (i4.__ = r4, i4.__H = o4, u2.__H.__h.push(i4));
}
function h2(r4, o4) {
  var i4 = m2(t2++, 4);
  !l.__s && k2(i4.__H, o4) && (i4.__ = r4, i4.__H = o4, u2.__h.push(i4));
}
function s2(n3) {
  return o2 = 5, d2(function() {
    return { current: n3 };
  }, []);
}
function d2(n3, u4) {
  var r4 = m2(t2++, 7);
  return k2(r4.__H, u4) && (r4.__ = n3(), r4.__H = u4, r4.__h = n3), r4.__;
}
function F(n3) {
  var r4 = u2.context[n3.__c], o4 = m2(t2++, 9);
  return o4.c = n3, r4 ? (o4.__ == null && (o4.__ = true, r4.sub(u2)), r4.props.value) : n3.__;
}
function x2() {
  i2.forEach(function(t3) {
    if (t3.__P)
      try {
        t3.__H.__h.forEach(g2), t3.__H.__h.forEach(j2), t3.__H.__h = [];
      } catch (u4) {
        t3.__H.__h = [], l.__e(u4, t3.__v);
      }
  }), i2 = [];
}
l.__b = function(n3) {
  u2 = null, c2 && c2(n3);
}, l.__r = function(n3) {
  f2 && f2(n3), t2 = 0;
  var r4 = (u2 = n3.__c).__H;
  r4 && (r4.__h.forEach(g2), r4.__h.forEach(j2), r4.__h = []);
}, l.diffed = function(t3) {
  e2 && e2(t3);
  var o4 = t3.__c;
  o4 && o4.__H && o4.__H.__h.length && (i2.push(o4) !== 1 && r2 === l.requestAnimationFrame || ((r2 = l.requestAnimationFrame) || function(n3) {
    var t4, u4 = function() {
      clearTimeout(r4), b2 && cancelAnimationFrame(t4), setTimeout(n3);
    }, r4 = setTimeout(u4, 100);
    b2 && (t4 = requestAnimationFrame(u4));
  })(x2)), u2 = null;
}, l.__c = function(t3, u4) {
  u4.some(function(t4) {
    try {
      t4.__h.forEach(g2), t4.__h = t4.__h.filter(function(n3) {
        return !n3.__ || j2(n3);
      });
    } catch (r4) {
      u4.some(function(n3) {
        n3.__h && (n3.__h = []);
      }), u4 = [], l.__e(r4, t4.__v);
    }
  }), a2 && a2(t3, u4);
}, l.unmount = function(t3) {
  v2 && v2(t3);
  var u4, r4 = t3.__c;
  r4 && r4.__H && (r4.__H.__.forEach(function(n3) {
    try {
      g2(n3);
    } catch (n4) {
      u4 = n4;
    }
  }), u4 && l.__e(u4, r4.__v));
};
var b2 = typeof requestAnimationFrame == "function";
function g2(n3) {
  var t3 = u2, r4 = n3.__c;
  typeof r4 == "function" && (n3.__c = void 0, r4()), u2 = t3;
}
function j2(n3) {
  var t3 = u2;
  n3.__c = n3.__(), u2 = t3;
}
function k2(n3, t3) {
  return !n3 || n3.length !== t3.length || t3.some(function(t4, u4) {
    return t4 !== n3[u4];
  });
}
function w2(n3, t3) {
  return typeof t3 == "function" ? t3(n3) : t3;
}

// node_modules/preact-render-to-string/dist/index.mjs
var r3 = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|^--/i;
var n2 = /[&<>"]/;
function o3(e3) {
  var t3 = String(e3);
  return n2.test(t3) ? t3.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : t3;
}
var a3 = function(e3, t3) {
  return String(e3).replace(/(\n+)/g, "$1" + (t3 || "	"));
};
var i3 = function(e3, t3, r4) {
  return String(e3).length > (t3 || 40) || !r4 && String(e3).indexOf("\n") !== -1 || String(e3).indexOf("<") !== -1;
};
var l3 = {};
function s3(e3) {
  var t3 = "";
  for (var n3 in e3) {
    var o4 = e3[n3];
    o4 != null && o4 !== "" && (t3 && (t3 += " "), t3 += n3[0] == "-" ? n3 : l3[n3] || (l3[n3] = n3.replace(/([A-Z])/g, "-$1").toLowerCase()), t3 += ": ", t3 += o4, typeof o4 == "number" && r3.test(n3) === false && (t3 += "px"), t3 += ";");
  }
  return t3 || void 0;
}
function f3(e3, t3) {
  for (var r4 in t3)
    e3[r4] = t3[r4];
  return e3;
}
function u3(e3, t3) {
  return Array.isArray(t3) ? t3.reduce(u3, e3) : t3 != null && t3 !== false && e3.push(t3), e3;
}
var c3 = { shallow: true };
var p2 = [];
var _2 = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;
var v3 = /[\s\n\\/='"\0<>]/;
var d3 = function() {
};
m3.render = m3;
var g3 = function(e3, t3) {
  return m3(e3, t3, c3);
};
var h3 = [];
function m3(t3, r4, n3) {
  r4 = r4 || {}, n3 = n3 || {};
  var o4 = l.__s;
  l.__s = true;
  var a4 = x3(t3, r4, n3);
  return l.__c && l.__c(t3, h3), h3.length = 0, l.__s = o4, a4;
}
function x3(r4, n3, l4, c4, g4, h4) {
  if (r4 == null || typeof r4 == "boolean")
    return "";
  if (typeof r4 != "object")
    return o3(r4);
  var m4 = l4.pretty, y3 = m4 && typeof m4 == "string" ? m4 : "	";
  if (Array.isArray(r4)) {
    for (var b3 = "", S2 = 0; S2 < r4.length; S2++)
      m4 && S2 > 0 && (b3 += "\n"), b3 += x3(r4[S2], n3, l4, c4, g4, h4);
    return b3;
  }
  var w3, k3 = r4.type, O2 = r4.props, C2 = false;
  if (typeof k3 == "function") {
    if (C2 = true, !l4.shallow || !c4 && l4.renderRootComponent !== false) {
      if (k3 === d) {
        var A = [];
        return u3(A, r4.props.children), x3(A, n3, l4, l4.shallowHighOrder !== false, g4, h4);
      }
      var H2, j3 = r4.__c = { __v: r4, context: n3, props: r4.props, setState: d3, forceUpdate: d3, __h: [] };
      if (l.__b && l.__b(r4), l.__r && l.__r(r4), k3.prototype && typeof k3.prototype.render == "function") {
        var F2 = k3.contextType, M2 = F2 && n3[F2.__c], T2 = F2 != null ? M2 ? M2.props.value : F2.__ : n3;
        (j3 = r4.__c = new k3(O2, T2)).__v = r4, j3._dirty = j3.__d = true, j3.props = O2, j3.state == null && (j3.state = {}), j3._nextState == null && j3.__s == null && (j3._nextState = j3.__s = j3.state), j3.context = T2, k3.getDerivedStateFromProps ? j3.state = f3(f3({}, j3.state), k3.getDerivedStateFromProps(j3.props, j3.state)) : j3.componentWillMount && (j3.componentWillMount(), j3.state = j3._nextState !== j3.state ? j3._nextState : j3.__s !== j3.state ? j3.__s : j3.state), H2 = j3.render(j3.props, j3.state, j3.context);
      } else {
        var $2 = k3.contextType, L2 = $2 && n3[$2.__c];
        H2 = k3.call(r4.__c, O2, $2 != null ? L2 ? L2.props.value : $2.__ : n3);
      }
      return j3.getChildContext && (n3 = f3(f3({}, n3), j3.getChildContext())), l.diffed && l.diffed(r4), x3(H2, n3, l4, l4.shallowHighOrder !== false, g4, h4);
    }
    k3 = (w3 = k3).displayName || w3 !== Function && w3.name || function(e3) {
      var t3 = (Function.prototype.toString.call(e3).match(/^\s*function\s+([^( ]+)/) || "")[1];
      if (!t3) {
        for (var r5 = -1, n4 = p2.length; n4--; )
          if (p2[n4] === e3) {
            r5 = n4;
            break;
          }
        r5 < 0 && (r5 = p2.push(e3) - 1), t3 = "UnnamedComponent" + r5;
      }
      return t3;
    }(w3);
  }
  var E, D2, N2 = "<" + k3;
  if (O2) {
    var P2 = Object.keys(O2);
    l4 && l4.sortAttributes === true && P2.sort();
    for (var R = 0; R < P2.length; R++) {
      var U = P2[R], W = O2[U];
      if (U !== "children") {
        if (!v3.test(U) && (l4 && l4.allAttributes || U !== "key" && U !== "ref" && U !== "__self" && U !== "__source" && U !== "defaultValue")) {
          if (U === "className") {
            if (O2.class)
              continue;
            U = "class";
          } else
            g4 && U.match(/^xlink:?./) && (U = U.toLowerCase().replace(/^xlink:?/, "xlink:"));
          if (U === "htmlFor") {
            if (O2.for)
              continue;
            U = "for";
          }
          U === "style" && W && typeof W == "object" && (W = s3(W)), U[0] === "a" && U[1] === "r" && typeof W == "boolean" && (W = String(W));
          var q2 = l4.attributeHook && l4.attributeHook(U, W, n3, l4, C2);
          if (q2 || q2 === "")
            N2 += q2;
          else if (U === "dangerouslySetInnerHTML")
            D2 = W && W.__html;
          else if (k3 === "textarea" && U === "value")
            E = W;
          else if ((W || W === 0 || W === "") && typeof W != "function") {
            if (!(W !== true && W !== "" || (W = U, l4 && l4.xml))) {
              N2 += " " + U;
              continue;
            }
            if (U === "value") {
              if (k3 === "select") {
                h4 = W;
                continue;
              }
              k3 === "option" && h4 == W && (N2 += " selected");
            }
            N2 += " " + U + '="' + o3(W) + '"';
          }
        }
      } else
        E = W;
    }
  }
  if (m4) {
    var z2 = N2.replace(/\n\s*/, " ");
    z2 === N2 || ~z2.indexOf("\n") ? m4 && ~N2.indexOf("\n") && (N2 += "\n") : N2 = z2;
  }
  if (N2 += ">", v3.test(k3))
    throw new Error(k3 + " is not a valid HTML tag name in " + N2);
  var I2, V = _2.test(k3) || l4.voidElements && l4.voidElements.test(k3), Z = [];
  if (D2)
    m4 && i3(D2) && (D2 = "\n" + y3 + a3(D2, y3)), N2 += D2;
  else if (E != null && u3(I2 = [], E).length) {
    for (var B2 = m4 && ~N2.indexOf("\n"), G = false, J = 0; J < I2.length; J++) {
      var K = I2[J];
      if (K != null && K !== false) {
        var Q = x3(K, n3, l4, true, k3 === "svg" || k3 !== "foreignObject" && g4, h4);
        if (m4 && !B2 && i3(Q) && (B2 = true), Q)
          if (m4) {
            var X = Q.length > 0 && Q[0] != "<";
            G && X ? Z[Z.length - 1] += Q : Z.push(Q), G = X;
          } else
            Z.push(Q);
      }
    }
    if (m4 && B2)
      for (var Y = Z.length; Y--; )
        Z[Y] = "\n" + y3 + a3(Z[Y], y3);
  }
  if (Z.length || D2)
    N2 += Z.join("");
  else if (l4 && l4.xml)
    return N2.substring(0, N2.length - 1) + " />";
  return !V || I2 || D2 ? (m4 && ~N2.indexOf("\n") && (N2 += "\n"), N2 += "</" + k3 + ">") : N2 = N2.replace(/>$/, " />"), N2;
}
m3.shallowRender = g3;

// index.js
var import_undom = __toModule(require_undom());
import htm from "https://esm.sh/htm@3.0.4?target=es2020";
var html = htm.bind(v);
var doc;
function createUndomRenderer() {
  if (!doc) {
    doc = (0, import_undom.default)();
    Object.assign(window, doc.defaultView);
  }
  var root, parent = doc.createElement("x-root");
  doc.body.appendChild(parent);
  return {
    render: function(jsx) {
      root = S(jsx, parent, root);
      return this;
    },
    html: function() {
      return serializeHtml(parent);
    }
  };
}
function serializeHtml(el) {
  if (el.nodeType === 3)
    return esc(el.nodeValue);
  var name = String(el.nodeName).toLowerCase(), str = "<" + name, hasClass = false, c4, i4;
  for (i4 = 0; i4 < el.attributes.length; i4++) {
    let name2 = el.attributes[i4].name;
    if (name2 === "class")
      hasClass = true;
    str += " " + name2 + '="' + esc(el.attributes[i4].value) + '"';
  }
  if (el.className && !hasClass)
    str += ' class="' + el.className + '"';
  str += ">";
  for (i4 = 0; i4 < el.childNodes.length; i4++) {
    c4 = serializeHtml(el.childNodes[i4]);
    if (c4)
      str += c4;
  }
  return str + "</" + name + ">";
}
function esc(str) {
  return String(str).replace(/[&<>"']/g, escMap);
}
function escMap(s4) {
  return "&" + map[s4] + ";";
}
var map = { "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "apos" };
export {
  _ as Component,
  B as cloneElement,
  D as createContext,
  createUndomRenderer,
  v as h,
  html,
  q as hydrate,
  S as render,
  m3 as render_html,
  F as useContext,
  y2 as useEffect,
  h2 as useLayoutEffect,
  d2 as useMemo,
  s2 as useRef,
  l2 as useState
};
