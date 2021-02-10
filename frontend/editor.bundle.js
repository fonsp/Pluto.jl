var e6, n5, t, _3, o2, r, u4, l4 = {
}, i7 = [], c6 = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
function s1(e1, n1) {
    for(var t1 in n1)e1[t1] = n1[t1];
    return e1;
}
function f2(e1) {
    var n1 = e1.parentNode;
    n1 && n1.removeChild(e1);
}
function a2(e1, n1, t1) {
    var _1, o1 = arguments, r1 = {
    };
    for(_1 in n1)"key" !== _1 && "ref" !== _1 && (r1[_1] = n1[_1]);
    if (arguments.length > 3) for(t1 = [
        t1
    ], _1 = 3; _1 < arguments.length; _1++)t1.push(o1[_1]);
    if (null != t1 && (r1.children = t1), "function" == typeof e1 && null != e1.defaultProps) for(_1 in e1.defaultProps)(void 0) === r1[_1] && (r1[_1] = e1.defaultProps[_1]);
    return p4(e1, r1, n1 && n1.key, n1 && n1.ref, null);
}
function p4(n1, t1, _1, o1, r1) {
    var u1 = {
        type: n1,
        props: t1,
        key: _1,
        ref: o1,
        __k: null,
        __: null,
        __b: 0,
        __e: null,
        __d: void 0,
        __c: null,
        constructor: void 0,
        __v: r1
    };
    return null == r1 && (u1.__v = u1), e6.vnode && e6.vnode(u1), u1;
}
function h1(e1) {
    return e1.children;
}
function d4(e1, n1) {
    this.props = e1, this.context = n1;
}
function v1(e1, n1) {
    if (null == n1) return e1.__ ? v1(e1.__, e1.__.__k.indexOf(e1) + 1) : null;
    for(var t1; n1 < e1.__k.length; n1++)if (null != (t1 = e1.__k[n1]) && null != t1.__e) return t1.__e;
    return "function" == typeof e1.type ? v1(e1) : null;
}
function m2(e1) {
    var n1, t1;
    if (null != (e1 = e1.__) && null != e1.__c) {
        for(e1.__e = e1.__c.base = null, n1 = 0; n1 < e1.__k.length; n1++)if (null != (t1 = e1.__k[n1]) && null != t1.__e) {
            e1.__e = e1.__c.base = t1.__e;
            break;
        }
        return m2(e1);
    }
}
function y1(r1) {
    (!r1.__d && (r1.__d = !0) && n5.push(r1) && !t++ || o2 !== e6.debounceRendering) && ((o2 = e6.debounceRendering) || _3)(g2);
}
function g2() {
    for(var e1; t = n5.length;)e1 = n5.sort(function(e2, n1) {
        return e2.__v.__b - n1.__v.__b;
    }), n5 = [], e1.some(function(e2) {
        var n1, t1, _1, o1, r1, u1, l1;
        e2.__d && (u1 = (r1 = (n1 = e2).__v).__e, (l1 = n1.__P) && (t1 = [], (_1 = s1({
        }, r1)).__v = _1, o1 = H1(l1, r1, _1, n1.__n, (void 0) !== l1.ownerSVGElement, null, t1, null == u1 ? v1(r1) : u1), S1(t1, r1), o1 != u1 && m2(r1)));
    });
}
function k2(e1, n1, t1, _1, o1, r1, u1, c1, s1) {
    var a1, p1, h1, d1, m1, y1, g1, k2 = t1 && t1.__k || i7, x = k2.length;
    if (c1 == l4 && (c1 = null != r1 ? r1[0] : x ? v1(t1, 0) : null), a1 = 0, n1.__k = b2(n1.__k, function(t2) {
        if (null != t2) {
            if ((t2.__ = n1, t2.__b = n1.__b + 1, null === (h1 = k2[a1]) || h1 && t2.key == h1.key && t2.type === h1.type)) k2[a1] = void 0;
            else for(p1 = 0; p1 < x; p1++){
                if ((h1 = k2[p1]) && t2.key == h1.key && t2.type === h1.type) {
                    k2[p1] = void 0;
                    break;
                }
                h1 = null;
            }
            if ((d1 = H1(e1, t2, h1 = h1 || l4, _1, o1, r1, u1, c1, s1), (p1 = t2.ref) && h1.ref != p1 && (g1 || (g1 = []), h1.ref && g1.push(h1.ref, null, t2), g1.push(p1, t2.__c || d1, t2)), null != d1)) {
                var i1;
                if ((null == y1 && (y1 = d1), (void 0) !== t2.__d)) i1 = t2.__d, t2.__d = void 0;
                else if (r1 == h1 || d1 != c1 || null == d1.parentNode) {
                    e: if (null == c1 || c1.parentNode !== e1) e1.appendChild(d1), i1 = null;
                    else {
                        for((m1 = c1, p1 = 0); (m1 = m1.nextSibling) && p1 < x; p1 += 2)if (m1 == d1) break e;
                        e1.insertBefore(d1, c1), i1 = c1;
                    }
                    "option" == n1.type && (e1.value = "");
                }
                c1 = (void 0) !== i1 ? i1 : d1.nextSibling, "function" == typeof n1.type && (n1.__d = c1);
            } else c1 && h1.__e == c1 && c1.parentNode != e1 && (c1 = v1(h1));
        }
        return (a1++, t2);
    }), n1.__e = y1, null != r1 && "function" != typeof n1.type) for(a1 = r1.length; a1--;)null != r1[a1] && f2(r1[a1]);
    for(a1 = x; a1--;)null != k2[a1] && D2(k2[a1], k2[a1]);
    if (g1) for(a1 = 0; a1 < g1.length; a1++)P2(g1[a1], g1[++a1], g1[++a1]);
}
function b2(e1, n1, t1) {
    if (null == t1 && (t1 = []), null == e1 || "boolean" == typeof e1) n1 && t1.push(n1(null));
    else if (Array.isArray(e1)) for(var _1 = 0; _1 < e1.length; _1++)b2(e1[_1], n1, t1);
    else t1.push(n1 ? n1("string" == typeof e1 || "number" == typeof e1 ? p4(null, e1, null, null, e1) : null != e1.__e || null != e1.__c ? p4(e1.type, e1.props, e1.key, null, e1.__v) : e1) : e1);
    return t1;
}
function x1(e1, n1, t1) {
    "-" === n1[0] ? e1.setProperty(n1, t1) : e1[n1] = "number" == typeof t1 && !1 === c6.test(n1) ? t1 + "px" : null == t1 ? "" : t1;
}
function w2(e1, n1, t1, _1, o1) {
    var r1, u1, l1, i2, c1;
    if (o1 ? "className" === n1 && (n1 = "class") : "class" === n1 && (n1 = "className"), "style" === n1) {
        if (r1 = e1.style, "string" == typeof t1) r1.cssText = t1;
        else {
            if ("string" == typeof _1 && (r1.cssText = "", _1 = null), _1) for(i2 in _1)t1 && i2 in t1 || x1(r1, i2, "");
            if (t1) for(c1 in t1)_1 && t1[c1] === _1[c1] || x1(r1, c1, t1[c1]);
        }
    } else "o" === n1[0] && "n" === n1[1] ? (u1 = n1 !== (n1 = n1.replace(/Capture$/, "")), l1 = n1.toLowerCase(), n1 = (l1 in e1 ? l1 : n1).slice(2), t1 ? (_1 || e1.addEventListener(n1, C2, u1), (e1.l || (e1.l = {
    }))[n1] = t1) : e1.removeEventListener(n1, C2, u1)) : "list" !== n1 && "tagName" !== n1 && "form" !== n1 && "type" !== n1 && "size" !== n1 && !o1 && n1 in e1 ? e1[n1] = null == t1 ? "" : t1 : "function" != typeof t1 && "dangerouslySetInnerHTML" !== n1 && (n1 !== (n1 = n1.replace(/^xlink:?/, "")) ? null == t1 || !1 === t1 ? e1.removeAttributeNS("http://www.w3.org/1999/xlink", n1.toLowerCase()) : e1.setAttributeNS("http://www.w3.org/1999/xlink", n1.toLowerCase(), t1) : null == t1 || !1 === t1 && !/^ar/.test(n1) ? e1.removeAttribute(n1) : e1.setAttribute(n1, t1));
}
function C2(n1) {
    this.l[n1.type](e6.event ? e6.event(n1) : n1);
}
function H1(n1, t1, _1, o1, r1, u1, l1, i2, c1) {
    var f1, a1, p1, v1, m1, y1, g1, b1, x1, w1, C1 = t1.type;
    if ((void 0) !== t1.constructor) return null;
    (f1 = e6.__b) && f1(t1);
    try {
        e: if ("function" == typeof C1) {
            if (b1 = t1.props, x1 = (f1 = C1.contextType) && o1[f1.__c], w1 = f1 ? x1 ? x1.props.value : f1.__ : o1, _1.__c ? g1 = (a1 = t1.__c = _1.__c).__ = a1.__E : ("prototype" in C1 && C1.prototype.render ? t1.__c = a1 = new C1(b1, w1) : (t1.__c = a1 = new d4(b1, w1), a1.constructor = C1, a1.render = N1), x1 && x1.sub(a1), a1.props = b1, a1.state || (a1.state = {
            }), a1.context = w1, a1.__n = o1, p1 = a1.__d = !0, a1.__h = []), null == a1.__s && (a1.__s = a1.state), null != C1.getDerivedStateFromProps && (a1.__s == a1.state && (a1.__s = s1({
            }, a1.__s)), s1(a1.__s, C1.getDerivedStateFromProps(b1, a1.__s))), v1 = a1.props, m1 = a1.state, p1) null == C1.getDerivedStateFromProps && null != a1.componentWillMount && a1.componentWillMount(), null != a1.componentDidMount && a1.__h.push(a1.componentDidMount);
            else {
                if (null == C1.getDerivedStateFromProps && b1 !== v1 && null != a1.componentWillReceiveProps && a1.componentWillReceiveProps(b1, w1), !a1.__e && null != a1.shouldComponentUpdate && !1 === a1.shouldComponentUpdate(b1, a1.__s, w1) || t1.__v === _1.__v && !a1.__) {
                    for(a1.props = b1, a1.state = a1.__s, t1.__v !== _1.__v && (a1.__d = !1), a1.__v = t1, t1.__e = _1.__e, t1.__k = _1.__k, a1.__h.length && l1.push(a1), f1 = 0; f1 < t1.__k.length; f1++)t1.__k[f1] && (t1.__k[f1].__ = t1);
                    break e;
                }
                null != a1.componentWillUpdate && a1.componentWillUpdate(b1, a1.__s, w1), null != a1.componentDidUpdate && a1.__h.push(function() {
                    a1.componentDidUpdate(v1, m1, y1);
                });
            }
            a1.context = w1, a1.props = b1, a1.state = a1.__s, (f1 = e6.__r) && f1(t1), a1.__d = !1, a1.__v = t1, a1.__P = n1, f1 = a1.render(a1.props, a1.state, a1.context), t1.__k = null != f1 && f1.type == h1 && null == f1.key ? f1.props.children : Array.isArray(f1) ? f1 : [
                f1
            ], null != a1.getChildContext && (o1 = s1(s1({
            }, o1), a1.getChildContext())), p1 || null == a1.getSnapshotBeforeUpdate || (y1 = a1.getSnapshotBeforeUpdate(v1, m1)), k2(n1, t1, _1, o1, r1, u1, l1, i2, c1), a1.base = t1.__e, a1.__h.length && l1.push(a1), g1 && (a1.__E = a1.__ = null), a1.__e = !1;
        } else null == u1 && t1.__v === _1.__v ? (t1.__k = _1.__k, t1.__e = _1.__e) : t1.__e = E2(_1.__e, t1, _1, o1, r1, u1, l1, c1);
        (f1 = e6.diffed) && f1(t1);
    } catch (n) {
        t1.__v = null, e6.__e(n, t1, _1);
    }
    return t1.__e;
}
function S1(n1, t1) {
    e6.__c && e6.__c(t1, n1), n1.some(function(t2) {
        try {
            n1 = t2.__h, t2.__h = [], n1.some(function(e1) {
                e1.call(t2);
            });
        } catch (n) {
            e6.__e(n, t2.__v);
        }
    });
}
function E2(e1, n1, t1, _1, o1, r1, u1, c1) {
    var s1, f1, a1, p1, h1, d1 = t1.props, v1 = n1.props;
    if (o1 = "svg" === n1.type || o1, null != r1) for(s1 = 0; s1 < r1.length; s1++)if (null != (f1 = r1[s1]) && ((null === n1.type ? 3 === f1.nodeType : f1.localName === n1.type) || e1 == f1)) {
        e1 = f1, r1[s1] = null;
        break;
    }
    if (null == e1) {
        if (null === n1.type) return document.createTextNode(v1);
        e1 = o1 ? document.createElementNS("http://www.w3.org/2000/svg", n1.type) : document.createElement(n1.type, v1.is && {
            is: v1.is
        }), r1 = null, c1 = !1;
    }
    if (null === n1.type) d1 !== v1 && e1.data != v1 && (e1.data = v1);
    else {
        if (null != r1 && (r1 = i7.slice.call(e1.childNodes)), a1 = (d1 = t1.props || l4).dangerouslySetInnerHTML, p1 = v1.dangerouslySetInnerHTML, !c1) {
            if (d1 === l4) for(d1 = {
            }, h1 = 0; h1 < e1.attributes.length; h1++)d1[e1.attributes[h1].name] = e1.attributes[h1].value;
            (p1 || a1) && (p1 && a1 && p1.__html == a1.__html || (e1.innerHTML = p1 && p1.__html || ""));
        }
        (function(e2, n2, t2, _2, o2) {
            var r2;
            for(r2 in t2)"children" === r2 || "key" === r2 || r2 in n2 || w2(e2, r2, null, t2[r2], _2);
            for(r2 in n2)o2 && "function" != typeof n2[r2] || "children" === r2 || "key" === r2 || "value" === r2 || "checked" === r2 || t2[r2] === n2[r2] || w2(e2, r2, n2[r2], t2[r2], _2);
        })(e1, v1, d1, o1, c1), n1.__k = n1.props.children, p1 || k2(e1, n1, t1, _1, "foreignObject" !== n1.type && o1, r1, u1, l4, c1), c1 || ("value" in v1 && (void 0) !== v1.value && v1.value !== e1.value && (e1.value = null == v1.value ? "" : v1.value), "checked" in v1 && (void 0) !== v1.checked && v1.checked !== e1.checked && (e1.checked = v1.checked));
    }
    return e1;
}
function P2(n1, t1, _1) {
    try {
        "function" == typeof n1 ? n1(t1) : n1.current = t1;
    } catch (n) {
        e6.__e(n, _1);
    }
}
function D2(n1, t1, _1) {
    var o1, r1, u1;
    if (e6.unmount && e6.unmount(n1), (o1 = n1.ref) && (o1.current && o1.current !== n1.__e || P2(o1, null, t1)), _1 || "function" == typeof n1.type || (_1 = null != (r1 = n1.__e)), n1.__e = n1.__d = void 0, null != (o1 = n1.__c)) {
        if (o1.componentWillUnmount) try {
            o1.componentWillUnmount();
        } catch (n) {
            e6.__e(n, t1);
        }
        o1.base = o1.__P = null;
    }
    if (o1 = n1.__k) for(u1 = 0; u1 < o1.length; u1++)o1[u1] && D2(o1[u1], t1, _1);
    null != r1 && f2(r1);
}
function N1(e1, n1, t1) {
    return this.constructor(e1, t1);
}
function T2(n1, t1, _1) {
    var o1, u1, c1;
    e6.__ && e6.__(n1, t1), u1 = (o1 = _1 === r) ? null : _1 && _1.__k || t1.__k, n1 = a2(h1, null, [
        n1
    ]), c1 = [], H1(t1, (o1 ? t1 : _1 || t1).__k = n1, u1 || l4, l4, (void 0) !== t1.ownerSVGElement, _1 && !o1 ? [
        _1
    ] : u1 ? null : i7.slice.call(t1.childNodes), c1, _1 || l4, o1), S1(c1, n1);
}
function U1(e1) {
    var n1 = {
    }, t1 = {
        __c: "__cC" + u4++,
        __: e1,
        Consumer: function(e2, n2) {
            return e2.children(n2);
        },
        Provider: function(e2) {
            var _1, o1 = this;
            return (this.getChildContext || (_1 = [], this.getChildContext = function() {
                return (n1[t1.__c] = o1, n1);
            }, this.shouldComponentUpdate = function(e3) {
                o1.props.value !== e3.value && _1.some(function(n2) {
                    n2.context = e3.value, y1(n2);
                });
            }, this.sub = function(e3) {
                _1.push(e3);
                var n2 = e3.componentWillUnmount;
                e3.componentWillUnmount = function() {
                    _1.splice(_1.indexOf(e3), 1), n2 && n2.call(e3);
                };
            }), e2.children);
        }
    };
    return t1.Consumer.contextType = t1, t1;
}
e6 = {
    __e: function(e1, n1) {
        for(var t1, _1; n1 = n1.__;)if ((t1 = n1.__c) && !t1.__) try {
            if (t1.constructor && null != t1.constructor.getDerivedStateFromError && (_1 = !0, t1.setState(t1.constructor.getDerivedStateFromError(e1))), null != t1.componentDidCatch && (_1 = !0, t1.componentDidCatch(e1)), _1) return y1(t1.__E = t1);
        } catch (n) {
            e1 = n;
        }
        throw e1;
    }
}, d4.prototype.setState = function(e1, n1) {
    var t1;
    t1 = this.__s !== this.state ? this.__s : this.__s = s1({
    }, this.state), "function" == typeof e1 && (e1 = e1(t1, this.props)), e1 && s1(t1, e1), null != e1 && this.__v && (n1 && this.__h.push(n1), y1(this));
}, d4.prototype.forceUpdate = function(e1) {
    this.__v && (this.__e = !0, e1 && this.__h.push(e1), y1(this));
}, d4.prototype.render = h1, n5 = [], t = 0, _3 = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, r = l4, u4 = 0;
var A1, M1, F2, L1 = [], W2 = e6.__r, R2 = e6.diffed, V1 = e6.__c, I2 = e6.unmount;
function O1(n1) {
    e6.__h && e6.__h(M1);
    var t1 = M1.__H || (M1.__H = {
        __: [],
        __h: []
    });
    return n1 >= t1.__.length && t1.__.push({
    }), t1.__[n1];
}
function q1(e1) {
    return B2(te, e1);
}
function B2(e1, n1, t1) {
    var _1 = O1(A1++);
    return _1.__c || (_1.__c = M1, _1.__ = [
        t1 ? t1(n1) : te(void 0, n1),
        function(n2) {
            var t2 = e1(_1.__[0], n2);
            _1.__[0] !== t2 && (_1.__[0] = t2, _1.__c.setState({
            }));
        }
    ]), _1.__;
}
function $1(e1, n1) {
    var t1 = O1(A1++);
    ne(t1.__H, n1) && (t1.__ = e1, t1.__H = n1, M1.__H.__h.push(t1));
}
function j(e1, n1) {
    var t1 = O1(A1++);
    ne(t1.__H, n1) && (t1.__ = e1, t1.__H = n1, M1.__h.push(t1));
}
function z2(e1) {
    return J1(function() {
        return {
            current: e1
        };
    }, []);
}
function J1(e1, n1) {
    var t1 = O1(A1++);
    return ne(t1.__H, n1) ? (t1.__H = n1, t1.__h = e1, t1.__ = e1()) : t1.__;
}
function Q1(e1) {
    var n1 = M1.context[e1.__c];
    if (!n1) return e1.__;
    var t1 = O1(A1++);
    return null == t1.__ && (t1.__ = !0, n1.sub(M1)), n1.props.value;
}
function Y1() {
    L1.some(function(n1) {
        if (n1.__P) try {
            n1.__H.__h.forEach(Z1), n1.__H.__h.forEach(ee), n1.__H.__h = [];
        } catch (t) {
            return (n1.__H.__h = [], e6.__e(t, n1.__v), !0);
        }
    }), L1 = [];
}
function Z1(e1) {
    e1.t && e1.t();
}
function ee(e1) {
    var n1 = e1.__();
    "function" == typeof n1 && (e1.t = n1);
}
function ne(e1, n1) {
    return !e1 || n1.some(function(n2, t1) {
        return n2 !== e1[t1];
    });
}
function te(e1, n1) {
    return "function" == typeof n1 ? n1(e1) : n1;
}
e6.__r = function(e1) {
    W2 && W2(e1), A1 = 0, (M1 = e1.__c).__H && (M1.__H.__h.forEach(Z1), M1.__H.__h.forEach(ee), M1.__H.__h = []);
}, e6.diffed = function(n1) {
    R2 && R2(n1);
    var t1 = n1.__c;
    if (t1) {
        var _1 = t1.__H;
        _1 && _1.__h.length && (1 !== L1.push(t1) && F2 === e6.requestAnimationFrame || ((F2 = e6.requestAnimationFrame) || function(e1) {
            var n2, t2 = function() {
                clearTimeout(_4), cancelAnimationFrame(n2), setTimeout(e1);
            }, _4 = setTimeout(t2, 100);
            "undefined" != typeof window && (n2 = requestAnimationFrame(t2));
        })(Y1));
    }
}, e6.__c = function(n1, t1) {
    t1.some(function(n2) {
        try {
            n2.__h.forEach(Z1), n2.__h = n2.__h.filter(function(e1) {
                return !e1.__ || ee(e1);
            });
        } catch (_) {
            t1.some(function(e1) {
                e1.__h && (e1.__h = []);
            }), t1 = [], e6.__e(_, n2.__v);
        }
    }), V1 && V1(n1, t1);
}, e6.unmount = function(n1) {
    I2 && I2(n1);
    var t1 = n1.__c;
    if (t1) {
        var _4 = t1.__H;
        if (_4) try {
            _4.__.forEach(function(e1) {
                return e1.t && e1.t();
            });
        } catch (n) {
            e6.__e(n, t1.__v);
        }
    }
};
var _e = function(e1, n1, t1, _5) {
    var o1;
    n1[0] = 0;
    for(var r1 = 1; r1 < n1.length; r1++){
        var u1 = n1[r1++], l1 = n1[r1] ? (n1[0] |= u1 ? 1 : 2, t1[n1[r1++]]) : n1[++r1];
        3 === u1 ? _5[0] = l1 : 4 === u1 ? _5[1] = Object.assign(_5[1] || {
        }, l1) : 5 === u1 ? (_5[1] = _5[1] || {
        })[n1[++r1]] = l1 : 6 === u1 ? _5[1][n1[++r1]] += l1 + "" : u1 ? (o1 = e1.apply(l1, _e(e1, l1, t1, [
            "",
            null
        ])), _5.push(o1), l1[0] ? n1[0] |= 2 : (n1[r1 - 2] = 0, n1[r1] = o1)) : _5.push(l1);
    }
    return _5;
}, oe = new Map, re = (function(e1) {
    var n1 = oe.get(this);
    return n1 || (n1 = new Map, oe.set(this, n1)), (n1 = _e(this, n1.get(e1) || (n1.set(e1, n1 = function(e2) {
        for(var n2, t1, _5 = 1, o1 = "", r1 = "", u2 = [
            0
        ], l2 = function(e3) {
            1 === _5 && (e3 || (o1 = o1.replace(/^\s*\n\s*|\s*\n\s*$/g, ""))) ? u2.push(0, e3, o1) : 3 === _5 && (e3 || o1) ? (u2.push(3, e3, o1), _5 = 2) : 2 === _5 && "..." === o1 && e3 ? u2.push(4, e3, 0) : 2 === _5 && o1 && !e3 ? u2.push(5, 0, !0, o1) : _5 >= 5 && ((o1 || !e3 && 5 === _5) && (u2.push(_5, 0, o1, t1), _5 = 6), e3 && (u2.push(_5, e3, 0, t1), _5 = 6)), o1 = "";
        }, i2 = 0; i2 < e2.length; i2++){
            i2 && (1 === _5 && l2(), l2(i2));
            for(var c1 = 0; c1 < e2[i2].length; c1++)n2 = e2[i2][c1], 1 === _5 ? "<" === n2 ? (l2(), u2 = [
                u2
            ], _5 = 3) : o1 += n2 : 4 === _5 ? "--" === o1 && ">" === n2 ? (_5 = 1, o1 = "") : o1 = n2 + o1[0] : r1 ? n2 === r1 ? r1 = "" : o1 += n2 : '"' === n2 || "'" === n2 ? r1 = n2 : ">" === n2 ? (l2(), _5 = 1) : _5 && ("=" === n2 ? (_5 = 5, t1 = o1, o1 = "") : "/" === n2 && (_5 < 5 || ">" === e2[i2][c1 + 1]) ? (l2(), 3 === _5 && (u2 = u2[0]), _5 = u2, (u2 = u2[0]).push(2, 0, _5), _5 = 0) : " " === n2 || "\t" === n2 || "\n" === n2 || "\r" === n2 ? (l2(), _5 = 2) : o1 += n2), 3 === _5 && "!--" === o1 && (_5 = 4, u2 = u2[0]);
        }
        return l2(), u2;
    }(e1)), n1), arguments, [])).length > 1 ? n1 : n1[0];
}).bind(a2);
const html = re;
window.process = {
    env: {
        NODE_ENV: "production"
    }
};
function n1(n2) {
    for(var t1 = arguments.length, r1 = Array(t1 > 1 ? t1 - 1 : 0), e1 = 1; e1 < t1; e1++)r1[e1 - 1] = arguments[e1];
    if ("production" !== process.env.NODE_ENV) {
        var i2 = Y2[n2], o1 = i2 ? "function" == typeof i2 ? i2.apply(null, r1) : i2 : "unknown error nr: " + n2;
        throw Error("[Immer] " + o1);
    }
    throw Error("[Immer] minified error nr: " + n2 + (r1.length ? " " + r1.map(function(n3) {
        return "'" + n3 + "'";
    }).join(",") : "") + ". Find the full error at: https://bit.ly/3cXEKWf");
}
function t1(n2) {
    return !!n2 && !!n2[Q2];
}
function r1(n2) {
    return !!n2 && ((function(n3) {
        if (!n3 || "object" != typeof n3) return !1;
        var t2 = Object.getPrototypeOf(n3);
        return !t2 || t2 === Object.prototype;
    })(n2) || Array.isArray(n2) || !!n2[L2] || !!n2.constructor[L2] || s2(n2) || v2(n2));
}
function i3(n2, t2, r2) {
    (void 0) === r2 && (r2 = !1), 0 === o3(n2) ? (r2 ? Object.keys : Z2)(n2).forEach(function(e1) {
        r2 && "symbol" == typeof e1 || t2(e1, n2[e1], n2);
    }) : n2.forEach(function(r3, e1) {
        return t2(e1, r3, n2);
    });
}
function o3(n2) {
    var t2 = n2[Q2];
    return t2 ? t2.i > 3 ? t2.i - 4 : t2.i : Array.isArray(n2) ? 1 : s2(n2) ? 2 : v2(n2) ? 3 : 0;
}
function u2(n2, t2) {
    return 2 === o3(n2) ? n2.has(t2) : Object.prototype.hasOwnProperty.call(n2, t2);
}
function a1(n2, t2) {
    return 2 === o3(n2) ? n2.get(t2) : n2[t2];
}
function f1(n2, t2, r2) {
    var e1 = o3(n2);
    2 === e1 ? n2.set(t2, r2) : 3 === e1 ? (n2.delete(t2), n2.add(r2)) : n2[t2] = r2;
}
function c2(n2, t2) {
    return n2 === t2 ? 0 !== n2 || 1 / n2 == 1 / t2 : n2 != n2 && t2 != t2;
}
function s2(n2) {
    return X1 && n2 instanceof Map;
}
function v2(n2) {
    return q2 && n2 instanceof Set;
}
function p1(n2) {
    return n2.o || n2.t;
}
function l2(n2) {
    if (Array.isArray(n2)) return Array.prototype.slice.call(n2);
    var t2 = nn(n2);
    delete t2[Q2];
    for(var r2 = Z2(t2), e1 = 0; e1 < r2.length; e1++){
        var i4 = r2[e1], o4 = t2[i4];
        !1 === o4.writable && (o4.writable = !0, o4.configurable = !0), (o4.get || o4.set) && (t2[i4] = {
            configurable: !0,
            writable: !0,
            enumerable: o4.enumerable,
            value: n2[i4]
        });
    }
    return Object.create(Object.getPrototypeOf(n2), t2);
}
function d1(n2, e1) {
    return (void 0) === e1 && (e1 = !1), y2(n2) || t1(n2) || !r1(n2) ? n2 : (o3(n2) > 1 && (n2.set = n2.add = n2.clear = n2.delete = h2), Object.freeze(n2), e1 && i3(n2, function(n3, t2) {
        return d1(t2, !0);
    }, !0), n2);
}
function h2() {
    n1(2);
}
function y2(n2) {
    return null == n2 || "object" != typeof n2 || Object.isFrozen(n2);
}
function b1(t2) {
    var r2 = tn[t2];
    return r2 || n1(18, t2), r2;
}
function m1(n2, t2) {
    tn[n2] || (tn[n2] = t2);
}
function _5() {
    return "production" === process.env.NODE_ENV || U2 || n1(0), U2;
}
function j1(n2, t2) {
    t2 && (b1("Patches"), n2.u = [], n2.s = [], n2.v = t2);
}
function g1(n2) {
    O2(n2), n2.p.forEach(S2), n2.p = null;
}
function O2(n2) {
    n2 === U2 && (U2 = n2.l);
}
function w1(n2) {
    return U2 = {
        p: [],
        l: U2,
        h: n2,
        m: !0,
        _: 0
    };
}
function S2(n2) {
    var t2 = n2[Q2];
    0 === t2.i || 1 === t2.i ? t2.j() : t2.g = !0;
}
function P1(t2, e1) {
    e1._ = e1.p.length;
    var i5 = e1.p[0], o5 = (void 0) !== t2 && t2 !== i5;
    return e1.h.O || b1("ES5").S(e1, t2, o5), o5 ? (i5[Q2].P && (g1(e1), n1(4)), r1(t2) && (t2 = M2(e1, t2), e1.l || x2(e1, t2)), e1.u && b1("Patches").M(i5[Q2], t2, e1.u, e1.s)) : t2 = M2(e1, i5, []), g1(e1), e1.u && e1.v(e1.u, e1.s), t2 !== H2 ? t2 : void 0;
}
function M2(n2, t2, r2) {
    if (y2(t2)) return t2;
    var e1 = t2[Q2];
    if (!e1) return i3(t2, function(i5, o5) {
        return A2(n2, e1, t2, i5, o5, r2);
    }, !0), t2;
    if (e1.A !== n2) return t2;
    if (!e1.P) return x2(n2, e1.t, !0), e1.t;
    if (!e1.I) {
        e1.I = !0, e1.A._--;
        var o5 = 4 === e1.i || 5 === e1.i ? e1.o = l2(e1.k) : e1.o;
        i3(3 === e1.i ? new Set(o5) : o5, function(t3, i5) {
            return A2(n2, e1, o5, t3, i5, r2);
        }), x2(n2, o5, !1), r2 && n2.u && b1("Patches").R(e1, r2, n2.u, n2.s);
    }
    return e1.o;
}
function A2(e1, i5, o6, a2, c3, s3) {
    if ("production" !== process.env.NODE_ENV && c3 === o6 && n1(5), t1(c3)) {
        var v3 = M2(e1, c3, s3 && i5 && 3 !== i5.i && !u2(i5.D, a2) ? s3.concat(a2) : void 0);
        if (f1(o6, a2, v3), !t1(v3)) return;
        e1.m = !1;
    }
    if (r1(c3) && !y2(c3)) {
        if (!e1.h.N && e1._ < 1) return;
        M2(e1, c3), i5 && i5.A.l || x2(e1, c3);
    }
}
function x2(n2, t2, r2) {
    (void 0) === r2 && (r2 = !1), n2.h.N && n2.m && d1(t2, r2);
}
function z1(n2, t2) {
    var r2 = n2[Q2];
    return (r2 ? p1(r2) : n2)[t2];
}
function I1(n2, t2) {
    if (t2 in n2) for(var r2 = Object.getPrototypeOf(n2); r2;){
        var e1 = Object.getOwnPropertyDescriptor(r2, t2);
        if (e1) return e1;
        r2 = Object.getPrototypeOf(r2);
    }
}
function E1(n2) {
    n2.P || (n2.P = !0, n2.l && E1(n2.l));
}
function k1(n2) {
    n2.o || (n2.o = l2(n2.t));
}
function R1(n2, t2, r2) {
    var e2 = s2(t2) ? b1("MapSet").T(t2, r2) : v2(t2) ? b1("MapSet").F(t2, r2) : n2.O ? function(n3, t3) {
        var r3 = Array.isArray(n3), e2 = {
            i: r3 ? 1 : 0,
            A: t3 ? t3.A : _5(),
            P: !1,
            I: !1,
            D: {
            },
            l: t3,
            t: n3,
            k: null,
            o: null,
            j: null,
            C: !1
        }, i5 = e2, o6 = rn;
        r3 && (i5 = [
            e2
        ], o6 = en);
        var u3 = Proxy.revocable(i5, o6), a2 = u3.revoke, f2 = u3.proxy;
        return e2.k = f2, e2.j = a2, f2;
    }(t2, r2) : b1("ES5").J(t2, r2);
    return (r2 ? r2.A : _5()).p.push(e2), e2;
}
function D1(e2) {
    return t1(e2) || n1(22, e2), (function n2(t2) {
        if (!r1(t2)) return t2;
        var e3, u3 = t2[Q2], c3 = o3(t2);
        if (u3) {
            if (!u3.P && (u3.i < 4 || !b1("ES5").K(u3))) return u3.t;
            u3.I = !0, e3 = N2(t2, c3), u3.I = !1;
        } else e3 = N2(t2, c3);
        return i3(e3, function(t3, r2) {
            u3 && a1(u3.t, t3) === r2 || f1(e3, t3, n2(r2));
        }), 3 === c3 ? new Set(e3) : e3;
    })(e2);
}
function N2(n2, t2) {
    switch(t2){
        case 2:
            return new Map(n2);
        case 3:
            return Array.from(n2);
    }
    return l2(n2);
}
function T1() {
    function r2(n2, t2) {
        var r2 = s4[n2];
        return r2 ? r2.enumerable = t2 : s4[n2] = r2 = {
            configurable: !0,
            enumerable: t2,
            get: function() {
                var t3 = this[Q2];
                return "production" !== process.env.NODE_ENV && f4(t3), rn.get(t3, n2);
            },
            set: function(t3) {
                var r2 = this[Q2];
                "production" !== process.env.NODE_ENV && f4(r2), rn.set(r2, n2, t3);
            }
        }, r2;
    }
    function e2(n2) {
        for(var t2 = n2.length - 1; t2 >= 0; t2--){
            var r3 = n2[t2][Q2];
            if (!r3.P) switch(r3.i){
                case 5:
                    a4(r3) && E1(r3);
                    break;
                case 4:
                    o6(r3) && E1(r3);
            }
        }
    }
    function o6(n2) {
        for(var t2 = n2.t, r4 = n2.k, e3 = Z2(r4), i5 = e3.length - 1; i5 >= 0; i5--){
            var o6 = e3[i5];
            if (o6 !== Q2) {
                var a3 = t2[o6];
                if ((void 0) === a3 && !u2(t2, o6)) return !0;
                var f3 = r4[o6], s3 = f3 && f3[Q2];
                if (s3 ? s3.t !== a3 : !c2(f3, a3)) return !0;
            }
        }
        var v4 = !!t2[Q2];
        return e3.length !== Z2(t2).length + (v4 ? 0 : 1);
    }
    function a4(n2) {
        var t2 = n2.k;
        if (t2.length !== n2.t.length) return !0;
        var r4 = Object.getOwnPropertyDescriptor(t2, t2.length - 1);
        return !(!r4 || r4.get);
    }
    function f4(t2) {
        t2.g && n1(3, JSON.stringify(p1(t2)));
    }
    var s4 = {
    };
    m1("ES5", {
        J: function(n2, t2) {
            var e3 = Array.isArray(n2), i5 = function(n3, t3) {
                if (n3) {
                    for(var e4 = Array(t3.length), i5 = 0; i5 < t3.length; i5++)Object.defineProperty(e4, "" + i5, r2(i5, !0));
                    return e4;
                }
                var o7 = nn(t3);
                delete o7[Q2];
                for(var u3 = Z2(o7), a5 = 0; a5 < u3.length; a5++){
                    var f5 = u3[a5];
                    o7[f5] = r2(f5, n3 || !!o7[f5].enumerable);
                }
                return Object.create(Object.getPrototypeOf(t3), o7);
            }(e3, n2), o7 = {
                i: e3 ? 5 : 4,
                A: t2 ? t2.A : _5(),
                P: !1,
                I: !1,
                D: {
                },
                l: t2,
                t: n2,
                k: i5,
                o: null,
                g: !1,
                C: !1
            };
            return (Object.defineProperty(i5, Q2, {
                value: o7,
                writable: !0
            }), i5);
        },
        S: function(n2, r4, o7) {
            o7 ? t1(r4) && r4[Q2].A === n2 && e2(n2.p) : (n2.u && (function n2(t2) {
                if (t2 && "object" == typeof t2) {
                    var r5 = t2[Q2];
                    if (r5) {
                        var e3 = r5.t, o8 = r5.k, f6 = r5.D, c3 = r5.i;
                        if (4 === c3) i3(o8, function(t3) {
                            t3 !== Q2 && ((void 0) !== e3[t3] || u2(e3, t3) ? f6[t3] || n2(o8[t3]) : (f6[t3] = !0, E1(r5)));
                        }), i3(e3, function(n3) {
                            (void 0) !== o8[n3] || u2(o8, n3) || (f6[n3] = !1, E1(r5));
                        });
                        else if (5 === c3) {
                            if (a4(r5) && (E1(r5), f6.length = !0), o8.length < e3.length) for(var s5 = o8.length; s5 < e3.length; s5++)f6[s5] = !1;
                            else for(var v4 = e3.length; v4 < o8.length; v4++)f6[v4] = !0;
                            for(var p2 = Math.min(o8.length, e3.length), l3 = 0; l3 < p2; l3++)(void 0) === f6[l3] && n2(o8[l3]);
                        }
                    }
                }
            })(n2.p[0]), e2(n2.p));
        },
        K: function(n2) {
            return 4 === n2.i ? o6(n2) : a4(n2);
        }
    });
}
function F1() {
    function e2(n2) {
        if (!r1(n2)) return n2;
        if (Array.isArray(n2)) return n2.map(e2);
        if (s2(n2)) return new Map(Array.from(n2.entries()).map(function(n3) {
            return [
                n3[0],
                e2(n3[1])
            ];
        }));
        if (v2(n2)) return new Set(Array.from(n2).map(e2));
        var t2 = Object.create(Object.getPrototypeOf(n2));
        for(var i5 in n2)t2[i5] = e2(n2[i5]);
        return t2;
    }
    function f4(n2) {
        return t1(n2) ? e2(n2) : n2;
    }
    var c4 = "add";
    m1("Patches", {
        $: function(t2, r2) {
            return (r2.forEach(function(r4) {
                for(var i5 = r4.path, u3 = r4.op, f7 = t2, s4 = 0; s4 < i5.length - 1; s4++)"object" != typeof (f7 = a1(f7, i5[s4])) && n1(15, i5.join("/"));
                var v5 = o3(f7), p3 = e2(r4.value), l4 = i5[i5.length - 1];
                switch(u3){
                    case "replace":
                        switch(v5){
                            case 2:
                                return f7.set(l4, p3);
                            case 3:
                                n1(16);
                            default:
                                return f7[l4] = p3;
                        }
                    case c4:
                        switch(v5){
                            case 1:
                                return f7.splice(l4, 0, p3);
                            case 2:
                                return f7.set(l4, p3);
                            case 3:
                                return f7.add(p3);
                            default:
                                return f7[l4] = p3;
                        }
                    case "remove":
                        switch(v5){
                            case 1:
                                return f7.splice(l4, 1);
                            case 2:
                                return f7.delete(l4);
                            case 3:
                                return f7.delete(r4.value);
                            default:
                                return delete f7[l4];
                        }
                    default:
                        n1(17, u3);
                }
            }), t2);
        },
        R: function(n2, t2, r2, e5) {
            switch(n2.i){
                case 0:
                case 4:
                case 2:
                    return function(n3, t3, r4, e6) {
                        var o6 = n3.t, s4 = n3.o;
                        i3(n3.D, function(n4, i5) {
                            var v5 = a1(o6, n4), p3 = a1(s4, n4), l4 = i5 ? u2(o6, n4) ? "replace" : c4 : "remove";
                            if (v5 !== p3 || "replace" !== l4) {
                                var d2 = t3.concat(n4);
                                r4.push("remove" === l4 ? {
                                    op: l4,
                                    path: d2
                                } : {
                                    op: l4,
                                    path: d2,
                                    value: p3
                                }), e6.push(l4 === c4 ? {
                                    op: "remove",
                                    path: d2
                                } : "remove" === l4 ? {
                                    op: c4,
                                    path: d2,
                                    value: f4(v5)
                                } : {
                                    op: "replace",
                                    path: d2,
                                    value: f4(v5)
                                });
                            }
                        });
                    }(n2, t2, r2, e5);
                case 5:
                case 1:
                    return function(n3, t3, r4, e6) {
                        var i5 = n3.t, o6 = n3.D, u3 = n3.o;
                        if (u3.length < i5.length) {
                            var a4 = [
                                u3,
                                i5
                            ];
                            i5 = a4[0], u3 = a4[1];
                            var s4 = [
                                e6,
                                r4
                            ];
                            r4 = s4[0], e6 = s4[1];
                        }
                        for(var v5 = 0; v5 < i5.length; v5++)if (o6[v5] && u3[v5] !== i5[v5]) {
                            var p3 = t3.concat([
                                v5
                            ]);
                            r4.push({
                                op: "replace",
                                path: p3,
                                value: f4(u3[v5])
                            }), e6.push({
                                op: "replace",
                                path: p3,
                                value: f4(i5[v5])
                            });
                        }
                        for(var l4 = i5.length; l4 < u3.length; l4++){
                            var d3 = t3.concat([
                                l4
                            ]);
                            r4.push({
                                op: c4,
                                path: d3,
                                value: f4(u3[l4])
                            });
                        }
                        i5.length < u3.length && e6.push({
                            op: "replace",
                            path: t3.concat([
                                "length"
                            ]),
                            value: i5.length
                        });
                    }(n2, t2, r2, e5);
                case 3:
                    return function(n3, t3, r4, e6) {
                        var i5 = n3.t, o6 = n3.o, u3 = 0;
                        i5.forEach(function(n4) {
                            if (!o6.has(n4)) {
                                var i6 = t3.concat([
                                    u3
                                ]);
                                r4.push({
                                    op: "remove",
                                    path: i6,
                                    value: n4
                                }), e6.unshift({
                                    op: c4,
                                    path: i6,
                                    value: n4
                                });
                            }
                            u3++;
                        }), u3 = 0, o6.forEach(function(n4) {
                            if (!i5.has(n4)) {
                                var o7 = t3.concat([
                                    u3
                                ]);
                                r4.push({
                                    op: c4,
                                    path: o7,
                                    value: n4
                                }), e6.unshift({
                                    op: "remove",
                                    path: o7,
                                    value: n4
                                });
                            }
                            u3++;
                        });
                    }(n2, t2, r2, e5);
            }
        },
        M: function(n2, t2, r2, e5) {
            r2.push({
                op: "replace",
                path: [],
                value: t2
            }), e5.push({
                op: "replace",
                path: [],
                value: n2.t
            });
        }
    });
}
function C1() {
    function t2(n2, t3) {
        function r2() {
            this.constructor = n2;
        }
        a5(n2, t3), n2.prototype = (r2.prototype = t3.prototype, new r2);
    }
    function e2(n2) {
        n2.o || (n2.D = new Map, n2.o = new Map(n2.t));
    }
    function o6(n2) {
        n2.o || (n2.o = new Set, n2.t.forEach(function(t3) {
            if (r1(t3)) {
                var e5 = R1(n2.A.h, t3, n2);
                n2.p.set(t3, e5), n2.o.add(e5);
            } else n2.o.add(t3);
        }));
    }
    function u3(t3) {
        t3.g && n1(3, JSON.stringify(p1(t3)));
    }
    var a5 = function(n2, t3) {
        return (a5 = Object.setPrototypeOf || ({
            __proto__: []
        }) instanceof Array && function(n3, t4) {
            n3.__proto__ = t4;
        } || function(n3, t4) {
            for(var r2 in t4)t4.hasOwnProperty(r2) && (n3[r2] = t4[r2]);
        })(n2, t3);
    }, f4 = function() {
        function n2(n3, t3) {
            return this[Q2] = {
                i: 2,
                l: t3,
                A: t3 ? t3.A : _5(),
                P: !1,
                I: !1,
                o: void 0,
                D: void 0,
                t: n3,
                k: this,
                C: !1,
                g: !1
            }, this;
        }
        t2(n2, Map);
        var o9 = n2.prototype;
        return Object.defineProperty(o9, "size", {
            get: function() {
                return p1(this[Q2]).size;
            }
        }), o9.has = function(n3) {
            return p1(this[Q2]).has(n3);
        }, o9.set = function(n3, t3) {
            var r2 = this[Q2];
            return u3(r2), p1(r2).has(n3) && p1(r2).get(n3) === t3 || (e2(r2), E1(r2), r2.D.set(n3, !0), r2.o.set(n3, t3), r2.D.set(n3, !0)), this;
        }, o9.delete = function(n3) {
            if (!this.has(n3)) return !1;
            var t3 = this[Q2];
            return u3(t3), e2(t3), E1(t3), t3.D.set(n3, !1), t3.o.delete(n3), !0;
        }, o9.clear = function() {
            var n3 = this[Q2];
            u3(n3), p1(n3).size && (e2(n3), E1(n3), n3.D = new Map, i3(n3.t, function(t3) {
                n3.D.set(t3, !1);
            }), n3.o.clear());
        }, o9.forEach = function(n3, t3) {
            var r2 = this;
            p1(this[Q2]).forEach(function(e6, i5) {
                n3.call(t3, r2.get(i5), i5, r2);
            });
        }, o9.get = function(n3) {
            var t3 = this[Q2];
            u3(t3);
            var i5 = p1(t3).get(n3);
            if (t3.I || !r1(i5)) return i5;
            if (i5 !== t3.t.get(n3)) return i5;
            var o10 = R1(t3.A.h, i5, t3);
            return e2(t3), t3.o.set(n3, o10), o10;
        }, o9.keys = function() {
            return p1(this[Q2]).keys();
        }, o9.values = function() {
            var n3, t3 = this, r2 = this.keys();
            return (n3 = {
            })[V2] = function() {
                return t3.values();
            }, n3.next = function() {
                var n4 = r2.next();
                return n4.done ? n4 : {
                    done: !1,
                    value: t3.get(n4.value)
                };
            }, n3;
        }, o9.entries = function() {
            var n3, t3 = this, r2 = this.keys();
            return (n3 = {
            })[V2] = function() {
                return t3.entries();
            }, n3.next = function() {
                var n4 = r2.next();
                if (n4.done) return n4;
                var e6 = t3.get(n4.value);
                return {
                    done: !1,
                    value: [
                        n4.value,
                        e6
                    ]
                };
            }, n3;
        }, o9[V2] = function() {
            return this.entries();
        }, n2;
    }(), c4 = function() {
        function n2(n3, t3) {
            return this[Q2] = {
                i: 3,
                l: t3,
                A: t3 ? t3.A : _5(),
                P: !1,
                I: !1,
                o: void 0,
                t: n3,
                k: this,
                p: new Map,
                g: !1,
                C: !1
            }, this;
        }
        t2(n2, Set);
        var r2 = n2.prototype;
        return Object.defineProperty(r2, "size", {
            get: function() {
                return p1(this[Q2]).size;
            }
        }), r2.has = function(n3) {
            var t3 = this[Q2];
            return u3(t3), t3.o ? !!t3.o.has(n3) || !(!t3.p.has(n3) || !t3.o.has(t3.p.get(n3))) : t3.t.has(n3);
        }, r2.add = function(n3) {
            var t3 = this[Q2];
            return u3(t3), this.has(n3) || (o6(t3), E1(t3), t3.o.add(n3)), this;
        }, r2.delete = function(n3) {
            if (!this.has(n3)) return !1;
            var t3 = this[Q2];
            return u3(t3), o6(t3), E1(t3), t3.o.delete(n3) || !!t3.p.has(n3) && t3.o.delete(t3.p.get(n3));
        }, r2.clear = function() {
            var n3 = this[Q2];
            u3(n3), p1(n3).size && (o6(n3), E1(n3), n3.o.clear());
        }, r2.values = function() {
            var n3 = this[Q2];
            return u3(n3), o6(n3), n3.o.values();
        }, r2.entries = function() {
            var n3 = this[Q2];
            return u3(n3), o6(n3), n3.o.entries();
        }, r2.keys = function() {
            return this.values();
        }, r2[V2] = function() {
            return this.values();
        }, r2.forEach = function(n3, t3) {
            for(var r4 = this.values(), e6 = r4.next(); !e6.done;)n3.call(t3, e6.value, e6.value, this), e6 = r4.next();
        }, n2;
    }();
    m1("MapSet", {
        T: function(n2, t3) {
            return new f4(n2, t3);
        },
        F: function(n2, t3) {
            return new c4(n2, t3);
        }
    });
}
var G1, U2, W1 = "undefined" != typeof Symbol && "symbol" == typeof Symbol("x"), X1 = "undefined" != typeof Map, q2 = "undefined" != typeof Set, B1 = "undefined" != typeof Proxy && (void 0) !== Proxy.revocable && "undefined" != typeof Reflect, H2 = W1 ? Symbol.for("immer-nothing") : ((G1 = {
})["immer-nothing"] = !0, G1), L2 = W1 ? Symbol.for("immer-draftable") : "__$immer_draftable", Q2 = W1 ? Symbol.for("immer-state") : "__$immer_state", V2 = "undefined" != typeof Symbol && Symbol.iterator || "@@iterator", Y2 = {
    0: "Illegal state",
    1: "Immer drafts cannot have computed properties",
    2: "This object has been frozen and should not be mutated",
    3: function(n2) {
        return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + n2;
    },
    4: "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
    5: "Immer forbids circular references",
    6: "The first or second argument to `produce` must be a function",
    7: "The third argument to `produce` must be a function or undefined",
    8: "First argument to `createDraft` must be a plain object, an array, or an immerable object",
    9: "First argument to `finishDraft` must be a draft returned by `createDraft`",
    10: "The given draft is already finalized",
    11: "Object.defineProperty() cannot be used on an Immer draft",
    12: "Object.setPrototypeOf() cannot be used on an Immer draft",
    13: "Immer only supports deleting array indices",
    14: "Immer only supports setting array indices and the 'length' property",
    15: function(n2) {
        return "Cannot apply patch, path doesn't resolve: " + n2;
    },
    16: 'Sets cannot have "replace" patches.',
    17: function(n2) {
        return "Unsupported patch operation: " + n2;
    },
    18: function(n2) {
        return "The plugin for '" + n2 + "' has not been loaded into Immer. To enable the plugin, import and call `enable" + n2 + "()` when initializing your application.";
    },
    20: "Cannot use proxies if Proxy, Proxy.revocable or Reflect are not available",
    21: function(n2) {
        return "produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '" + n2 + "'";
    },
    22: function(n2) {
        return "'current' expects a draft, got: " + n2;
    },
    23: function(n2) {
        return "'original' expects a draft, got: " + n2;
    }
}, Z2 = "undefined" != typeof Reflect && Reflect.ownKeys ? Reflect.ownKeys : (void 0) !== Object.getOwnPropertySymbols ? function(n2) {
    return Object.getOwnPropertyNames(n2).concat(Object.getOwnPropertySymbols(n2));
} : Object.getOwnPropertyNames, nn = Object.getOwnPropertyDescriptors || function(n2) {
    var t2 = {
    };
    return (Z2(n2).forEach(function(r2) {
        t2[r2] = Object.getOwnPropertyDescriptor(n2, r2);
    }), t2);
}, tn = {
}, rn = {
    get: function(n2, t2) {
        if (t2 === Q2) return n2;
        var e2 = p1(n2);
        if (!u2(e2, t2)) return function(n3, t3, r2) {
            var e6, i5 = I1(t3, r2);
            return i5 ? "value" in i5 ? i5.value : null === (e6 = i5.get) || (void 0) === e6 ? void 0 : e6.call(n3.k) : void 0;
        }(n2, e2, t2);
        var i5 = e2[t2];
        return n2.I || !r1(i5) ? i5 : i5 === z1(n2.t, t2) ? (k1(n2), n2.o[t2] = R1(n2.A.h, i5, n2)) : i5;
    },
    has: function(n2, t2) {
        return t2 in p1(n2);
    },
    ownKeys: function(n2) {
        return Reflect.ownKeys(p1(n2));
    },
    set: function(n2, t2, r2) {
        var e2 = I1(p1(n2), t2);
        if (null == e2 ? void 0 : e2.set) return (e2.set.call(n2.k, r2), !0);
        if (!n2.P) {
            var i5 = z1(p1(n2), t2), o6 = null == i5 ? void 0 : i5[Q2];
            if (o6 && o6.t === r2) return (n2.o[t2] = r2, n2.D[t2] = !1, !0);
            if (c2(r2, i5) && ((void 0) !== r2 || u2(n2.t, t2))) return !0;
            k1(n2), E1(n2);
        }
        return (n2.o[t2] = r2, n2.D[t2] = !0, !0);
    },
    deleteProperty: function(n2, t2) {
        return ((void 0) !== z1(n2.t, t2) || t2 in n2.t ? (n2.D[t2] = !1, k1(n2), E1(n2)) : delete n2.D[t2], n2.o && delete n2.o[t2], !0);
    },
    getOwnPropertyDescriptor: function(n2, t2) {
        var r2 = p1(n2), e2 = Reflect.getOwnPropertyDescriptor(r2, t2);
        return e2 ? {
            writable: !0,
            configurable: 1 !== n2.i || "length" !== t2,
            enumerable: e2.enumerable,
            value: r2[t2]
        } : e2;
    },
    defineProperty: function() {
        n1(11);
    },
    getPrototypeOf: function(n2) {
        return Object.getPrototypeOf(n2.t);
    },
    setPrototypeOf: function() {
        n1(12);
    }
}, en = {
};
i3(rn, function(n2, t2) {
    en[n2] = function() {
        return arguments[0] = arguments[0][0], t2.apply(this, arguments);
    };
}), en.deleteProperty = function(t2, r2) {
    return "production" !== process.env.NODE_ENV && isNaN(parseInt(r2)) && n1(13), rn.deleteProperty.call(this, t2[0], r2);
}, en.set = function(t2, r2, e2) {
    return "production" !== process.env.NODE_ENV && "length" !== r2 && isNaN(parseInt(r2)) && n1(14), rn.set.call(this, t2[0], r2, e2, t2[0]);
};
var on = function() {
    function e2(n2) {
        this.O = B1, this.N = !0, "boolean" == typeof (null == n2 ? void 0 : n2.useProxies) && this.setUseProxies(n2.useProxies), "boolean" == typeof (null == n2 ? void 0 : n2.autoFreeze) && this.setAutoFreeze(n2.autoFreeze), this.produce = this.produce.bind(this), this.produceWithPatches = this.produceWithPatches.bind(this);
    }
    var i7 = e2.prototype;
    return i7.produce = function(t2, e6, i8) {
        if ("function" == typeof t2 && "function" != typeof e6) {
            var o9 = e6;
            e6 = t2;
            var u3 = this;
            return function(n2) {
                var t3 = this;
                (void 0) === n2 && (n2 = o9);
                for(var r2 = arguments.length, i9 = Array(r2 > 1 ? r2 - 1 : 0), a5 = 1; a5 < r2; a5++)i9[a5 - 1] = arguments[a5];
                return u3.produce(n2, function(n3) {
                    var r4;
                    return (r4 = e6).call.apply(r4, [
                        t3,
                        n3
                    ].concat(i9));
                });
            };
        }
        var a5;
        if ("function" != typeof e6 && n1(6), (void 0) !== i8 && "function" != typeof i8 && n1(7), r1(t2)) {
            var f4 = w1(this), c4 = R1(this, t2, void 0), s6 = !0;
            try {
                a5 = e6(c4), s6 = !1;
            } finally{
                s6 ? g1(f4) : O2(f4);
            }
            return "undefined" != typeof Promise && a5 instanceof Promise ? a5.then(function(n2) {
                return (j1(f4, i8), P1(n2, f4));
            }, function(n2) {
                throw (g1(f4), n2);
            }) : (j1(f4, i8), P1(a5, f4));
        }
        if (!t2 || "object" != typeof t2) {
            if ((a5 = e6(t2)) === H2) return;
            return (void 0) === a5 && (a5 = t2), this.N && d1(a5, !0), a5;
        }
        n1(21, t2);
    }, i7.produceWithPatches = function(n2, t2) {
        var r2, e6, i8 = this;
        return "function" == typeof n2 ? function(t3) {
            for(var r4 = arguments.length, e7 = Array(r4 > 1 ? r4 - 1 : 0), o10 = 1; o10 < r4; o10++)e7[o10 - 1] = arguments[o10];
            return i8.produceWithPatches(t3, function(t4) {
                return n2.apply(void 0, [
                    t4
                ].concat(e7));
            });
        } : [
            this.produce(n2, t2, function(n3, t3) {
                r2 = n3, e6 = t3;
            }),
            r2,
            e6
        ];
    }, i7.createDraft = function(e6) {
        r1(e6) || n1(8), t1(e6) && (e6 = D1(e6));
        var i8 = w1(this), o10 = R1(this, e6, void 0);
        return o10[Q2].C = !0, O2(i8), o10;
    }, i7.finishDraft = function(t2, r2) {
        var e6 = t2 && t2[Q2];
        "production" !== process.env.NODE_ENV && (e6 && e6.C || n1(9), e6.I && n1(10));
        var i8 = e6.A;
        return j1(i8, r2), P1(void 0, i8);
    }, i7.setAutoFreeze = function(n2) {
        this.N = n2;
    }, i7.setUseProxies = function(t2) {
        t2 && !B1 && n1(20), this.O = t2;
    }, i7.applyPatches = function(n2, r2) {
        var e6;
        for(e6 = r2.length - 1; e6 >= 0; e6--){
            var i8 = r2[e6];
            if (0 === i8.path.length && "replace" === i8.op) {
                n2 = i8.value;
                break;
            }
        }
        var o10 = b1("Patches").$;
        return t1(n2) ? o10(n2, r2) : this.produce(n2, function(n3) {
            return o10(n3, r2.slice(e6 + 1));
        });
    }, e2;
}(), un = new on, an = un.produce, fn = un.produceWithPatches.bind(un), cn = un.setAutoFreeze.bind(un), vn = un.applyPatches.bind(un);
const immer = an;
F1();
cn(false);
if (Blob.prototype.text == null) {
    Blob.prototype.text = function() {
        const reader = new FileReader();
        const promise = new Promise((resolve, reject)=>{
            reader.onload = ()=>{
                resolve(reader.result);
            };
            reader.onerror = (e2)=>{
                reader.abort();
                reject(e2);
            };
        });
        reader.readAsText(this);
        return promise;
    };
}
if (Blob.prototype.arrayBuffer == null) {
    Blob.prototype.arrayBuffer = function() {
        return new Response(this).arrayBuffer();
    };
}
const reconnect_after_close_delay = 500;
const timeout_promise = (promise, time_ms)=>Promise.race([
        promise,
        new Promise((resolve, reject)=>{
            setTimeout(()=>{
                reject(new Error("Promise timed out."));
            }, time_ms);
        }), 
    ])
;
const retry_until_resolved = (f7, time_ms)=>timeout_promise(f7(), time_ms).catch((e2)=>{
        console.error(e2);
        console.error("godverdomme");
        return retry_until_resolved(f7, time_ms);
    })
;
const resolvable_promise = ()=>{
    let resolve = ()=>{
    };
    let reject = ()=>{
    };
    const p4 = new Promise((_resolve, _reject)=>{
        resolve = _resolve;
        reject = _reject;
    });
    return {
        current: p4,
        resolve: resolve,
        reject: reject
    };
};
const get_unique_short_id = ()=>crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
;
const socket_is_alright = (socket)=>socket.readyState == WebSocket.OPEN || socket.readyState == WebSocket.CONNECTING
;
const socket_is_alright_with_grace_period = (socket)=>new Promise((res)=>{
        if (socket_is_alright(socket)) {
            res(true);
        } else {
            setTimeout(()=>{
                res(socket_is_alright(socket));
            }, 1000);
        }
    })
;
const try_close_socket_connection = (socket)=>{
    socket.onopen = ()=>{
        try_close_socket_connection(socket);
    };
    socket.onmessage = socket.onclose = socket.onerror = undefined;
    try {
        socket.close(1000, "byebye");
    } catch (ex) {
    }
};
const msgpack = ((silly_function)=>silly_function()
)(function() {
    return (function t2(r2, e2, n2) {
        function i7(f7, u4) {
            if (!e2[f7]) {
                if (!r2[f7]) {
                    var a5 = "function" == typeof require && require;
                    if (!u4 && a5) return a5(f7, !0);
                    if (o10) return o10(f7, !0);
                    var s7 = new Error("Cannot find module '" + f7 + "'");
                    throw s7.code = "MODULE_NOT_FOUND", s7;
                }
                var c5 = e2[f7] = {
                    exports: {
                    }
                };
                r2[f7][0].call(c5.exports, function(t3) {
                    var e6 = r2[f7][1][t3];
                    return i7(e6 ? e6 : t3);
                }, c5, c5.exports, t2, r2, e2, n2);
            }
            return e2[f7].exports;
        }
        for(var o10 = "function" == typeof require && require, f7 = 0; f7 < n2.length; f7++)i7(n2[f7]);
        return i7;
    })({
        1: [
            function(t3, r2, e2) {
                e2.encode = t3("./encode").encode, e2.decode = t3("./decode").decode, e2.Encoder = t3("./encoder").Encoder, e2.Decoder = t3("./decoder").Decoder, e2.createCodec = t3("./ext").createCodec, e2.codec = t3("./codec").codec;
            },
            {
                "./codec": 10,
                "./decode": 12,
                "./decoder": 13,
                "./encode": 15,
                "./encoder": 16,
                "./ext": 20
            }
        ],
        2: [
            function(t3, r2, e2) {
                (function(Buffer) {
                    function t4(t5) {
                        return t5 && t5.isBuffer && t5;
                    }
                    r2.exports = t4("undefined" != typeof Buffer && Buffer) || t4(this.Buffer) || t4("undefined" != typeof window && window.Buffer) || this.Buffer;
                }).call(this, t3("buffer").Buffer);
            },
            {
                buffer: 29
            }
        ],
        3: [
            function(t3, r2, e2) {
                function n2(t4, r4) {
                    for(var e6 = this, n2 = r4 || (r4 |= 0), i7 = t4.length, o10 = 0, f7 = 0; f7 < i7;)o10 = t4.charCodeAt(f7++), o10 < 128 ? e6[n2++] = o10 : o10 < 2048 ? (e6[n2++] = 192 | o10 >>> 6, e6[n2++] = 128 | 63 & o10) : o10 < 55296 || o10 > 57343 ? (e6[n2++] = 224 | o10 >>> 12, e6[n2++] = 128 | o10 >>> 6 & 63, e6[n2++] = 128 | 63 & o10) : (o10 = (o10 - 55296 << 10 | t4.charCodeAt(f7++) - 56320) + 65536, e6[n2++] = 240 | o10 >>> 18, e6[n2++] = 128 | o10 >>> 12 & 63, e6[n2++] = 128 | o10 >>> 6 & 63, e6[n2++] = 128 | 63 & o10);
                    return n2 - r4;
                }
                function i7(t4, r4, e6) {
                    var n3 = this, i7 = 0 | r4;
                    e6 || (e6 = n3.length);
                    for(var o10 = "", f7 = 0; i7 < e6;)f7 = n3[i7++], f7 < 128 ? o10 += String.fromCharCode(f7) : (192 === (224 & f7) ? f7 = (31 & f7) << 6 | 63 & n3[i7++] : 224 === (240 & f7) ? f7 = (15 & f7) << 12 | (63 & n3[i7++]) << 6 | 63 & n3[i7++] : 240 === (248 & f7) && (f7 = (7 & f7) << 18 | (63 & n3[i7++]) << 12 | (63 & n3[i7++]) << 6 | 63 & n3[i7++]), f7 >= 65536 ? (f7 -= 65536, o10 += String.fromCharCode((f7 >>> 10) + 55296, (1023 & f7) + 56320)) : o10 += String.fromCharCode(f7));
                    return o10;
                }
                function o10(t4, r4, e6, n3) {
                    var i9;
                    e6 || (e6 = 0), n3 || 0 === n3 || (n3 = this.length), r4 || (r4 = 0);
                    var o10 = n3 - e6;
                    if (t4 === this && e6 < r4 && r4 < n3) for(i9 = o10 - 1; i9 >= 0; i9--)t4[i9 + r4] = this[i9 + e6];
                    else for(i9 = 0; i9 < o10; i9++)t4[i9 + r4] = this[i9 + e6];
                    return o10;
                }
                e2.copy = o10, e2.toString = i7, e2.write = n2;
            },
            {
            }
        ],
        4: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return new Array(t4);
                }
                function i7(t4) {
                    if (!o10.isBuffer(t4) && o10.isView(t4)) t4 = o10.Uint8Array.from(t4);
                    else if (o10.isArrayBuffer(t4)) t4 = new Uint8Array(t4);
                    else {
                        if ("string" == typeof t4) return o10.from.call(e2, t4);
                        if ("number" == typeof t4) throw new TypeError('"value" argument must not be a number');
                    }
                    return Array.prototype.slice.call(t4);
                }
                var o10 = t3("./bufferish"), e2 = r2.exports = n2(0);
                e2.alloc = n2, e2.concat = o10.concat, e2.from = i7;
            },
            {
                "./bufferish": 8
            }
        ],
        5: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return new Buffer(t4);
                }
                function i7(t4) {
                    if (!o10.isBuffer(t4) && o10.isView(t4)) t4 = o10.Uint8Array.from(t4);
                    else if (o10.isArrayBuffer(t4)) t4 = new Uint8Array(t4);
                    else {
                        if ("string" == typeof t4) return o10.from.call(e2, t4);
                        if ("number" == typeof t4) throw new TypeError('"value" argument must not be a number');
                    }
                    return Buffer.from && 1 !== Buffer.from.length ? Buffer.from(t4) : new Buffer(t4);
                }
                var o10 = t3("./bufferish"), Buffer = o10.global, e2 = r2.exports = o10.hasBuffer ? n2(0) : [];
                e2.alloc = o10.hasBuffer && Buffer.alloc || n2, e2.concat = o10.concat, e2.from = i7;
            },
            {
                "./bufferish": 8
            }
        ],
        6: [
            function(t3, r2, e2) {
                function n2(t4, r4, e6, n3) {
                    var o10 = a6.isBuffer(this), f7 = a6.isBuffer(t4);
                    if (o10 && f7) return this.copy(t4, r4, e6, n3);
                    if (c7 || o10 || f7 || !a6.isView(this) || !a6.isView(t4)) return u5.copy.call(this, t4, r4, e6, n3);
                    var s8 = e6 || null != n3 ? i9.call(this, e6, n3) : this;
                    return (t4.set(s8, r4), s8.length);
                }
                function i9(t4, r4) {
                    var e6 = this.slice || !c7 && this.subarray;
                    if (e6) return e6.call(this, t4, r4);
                    var i9 = a6.alloc.call(this, r4 - t4);
                    return (n2.call(this, i9, 0, t4, r4), i9);
                }
                function o10(t4, r4, e6) {
                    var n3 = !s8 && a6.isBuffer(this) ? this.toString : u5.toString;
                    return n3.apply(this, arguments);
                }
                function f7(t4) {
                    function r4() {
                        var r4 = this[t4] || u5[t4];
                        return r4.apply(this, arguments);
                    }
                    return r4;
                }
                var u5 = t3("./buffer-lite");
                e2.copy = n2, e2.slice = i9, e2.toString = o10, e2.write = f7("write");
                var a6 = t3("./bufferish"), Buffer = a6.global, s8 = a6.hasBuffer && "TYPED_ARRAY_SUPPORT" in Buffer, c7 = s8 && !Buffer.TYPED_ARRAY_SUPPORT;
            },
            {
                "./buffer-lite": 3,
                "./bufferish": 8
            }
        ],
        7: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return new Uint8Array(t4);
                }
                function i9(t4) {
                    if (o10.isView(t4)) {
                        var r4 = t4.byteOffset, n3 = t4.byteLength;
                        t4 = t4.buffer, t4.byteLength !== n3 && (t4.slice ? t4 = t4.slice(r4, r4 + n3) : (t4 = new Uint8Array(t4), t4.byteLength !== n3 && (t4 = Array.prototype.slice.call(t4, r4, r4 + n3))));
                    } else {
                        if ("string" == typeof t4) return o10.from.call(e2, t4);
                        if ("number" == typeof t4) throw new TypeError('"value" argument must not be a number');
                    }
                    return new Uint8Array(t4);
                }
                var o10 = t3("./bufferish"), e2 = r2.exports = o10.hasArrayBuffer ? n2(0) : [];
                e2.alloc = n2, e2.concat = o10.concat, e2.from = i9;
            },
            {
                "./bufferish": 8
            }
        ],
        8: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return "string" == typeof t4 ? u5.call(this, t4) : a6(this).from(t4);
                }
                function i9(t4) {
                    return a6(this).alloc(t4);
                }
                function o10(t4, r6) {
                    function n4(t5) {
                        r6 += t5.length;
                    }
                    function o10(t5) {
                        a6 += w3.copy.call(t5, u5, a6);
                    }
                    r6 || (r6 = 0, Array.prototype.forEach.call(t4, n4));
                    var f7 = this !== e2 && this || t4[0], u5 = i9.call(f7, r6), a6 = 0;
                    return (Array.prototype.forEach.call(t4, o10), u5);
                }
                function f7(t4) {
                    return t4 instanceof ArrayBuffer || E3(t4);
                }
                function u5(t4) {
                    var r6 = 3 * t4.length, e6 = i9.call(this, r6), n4 = w3.write.call(e6, t4);
                    return (r6 !== n4 && (e6 = w3.slice.call(e6, 0, n4)), e6);
                }
                function a6(t4) {
                    return d5(t4) ? g3 : y3(t4) ? b3 : p5(t4) ? v5 : h3 ? g3 : l5 ? b3 : v5;
                }
                function s8() {
                    return !1;
                }
                function c7(t4, r6) {
                    return (t4 = "[object " + t4 + "]", function(e6) {
                        return null != e6 && ({
                        }).toString.call(r6 ? e6[r6] : e6) === t4;
                    });
                }
                var Buffer = e2.global = t3("./buffer-global"), h3 = e2.hasBuffer = Buffer && !!Buffer.isBuffer, l5 = e2.hasArrayBuffer = "undefined" != typeof ArrayBuffer, p5 = e2.isArray = t3("isarray");
                e2.isArrayBuffer = l5 ? f7 : s8;
                var d5 = e2.isBuffer = h3 ? Buffer.isBuffer : s8, y3 = e2.isView = l5 ? ArrayBuffer.isView || c7("ArrayBuffer", "buffer") : s8;
                e2.alloc = i9, e2.concat = o10, e2.from = n2;
                var v5 = e2.Array = t3("./bufferish-array"), g3 = e2.Buffer = t3("./bufferish-buffer"), b3 = e2.Uint8Array = t3("./bufferish-uint8array"), w3 = e2.prototype = t3("./bufferish-proto"), E3 = c7("ArrayBuffer");
            },
            {
                "./buffer-global": 2,
                "./bufferish-array": 4,
                "./bufferish-buffer": 5,
                "./bufferish-proto": 6,
                "./bufferish-uint8array": 7,
                isarray: 34
            }
        ],
        9: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return this instanceof n2 ? (this.options = t4, void this.init()) : new n2(t4);
                }
                function i9(t4) {
                    for(var r6 in t4)n2.prototype[r6] = o10(n2.prototype[r6], t4[r6]);
                }
                function o10(t4, r6) {
                    function e6() {
                        return (t4.apply(this, arguments), r6.apply(this, arguments));
                    }
                    return t4 && r6 ? e6 : t4 || r6;
                }
                function f7(t4) {
                    function r6(t5, r7) {
                        return r7(t5);
                    }
                    return (t4 = t4.slice(), function(e6) {
                        return t4.reduce(r6, e6);
                    });
                }
                function u5(t4) {
                    return s8(t4) ? f7(t4) : t4;
                }
                function a6(t4) {
                    return new n2(t4);
                }
                var s8 = t3("isarray");
                e2.createCodec = a6, e2.install = i9, e2.filter = u5;
                var c7 = t3("./bufferish");
                n2.prototype.init = function() {
                    var t4 = this.options;
                    return t4 && t4.uint8array && (this.bufferish = c7.Uint8Array), this;
                }, e2.preset = a6({
                    preset: !0
                });
            },
            {
                "./bufferish": 8,
                isarray: 34
            }
        ],
        10: [
            function(t3, r2, e2) {
                t3("./read-core"), t3("./write-core"), e2.codec = {
                    preset: t3("./codec-base").preset
                };
            },
            {
                "./codec-base": 9,
                "./read-core": 22,
                "./write-core": 25
            }
        ],
        11: [
            function(t3, r2, e2) {
                function n2(t4) {
                    if (!(this instanceof n2)) return new n2(t4);
                    if (t4 && (this.options = t4, t4.codec)) {
                        var r6 = this.codec = t4.codec;
                        r6.bufferish && (this.bufferish = r6.bufferish);
                    }
                }
                e2.DecodeBuffer = n2;
                var i9 = t3("./read-core").preset, o10 = t3("./flex-buffer").FlexDecoder;
                o10.mixin(n2.prototype), n2.prototype.codec = i9, n2.prototype.fetch = function() {
                    return this.codec.decode(this);
                };
            },
            {
                "./flex-buffer": 21,
                "./read-core": 22
            }
        ],
        12: [
            function(t3, r2, e2) {
                function n2(t4, r7) {
                    var e6 = new i9(r7);
                    return (e6.write(t4), e6.read());
                }
                e2.decode = n2;
                var i9 = t3("./decode-buffer").DecodeBuffer;
            },
            {
                "./decode-buffer": 11
            }
        ],
        13: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return this instanceof n2 ? void o10.call(this, t4) : new n2(t4);
                }
                e2.Decoder = n2;
                var i9 = t3("event-lite"), o10 = t3("./decode-buffer").DecodeBuffer;
                n2.prototype = new o10, i9.mixin(n2.prototype), n2.prototype.decode = function(t4) {
                    arguments.length && this.write(t4), this.flush();
                }, n2.prototype.push = function(t4) {
                    this.emit("data", t4);
                }, n2.prototype.end = function(t4) {
                    this.decode(t4), this.emit("end");
                };
            },
            {
                "./decode-buffer": 11,
                "event-lite": 31
            }
        ],
        14: [
            function(t3, r2, e2) {
                function n2(t4) {
                    if (!(this instanceof n2)) return new n2(t4);
                    if (t4 && (this.options = t4, t4.codec)) {
                        var r7 = this.codec = t4.codec;
                        r7.bufferish && (this.bufferish = r7.bufferish);
                    }
                }
                e2.EncodeBuffer = n2;
                var i9 = t3("./write-core").preset, o10 = t3("./flex-buffer").FlexEncoder;
                o10.mixin(n2.prototype), n2.prototype.codec = i9, n2.prototype.write = function(t4) {
                    this.codec.encode(this, t4);
                };
            },
            {
                "./flex-buffer": 21,
                "./write-core": 25
            }
        ],
        15: [
            function(t3, r2, e2) {
                function n2(t4, r8) {
                    var e6 = new i9(r8);
                    return (e6.write(t4), e6.read());
                }
                e2.encode = n2;
                var i9 = t3("./encode-buffer").EncodeBuffer;
            },
            {
                "./encode-buffer": 14
            }
        ],
        16: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return this instanceof n2 ? void o10.call(this, t4) : new n2(t4);
                }
                e2.Encoder = n2;
                var i9 = t3("event-lite"), o10 = t3("./encode-buffer").EncodeBuffer;
                n2.prototype = new o10, i9.mixin(n2.prototype), n2.prototype.encode = function(t4) {
                    this.write(t4), this.emit("data", this.read());
                }, n2.prototype.end = function(t4) {
                    arguments.length && this.encode(t4), this.flush(), this.emit("end");
                };
            },
            {
                "./encode-buffer": 14,
                "event-lite": 31
            }
        ],
        17: [
            function(t3, r2, e2) {
                function n2(t4, r8) {
                    return this instanceof n2 ? (this.buffer = i9.from(t4), void (this.type = r8)) : new n2(t4, r8);
                }
                e2.ExtBuffer = n2;
                var i9 = t3("./bufferish");
            },
            {
                "./bufferish": 8
            }
        ],
        18: [
            function(t3, r2, e2) {
                function n2(t4) {
                    t4.addExtPacker(14, Error, [
                        u5,
                        i9
                    ]), t4.addExtPacker(1, EvalError, [
                        u5,
                        i9
                    ]), t4.addExtPacker(2, RangeError, [
                        u5,
                        i9
                    ]), t4.addExtPacker(3, ReferenceError, [
                        u5,
                        i9
                    ]), t4.addExtPacker(4, SyntaxError, [
                        u5,
                        i9
                    ]), t4.addExtPacker(5, TypeError, [
                        u5,
                        i9
                    ]), t4.addExtPacker(6, URIError, [
                        u5,
                        i9
                    ]), t4.addExtPacker(10, RegExp, [
                        f7,
                        i9
                    ]), t4.addExtPacker(11, Boolean, [
                        o10,
                        i9
                    ]), t4.addExtPacker(12, String, [
                        o10,
                        i9
                    ]), t4.addExtPacker(13, Date, [
                        Number,
                        i9
                    ]), t4.addExtPacker(15, Number, [
                        o10,
                        i9
                    ]), "undefined" != typeof Uint8Array && (t4.addExtPacker(17, Int8Array, c7), t4.addExtPacker(18, Uint8Array, c7), t4.addExtPacker(19, Int16Array, c7), t4.addExtPacker(20, Uint16Array, c7), t4.addExtPacker(21, Int32Array, c7), t4.addExtPacker(22, Uint32Array, c7), t4.addExtPacker(23, Float32Array, c7), "undefined" != typeof Float64Array && t4.addExtPacker(24, Float64Array, c7), "undefined" != typeof Uint8ClampedArray && t4.addExtPacker(25, Uint8ClampedArray, c7), t4.addExtPacker(26, ArrayBuffer, c7), t4.addExtPacker(29, DataView, c7)), s8.hasBuffer && t4.addExtPacker(27, Buffer, s8.from);
                }
                function i9(r8) {
                    return (a6 || (a6 = t3("./encode").encode), a6(r8));
                }
                function o10(t4) {
                    return t4.valueOf();
                }
                function f7(t4) {
                    t4 = RegExp.prototype.toString.call(t4).split("/"), t4.shift();
                    var r8 = [
                        t4.pop()
                    ];
                    return (r8.unshift(t4.join("/")), r8);
                }
                function u5(t4) {
                    var r8 = {
                    };
                    for(var e6 in h3)r8[e6] = t4[e6];
                    return r8;
                }
                e2.setExtPackers = n2;
                var a6, s8 = t3("./bufferish"), Buffer = s8.global, c7 = s8.Uint8Array.from, h3 = {
                    name: 1,
                    message: 1,
                    stack: 1,
                    columnNumber: 1,
                    fileName: 1,
                    lineNumber: 1
                };
            },
            {
                "./bufferish": 8,
                "./encode": 15
            }
        ],
        19: [
            function(t3, r2, e2) {
                function n2(t4) {
                    t4.addExtUnpacker(14, [
                        i9,
                        f7(Error)
                    ]), t4.addExtUnpacker(1, [
                        i9,
                        f7(EvalError)
                    ]), t4.addExtUnpacker(2, [
                        i9,
                        f7(RangeError)
                    ]), t4.addExtUnpacker(3, [
                        i9,
                        f7(ReferenceError)
                    ]), t4.addExtUnpacker(4, [
                        i9,
                        f7(SyntaxError)
                    ]), t4.addExtUnpacker(5, [
                        i9,
                        f7(TypeError)
                    ]), t4.addExtUnpacker(6, [
                        i9,
                        f7(URIError)
                    ]), t4.addExtUnpacker(10, [
                        i9,
                        o10
                    ]), t4.addExtUnpacker(11, [
                        i9,
                        u5(Boolean)
                    ]), t4.addExtUnpacker(12, [
                        i9,
                        u5(String)
                    ]), t4.addExtUnpacker(13, [
                        i9,
                        u5(Date)
                    ]), t4.addExtUnpacker(15, [
                        i9,
                        u5(Number)
                    ]), "undefined" != typeof Uint8Array && (t4.addExtUnpacker(17, u5(Int8Array)), t4.addExtUnpacker(18, u5(Uint8Array)), t4.addExtUnpacker(19, [
                        a6,
                        u5(Int16Array)
                    ]), t4.addExtUnpacker(20, [
                        a6,
                        u5(Uint16Array)
                    ]), t4.addExtUnpacker(21, [
                        a6,
                        u5(Int32Array)
                    ]), t4.addExtUnpacker(22, [
                        a6,
                        u5(Uint32Array)
                    ]), t4.addExtUnpacker(23, [
                        a6,
                        u5(Float32Array)
                    ]), "undefined" != typeof Float64Array && t4.addExtUnpacker(24, [
                        a6,
                        u5(Float64Array)
                    ]), "undefined" != typeof Uint8ClampedArray && t4.addExtUnpacker(25, u5(Uint8ClampedArray)), t4.addExtUnpacker(26, a6), t4.addExtUnpacker(29, [
                        a6,
                        u5(DataView)
                    ])), c7.hasBuffer && t4.addExtUnpacker(27, u5(Buffer));
                }
                function i9(r8) {
                    return (s8 || (s8 = t3("./decode").decode), s8(r8));
                }
                function o10(t4) {
                    return RegExp.apply(null, t4);
                }
                function f7(t4) {
                    return function(r8) {
                        var e6 = new t4;
                        for(var n4 in h3)e6[n4] = r8[n4];
                        return e6;
                    };
                }
                function u5(t4) {
                    return function(r8) {
                        return new t4(r8);
                    };
                }
                function a6(t4) {
                    return new Uint8Array(t4).buffer;
                }
                e2.setExtUnpackers = n2;
                var s8, c7 = t3("./bufferish"), Buffer = c7.global, h3 = {
                    name: 1,
                    message: 1,
                    stack: 1,
                    columnNumber: 1,
                    fileName: 1,
                    lineNumber: 1
                };
            },
            {
                "./bufferish": 8,
                "./decode": 12
            }
        ],
        20: [
            function(t3, r2, e2) {
                t3("./read-core"), t3("./write-core"), e2.createCodec = t3("./codec-base").createCodec;
            },
            {
                "./codec-base": 9,
                "./read-core": 22,
                "./write-core": 25
            }
        ],
        21: [
            function(t3, r2, e2) {
                function n2() {
                    if (!(this instanceof n2)) return new n2;
                }
                function i9() {
                    if (!(this instanceof i9)) return new i9;
                }
                function o10() {
                    function t4(t5) {
                        var r8 = this.offset ? p5.prototype.slice.call(this.buffer, this.offset) : this.buffer;
                        this.buffer = r8 ? t5 ? this.bufferish.concat([
                            r8,
                            t5
                        ]) : r8 : t5, this.offset = 0;
                    }
                    function r8() {
                        for(; this.offset < this.buffer.length;){
                            var t5, r8 = this.offset;
                            try {
                                t5 = this.fetch();
                            } catch (t) {
                                if (t && t.message != v5) throw t;
                                this.offset = r8;
                                break;
                            }
                            this.push(t5);
                        }
                    }
                    function e6(t6) {
                        var r9 = this.offset, e6 = r9 + t6;
                        if (e6 > this.buffer.length) throw new Error(v5);
                        return (this.offset = e6, r9);
                    }
                    return {
                        bufferish: p5,
                        write: t4,
                        fetch: a6,
                        flush: r8,
                        push: c7,
                        pull: h3,
                        read: s8,
                        reserve: e6,
                        offset: 0
                    };
                }
                function f7() {
                    function t4() {
                        var t4 = this.start;
                        if (t4 < this.offset) {
                            var r8 = this.start = this.offset;
                            return p5.prototype.slice.call(this.buffer, t4, r8);
                        }
                    }
                    function r9() {
                        for(; this.start < this.offset;){
                            var t6 = this.fetch();
                            t6 && this.push(t6);
                        }
                    }
                    function e6() {
                        var t7 = this.buffers || (this.buffers = []), r10 = t7.length > 1 ? this.bufferish.concat(t7) : t7[0];
                        return (t7.length = 0, r10);
                    }
                    function n4(t7) {
                        var r10 = 0 | t7;
                        if (this.buffer) {
                            var e7 = this.buffer.length, n4 = 0 | this.offset, i10 = n4 + r10;
                            if (i10 < e7) return (this.offset = i10, n4);
                            this.flush(), t7 = Math.max(t7, Math.min(2 * e7, this.maxBufferSize));
                        }
                        return (t7 = Math.max(t7, this.minBufferSize), this.buffer = this.bufferish.alloc(t7), this.start = 0, this.offset = r10, 0);
                    }
                    function i11(t7) {
                        var r10 = t7.length;
                        if (r10 > this.minBufferSize) this.flush(), this.push(t7);
                        else {
                            var e8 = this.reserve(r10);
                            p5.prototype.copy.call(t7, this.buffer, e8);
                        }
                    }
                    return {
                        bufferish: p5,
                        write: u5,
                        fetch: t4,
                        flush: r9,
                        push: c7,
                        pull: e6,
                        read: s8,
                        reserve: n4,
                        send: i11,
                        maxBufferSize: y3,
                        minBufferSize: d5,
                        offset: 0,
                        start: 0
                    };
                }
                function u5() {
                    throw new Error("method not implemented: write()");
                }
                function a6() {
                    throw new Error("method not implemented: fetch()");
                }
                function s8() {
                    var t4 = this.buffers && this.buffers.length;
                    return t4 ? (this.flush(), this.pull()) : this.fetch();
                }
                function c7(t4) {
                    var r9 = this.buffers || (this.buffers = []);
                    r9.push(t4);
                }
                function h3() {
                    var t4 = this.buffers || (this.buffers = []);
                    return t4.shift();
                }
                function l5(t4) {
                    function r9(r10) {
                        for(var e6 in t4)r10[e6] = t4[e6];
                        return r10;
                    }
                    return r9;
                }
                e2.FlexDecoder = n2, e2.FlexEncoder = i9;
                var p5 = t3("./bufferish"), d5 = 2048, y3 = 65536, v5 = "BUFFER_SHORTAGE";
                n2.mixin = l5(o10()), n2.mixin(n2.prototype), i9.mixin = l5(f7()), i9.mixin(i9.prototype);
            },
            {
                "./bufferish": 8
            }
        ],
        22: [
            function(t3, r2, e2) {
                function n2(t4) {
                    function r9(t7) {
                        var r9 = s8(t7), n4 = e9[r9];
                        if (!n4) throw new Error("Invalid type: " + (r9 ? "0x" + r9.toString(16) : r9));
                        return n4(t7);
                    }
                    var e9 = c7.getReadToken(t4);
                    return r9;
                }
                function i9() {
                    var t4 = this.options;
                    return (this.decode = n2(t4), t4 && t4.preset && a6.setExtUnpackers(this), this);
                }
                function o10(t4, r9) {
                    var e9 = this.extUnpackers || (this.extUnpackers = []);
                    e9[t4] = h3.filter(r9);
                }
                function f7(t4) {
                    function r9(r10) {
                        return new u5(r10, t4);
                    }
                    var e9 = this.extUnpackers || (this.extUnpackers = []);
                    return e9[t4] || r9;
                }
                var u5 = t3("./ext-buffer").ExtBuffer, a6 = t3("./ext-unpacker"), s8 = t3("./read-format").readUint8, c7 = t3("./read-token"), h3 = t3("./codec-base");
                h3.install({
                    addExtUnpacker: o10,
                    getExtUnpacker: f7,
                    init: i9
                }), e2.preset = i9.call(h3.preset);
            },
            {
                "./codec-base": 9,
                "./ext-buffer": 17,
                "./ext-unpacker": 19,
                "./read-format": 23,
                "./read-token": 24
            }
        ],
        23: [
            function(t3, r2, e2) {
                function n2(t4) {
                    var r9 = k3.hasArrayBuffer && t4 && t4.binarraybuffer, e9 = t4 && t4.int64, n2 = T3 && t4 && t4.usemap, B2 = {
                        map: n2 ? o10 : i9,
                        array: f7,
                        str: u5,
                        bin: r9 ? s8 : a6,
                        ext: c7,
                        uint8: h3,
                        uint16: p5,
                        uint32: y3,
                        uint64: g3(8, e9 ? E3 : b3),
                        int8: l5,
                        int16: d5,
                        int32: v5,
                        int64: g3(8, e9 ? A3 : w3),
                        float32: g3(4, m3),
                        float64: g3(8, x3)
                    };
                    return B2;
                }
                function i9(t4, r9) {
                    var e9, n4 = {
                    }, i9 = new Array(r9), o10 = new Array(r9), f7 = t4.codec.decode;
                    for(e9 = 0; e9 < r9; e9++)i9[e9] = f7(t4), o10[e9] = f7(t4);
                    for(e9 = 0; e9 < r9; e9++)n4[i9[e9]] = o10[e9];
                    return n4;
                }
                function o10(t4, r9) {
                    var e9, n4 = new Map, i11 = new Array(r9), o10 = new Array(r9), f7 = t4.codec.decode;
                    for(e9 = 0; e9 < r9; e9++)i11[e9] = f7(t4), o10[e9] = f7(t4);
                    for(e9 = 0; e9 < r9; e9++)n4.set(i11[e9], o10[e9]);
                    return n4;
                }
                function f7(t4, r9) {
                    for(var e9 = new Array(r9), n4 = t4.codec.decode, i11 = 0; i11 < r9; i11++)e9[i11] = n4(t4);
                    return e9;
                }
                function u5(t4, r9) {
                    var e9 = t4.reserve(r9), n4 = e9 + r9;
                    return _6.toString.call(t4.buffer, "utf-8", e9, n4);
                }
                function a6(t4, r9) {
                    var e9 = t4.reserve(r9), n4 = e9 + r9, i11 = _6.slice.call(t4.buffer, e9, n4);
                    return k3.from(i11);
                }
                function s8(t4, r9) {
                    var e9 = t4.reserve(r9), n4 = e9 + r9, i11 = _6.slice.call(t4.buffer, e9, n4);
                    return k3.Uint8Array.from(i11).buffer;
                }
                function c7(t4, r9) {
                    var e9 = t4.reserve(r9 + 1), n4 = t4.buffer[e9++], i11 = e9 + r9, o11 = t4.codec.getExtUnpacker(n4);
                    if (!o11) throw new Error("Invalid ext type: " + (n4 ? "0x" + n4.toString(16) : n4));
                    var f8 = _6.slice.call(t4.buffer, e9, i11);
                    return o11(f8);
                }
                function h3(t4) {
                    var r9 = t4.reserve(1);
                    return t4.buffer[r9];
                }
                function l5(t4) {
                    var r9 = t4.reserve(1), e9 = t4.buffer[r9];
                    return 128 & e9 ? e9 - 256 : e9;
                }
                function p5(t4) {
                    var r9 = t4.reserve(2), e9 = t4.buffer;
                    return e9[r9++] << 8 | e9[r9];
                }
                function d5(t4) {
                    var r9 = t4.reserve(2), e9 = t4.buffer, n4 = e9[r9++] << 8 | e9[r9];
                    return 32768 & n4 ? n4 - 65536 : n4;
                }
                function y3(t4) {
                    var r9 = t4.reserve(4), e9 = t4.buffer;
                    return 16777216 * e9[r9++] + (e9[r9++] << 16) + (e9[r9++] << 8) + e9[r9];
                }
                function v5(t4) {
                    var r9 = t4.reserve(4), e9 = t4.buffer;
                    return e9[r9++] << 24 | e9[r9++] << 16 | e9[r9++] << 8 | e9[r9];
                }
                function g3(t4, r9) {
                    return function(e9) {
                        var n4 = e9.reserve(t4);
                        return r9.call(e9.buffer, n4, S3);
                    };
                }
                function b3(t4) {
                    return new P3(this, t4).toNumber();
                }
                function w3(t4) {
                    return new R3(this, t4).toNumber();
                }
                function E3(t4) {
                    return new P3(this, t4);
                }
                function A3(t4) {
                    return new R3(this, t4);
                }
                function m3(t4) {
                    return B3.read(this, t4, !1, 23, 4);
                }
                function x3(t4) {
                    return B3.read(this, t4, !1, 52, 8);
                }
                var B3 = t3("ieee754"), U3 = t3("int64-buffer"), P3 = U3.Uint64BE, R3 = U3.Int64BE;
                e2.getReadFormat = n2, e2.readUint8 = h3;
                var k3 = t3("./bufferish"), _6 = t3("./bufferish-proto"), T3 = "undefined" != typeof Map, S3 = !0;
            },
            {
                "./bufferish": 8,
                "./bufferish-proto": 6,
                ieee754: 32,
                "int64-buffer": 33
            }
        ],
        24: [
            function(t3, r2, e2) {
                function n2(t4) {
                    var r9 = s8.getReadFormat(t4);
                    return t4 && t4.useraw ? o10(r9) : i9(r9);
                }
                function i9(t4) {
                    var r9, e9 = new Array(256);
                    for(r9 = 0; r9 <= 127; r9++)e9[r9] = f7(r9);
                    for(r9 = 128; r9 <= 143; r9++)e9[r9] = a6(r9 - 128, t4.map);
                    for(r9 = 144; r9 <= 159; r9++)e9[r9] = a6(r9 - 144, t4.array);
                    for(r9 = 160; r9 <= 191; r9++)e9[r9] = a6(r9 - 160, t4.str);
                    for((e9[192] = f7(null), e9[193] = null, e9[194] = f7(!1), e9[195] = f7(!0), e9[196] = u5(t4.uint8, t4.bin), e9[197] = u5(t4.uint16, t4.bin), e9[198] = u5(t4.uint32, t4.bin), e9[199] = u5(t4.uint8, t4.ext), e9[200] = u5(t4.uint16, t4.ext), e9[201] = u5(t4.uint32, t4.ext), e9[202] = t4.float32, e9[203] = t4.float64, e9[204] = t4.uint8, e9[205] = t4.uint16, e9[206] = t4.uint32, e9[207] = t4.uint64, e9[208] = t4.int8, e9[209] = t4.int16, e9[210] = t4.int32, e9[211] = t4.int64, e9[212] = a6(1, t4.ext), e9[213] = a6(2, t4.ext), e9[214] = a6(4, t4.ext), e9[215] = a6(8, t4.ext), e9[216] = a6(16, t4.ext), e9[217] = u5(t4.uint8, t4.str), e9[218] = u5(t4.uint16, t4.str), e9[219] = u5(t4.uint32, t4.str), e9[220] = u5(t4.uint16, t4.array), e9[221] = u5(t4.uint32, t4.array), e9[222] = u5(t4.uint16, t4.map), e9[223] = u5(t4.uint32, t4.map), r9 = 224); r9 <= 255; r9++)e9[r9] = f7(r9 - 256);
                    return e9;
                }
                function o10(t4) {
                    var r9, e9 = i9(t4).slice();
                    for((e9[217] = e9[196], e9[218] = e9[197], e9[219] = e9[198], r9 = 160); r9 <= 191; r9++)e9[r9] = a6(r9 - 160, t4.bin);
                    return e9;
                }
                function f7(t4) {
                    return function() {
                        return t4;
                    };
                }
                function u5(t4, r9) {
                    return function(e9) {
                        var n4 = t4(e9);
                        return r9(e9, n4);
                    };
                }
                function a6(t4, r9) {
                    return function(e9) {
                        return r9(e9, t4);
                    };
                }
                var s8 = t3("./read-format");
                e2.getReadToken = n2;
            },
            {
                "./read-format": 23
            }
        ],
        25: [
            function(t3, r2, e2) {
                function n2(t4) {
                    function r9(t7, r10) {
                        var n4 = e9[typeof r10];
                        if (!n4) throw new Error('Unsupported type "' + typeof r10 + '": ' + r10);
                        n4(t7, r10);
                    }
                    var e9 = s8.getWriteType(t4);
                    return r9;
                }
                function i9() {
                    var t4 = this.options;
                    return (this.encode = n2(t4), t4 && t4.preset && a6.setExtPackers(this), this);
                }
                function o10(t4, r9, e9) {
                    function n4(r10) {
                        return (e9 && (r10 = e9(r10)), new u6(r10, t4));
                    }
                    e9 = c7.filter(e9);
                    var i11 = r9.name;
                    if (i11 && "Object" !== i11) {
                        var o10 = this.extPackers || (this.extPackers = {
                        });
                        o10[i11] = n4;
                    } else {
                        var f7 = this.extEncoderList || (this.extEncoderList = []);
                        f7.unshift([
                            r9,
                            n4
                        ]);
                    }
                }
                function f8(t4) {
                    var r9 = this.extPackers || (this.extPackers = {
                    }), e9 = t4.constructor, n4 = e9 && e9.name && r9[e9.name];
                    if (n4) return n4;
                    for(var i11 = this.extEncoderList || (this.extEncoderList = []), o11 = i11.length, f8 = 0; f8 < o11; f8++){
                        var u5 = i11[f8];
                        if (e9 === u5[0]) return u5[1];
                    }
                }
                var u6 = t3("./ext-buffer").ExtBuffer, a6 = t3("./ext-packer"), s8 = t3("./write-type"), c7 = t3("./codec-base");
                c7.install({
                    addExtPacker: o10,
                    getExtPacker: f8,
                    init: i9
                }), e2.preset = i9.call(c7.preset);
            },
            {
                "./codec-base": 9,
                "./ext-buffer": 17,
                "./ext-packer": 18,
                "./write-type": 27
            }
        ],
        26: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return t4 && t4.uint8array ? i9() : m3 || E3.hasBuffer && t4 && t4.safe ? f8() : o10();
                }
                function i9() {
                    var t4 = o10();
                    return (t4[202] = c7(202, 4, p5), t4[203] = c7(203, 8, d5), t4);
                }
                function o10() {
                    var t4 = w3.slice();
                    return (t4[196] = u6(196), t4[197] = a6(197), t4[198] = s8(198), t4[199] = u6(199), t4[200] = a6(200), t4[201] = s8(201), t4[202] = c7(202, 4, x3.writeFloatBE || p5, !0), t4[203] = c7(203, 8, x3.writeDoubleBE || d5, !0), t4[204] = u6(204), t4[205] = a6(205), t4[206] = s8(206), t4[207] = c7(207, 8, h3), t4[208] = u6(208), t4[209] = a6(209), t4[210] = s8(210), t4[211] = c7(211, 8, l5), t4[217] = u6(217), t4[218] = a6(218), t4[219] = s8(219), t4[220] = a6(220), t4[221] = s8(221), t4[222] = a6(222), t4[223] = s8(223), t4);
                }
                function f8() {
                    var t4 = w3.slice();
                    return (t4[196] = c7(196, 1, Buffer.prototype.writeUInt8), t4[197] = c7(197, 2, Buffer.prototype.writeUInt16BE), t4[198] = c7(198, 4, Buffer.prototype.writeUInt32BE), t4[199] = c7(199, 1, Buffer.prototype.writeUInt8), t4[200] = c7(200, 2, Buffer.prototype.writeUInt16BE), t4[201] = c7(201, 4, Buffer.prototype.writeUInt32BE), t4[202] = c7(202, 4, Buffer.prototype.writeFloatBE), t4[203] = c7(203, 8, Buffer.prototype.writeDoubleBE), t4[204] = c7(204, 1, Buffer.prototype.writeUInt8), t4[205] = c7(205, 2, Buffer.prototype.writeUInt16BE), t4[206] = c7(206, 4, Buffer.prototype.writeUInt32BE), t4[207] = c7(207, 8, h3), t4[208] = c7(208, 1, Buffer.prototype.writeInt8), t4[209] = c7(209, 2, Buffer.prototype.writeInt16BE), t4[210] = c7(210, 4, Buffer.prototype.writeInt32BE), t4[211] = c7(211, 8, l5), t4[217] = c7(217, 1, Buffer.prototype.writeUInt8), t4[218] = c7(218, 2, Buffer.prototype.writeUInt16BE), t4[219] = c7(219, 4, Buffer.prototype.writeUInt32BE), t4[220] = c7(220, 2, Buffer.prototype.writeUInt16BE), t4[221] = c7(221, 4, Buffer.prototype.writeUInt32BE), t4[222] = c7(222, 2, Buffer.prototype.writeUInt16BE), t4[223] = c7(223, 4, Buffer.prototype.writeUInt32BE), t4);
                }
                function u6(t4) {
                    return function(r9, e9) {
                        var n4 = r9.reserve(2), i11 = r9.buffer;
                        i11[n4++] = t4, i11[n4] = e9;
                    };
                }
                function a6(t4) {
                    return function(r9, e9) {
                        var n4 = r9.reserve(3), i11 = r9.buffer;
                        i11[n4++] = t4, i11[n4++] = e9 >>> 8, i11[n4] = e9;
                    };
                }
                function s8(t4) {
                    return function(r9, e9) {
                        var n4 = r9.reserve(5), i11 = r9.buffer;
                        i11[n4++] = t4, i11[n4++] = e9 >>> 24, i11[n4++] = e9 >>> 16, i11[n4++] = e9 >>> 8, i11[n4] = e9;
                    };
                }
                function c7(t4, r9, e9, n4) {
                    return function(i11, o11) {
                        var f9 = i11.reserve(r9 + 1);
                        i11.buffer[f9++] = t4, e9.call(i11.buffer, o11, f9, n4);
                    };
                }
                function h3(t4, r9) {
                    new g3(this, r9, t4);
                }
                function l5(t4, r9) {
                    new b3(this, r9, t4);
                }
                function p5(t4, r9) {
                    y3.write(this, t4, r9, !1, 23, 4);
                }
                function d5(t4, r9) {
                    y3.write(this, t4, r9, !1, 52, 8);
                }
                var y3 = t3("ieee754"), v5 = t3("int64-buffer"), g3 = v5.Uint64BE, b3 = v5.Int64BE, w3 = t3("./write-uint8").uint8, E3 = t3("./bufferish"), Buffer = E3.global, A3 = E3.hasBuffer && "TYPED_ARRAY_SUPPORT" in Buffer, m3 = A3 && !Buffer.TYPED_ARRAY_SUPPORT, x3 = E3.hasBuffer && Buffer.prototype || {
                };
                e2.getWriteToken = n2;
            },
            {
                "./bufferish": 8,
                "./write-uint8": 28,
                ieee754: 32,
                "int64-buffer": 33
            }
        ],
        27: [
            function(t3, r2, e2) {
                function n2(t4) {
                    function r9(t7, r10) {
                        var e9 = r10 ? 195 : 194;
                        _6[e9](t7, r10);
                    }
                    function e9(t7, r10) {
                        var e9, n4 = 0 | r10;
                        return r10 !== n4 ? (e9 = 203, void _6[e9](t7, r10)) : (e9 = -32 <= n4 && n4 <= 127 ? 255 & n4 : 0 <= n4 ? n4 <= 255 ? 204 : n4 <= 65535 ? 205 : 206 : -128 <= n4 ? 208 : -32768 <= n4 ? 209 : 210, void _6[e9](t7, n4));
                    }
                    function n2(t7, r10) {
                        var e10 = 207;
                        _6[e10](t7, r10.toArray());
                    }
                    function o10(t7, r10) {
                        var e10 = 211;
                        _6[e10](t7, r10.toArray());
                    }
                    function v5(t7) {
                        return t7 < 32 ? 1 : t7 <= 255 ? 2 : t7 <= 65535 ? 3 : 5;
                    }
                    function g3(t7) {
                        return t7 < 32 ? 1 : t7 <= 65535 ? 3 : 5;
                    }
                    function b3(t7) {
                        function r10(r11, e10) {
                            var n4 = e10.length, i9 = 5 + 3 * n4;
                            r11.offset = r11.reserve(i9);
                            var o11 = r11.buffer, f8 = t7(n4), u6 = r11.offset + f8;
                            n4 = s8.write.call(o11, e10, u6);
                            var a6 = t7(n4);
                            if (f8 !== a6) {
                                var c7 = u6 + a6 - f8, h3 = u6 + n4;
                                s8.copy.call(o11, o11, c7, u6, h3);
                            }
                            var l5 = 1 === a6 ? 160 + n4 : a6 <= 3 ? 215 + a6 : 219;
                            _6[l5](r11, n4), r11.offset += n4;
                        }
                        return r10;
                    }
                    function w3(t7, r10) {
                        if (null === r10) return A3(t7, r10);
                        if (I3(r10)) return Y3(t7, r10);
                        if (i9(r10)) return m3(t7, r10);
                        if (f8.isUint64BE(r10)) return n2(t7, r10);
                        if (u6.isInt64BE(r10)) return o10(t7, r10);
                        var e10 = t7.codec.getExtPacker(r10);
                        return (e10 && (r10 = e10(r10)), r10 instanceof l5 ? U3(t7, r10) : void D3(t7, r10));
                    }
                    function E3(t7, r10) {
                        return I3(r10) ? k3(t7, r10) : void w3(t7, r10);
                    }
                    function A3(t7, r10) {
                        var e10 = 192;
                        _6[e10](t7, r10);
                    }
                    function m3(t7, r10) {
                        var e10 = r10.length, n4 = e10 < 16 ? 144 + e10 : e10 <= 65535 ? 220 : 221;
                        _6[n4](t7, e10);
                        for(var i9 = t7.codec.encode, o11 = 0; o11 < e10; o11++)i9(t7, r10[o11]);
                    }
                    function x3(t7, r10) {
                        var e10 = r10.length, n4 = e10 < 255 ? 196 : e10 <= 65535 ? 197 : 198;
                        _6[n4](t7, e10), t7.send(r10);
                    }
                    function B3(t7, r10) {
                        x3(t7, new Uint8Array(r10));
                    }
                    function U3(t7, r10) {
                        var e10 = r10.buffer, n4 = e10.length, i9 = y3[n4] || (n4 < 255 ? 199 : n4 <= 65535 ? 200 : 201);
                        _6[i9](t7, n4), h4[r10.type](t7), t7.send(e10);
                    }
                    function P3(t7, r10) {
                        var e10 = Object.keys(r10), n4 = e10.length, i9 = n4 < 16 ? 128 + n4 : n4 <= 65535 ? 222 : 223;
                        _6[i9](t7, n4);
                        var o11 = t7.codec.encode;
                        e10.forEach(function(e11) {
                            o11(t7, e11), o11(t7, r10[e11]);
                        });
                    }
                    function R3(t7, r10) {
                        if (!(r10 instanceof Map)) return P3(t7, r10);
                        var e10 = r10.size, n4 = e10 < 16 ? 128 + e10 : e10 <= 65535 ? 222 : 223;
                        _6[n4](t7, e10);
                        var i9 = t7.codec.encode;
                        r10.forEach(function(r11, e11, n5) {
                            i9(t7, e11), i9(t7, r11);
                        });
                    }
                    function k3(t7, r10) {
                        var e10 = r10.length, n4 = e10 < 32 ? 160 + e10 : e10 <= 65535 ? 218 : 219;
                        _6[n4](t7, e10), t7.send(r10);
                    }
                    var _6 = c8.getWriteToken(t4), T3 = t4 && t4.useraw, S3 = p5 && t4 && t4.binarraybuffer, I3 = S3 ? a6.isArrayBuffer : a6.isBuffer, Y3 = S3 ? B3 : x3, C2 = d5 && t4 && t4.usemap, D3 = C2 ? R3 : P3, O3 = {
                        boolean: r9,
                        function: A3,
                        number: e9,
                        object: T3 ? E3 : w3,
                        string: b3(T3 ? g3 : v5),
                        symbol: A3,
                        undefined: A3
                    };
                    return O3;
                }
                var i9 = t3("isarray"), o10 = t3("int64-buffer"), f8 = o10.Uint64BE, u6 = o10.Int64BE, a6 = t3("./bufferish"), s8 = t3("./bufferish-proto"), c8 = t3("./write-token"), h4 = t3("./write-uint8").uint8, l5 = t3("./ext-buffer").ExtBuffer, p5 = "undefined" != typeof Uint8Array, d5 = "undefined" != typeof Map, y3 = [];
                y3[1] = 212, y3[2] = 213, y3[4] = 214, y3[8] = 215, y3[16] = 216, e2.getWriteType = n2;
            },
            {
                "./bufferish": 8,
                "./bufferish-proto": 6,
                "./ext-buffer": 17,
                "./write-token": 26,
                "./write-uint8": 28,
                "int64-buffer": 33,
                isarray: 34
            }
        ],
        28: [
            function(t3, r2, e2) {
                function n2(t4) {
                    return function(r9) {
                        var e9 = r9.reserve(1);
                        r9.buffer[e9] = t4;
                    };
                }
                for(var i9 = e2.uint8 = new Array(256), o10 = 0; o10 <= 255; o10++)i9[o10] = n2(o10);
            },
            {
            }
        ],
        29: [
            function(t3, r2, e2) {
                (function(r9) {
                    "use strict";
                    function n2() {
                        try {
                            var t4 = new Uint8Array(1);
                            return t4.__proto__ = {
                                __proto__: Uint8Array.prototype,
                                foo: function() {
                                    return 42;
                                }
                            }, 42 === t4.foo() && "function" == typeof t4.subarray && 0 === t4.subarray(1, 1).byteLength;
                        } catch (t) {
                            return !1;
                        }
                    }
                    function i9() {
                        return Buffer.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823;
                    }
                    function o10(t4, r10) {
                        if (i9() < r10) throw new RangeError("Invalid typed array length");
                        return Buffer.TYPED_ARRAY_SUPPORT ? (t4 = new Uint8Array(r10), t4.__proto__ = Buffer.prototype) : (null === t4 && (t4 = new Buffer(r10)), t4.length = r10), t4;
                    }
                    function Buffer(t4, r10, e9) {
                        if (!(Buffer.TYPED_ARRAY_SUPPORT || this instanceof Buffer)) return new Buffer(t4, r10, e9);
                        if ("number" == typeof t4) {
                            if ("string" == typeof r10) throw new Error("If encoding is specified then the first argument must be a string");
                            return s8(this, t4);
                        }
                        return f8(this, t4, r10, e9);
                    }
                    function f8(t4, r10, e9, n4) {
                        if ("number" == typeof r10) throw new TypeError('"value" argument must not be a number');
                        return "undefined" != typeof ArrayBuffer && r10 instanceof ArrayBuffer ? l5(t4, r10, e9, n4) : "string" == typeof r10 ? c8(t4, r10, e9) : p5(t4, r10);
                    }
                    function u6(t4) {
                        if ("number" != typeof t4) throw new TypeError('"size" argument must be a number');
                        if (t4 < 0) throw new RangeError('"size" argument must not be negative');
                    }
                    function a6(t4, r10, e9, n4) {
                        return u6(r10), r10 <= 0 ? o10(t4, r10) : (void 0) !== e9 ? "string" == typeof n4 ? o10(t4, r10).fill(e9, n4) : o10(t4, r10).fill(e9) : o10(t4, r10);
                    }
                    function s8(t4, r10) {
                        if (u6(r10), t4 = o10(t4, r10 < 0 ? 0 : 0 | d5(r10)), !Buffer.TYPED_ARRAY_SUPPORT) for(var e9 = 0; e9 < r10; ++e9)t4[e9] = 0;
                        return t4;
                    }
                    function c8(t4, r10, e9) {
                        if ("string" == typeof e9 && "" !== e9 || (e9 = "utf8"), !Buffer.isEncoding(e9)) throw new TypeError('"encoding" must be a valid string encoding');
                        var n4 = 0 | v5(r10, e9);
                        t4 = o10(t4, n4);
                        var i11 = t4.write(r10, e9);
                        return i11 !== n4 && (t4 = t4.slice(0, i11)), t4;
                    }
                    function h4(t4, r10) {
                        var e9 = r10.length < 0 ? 0 : 0 | d5(r10.length);
                        t4 = o10(t4, e9);
                        for(var n4 = 0; n4 < e9; n4 += 1)t4[n4] = 255 & r10[n4];
                        return t4;
                    }
                    function l5(t4, r10, e9, n4) {
                        if (r10.byteLength, e9 < 0 || r10.byteLength < e9) throw new RangeError("'offset' is out of bounds");
                        if (r10.byteLength < e9 + (n4 || 0)) throw new RangeError("'length' is out of bounds");
                        return r10 = (void 0) === e9 && (void 0) === n4 ? new Uint8Array(r10) : (void 0) === n4 ? new Uint8Array(r10, e9) : new Uint8Array(r10, e9, n4), Buffer.TYPED_ARRAY_SUPPORT ? (t4 = r10, t4.__proto__ = Buffer.prototype) : t4 = h4(t4, r10), t4;
                    }
                    function p5(t4, r10) {
                        if (Buffer.isBuffer(r10)) {
                            var e9 = 0 | d5(r10.length);
                            return t4 = o10(t4, e9), 0 === t4.length ? t4 : (r10.copy(t4, 0, 0, e9), t4);
                        }
                        if (r10) {
                            if ("undefined" != typeof ArrayBuffer && r10.buffer instanceof ArrayBuffer || "length" in r10) return "number" != typeof r10.length || H3(r10.length) ? o10(t4, 0) : h4(t4, r10);
                            if ("Buffer" === r10.type && Q3(r10.data)) return h4(t4, r10.data);
                        }
                        throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.");
                    }
                    function d5(t4) {
                        if (t4 >= i9()) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + i9().toString(16) + " bytes");
                        return 0 | t4;
                    }
                    function y3(t4) {
                        return +t4 != t4 && (t4 = 0), Buffer.alloc(+t4);
                    }
                    function v5(t4, r10) {
                        if (Buffer.isBuffer(t4)) return t4.length;
                        if ("undefined" != typeof ArrayBuffer && "function" == typeof ArrayBuffer.isView && (ArrayBuffer.isView(t4) || t4 instanceof ArrayBuffer)) return t4.byteLength;
                        "string" != typeof t4 && (t4 = "" + t4);
                        var e10 = t4.length;
                        if (0 === e10) return 0;
                        for(var n4 = !1;;)switch(r10){
                            case "ascii":
                            case "latin1":
                            case "binary":
                                return e10;
                            case "utf8":
                            case "utf-8":
                            case void 0:
                                return q3(t4).length;
                            case "ucs2":
                            case "ucs-2":
                            case "utf16le":
                            case "utf-16le":
                                return 2 * e10;
                            case "hex":
                                return e10 >>> 1;
                            case "base64":
                                return X2(t4).length;
                            default:
                                if (n4) return q3(t4).length;
                                r10 = ("" + r10).toLowerCase(), n4 = !0;
                        }
                    }
                    function g3(t4, r10, e10) {
                        var n4 = !1;
                        if (((void 0) === r10 || r10 < 0) && (r10 = 0), r10 > this.length) return "";
                        if (((void 0) === e10 || e10 > this.length) && (e10 = this.length), e10 <= 0) return "";
                        if (e10 >>>= 0, r10 >>>= 0, e10 <= r10) return "";
                        for(t4 || (t4 = "utf8");;)switch(t4){
                            case "hex":
                                return I3(this, r10, e10);
                            case "utf8":
                            case "utf-8":
                                return k3(this, r10, e10);
                            case "ascii":
                                return T3(this, r10, e10);
                            case "latin1":
                            case "binary":
                                return S3(this, r10, e10);
                            case "base64":
                                return R3(this, r10, e10);
                            case "ucs2":
                            case "ucs-2":
                            case "utf16le":
                            case "utf-16le":
                                return Y3(this, r10, e10);
                            default:
                                if (n4) throw new TypeError("Unknown encoding: " + t4);
                                t4 = (t4 + "").toLowerCase(), n4 = !0;
                        }
                    }
                    function b3(t4, r10, e10) {
                        var n4 = t4[r10];
                        t4[r10] = t4[e10], t4[e10] = n4;
                    }
                    function w3(t4, r10, e10, n4, i11) {
                        if (0 === t4.length) return -1;
                        if ("string" == typeof e10 ? (n4 = e10, e10 = 0) : e10 > 2147483647 ? e10 = 2147483647 : e10 < -2147483648 && (e10 = -2147483648), e10 = +e10, isNaN(e10) && (e10 = i11 ? 0 : t4.length - 1), e10 < 0 && (e10 = t4.length + e10), e10 >= t4.length) {
                            if (i11) return -1;
                            e10 = t4.length - 1;
                        } else if (e10 < 0) {
                            if (!i11) return -1;
                            e10 = 0;
                        }
                        if ("string" == typeof r10 && (r10 = Buffer.from(r10, n4)), Buffer.isBuffer(r10)) return 0 === r10.length ? -1 : E3(t4, r10, e10, n4, i11);
                        if ("number" == typeof r10) return r10 = 255 & r10, Buffer.TYPED_ARRAY_SUPPORT && "function" == typeof Uint8Array.prototype.indexOf ? i11 ? Uint8Array.prototype.indexOf.call(t4, r10, e10) : Uint8Array.prototype.lastIndexOf.call(t4, r10, e10) : E3(t4, [
                            r10
                        ], e10, n4, i11);
                        throw new TypeError("val must be string, number or Buffer");
                    }
                    function E3(t4, r10, e10, n4, i11) {
                        function o11(t7, r11) {
                            return 1 === f9 ? t7[r11] : t7.readUInt16BE(r11 * f9);
                        }
                        var f9 = 1, u7 = t4.length, a7 = r10.length;
                        if ((void 0) !== n4 && (n4 = String(n4).toLowerCase(), "ucs2" === n4 || "ucs-2" === n4 || "utf16le" === n4 || "utf-16le" === n4)) {
                            if (t4.length < 2 || r10.length < 2) return -1;
                            f9 = 2, u7 /= 2, a7 /= 2, e10 /= 2;
                        }
                        var s9;
                        if (i11) {
                            var c9 = -1;
                            for(s9 = e10; s9 < u7; s9++)if (o11(t4, s9) === o11(r10, c9 === -1 ? 0 : s9 - c9)) {
                                if (c9 === -1 && (c9 = s9), s9 - c9 + 1 === a7) return c9 * f9;
                            } else c9 !== -1 && (s9 -= s9 - c9), c9 = -1;
                        } else for(e10 + a7 > u7 && (e10 = u7 - a7), s9 = e10; s9 >= 0; s9--){
                            for(var h5 = !0, l6 = 0; l6 < a7; l6++)if (o11(t4, s9 + l6) !== o11(r10, l6)) {
                                h5 = !1;
                                break;
                            }
                            if (h5) return s9;
                        }
                        return -1;
                    }
                    function A3(t4, r10, e10, n4) {
                        e10 = Number(e10) || 0;
                        var i11 = t4.length - e10;
                        n4 ? (n4 = Number(n4), n4 > i11 && (n4 = i11)) : n4 = i11;
                        var o11 = r10.length;
                        if (o11 % 2 !== 0) throw new TypeError("Invalid hex string");
                        n4 > o11 / 2 && (n4 = o11 / 2);
                        for(var f9 = 0; f9 < n4; ++f9){
                            var u7 = parseInt(r10.substr(2 * f9, 2), 16);
                            if (isNaN(u7)) return f9;
                            t4[e10 + f9] = u7;
                        }
                        return f9;
                    }
                    function m3(t4, r10, e10, n4) {
                        return G2(q3(r10, t4.length - e10), t4, e10, n4);
                    }
                    function x3(t4, r10, e10, n4) {
                        return G2(W3(r10), t4, e10, n4);
                    }
                    function B3(t4, r10, e10, n4) {
                        return x3(t4, r10, e10, n4);
                    }
                    function U3(t4, r10, e10, n4) {
                        return G2(X2(r10), t4, e10, n4);
                    }
                    function P3(t4, r10, e10, n4) {
                        return G2(J2(r10, t4.length - e10), t4, e10, n4);
                    }
                    function R3(t4, r10, e10) {
                        return 0 === r10 && e10 === t4.length ? Z3.fromByteArray(t4) : Z3.fromByteArray(t4.slice(r10, e10));
                    }
                    function k3(t4, r10, e10) {
                        e10 = Math.min(t4.length, e10);
                        for(var n4 = [], i11 = r10; i11 < e10;){
                            var o11 = t4[i11], f9 = null, u8 = o11 > 239 ? 4 : o11 > 223 ? 3 : o11 > 191 ? 2 : 1;
                            if (i11 + u8 <= e10) {
                                var a7, s9, c10, h6;
                                switch(u8){
                                    case 1:
                                        o11 < 128 && (f9 = o11);
                                        break;
                                    case 2:
                                        a7 = t4[i11 + 1], 128 === (192 & a7) && (h6 = (31 & o11) << 6 | 63 & a7, h6 > 127 && (f9 = h6));
                                        break;
                                    case 3:
                                        a7 = t4[i11 + 1], s9 = t4[i11 + 2], 128 === (192 & a7) && 128 === (192 & s9) && (h6 = (15 & o11) << 12 | (63 & a7) << 6 | 63 & s9, h6 > 2047 && (h6 < 55296 || h6 > 57343) && (f9 = h6));
                                        break;
                                    case 4:
                                        a7 = t4[i11 + 1], s9 = t4[i11 + 2], c10 = t4[i11 + 3], 128 === (192 & a7) && 128 === (192 & s9) && 128 === (192 & c10) && (h6 = (15 & o11) << 18 | (63 & a7) << 12 | (63 & s9) << 6 | 63 & c10, h6 > 65535 && h6 < 1114112 && (f9 = h6));
                                }
                            }
                            null === f9 ? (f9 = 65533, u8 = 1) : f9 > 65535 && (f9 -= 65536, n4.push(f9 >>> 10 & 1023 | 55296), f9 = 56320 | 1023 & f9), n4.push(f9), i11 += u8;
                        }
                        return _6(n4);
                    }
                    function _6(t4) {
                        var r10 = t4.length;
                        if (r10 <= $2) return String.fromCharCode.apply(String, t4);
                        for(var e10 = "", n4 = 0; n4 < r10;)e10 += String.fromCharCode.apply(String, t4.slice(n4, n4 += $2));
                        return e10;
                    }
                    function T3(t4, r10, e10) {
                        var n4 = "";
                        e10 = Math.min(t4.length, e10);
                        for(var i11 = r10; i11 < e10; ++i11)n4 += String.fromCharCode(127 & t4[i11]);
                        return n4;
                    }
                    function S3(t4, r10, e10) {
                        var n4 = "";
                        e10 = Math.min(t4.length, e10);
                        for(var i11 = r10; i11 < e10; ++i11)n4 += String.fromCharCode(t4[i11]);
                        return n4;
                    }
                    function I3(t4, r10, e10) {
                        var n4 = t4.length;
                        (!r10 || r10 < 0) && (r10 = 0), (!e10 || e10 < 0 || e10 > n4) && (e10 = n4);
                        for(var i11 = "", o12 = r10; o12 < e10; ++o12)i11 += V3(t4[o12]);
                        return i11;
                    }
                    function Y3(t4, r10, e10) {
                        for(var n4 = t4.slice(r10, e10), i11 = "", o12 = 0; o12 < n4.length; o12 += 2)i11 += String.fromCharCode(n4[o12] + 256 * n4[o12 + 1]);
                        return i11;
                    }
                    function C2(t4, r10, e10) {
                        if (t4 % 1 !== 0 || t4 < 0) throw new RangeError("offset is not uint");
                        if (t4 + r10 > e10) throw new RangeError("Trying to access beyond buffer length");
                    }
                    function D3(t4, r10, e10, n4, i11, o12) {
                        if (!Buffer.isBuffer(t4)) throw new TypeError('"buffer" argument must be a Buffer instance');
                        if (r10 > i11 || r10 < o12) throw new RangeError('"value" argument is out of bounds');
                        if (e10 + n4 > t4.length) throw new RangeError("Index out of range");
                    }
                    function O3(t4, r10, e10, n4) {
                        r10 < 0 && (r10 = 65535 + r10 + 1);
                        for(var i11 = 0, o12 = Math.min(t4.length - e10, 2); i11 < o12; ++i11)t4[e10 + i11] = (r10 & 255 << 8 * (n4 ? i11 : 1 - i11)) >>> 8 * (n4 ? i11 : 1 - i11);
                    }
                    function L3(t4, r10, e10, n4) {
                        r10 < 0 && (r10 = 4294967295 + r10 + 1);
                        for(var i11 = 0, o12 = Math.min(t4.length - e10, 4); i11 < o12; ++i11)t4[e10 + i11] = r10 >>> 8 * (n4 ? i11 : 3 - i11) & 255;
                    }
                    function M3(t4, r10, e10, n4, i11, o12) {
                        if (e10 + n4 > t4.length) throw new RangeError("Index out of range");
                        if (e10 < 0) throw new RangeError("Index out of range");
                    }
                    function N3(t4, r10, e10, n4, i11) {
                        return i11 || M3(t4, r10, e10, 4, 340282346638528900000000000000000000000, -340282346638528900000000000000000000000), K.write(t4, r10, e10, n4, 23, 4), e10 + 4;
                    }
                    function F2(t4, r10, e10, n4, i11) {
                        return i11 || M3(t4, r10, e10, 8, 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000), K.write(t4, r10, e10, n4, 52, 8), e10 + 8;
                    }
                    function j2(t4) {
                        if (t4 = z3(t4).replace(tt, ""), t4.length < 2) return "";
                        for(; t4.length % 4 !== 0;)t4 += "=";
                        return t4;
                    }
                    function z3(t4) {
                        return t4.trim ? t4.trim() : t4.replace(/^\s+|\s+$/g, "");
                    }
                    function V3(t4) {
                        return t4 < 16 ? "0" + t4.toString(16) : t4.toString(16);
                    }
                    function q3(t4, r10) {
                        r10 = r10 || 1 / 0;
                        for(var e10, n4 = t4.length, i11 = null, o12 = [], f10 = 0; f10 < n4; ++f10){
                            if (e10 = t4.charCodeAt(f10), e10 > 55295 && e10 < 57344) {
                                if (!i11) {
                                    if (e10 > 56319) {
                                        (r10 -= 3) > -1 && o12.push(239, 191, 189);
                                        continue;
                                    }
                                    if (f10 + 1 === n4) {
                                        (r10 -= 3) > -1 && o12.push(239, 191, 189);
                                        continue;
                                    }
                                    i11 = e10;
                                    continue;
                                }
                                if (e10 < 56320) {
                                    (r10 -= 3) > -1 && o12.push(239, 191, 189), i11 = e10;
                                    continue;
                                }
                                e10 = (i11 - 55296 << 10 | e10 - 56320) + 65536;
                            } else i11 && (r10 -= 3) > -1 && o12.push(239, 191, 189);
                            if (i11 = null, e10 < 128) {
                                if ((r10 -= 1) < 0) break;
                                o12.push(e10);
                            } else if (e10 < 2048) {
                                if ((r10 -= 2) < 0) break;
                                o12.push(e10 >> 6 | 192, 63 & e10 | 128);
                            } else if (e10 < 65536) {
                                if ((r10 -= 3) < 0) break;
                                o12.push(e10 >> 12 | 224, e10 >> 6 & 63 | 128, 63 & e10 | 128);
                            } else {
                                if (!(e10 < 1114112)) throw new Error("Invalid code point");
                                if ((r10 -= 4) < 0) break;
                                o12.push(e10 >> 18 | 240, e10 >> 12 & 63 | 128, e10 >> 6 & 63 | 128, 63 & e10 | 128);
                            }
                        }
                        return o12;
                    }
                    function W3(t4) {
                        for(var r10 = [], e10 = 0; e10 < t4.length; ++e10)r10.push(255 & t4.charCodeAt(e10));
                        return r10;
                    }
                    function J2(t4, r10) {
                        for(var e10, n4, i11, o12 = [], f10 = 0; f10 < t4.length && !((r10 -= 2) < 0); ++f10)e10 = t4.charCodeAt(f10), n4 = e10 >> 8, i11 = e10 % 256, o12.push(i11), o12.push(n4);
                        return o12;
                    }
                    function X2(t4) {
                        return Z3.toByteArray(j2(t4));
                    }
                    function G2(t4, r10, e10, n4) {
                        for(var i11 = 0; i11 < n4 && !(i11 + e10 >= r10.length || i11 >= t4.length); ++i11)r10[i11 + e10] = t4[i11];
                        return i11;
                    }
                    function H3(t4) {
                        return t4 !== t4;
                    }
                    var Z3 = t3("base64-js"), K = t3("ieee754"), Q3 = t3("isarray");
                    e2.Buffer = Buffer, e2.SlowBuffer = y3, e2.INSPECT_MAX_BYTES = 50, Buffer.TYPED_ARRAY_SUPPORT = (void 0) !== r9.TYPED_ARRAY_SUPPORT ? r9.TYPED_ARRAY_SUPPORT : n2(), e2.kMaxLength = i9(), Buffer.poolSize = 8192, Buffer._augment = function(t4) {
                        return t4.__proto__ = Buffer.prototype, t4;
                    }, Buffer.from = function(t4, r10, e10) {
                        return f8(null, t4, r10, e10);
                    }, Buffer.TYPED_ARRAY_SUPPORT && (Buffer.prototype.__proto__ = Uint8Array.prototype, Buffer.__proto__ = Uint8Array, "undefined" != typeof Symbol && Symbol.species && Buffer[Symbol.species] === Buffer && Object.defineProperty(Buffer, Symbol.species, {
                        value: null,
                        configurable: !0
                    })), Buffer.alloc = function(t4, r10, e10) {
                        return a6(null, t4, r10, e10);
                    }, Buffer.allocUnsafe = function(t4) {
                        return s8(null, t4);
                    }, Buffer.allocUnsafeSlow = function(t4) {
                        return s8(null, t4);
                    }, Buffer.isBuffer = function(t4) {
                        return !(null == t4 || !t4._isBuffer);
                    }, Buffer.compare = function(t4, r10) {
                        if (!Buffer.isBuffer(t4) || !Buffer.isBuffer(r10)) throw new TypeError("Arguments must be Buffers");
                        if (t4 === r10) return 0;
                        for(var e10 = t4.length, n4 = r10.length, i11 = 0, o12 = Math.min(e10, n4); i11 < o12; ++i11)if (t4[i11] !== r10[i11]) {
                            e10 = t4[i11], n4 = r10[i11];
                            break;
                        }
                        return e10 < n4 ? -1 : n4 < e10 ? 1 : 0;
                    }, Buffer.isEncoding = function(t4) {
                        switch(String(t4).toLowerCase()){
                            case "hex":
                            case "utf8":
                            case "utf-8":
                            case "ascii":
                            case "latin1":
                            case "binary":
                            case "base64":
                            case "ucs2":
                            case "ucs-2":
                            case "utf16le":
                            case "utf-16le":
                                return !0;
                            default:
                                return !1;
                        }
                    }, Buffer.concat = function(t4, r10) {
                        if (!Q3(t4)) throw new TypeError('"list" argument must be an Array of Buffers');
                        if (0 === t4.length) return Buffer.alloc(0);
                        var e10;
                        if ((void 0) === r10) for(r10 = 0, e10 = 0; e10 < t4.length; ++e10)r10 += t4[e10].length;
                        var n4 = Buffer.allocUnsafe(r10), i11 = 0;
                        for(e10 = 0; e10 < t4.length; ++e10){
                            var o12 = t4[e10];
                            if (!Buffer.isBuffer(o12)) throw new TypeError('"list" argument must be an Array of Buffers');
                            o12.copy(n4, i11), i11 += o12.length;
                        }
                        return n4;
                    }, Buffer.byteLength = v5, Buffer.prototype._isBuffer = !0, Buffer.prototype.swap16 = function() {
                        var t4 = this.length;
                        if (t4 % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
                        for(var r10 = 0; r10 < t4; r10 += 2)b3(this, r10, r10 + 1);
                        return this;
                    }, Buffer.prototype.swap32 = function() {
                        var t4 = this.length;
                        if (t4 % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
                        for(var r10 = 0; r10 < t4; r10 += 4)b3(this, r10, r10 + 3), b3(this, r10 + 1, r10 + 2);
                        return this;
                    }, Buffer.prototype.swap64 = function() {
                        var t4 = this.length;
                        if (t4 % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
                        for(var r10 = 0; r10 < t4; r10 += 8)b3(this, r10, r10 + 7), b3(this, r10 + 1, r10 + 6), b3(this, r10 + 2, r10 + 5), b3(this, r10 + 3, r10 + 4);
                        return this;
                    }, Buffer.prototype.toString = function() {
                        var t4 = 0 | this.length;
                        return 0 === t4 ? "" : 0 === arguments.length ? k3(this, 0, t4) : g3.apply(this, arguments);
                    }, Buffer.prototype.equals = function(t4) {
                        if (!Buffer.isBuffer(t4)) throw new TypeError("Argument must be a Buffer");
                        return this === t4 || 0 === Buffer.compare(this, t4);
                    }, Buffer.prototype.inspect = function() {
                        var t4 = "", r10 = e2.INSPECT_MAX_BYTES;
                        return this.length > 0 && (t4 = this.toString("hex", 0, r10).match(/.{2}/g).join(" "), this.length > r10 && (t4 += " ... ")), "<Buffer " + t4 + ">";
                    }, Buffer.prototype.compare = function(t4, r10, e10, n4, i11) {
                        if (!Buffer.isBuffer(t4)) throw new TypeError("Argument must be a Buffer");
                        if ((void 0) === r10 && (r10 = 0), (void 0) === e10 && (e10 = t4 ? t4.length : 0), (void 0) === n4 && (n4 = 0), (void 0) === i11 && (i11 = this.length), r10 < 0 || e10 > t4.length || n4 < 0 || i11 > this.length) throw new RangeError("out of range index");
                        if (n4 >= i11 && r10 >= e10) return 0;
                        if (n4 >= i11) return -1;
                        if (r10 >= e10) return 1;
                        if (r10 >>>= 0, e10 >>>= 0, n4 >>>= 0, i11 >>>= 0, this === t4) return 0;
                        for(var o13 = i11 - n4, f10 = e10 - r10, u9 = Math.min(o13, f10), a8 = this.slice(n4, i11), s10 = t4.slice(r10, e10), c11 = 0; c11 < u9; ++c11)if (a8[c11] !== s10[c11]) {
                            o13 = a8[c11], f10 = s10[c11];
                            break;
                        }
                        return o13 < f10 ? -1 : f10 < o13 ? 1 : 0;
                    }, Buffer.prototype.includes = function(t4, r10, e10) {
                        return this.indexOf(t4, r10, e10) !== -1;
                    }, Buffer.prototype.indexOf = function(t4, r10, e10) {
                        return w3(this, t4, r10, e10, !0);
                    }, Buffer.prototype.lastIndexOf = function(t4, r10, e10) {
                        return w3(this, t4, r10, e10, !1);
                    }, Buffer.prototype.write = function(t4, r10, e10, n4) {
                        if ((void 0) === r10) n4 = "utf8", e10 = this.length, r10 = 0;
                        else if ((void 0) === e10 && "string" == typeof r10) n4 = r10, e10 = this.length, r10 = 0;
                        else {
                            if (!isFinite(r10)) throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
                            r10 = 0 | r10, isFinite(e10) ? (e10 = 0 | e10, (void 0) === n4 && (n4 = "utf8")) : (n4 = e10, e10 = void 0);
                        }
                        var i11 = this.length - r10;
                        if (((void 0) === e10 || e10 > i11) && (e10 = i11), t4.length > 0 && (e10 < 0 || r10 < 0) || r10 > this.length) throw new RangeError("Attempt to write outside buffer bounds");
                        n4 || (n4 = "utf8");
                        for(var o13 = !1;;)switch(n4){
                            case "hex":
                                return A3(this, t4, r10, e10);
                            case "utf8":
                            case "utf-8":
                                return m3(this, t4, r10, e10);
                            case "ascii":
                                return x3(this, t4, r10, e10);
                            case "latin1":
                            case "binary":
                                return B3(this, t4, r10, e10);
                            case "base64":
                                return U3(this, t4, r10, e10);
                            case "ucs2":
                            case "ucs-2":
                            case "utf16le":
                            case "utf-16le":
                                return P3(this, t4, r10, e10);
                            default:
                                if (o13) throw new TypeError("Unknown encoding: " + n4);
                                n4 = ("" + n4).toLowerCase(), o13 = !0;
                        }
                    }, Buffer.prototype.toJSON = function() {
                        return {
                            type: "Buffer",
                            data: Array.prototype.slice.call(this._arr || this, 0)
                        };
                    };
                    var $2 = 4096;
                    Buffer.prototype.slice = function(t4, r10) {
                        var e10 = this.length;
                        t4 = ~~t4, r10 = (void 0) === r10 ? e10 : ~~r10, t4 < 0 ? (t4 += e10, t4 < 0 && (t4 = 0)) : t4 > e10 && (t4 = e10), r10 < 0 ? (r10 += e10, r10 < 0 && (r10 = 0)) : r10 > e10 && (r10 = e10), r10 < t4 && (r10 = t4);
                        var n4;
                        if (Buffer.TYPED_ARRAY_SUPPORT) n4 = this.subarray(t4, r10), n4.__proto__ = Buffer.prototype;
                        else {
                            var i11 = r10 - t4;
                            n4 = new Buffer(i11, void 0);
                            for(var o13 = 0; o13 < i11; ++o13)n4[o13] = this[o13 + t4];
                        }
                        return n4;
                    }, Buffer.prototype.readUIntLE = function(t4, r10, e10) {
                        t4 = 0 | t4, r10 = 0 | r10, e10 || C2(t4, r10, this.length);
                        for(var n4 = this[t4], i12 = 1, o14 = 0; (++o14) < r10 && (i12 *= 256);)n4 += this[t4 + o14] * i12;
                        return n4;
                    }, Buffer.prototype.readUIntBE = function(t4, r10, e10) {
                        t4 = 0 | t4, r10 = 0 | r10, e10 || C2(t4, r10, this.length);
                        for(var n4 = this[t4 + --r10], i12 = 1; r10 > 0 && (i12 *= 256);)n4 += this[t4 + --r10] * i12;
                        return n4;
                    }, Buffer.prototype.readUInt8 = function(t4, r10) {
                        return r10 || C2(t4, 1, this.length), this[t4];
                    }, Buffer.prototype.readUInt16LE = function(t4, r10) {
                        return r10 || C2(t4, 2, this.length), this[t4] | this[t4 + 1] << 8;
                    }, Buffer.prototype.readUInt16BE = function(t4, r10) {
                        return r10 || C2(t4, 2, this.length), this[t4] << 8 | this[t4 + 1];
                    }, Buffer.prototype.readUInt32LE = function(t4, r10) {
                        return r10 || C2(t4, 4, this.length), (this[t4] | this[t4 + 1] << 8 | this[t4 + 2] << 16) + 16777216 * this[t4 + 3];
                    }, Buffer.prototype.readUInt32BE = function(t4, r10) {
                        return r10 || C2(t4, 4, this.length), 16777216 * this[t4] + (this[t4 + 1] << 16 | this[t4 + 2] << 8 | this[t4 + 3]);
                    }, Buffer.prototype.readIntLE = function(t4, r10, e10) {
                        t4 = 0 | t4, r10 = 0 | r10, e10 || C2(t4, r10, this.length);
                        for(var n4 = this[t4], i12 = 1, o14 = 0; (++o14) < r10 && (i12 *= 256);)n4 += this[t4 + o14] * i12;
                        return i12 *= 128, n4 >= i12 && (n4 -= Math.pow(2, 8 * r10)), n4;
                    }, Buffer.prototype.readIntBE = function(t4, r10, e10) {
                        t4 = 0 | t4, r10 = 0 | r10, e10 || C2(t4, r10, this.length);
                        for(var n4 = r10, i12 = 1, o14 = this[t4 + --n4]; n4 > 0 && (i12 *= 256);)o14 += this[t4 + --n4] * i12;
                        return i12 *= 128, o14 >= i12 && (o14 -= Math.pow(2, 8 * r10)), o14;
                    }, Buffer.prototype.readInt8 = function(t4, r10) {
                        return r10 || C2(t4, 1, this.length), 128 & this[t4] ? (255 - this[t4] + 1) * -1 : this[t4];
                    }, Buffer.prototype.readInt16LE = function(t4, r10) {
                        r10 || C2(t4, 2, this.length);
                        var e10 = this[t4] | this[t4 + 1] << 8;
                        return 32768 & e10 ? 4294901760 | e10 : e10;
                    }, Buffer.prototype.readInt16BE = function(t4, r10) {
                        r10 || C2(t4, 2, this.length);
                        var e10 = this[t4 + 1] | this[t4] << 8;
                        return 32768 & e10 ? 4294901760 | e10 : e10;
                    }, Buffer.prototype.readInt32LE = function(t4, r10) {
                        return r10 || C2(t4, 4, this.length), this[t4] | this[t4 + 1] << 8 | this[t4 + 2] << 16 | this[t4 + 3] << 24;
                    }, Buffer.prototype.readInt32BE = function(t4, r10) {
                        return r10 || C2(t4, 4, this.length), this[t4] << 24 | this[t4 + 1] << 16 | this[t4 + 2] << 8 | this[t4 + 3];
                    }, Buffer.prototype.readFloatLE = function(t4, r10) {
                        return r10 || C2(t4, 4, this.length), K.read(this, t4, !0, 23, 4);
                    }, Buffer.prototype.readFloatBE = function(t4, r10) {
                        return r10 || C2(t4, 4, this.length), K.read(this, t4, !1, 23, 4);
                    }, Buffer.prototype.readDoubleLE = function(t4, r10) {
                        return r10 || C2(t4, 8, this.length), K.read(this, t4, !0, 52, 8);
                    }, Buffer.prototype.readDoubleBE = function(t4, r10) {
                        return r10 || C2(t4, 8, this.length), K.read(this, t4, !1, 52, 8);
                    }, Buffer.prototype.writeUIntLE = function(t4, r10, e10, n4) {
                        if (t4 = +t4, r10 = 0 | r10, e10 = 0 | e10, !n4) {
                            var i12 = Math.pow(2, 8 * e10) - 1;
                            D3(this, t4, r10, e10, i12, 0);
                        }
                        var o14 = 1, f10 = 0;
                        for(this[r10] = 255 & t4; (++f10) < e10 && (o14 *= 256);)this[r10 + f10] = t4 / o14 & 255;
                        return r10 + e10;
                    }, Buffer.prototype.writeUIntBE = function(t4, r10, e10, n4) {
                        if (t4 = +t4, r10 = 0 | r10, e10 = 0 | e10, !n4) {
                            var i13 = Math.pow(2, 8 * e10) - 1;
                            D3(this, t4, r10, e10, i13, 0);
                        }
                        var o14 = e10 - 1, f10 = 1;
                        for(this[r10 + o14] = 255 & t4; (--o14) >= 0 && (f10 *= 256);)this[r10 + o14] = t4 / f10 & 255;
                        return r10 + e10;
                    }, Buffer.prototype.writeUInt8 = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 1, 255, 0), Buffer.TYPED_ARRAY_SUPPORT || (t4 = Math.floor(t4)), this[r10] = 255 & t4, r10 + 1;
                    }, Buffer.prototype.writeUInt16LE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 2, 65535, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10] = 255 & t4, this[r10 + 1] = t4 >>> 8) : O3(this, t4, r10, !0), r10 + 2;
                    }, Buffer.prototype.writeUInt16BE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 2, 65535, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10] = t4 >>> 8, this[r10 + 1] = 255 & t4) : O3(this, t4, r10, !1), r10 + 2;
                    }, Buffer.prototype.writeUInt32LE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 4, 4294967295, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10 + 3] = t4 >>> 24, this[r10 + 2] = t4 >>> 16, this[r10 + 1] = t4 >>> 8, this[r10] = 255 & t4) : L3(this, t4, r10, !0), r10 + 4;
                    }, Buffer.prototype.writeUInt32BE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 4, 4294967295, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10] = t4 >>> 24, this[r10 + 1] = t4 >>> 16, this[r10 + 2] = t4 >>> 8, this[r10 + 3] = 255 & t4) : L3(this, t4, r10, !1), r10 + 4;
                    }, Buffer.prototype.writeIntLE = function(t4, r10, e10, n4) {
                        if (t4 = +t4, r10 = 0 | r10, !n4) {
                            var i14 = Math.pow(2, 8 * e10 - 1);
                            D3(this, t4, r10, e10, i14 - 1, -i14);
                        }
                        var o14 = 0, f10 = 1, u9 = 0;
                        for(this[r10] = 255 & t4; (++o14) < e10 && (f10 *= 256);)t4 < 0 && 0 === u9 && 0 !== this[r10 + o14 - 1] && (u9 = 1), this[r10 + o14] = (t4 / f10 >> 0) - u9 & 255;
                        return r10 + e10;
                    }, Buffer.prototype.writeIntBE = function(t4, r10, e10, n4) {
                        if (t4 = +t4, r10 = 0 | r10, !n4) {
                            var i15 = Math.pow(2, 8 * e10 - 1);
                            D3(this, t4, r10, e10, i15 - 1, -i15);
                        }
                        var o14 = e10 - 1, f10 = 1, u9 = 0;
                        for(this[r10 + o14] = 255 & t4; (--o14) >= 0 && (f10 *= 256);)t4 < 0 && 0 === u9 && 0 !== this[r10 + o14 + 1] && (u9 = 1), this[r10 + o14] = (t4 / f10 >> 0) - u9 & 255;
                        return r10 + e10;
                    }, Buffer.prototype.writeInt8 = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 1, 127, -128), Buffer.TYPED_ARRAY_SUPPORT || (t4 = Math.floor(t4)), t4 < 0 && (t4 = 255 + t4 + 1), this[r10] = 255 & t4, r10 + 1;
                    }, Buffer.prototype.writeInt16LE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 2, 32767, -32768), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10] = 255 & t4, this[r10 + 1] = t4 >>> 8) : O3(this, t4, r10, !0), r10 + 2;
                    }, Buffer.prototype.writeInt16BE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 2, 32767, -32768), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10] = t4 >>> 8, this[r10 + 1] = 255 & t4) : O3(this, t4, r10, !1), r10 + 2;
                    }, Buffer.prototype.writeInt32LE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 4, 2147483647, -2147483648), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10] = 255 & t4, this[r10 + 1] = t4 >>> 8, this[r10 + 2] = t4 >>> 16, this[r10 + 3] = t4 >>> 24) : L3(this, t4, r10, !0), r10 + 4;
                    }, Buffer.prototype.writeInt32BE = function(t4, r10, e10) {
                        return t4 = +t4, r10 = 0 | r10, e10 || D3(this, t4, r10, 4, 2147483647, -2147483648), t4 < 0 && (t4 = 4294967295 + t4 + 1), Buffer.TYPED_ARRAY_SUPPORT ? (this[r10] = t4 >>> 24, this[r10 + 1] = t4 >>> 16, this[r10 + 2] = t4 >>> 8, this[r10 + 3] = 255 & t4) : L3(this, t4, r10, !1), r10 + 4;
                    }, Buffer.prototype.writeFloatLE = function(t4, r10, e10) {
                        return N3(this, t4, r10, !0, e10);
                    }, Buffer.prototype.writeFloatBE = function(t4, r10, e10) {
                        return N3(this, t4, r10, !1, e10);
                    }, Buffer.prototype.writeDoubleLE = function(t4, r10, e10) {
                        return F2(this, t4, r10, !0, e10);
                    }, Buffer.prototype.writeDoubleBE = function(t4, r10, e10) {
                        return F2(this, t4, r10, !1, e10);
                    }, Buffer.prototype.copy = function(t4, r10, e10, n4) {
                        if (e10 || (e10 = 0), n4 || 0 === n4 || (n4 = this.length), r10 >= t4.length && (r10 = t4.length), r10 || (r10 = 0), n4 > 0 && n4 < e10 && (n4 = e10), n4 === e10) return 0;
                        if (0 === t4.length || 0 === this.length) return 0;
                        if (r10 < 0) throw new RangeError("targetStart out of bounds");
                        if (e10 < 0 || e10 >= this.length) throw new RangeError("sourceStart out of bounds");
                        if (n4 < 0) throw new RangeError("sourceEnd out of bounds");
                        n4 > this.length && (n4 = this.length), t4.length - r10 < n4 - e10 && (n4 = t4.length - r10 + e10);
                        var i16, o14 = n4 - e10;
                        if (this === t4 && e10 < r10 && r10 < n4) for(i16 = o14 - 1; i16 >= 0; --i16)t4[i16 + r10] = this[i16 + e10];
                        else if (o14 < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) for(i16 = 0; i16 < o14; ++i16)t4[i16 + r10] = this[i16 + e10];
                        else Uint8Array.prototype.set.call(t4, this.subarray(e10, e10 + o14), r10);
                        return o14;
                    }, Buffer.prototype.fill = function(t4, r10, e10, n4) {
                        if ("string" == typeof t4) {
                            if ("string" == typeof r10 ? (n4 = r10, r10 = 0, e10 = this.length) : "string" == typeof e10 && (n4 = e10, e10 = this.length), 1 === t4.length) {
                                var i16 = t4.charCodeAt(0);
                                i16 < 256 && (t4 = i16);
                            }
                            if ((void 0) !== n4 && "string" != typeof n4) throw new TypeError("encoding must be a string");
                            if ("string" == typeof n4 && !Buffer.isEncoding(n4)) throw new TypeError("Unknown encoding: " + n4);
                        } else "number" == typeof t4 && (t4 = 255 & t4);
                        if (r10 < 0 || this.length < r10 || this.length < e10) throw new RangeError("Out of range index");
                        if (e10 <= r10) return this;
                        r10 >>>= 0, e10 = (void 0) === e10 ? this.length : e10 >>> 0, t4 || (t4 = 0);
                        var o14;
                        if ("number" == typeof t4) for(o14 = r10; o14 < e10; ++o14)this[o14] = t4;
                        else {
                            var f10 = Buffer.isBuffer(t4) ? t4 : q3(new Buffer(t4, n4).toString()), u9 = f10.length;
                            for(o14 = 0; o14 < e10 - r10; ++o14)this[o14 + r10] = f10[o14 % u9];
                        }
                        return this;
                    };
                    var tt = /[^+\/0-9A-Za-z-_]/g;
                }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {
                });
            },
            {
                "base64-js": 30,
                ieee754: 32,
                isarray: 34
            }
        ],
        30: [
            function(t3, r2, e2) {
                "use strict";
                function n2(t4) {
                    var r9 = t4.length;
                    if (r9 % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
                    return "=" === t4[r9 - 2] ? 2 : "=" === t4[r9 - 1] ? 1 : 0;
                }
                function i9(t4) {
                    return 3 * t4.length / 4 - n2(t4);
                }
                function o10(t4) {
                    var r9, e10, i17, o10, f8, u6, a6 = t4.length;
                    f8 = n2(t4), u6 = new h4(3 * a6 / 4 - f8), i17 = f8 > 0 ? a6 - 4 : a6;
                    var s8 = 0;
                    for((r9 = 0, e10 = 0); r9 < i17; (r9 += 4, e10 += 3))o10 = c8[t4.charCodeAt(r9)] << 18 | c8[t4.charCodeAt(r9 + 1)] << 12 | c8[t4.charCodeAt(r9 + 2)] << 6 | c8[t4.charCodeAt(r9 + 3)], u6[s8++] = o10 >> 16 & 255, u6[s8++] = o10 >> 8 & 255, u6[s8++] = 255 & o10;
                    return (2 === f8 ? (o10 = c8[t4.charCodeAt(r9)] << 2 | c8[t4.charCodeAt(r9 + 1)] >> 4, u6[s8++] = 255 & o10) : 1 === f8 && (o10 = c8[t4.charCodeAt(r9)] << 10 | c8[t4.charCodeAt(r9 + 1)] << 4 | c8[t4.charCodeAt(r9 + 2)] >> 2, u6[s8++] = o10 >> 8 & 255, u6[s8++] = 255 & o10), u6);
                }
                function f8(t4) {
                    return s8[t4 >> 18 & 63] + s8[t4 >> 12 & 63] + s8[t4 >> 6 & 63] + s8[63 & t4];
                }
                function u6(t4, r9, e10) {
                    for(var n4, i17 = [], o14 = r9; o14 < e10; o14 += 3)n4 = (t4[o14] << 16) + (t4[o14 + 1] << 8) + t4[o14 + 2], i17.push(f8(n4));
                    return i17.join("");
                }
                function a6(t4) {
                    for(var r9, e10 = t4.length, n4 = e10 % 3, i17 = "", o14 = [], f11 = 16383, a6 = 0, c8 = e10 - n4; a6 < c8; a6 += f11)o14.push(u6(t4, a6, a6 + f11 > c8 ? c8 : a6 + f11));
                    return (1 === n4 ? (r9 = t4[e10 - 1], i17 += s8[r9 >> 2], i17 += s8[r9 << 4 & 63], i17 += "==") : 2 === n4 && (r9 = (t4[e10 - 2] << 8) + t4[e10 - 1], i17 += s8[r9 >> 10], i17 += s8[r9 >> 4 & 63], i17 += s8[r9 << 2 & 63], i17 += "="), o14.push(i17), o14.join(""));
                }
                e2.byteLength = i9, e2.toByteArray = o10, e2.fromByteArray = a6;
                for(var s8 = [], c8 = [], h4 = "undefined" != typeof Uint8Array ? Uint8Array : Array, l5 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", p5 = 0, d5 = l5.length; p5 < d5; ++p5)s8[p5] = l5[p5], c8[l5.charCodeAt(p5)] = p5;
                c8["-".charCodeAt(0)] = 62, c8["_".charCodeAt(0)] = 63;
            },
            {
            }
        ],
        31: [
            function(t3, r2, e2) {
                function n2() {
                    if (!(this instanceof n2)) return new n2;
                }
                !(function(t4) {
                    function e10(t7) {
                        for(var r9 in s10)t7[r9] = s10[r9];
                        return t7;
                    }
                    function n4(t7, r9) {
                        return u6(this, t7).push(r9), this;
                    }
                    function i9(t7, r9) {
                        function e11() {
                            o10.call(n6, t7, e11), r9.apply(this, arguments);
                        }
                        var n6 = this;
                        return e11.originalListener = r9, u6(n6, t7).push(e11), n6;
                    }
                    function o10(t7, r9) {
                        function e11(t8) {
                            return t8 !== r9 && t8.originalListener !== r9;
                        }
                        var n6, i17 = this;
                        if (arguments.length) {
                            if (r9) {
                                if (n6 = u6(i17, t7, !0)) {
                                    if (n6 = n6.filter(e11), !n6.length) return o10.call(i17, t7);
                                    i17[a6][t7] = n6;
                                }
                            } else if (n6 = i17[a6], n6 && (delete n6[t7], !Object.keys(n6).length)) return o10.call(i17);
                        } else delete i17[a6];
                        return i17;
                    }
                    function f8(t7, r9) {
                        function e11(t8) {
                            t8.call(o14);
                        }
                        function n6(t8) {
                            t8.call(o14, r9);
                        }
                        function i17(t8) {
                            t8.apply(o14, s8);
                        }
                        var o14 = this, f8 = u6(o14, t7, !0);
                        if (!f8) return !1;
                        var a6 = arguments.length;
                        if (1 === a6) f8.forEach(e11);
                        else if (2 === a6) f8.forEach(n6);
                        else {
                            var s8 = Array.prototype.slice.call(arguments, 1);
                            f8.forEach(i17);
                        }
                        return !!f8.length;
                    }
                    function u6(t7, r9, e11) {
                        if (!e11 || t7[a6]) {
                            var n6 = t7[a6] || (t7[a6] = {
                            });
                            return n6[r9] || (n6[r9] = []);
                        }
                    }
                    "undefined" != typeof r2 && (r2.exports = t4);
                    var a6 = "listeners", s10 = {
                        on: n4,
                        once: i9,
                        off: o10,
                        emit: f8
                    };
                    e10(t4.prototype), t4.mixin = e10;
                })(n2);
            },
            {
            }
        ],
        32: [
            function(t3, r2, e2) {
                e2.read = function(t4, r9, e10, n2, i9) {
                    var o10, f8, u6 = 8 * i9 - n2 - 1, a6 = (1 << u6) - 1, s10 = a6 >> 1, c8 = -7, h4 = e10 ? i9 - 1 : 0, l5 = e10 ? -1 : 1, p5 = t4[r9 + h4];
                    for(h4 += l5, o10 = p5 & (1 << -c8) - 1, p5 >>= -c8, c8 += u6; c8 > 0; o10 = 256 * o10 + t4[r9 + h4], h4 += l5, c8 -= 8);
                    for(f8 = o10 & (1 << -c8) - 1, o10 >>= -c8, c8 += n2; c8 > 0; f8 = 256 * f8 + t4[r9 + h4], h4 += l5, c8 -= 8);
                    if (0 === o10) o10 = 1 - s10;
                    else {
                        if (o10 === a6) return f8 ? NaN : (p5 ? -1 : 1) * (1 / 0);
                        f8 += Math.pow(2, n2), o10 -= s10;
                    }
                    return (p5 ? -1 : 1) * f8 * Math.pow(2, o10 - n2);
                }, e2.write = function(t4, r9, e10, n2, i9, o10) {
                    var f8, u6, a6, s10 = 8 * o10 - i9 - 1, c8 = (1 << s10) - 1, h4 = c8 >> 1, l5 = 23 === i9 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, p5 = n2 ? 0 : o10 - 1, d5 = n2 ? 1 : -1, y3 = r9 < 0 || 0 === r9 && 1 / r9 < 0 ? 1 : 0;
                    for(r9 = Math.abs(r9), isNaN(r9) || r9 === 1 / 0 ? (u6 = isNaN(r9) ? 1 : 0, f8 = c8) : (f8 = Math.floor(Math.log(r9) / Math.LN2), r9 * (a6 = Math.pow(2, -f8)) < 1 && (f8--, a6 *= 2), r9 += f8 + h4 >= 1 ? l5 / a6 : l5 * Math.pow(2, 1 - h4), r9 * a6 >= 2 && (f8++, a6 /= 2), f8 + h4 >= c8 ? (u6 = 0, f8 = c8) : f8 + h4 >= 1 ? (u6 = (r9 * a6 - 1) * Math.pow(2, i9), f8 += h4) : (u6 = r9 * Math.pow(2, h4 - 1) * Math.pow(2, i9), f8 = 0)); i9 >= 8; t4[e10 + p5] = 255 & u6, p5 += d5, u6 /= 256, i9 -= 8);
                    for(f8 = f8 << i9 | u6, s10 += i9; s10 > 0; t4[e10 + p5] = 255 & f8, p5 += d5, f8 /= 256, s10 -= 8);
                    t4[e10 + p5 - d5] |= 128 * y3;
                };
            },
            {
            }
        ],
        33: [
            function(t3, r2, e2) {
                (function(Buffer) {
                    var t4, r9, n2, i9;
                    !(function(e10) {
                        function o10(t7, r10, n4) {
                            function i17(t8, r11, e11, n7) {
                                return this instanceof i17 ? v5(this, t8, r11, e11, n7) : new i17(t8, r11, e11, n7);
                            }
                            function o10(t8) {
                                return !(!t8 || !t8[F3]);
                            }
                            function v5(t8, r11, e11, n7, i18) {
                                if (E3 && A3 && (r11 instanceof A3 && (r11 = new E3(r11)), n7 instanceof A3 && (n7 = new E3(n7))), !(r11 || e11 || n7 || g3)) return void (t8.buffer = h4(m3, 0));
                                if (!s11(r11, e11)) {
                                    var o14 = g3 || Array;
                                    i18 = e11, n7 = r11, e11 = 0, r11 = new o14(8);
                                }
                                t8.buffer = r11, t8.offset = e11 |= 0, b3 !== typeof n7 && ("string" == typeof n7 ? x3(r11, e11, n7, i18 || 10) : s11(n7, i18) ? c8(r11, e11, n7, i18) : "number" == typeof i18 ? (k3(r11, e11 + T3, n7), k3(r11, e11 + S3, i18)) : n7 > 0 ? O3(r11, e11, n7) : n7 < 0 ? L3(r11, e11, n7) : c8(r11, e11, m3, 0));
                            }
                            function x3(t8, r11, e11, n7) {
                                var i18 = 0, o15 = e11.length, f8 = 0, u6 = 0;
                                "-" === e11[0] && i18++;
                                for(var a6 = i18; i18 < o15;){
                                    var s10 = parseInt(e11[i18++], n7);
                                    if (!(s10 >= 0)) break;
                                    u6 = u6 * n7 + s10, f8 = f8 * n7 + Math.floor(u6 / B3), u6 %= B3;
                                }
                                a6 && (f8 = ~f8, u6 ? u6 = B3 - u6 : f8++), k3(t8, r11 + T3, f8), k3(t8, r11 + S3, u6);
                            }
                            function P3() {
                                var t8 = this.buffer, r11 = this.offset, e11 = _6(t8, r11 + T3), i18 = _6(t8, r11 + S3);
                                return n4 || (e11 |= 0), e11 ? e11 * B3 + i18 : i18;
                            }
                            function R3(t8) {
                                var r11 = this.buffer, e11 = this.offset, i18 = _6(r11, e11 + T3), o15 = _6(r11, e11 + S3), f8 = "", u6 = !n4 && 2147483648 & i18;
                                for(u6 && (i18 = ~i18, o15 = B3 - o15), t8 = t8 || 10;;){
                                    var a6 = i18 % t8 * B3 + o15;
                                    if (i18 = Math.floor(i18 / t8), o15 = Math.floor(a6 / t8), f8 = (a6 % t8).toString(t8) + f8, !i18 && !o15) break;
                                }
                                return u6 && (f8 = "-" + f8), f8;
                            }
                            function k3(t8, r11, e11) {
                                t8[r11 + D3] = 255 & e11, e11 >>= 8, t8[r11 + C3] = 255 & e11, e11 >>= 8, t8[r11 + Y3] = 255 & e11, e11 >>= 8, t8[r11 + I3] = 255 & e11;
                            }
                            function _6(t8, r11) {
                                return t8[r11 + I3] * U3 + (t8[r11 + Y3] << 16) + (t8[r11 + C3] << 8) + t8[r11 + D3];
                            }
                            var T3 = r10 ? 0 : 4, S3 = r10 ? 4 : 0, I3 = r10 ? 0 : 3, Y3 = r10 ? 1 : 2, C3 = r10 ? 2 : 1, D3 = r10 ? 3 : 0, O3 = r10 ? l5 : d5, L3 = r10 ? p5 : y3, M3 = i17.prototype, N3 = "is" + t7, F3 = "_" + N3;
                            return M3.buffer = void 0, M3.offset = 0, M3[F3] = !0, M3.toNumber = P3, M3.toString = R3, M3.toJSON = P3, M3.toArray = f8, w3 && (M3.toBuffer = u6), E3 && (M3.toArrayBuffer = a8), i17[N3] = o10, e10[t7] = i17, i17;
                        }
                        function f8(t7) {
                            var r10 = this.buffer, e11 = this.offset;
                            return g3 = null, t7 !== !1 && 0 === e11 && 8 === r10.length && x3(r10) ? r10 : h4(r10, e11);
                        }
                        function u6(t7) {
                            var r10 = this.buffer, e11 = this.offset;
                            if (g3 = w3, t7 !== !1 && 0 === e11 && 8 === r10.length && Buffer.isBuffer(r10)) return r10;
                            var n4 = new w3(8);
                            return c8(n4, 0, r10, e11), n4;
                        }
                        function a8(t7) {
                            var r10 = this.buffer, e11 = this.offset, n4 = r10.buffer;
                            if (g3 = E3, t7 !== !1 && 0 === e11 && n4 instanceof A3 && 8 === n4.byteLength) return n4;
                            var i17 = new E3(8);
                            return c8(i17, 0, r10, e11), i17.buffer;
                        }
                        function s11(t7, r10) {
                            var e11 = t7 && t7.length;
                            return r10 |= 0, e11 && r10 + 8 <= e11 && "string" != typeof t7[r10];
                        }
                        function c8(t7, r10, e11, n4) {
                            r10 |= 0, n4 |= 0;
                            for(var i17 = 0; i17 < 8; i17++)t7[r10++] = 255 & e11[n4++];
                        }
                        function h4(t7, r10) {
                            return Array.prototype.slice.call(t7, r10, r10 + 8);
                        }
                        function l5(t7, r10, e11) {
                            for(var n4 = r10 + 8; n4 > r10;)t7[--n4] = 255 & e11, e11 /= 256;
                        }
                        function p5(t7, r10, e11) {
                            var n4 = r10 + 8;
                            for(e11++; n4 > r10;)t7[--n4] = 255 & -e11 ^ 255, e11 /= 256;
                        }
                        function d5(t7, r10, e11) {
                            for(var n4 = r10 + 8; r10 < n4;)t7[r10++] = 255 & e11, e11 /= 256;
                        }
                        function y3(t7, r10, e11) {
                            var n4 = r10 + 8;
                            for(e11++; r10 < n4;)t7[r10++] = 255 & -e11 ^ 255, e11 /= 256;
                        }
                        function v5(t7) {
                            return !!t7 && "[object Array]" == Object.prototype.toString.call(t7);
                        }
                        var g3, b3 = "undefined", w3 = b3 !== typeof Buffer && Buffer, E3 = b3 !== typeof Uint8Array && Uint8Array, A3 = b3 !== typeof ArrayBuffer && ArrayBuffer, m3 = [
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0
                        ], x3 = Array.isArray || v5, B3 = 4294967296, U3 = 16777216;
                        t4 = o10("Uint64BE", !0, !0), r9 = o10("Int64BE", !0, !1), n2 = o10("Uint64LE", !1, !0), i9 = o10("Int64LE", !1, !1);
                    })("object" == typeof e2 && "string" != typeof e2.nodeName ? e2 : this || {
                    });
                }).call(this, t3("buffer").Buffer);
            },
            {
                buffer: 29
            }
        ],
        34: [
            function(t3, r2, e2) {
                var n2 = {
                }.toString;
                r2.exports = Array.isArray || function(t4) {
                    return "[object Array]" == n2.call(t4);
                };
            },
            {
            }
        ]
    }, {
    }, [
        1
    ])(1);
});
const codec = msgpack.createCodec();
const packTypedArray = (x3)=>new Uint8Array(x3.buffer)
;
codec.addExtPacker(17, Int8Array, packTypedArray);
codec.addExtPacker(18, Uint8Array, packTypedArray);
codec.addExtPacker(19, Int16Array, packTypedArray);
codec.addExtPacker(20, Uint16Array, packTypedArray);
codec.addExtPacker(21, Int32Array, packTypedArray);
codec.addExtPacker(22, Uint32Array, packTypedArray);
codec.addExtPacker(23, Float32Array, packTypedArray);
codec.addExtPacker(24, Float64Array, packTypedArray);
codec.addExtPacker(18, Uint8ClampedArray, packTypedArray);
codec.addExtPacker(18, ArrayBuffer, (x3)=>new Uint8Array(x3)
);
codec.addExtPacker(18, DataView, packTypedArray);
codec.addExtPacker(13, Date, (d5)=>new BigInt64Array([
        BigInt(d5)
    ])
);
codec.addExtUnpacker(13, (uintarray)=>{
    if ("getBigInt64" in DataView.prototype) {
        let dataview = new DataView(uintarray.buffer, uintarray.byteOffset, uintarray.byteLength);
        let bigint = dataview.getBigInt64(0, true);
        if (bigint > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Can't read too big number as date (how far in the future is this?!)`);
        }
        return new Date(Number(bigint));
    } else {
        return new Date(NaN);
    }
});
codec.addExtUnpacker(17, (buffer)=>new Int8Array(buffer)
);
codec.addExtUnpacker(18, (buffer)=>new Uint8Array(buffer)
);
codec.addExtUnpacker(19, (buffer)=>new Int16Array(buffer)
);
codec.addExtUnpacker(20, (buffer)=>new Uint16Array(buffer)
);
codec.addExtUnpacker(21, (buffer)=>new Int32Array(buffer)
);
codec.addExtUnpacker(22, (buffer)=>new Uint32Array(buffer)
);
codec.addExtUnpacker(23, (buffer)=>new Float32Array(buffer)
);
codec.addExtUnpacker(24, (buffer)=>new Float64Array(buffer)
);
const pack = (x3)=>{
    return msgpack.encode(x3, {
        codec: codec
    });
};
const unpack = (x3)=>{
    return msgpack.decode(x3, {
        codec: codec
    });
};
const unpack1 = unpack;
const create_ws_connection = (address, { on_message , on_socket_close  }, timeout_ms = 30 * 1000)=>{
    return new Promise((resolve, reject)=>{
        const socket = new WebSocket(address);
        var has_been_open = false;
        const timeout_handle = setTimeout(()=>{
            console.warn("Creating websocket timed out", new Date().toLocaleTimeString());
            try_close_socket_connection(socket);
            reject("Socket timeout");
        }, timeout_ms);
        const send_encoded = (message)=>{
            const encoded = pack(message);
            socket.send(encoded);
        };
        let last_task = Promise.resolve();
        socket.onmessage = (event)=>{
            last_task = last_task.then(async ()=>{
                try {
                    const buffer = await event.data.arrayBuffer();
                    const message = unpack1(new Uint8Array(buffer));
                    try {
                        on_message(message);
                    } catch (process_err) {
                        console.error("Failed to process message from websocket", process_err, {
                            message
                        });
                        alert(`Something went wrong! You might need to refresh the page.\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to process update\n${process_err.message}\n\n${JSON.stringify(event)}`);
                    }
                } catch (unpack_err) {
                    console.error("Failed to unpack message from websocket", unpack_err, {
                        event
                    });
                    alert(`Something went wrong! You might need to refresh the page.\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to unpack message\n${unpack_err}\n\n${JSON.stringify(event)}`);
                }
            });
        };
        socket.onerror = async (e2)=>{
            console.error(`Socket did an oopsie - ${e2.type}`, new Date().toLocaleTimeString(), "was open:", has_been_open, e2);
            if (await socket_is_alright_with_grace_period(socket)) {
                console.log("The socket somehow recovered from an error?! Onbegrijpelijk");
                console.log(socket);
                console.log(socket.readyState);
            } else {
                if (has_been_open) {
                    on_socket_close();
                    try_close_socket_connection(socket);
                } else {
                    reject(e2);
                }
            }
        };
        socket.onclose = async (e2)=>{
            console.error(`Socket did an oopsie - ${e2.type}`, new Date().toLocaleTimeString(), "was open:", has_been_open, e2);
            if (has_been_open) {
                on_socket_close();
                try_close_socket_connection(socket);
            } else {
                reject(e2);
            }
        };
        socket.onopen = ()=>{
            console.log("Socket opened", new Date().toLocaleTimeString());
            clearInterval(timeout_handle);
            has_been_open = true;
            resolve({
                socket: socket,
                send: send_encoded
            });
        };
        console.log("Waiting for socket to open...", new Date().toLocaleTimeString());
    });
};
const ws_address_from_base = (base_url)=>{
    const ws_url = new URL("./", base_url);
    ws_url.protocol = ws_url.protocol.replace("http", "ws");
    return String(ws_url);
};
const ws_address_from_base1 = ws_address_from_base;
const default_ws_address = ()=>ws_address_from_base(window.location.href)
;
let make_library = ()=>{
    let library = new window.observablehq.Library();
    return {
        DOM: library.DOM,
        Files: library.Files,
        Generators: library.Generators,
        Promises: library.Promises,
        now: library.now,
        svg: library.svg(),
        html: library.html(),
        require: library.require()
    };
};
const observablehq_for_myself = make_library();
const observablehq_for_cells = make_library();
let Promises = observablehq_for_myself.Promises;
const Promises1 = Promises;
const create_pluto_connection = async ({ on_unrequested_update , on_reconnect , on_connection_status , connect_metadata ={
} , ws_address =default_ws_address() ,  })=>{
    var ws_connection = null;
    const client = {
        send: null,
        kill: null,
        session_options: null,
        version_info: {
            julia: "unknown",
            pluto: "unknown"
        }
    };
    const client_id = get_unique_short_id();
    const sent_requests = {
    };
    const send = (message_type, body = {
    }, metadata = {
    }, no_broadcast = true)=>{
        const request_id = get_unique_short_id();
        const message = {
            type: message_type,
            client_id: client_id,
            request_id: request_id,
            body: body,
            ...metadata
        };
        var p5 = resolvable_promise();
        sent_requests[request_id] = (response_message)=>{
            p5.resolve(response_message);
            if (no_broadcast === false) {
                on_unrequested_update(response_message, true);
            }
        };
        ws_connection.send(message);
        return p5.current;
    };
    client.send = send;
    const connect = async ()=>{
        let update_url_with_binder_token = async ()=>{
            try {
                const url = new URL(window.location.href);
                const response = await fetch("possible_binder_token_please");
                if (!response.ok) {
                    return;
                }
                const possible_binder_token = await response.text();
                if (possible_binder_token !== "" && url.searchParams.get("token") !== possible_binder_token) {
                    url.searchParams.set("token", possible_binder_token);
                    history.replaceState({
                    }, "", url.toString());
                }
            } catch (error) {
                console.warn("Error while setting binder url:", error);
            }
        };
        update_url_with_binder_token();
        try {
            ws_connection = await create_ws_connection(String(ws_address), {
                on_message: (update)=>{
                    const by_me = update.initiator_id == client_id;
                    const request_id = update.request_id;
                    if (by_me && request_id) {
                        const request = sent_requests[request_id];
                        if (request) {
                            request(update);
                            delete sent_requests[request_id];
                            return;
                        }
                    }
                    on_unrequested_update(update, by_me);
                },
                on_socket_close: async ()=>{
                    on_connection_status(false);
                    console.log(`Starting new websocket`, new Date().toLocaleTimeString());
                    await Promises1.delay(reconnect_after_close_delay);
                    await connect();
                    console.log(`Starting state sync`, new Date().toLocaleTimeString());
                    const accept = on_reconnect();
                    console.log(`State sync ${accept ? "" : "not "}successful`, new Date().toLocaleTimeString());
                    on_connection_status(accept);
                    if (!accept) {
                        alert("Connection out of sync 😥\n\nRefresh the page to continue");
                    }
                }
            });
            console.log("Hello?");
            const u6 = await send("connect", {
            }, connect_metadata);
            console.log("Hello!");
            client.session_options = u6.message.options;
            client.version_info = u6.message.version_info;
            console.log(client);
            if (connect_metadata.notebook_id != null && !u6.message.notebook_exists) {
                if (confirm("A new server was started - this notebook session is no longer running.\n\nWould you like to go back to the main menu?")) {
                    window.location.href = "./";
                }
                on_connection_status(false);
                return {
                };
            }
            on_connection_status(true);
            const ping = ()=>{
                send("ping", {
                }, {
                }).then(()=>{
                    setTimeout(ping, 28 * 1000);
                }).catch();
            };
            ping();
            return u6.message;
        } catch (ex) {
            console.error("connect() failed", ex);
            await Promises.delay(5000);
            return await connect();
        }
    };
    await connect();
    return client;
};
const create_pluto_connection1 = create_pluto_connection;
const fetch_latest_pluto_version = async ()=>{
    let response = await fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases", {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json"
        },
        redirect: "follow",
        referrerPolicy: "no-referrer"
    });
    let json = await response.json();
    return json[0].tag_name;
};
const create_counter_statistics = ()=>{
    return {
        numEvals: 0,
        numRuns: 0,
        numBondSets: 0,
        numFileDrops: 0
    };
};
const create_counter_statistics1 = create_counter_statistics;
const first_line = (cell)=>/(.*)/.exec(cell.code)[0]
;
const count_matches = (pattern, haystack)=>(haystack.match(pattern) || []).length
;
const value_counts = (values)=>values.reduce((prev_counts, val)=>{
        prev_counts[val] = prev_counts[val] ? prev_counts[val] + 1 : 1;
        return prev_counts;
    }, {
    })
;
const sum = (values)=>values.reduce((a8, b3)=>a8 + b3
    , 0)
;
const finalize_statistics = async (state, client, counter_statistics)=>{
    const cell_results = state.notebook.cell_order.map((cell_id)=>state.notebook.cell_results[cell_id]
    ).filter((x3)=>x3 != null
    );
    const cells = state.notebook.cell_order.map((cell_id)=>state.notebook.cell_inputs[cell_id]
    ).filter((x3)=>x3 != null
    );
    const cell_inputs_local = state.notebook.cell_order.map((cell_id)=>{
        return {
            ...state.cell_inputs_local[cell_id] ?? state.notebook.cell_inputs[cell_id],
            ...state.cell_inputs_local[cell_id]
        };
    });
    const statistics = {
        numCells: cells.length,
        numErrored: cell_results.filter((c8)=>c8.errored
        ).length,
        numFolded: cells.filter((c8)=>c8.code_folded
        ).length,
        numCodeDiffers: state.notebook.cell_order.filter((cell_id)=>state.notebook.cell_inputs[cell_id].code === (state.cell_inputs_local[cell_id]?.code ?? state.notebook.cell_inputs[cell_id].code)
        ).length,
        numMarkdowns: cell_inputs_local.filter((c8)=>first_line(c8).startsWith('md"')
        ).length,
        numBinds: sum(cell_inputs_local.map((c8)=>count_matches(/\@bind/g, c8.code)
        )),
        numBegins: cell_inputs_local.filter((c8)=>first_line(c8).endsWith("begin")
        ).length,
        numLets: cell_inputs_local.filter((c8)=>first_line(c8).endsWith("let")
        ).length,
        cellSizes: value_counts(cell_inputs_local.map((c8)=>count_matches(/\n/g, c8.code) + 1
        )),
        runtimes: value_counts(cell_results.map((c8)=>Math.floor(Math.log10(c8.runtime + 1))
        )),
        versionPluto: client.version_info == null ? "unkown" : client.version_info.pluto,
        timestamp: firebase.firestore.Timestamp.now(),
        screenWidthApprox: 100 * Math.round(document.body.clientWidth / 100),
        docsOpen: parseFloat(window.getComputedStyle(document.querySelector("pluto-helpbox")).height) > 200,
        hasFocus: document.hasFocus(),
        numConcurrentNotebooks: NaN,
        pingTimeWS: NaN,
        pingTimeHTTP: NaN,
        ...counter_statistics
    };
    try {
        let { message  } = await client.send("get_all_notebooks");
        statistics.numConcurrentNotebooks = message.notebooks.length;
        await fetch("ping");
        const ticHTTP = Date.now();
        await fetch("ping");
        statistics.pingTimeHTTP = Date.now() - ticHTTP;
        await client.send("ping");
        const ticWS = Date.now();
        await client.send("ping");
        statistics.pingTimeWS = Date.now() - ticWS;
    } catch (ex) {
        console.log("Failed to measure ping times");
        console.log(ex);
    }
    return statistics;
};
const store_statistics_sample = (statistics)=>localStorage.setItem("statistics sample", JSON.stringify(statistics, null, 4))
;
const feedbackdb = {
    instance: null
};
const init_firebase = ()=>{
    firebase.initializeApp({
        apiKey: "AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68",
        authDomain: "localhost",
        projectId: "pluto-feedback"
    });
    feedbackdb.instance = firebase.firestore();
};
const init_feedback = ()=>{
    init_firebase();
    const feedbackform = document.querySelector("form#feedback");
    feedbackform.addEventListener("submit", (e2)=>{
        const email = prompt("Would you like us to contact you?\n\nEmail: (leave blank to stay anonymous 👀)");
        timeout_promise(feedbackdb.instance.collection("feedback").add({
            feedback: new FormData(e2.target).get("opinion"),
            timestamp: firebase.firestore.Timestamp.now(),
            email: email ? email : ""
        }), 5000).then(()=>{
            let message = "Submitted. Thank you for your feedback! 💕";
            console.log(message);
            alert(message);
            feedbackform.querySelector("#opinion").value = "";
        }).catch((error)=>{
            let message = "Whoops, failed to send feedback 😢\nWe would really like to hear from you! Please got to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n";
            console.error(message);
            console.error(error);
            alert(message + error);
        });
        e2.preventDefault();
    });
};
const send_statistics_if_enabled = (statistics)=>{
    if (localStorage.getItem("statistics enable") && localStorage.getItem("statistics enable") == "true") {
        timeout_promise(feedbackdb.instance.collection("statistics").add(statistics), 10000).catch((error)=>{
            console.error("Failed to send statistics:");
            console.error(error);
        });
    }
};
const deselect = (cm)=>{
    cm.setSelection({
        line: 0,
        ch: Infinity
    }, {
        line: 0,
        ch: Infinity
    }, {
        scroll: false
    });
};
let is_mac_keyboard = /Mac/.test(navigator.platform);
let ctrl_or_cmd_name = is_mac_keyboard ? "Cmd" : "Ctrl";
let has_ctrl_or_cmd_pressed = (event)=>event.ctrlKey || is_mac_keyboard && event.metaKey
;
let map_cmd_to_ctrl_on_mac = (keymap)=>{
    if (!is_mac_keyboard) {
        return keymap;
    }
    let keymap_with_cmd = {
        ...keymap
    };
    for (let [key, handler] of Object.entries(keymap)){
        keymap_with_cmd[key.replace(/Ctrl/g, "Cmd")] = handler;
    }
    return keymap_with_cmd;
};
let in_textarea_or_input = ()=>{
    const { tagName  } = document.activeElement;
    return tagName === "INPUT" || tagName === "TEXTAREA";
};
class FilePicker extends d4 {
    constructor(){
        super();
        this.forced_value = "";
        this.cm = null;
        this.suggest_not_tmp = ()=>{
            const suggest = this.props.suggest_new_file;
            if (suggest != null && this.cm.getValue() === "") {
                this.cm.setValue(suggest.base);
                this.cm.setSelection({
                    line: 0,
                    ch: Infinity
                }, {
                    line: 0,
                    ch: Infinity
                });
                this.cm.focus();
                this.request_path_completions.bind(this)();
            }
            window.dispatchEvent(new CustomEvent("collapse_cell_selection", {
            }));
        };
        this.on_submit = async ()=>{
            const my_val = this.cm.getValue();
            if (my_val === this.forced_value) {
                this.suggest_not_tmp();
                return;
            }
            try {
                await this.props.on_submit(this.cm.getValue());
                this.cm.blur();
            } catch (error) {
                this.cm.setValue(this.props.value);
                deselect(this.cm);
            }
        };
    }
    componentDidUpdate() {
        if (this.forced_value != this.props.value) {
            this.cm.setValue(this.props.value);
            deselect(this.cm);
            this.forced_value = this.props.value;
        }
    }
    componentDidMount() {
        this.cm = window.CodeMirror((el)=>{
            this.base.insertBefore(el, this.base.firstElementChild);
        }, {
            value: "",
            lineNumbers: false,
            lineWrapping: false,
            theme: "nothing",
            viewportMargin: Infinity,
            placeholder: this.props.placeholder,
            indentWithTabs: true,
            indentUnit: 4,
            hintOptions: {
                hint: pathhints,
                completeSingle: false,
                suggest_new_file: this.props.suggest_new_file,
                client: this.props.client
            },
            scrollbarStyle: "null"
        });
        this.cm.setOption("extraKeys", map_cmd_to_ctrl_on_mac({
            "Ctrl-Enter": this.on_submit,
            "Ctrl-Shift-Enter": this.on_submit,
            "Enter": this.on_submit,
            "Esc": (cm)=>{
                cm.closeHint();
                cm.setValue(this.props.value);
                deselect(cm);
                document.activeElement.blur();
            },
            "Tab": this.request_path_completions.bind(this)
        }));
        this.cm.on("change", (cm, e2)=>{
            if (e2.origin !== "setValue") {
                this.request_path_completions.bind(this)();
            }
        });
        this.cm.on("blur", (cm, e2)=>{
            setTimeout(()=>{
                if (!cm.hasFocus()) {
                    cm.setValue(this.props.value);
                    deselect(cm);
                }
            }, 250);
        });
        this.cm.on("focus", (cm, e2)=>{
            this.suggest_not_tmp();
        });
        window.addEventListener("resize", ()=>{
            if (!this.cm.hasFocus()) {
                deselect(this.cm);
            }
        });
    }
    render() {
        return re`\n            <pluto-filepicker>\n                <button onClick=${this.on_submit}>${this.props.button_label}</button>\n            </pluto-filepicker>\n        `;
    }
    request_path_completions() {
        const cursor = this.cm.getCursor();
        const oldLine = this.cm.getLine(cursor.line);
        if (!this.cm.somethingSelected()) {
            if (cursor.ch == oldLine.length) {
                this.cm.showHint();
            }
        }
    }
}
const te1 = new TextEncoder();
const td = new TextDecoder();
const utf8index_to_ut16index = (str, index_utf8)=>td.decode(te1.encode(str).slice(0, index_utf8)).length
;
const splice_utf8 = (original, startindex_utf8, endindex_utf8, replacement)=>{
    const original_enc = te1.encode(original);
    const replacement_enc = te1.encode(replacement);
    const result_enc = new Uint8Array(original_enc.length + replacement_enc.length - (endindex_utf8 - startindex_utf8));
    result_enc.set(original_enc.slice(0, startindex_utf8), 0);
    result_enc.set(replacement_enc, startindex_utf8);
    result_enc.set(original_enc.slice(endindex_utf8), startindex_utf8 + replacement_enc.length);
    return td.decode(result_enc);
};
const slice_utf8 = (original, startindex_utf8, endindex_utf8)=>{
    const original_enc = te1.encode(original);
    return td.decode(original_enc.slice(startindex_utf8, endindex_utf8));
};
const slice_utf81 = slice_utf8;
console.assert(splice_utf8("e é 🐶 is a dog", 5, 9, "hannes ❤") === "e é hannes ❤ is a dog");
console.assert(slice_utf8("e é 🐶 is a dog", 5, 9) === "🐶");
const pathhints = (cm, options)=>{
    const cursor = cm.getCursor();
    const oldLine = cm.getLine(cursor.line);
    return options.client.send("completepath", {
        query: oldLine
    }).then((update)=>{
        const queryFileName = oldLine.split("/").pop().split("\\").pop();
        const results = update.message.results;
        const from = utf8index_to_ut16index(oldLine, update.message.start);
        const to = utf8index_to_ut16index(oldLine, update.message.stop);
        if (results.length >= 1 && results[0] == queryFileName) {
            return null;
        }
        var styledResults = results.map((r2)=>({
                text: r2,
                className: r2.endsWith("/") || r2.endsWith("\\") ? "dir" : "file"
            })
        );
        if (options.suggest_new_file != null) {
            for(var initLength = 3; initLength >= 0; initLength--){
                const init = ".jl".substring(0, initLength);
                if (queryFileName.endsWith(init)) {
                    var suggestedFileName = queryFileName + ".jl".substring(initLength);
                    if (suggestedFileName == ".jl") {
                        suggestedFileName = "notebook.jl";
                    }
                    if (initLength == 3) {
                        return null;
                    }
                    if (!results.includes(suggestedFileName)) {
                        styledResults.push({
                            text: suggestedFileName,
                            displayText: suggestedFileName + " (new)",
                            className: "file new"
                        });
                    }
                    break;
                }
            }
        }
        return {
            list: styledResults,
            from: CodeMirror.Pos(cursor.line, from),
            to: CodeMirror.Pos(cursor.line, to)
        };
    });
};
const CodeMirror = window.CodeMirror;
const clear_selection = (cm)=>{
    const c8 = cm.getCursor();
    cm.setSelection(c8, c8, {
        scroll: false
    });
};
const all_equal = (x3)=>x3.every((y3)=>y3 === x3[0]
    )
;
let PlutoContext = U1();
let PlutoBondsContext = U1(null);
const CellInput = ({ local_code , remote_code , disable_input , focus_after_creation , cm_forced_focus , set_cm_forced_focus , on_submit , on_delete , on_add_after , on_change , on_update_doc_query , on_focus_neighbor , on_drag_drop_events , cell_id , notebook_id ,  })=>{
    let pluto_actions = Q1(PlutoContext);
    const cm_ref = z2(null);
    const text_area_ref = z2(null);
    const dom_node_ref = z2(null);
    const remote_code_ref = z2(null);
    const change_handler_ref = z2(null);
    change_handler_ref.current = on_change;
    const time_last_being_force_focussed_ref = z2(0);
    const time_last_genuine_backspace = z2(0);
    $1(()=>{
        const current_value = cm_ref.current?.getValue() ?? "";
        if (remote_code_ref.current == null && remote_code === "" && current_value !== "") {
            return;
        }
        remote_code_ref.current = remote_code;
        if (current_value !== remote_code) {
            cm_ref.current?.setValue(remote_code);
        }
    }, [
        remote_code
    ]);
    j(()=>{
        const cm = cm_ref.current = CodeMirror.fromTextArea(text_area_ref.current, {
            value: local_code,
            lineNumbers: true,
            mode: "julia",
            lineWrapping: true,
            viewportMargin: Infinity,
            placeholder: "Enter cell code...",
            indentWithTabs: true,
            indentUnit: 4,
            hintOptions: {
                hint: juliahints,
                pluto_actions: pluto_actions,
                notebook_id: notebook_id,
                on_update_doc_query: on_update_doc_query,
                extraKeys: {
                    ".": (cm1, { pick  })=>{
                        pick();
                        cm1.replaceSelection(".");
                        cm1.showHint();
                    }
                }
            },
            matchBrackets: true
        });
        const keys = {
        };
        keys["Shift-Enter"] = ()=>on_submit()
        ;
        keys["Ctrl-Enter"] = async ()=>{
            await on_add_after();
            const new_value = cm.getValue();
            if (new_value !== remote_code_ref.current.body) {
                on_submit();
            }
        };
        keys["PageUp"] = ()=>{
            on_focus_neighbor(cell_id, -1, 0, 0);
        };
        keys["PageDown"] = ()=>{
            on_focus_neighbor(cell_id, +1, 0, 0);
        };
        keys["Shift-Tab"] = "indentLess";
        keys["Tab"] = on_tab_key;
        keys["Ctrl-Space"] = ()=>cm.showHint()
        ;
        keys["Ctrl-D"] = ()=>{
            if (cm.somethingSelected()) {
                const sels = cm.getSelections();
                if (all_equal(sels)) {
                }
            } else {
                const cursor = cm.getCursor();
                const token = cm.getTokenAt(cursor);
                cm.setSelection({
                    line: cursor.line,
                    ch: token.start
                }, {
                    line: cursor.line,
                    ch: token.end
                });
            }
        };
        keys["Ctrl-/"] = ()=>{
            const old_value = cm.getValue();
            cm.toggleComment({
                indent: true
            });
            const new_value = cm.getValue();
            if (old_value === new_value) {
                cm.setValue(cm.lineCount() === 1 ? `# ${new_value}` : `#= ${new_value} =#`);
                cm.execCommand("selectAll");
            }
        };
        keys["Ctrl-M"] = ()=>{
            const value = cm.getValue();
            const trimmed = value.trim();
            const offset = value.length - value.trimStart().length;
            if (trimmed.startsWith('md"') && trimmed.endsWith('"')) {
                let start, end;
                if (trimmed.startsWith('md"""') && trimmed.endsWith('"""')) {
                    start = 5;
                    end = trimmed.length - 3;
                } else {
                    start = 3;
                    end = trimmed.length - 1;
                }
                if (start >= end || trimmed.substring(start, end).trim() == "") {
                    cm.setValue("");
                } else {
                    while(/\s/.test(trimmed[start])){
                        ++start;
                    }
                    while(/\s/.test(trimmed[end - 1])){
                        --end;
                    }
                    cm.replaceRange("", cm.posFromIndex(end + offset), {
                        line: cm.lineCount()
                    });
                    cm.replaceRange("", {
                        line: 0,
                        ch: 0
                    }, cm.posFromIndex(start + offset));
                }
            } else {
                const old_selections = cm.listSelections();
                cm.setValue(`md"""\n${value}\n"""`);
                const new_selections = old_selections.map(({ anchor , head  })=>{
                    return {
                        anchor: {
                            ...anchor,
                            line: anchor.line + 1
                        },
                        head: {
                            ...head,
                            line: head.line + 1
                        }
                    };
                });
                cm.setSelections(new_selections);
            }
        };
        const swap = (a8, i9, j2)=>{
            [a8[i9], a8[j2]] = [
                a8[j2],
                a8[i9]
            ];
        };
        const range = (a8, b3)=>{
            const x3 = Math.min(a8, b3);
            const y3 = Math.max(a8, b3);
            return [
                ...Array(y3 + 1 - x3).keys()
            ].map((i9)=>i9 + x3
            );
        };
        const alt_move = (delta)=>{
            const selections = cm.listSelections();
            const selected_lines = new Set([].concat(...selections.map((sel)=>range(sel.anchor.line, sel.head.line)
            )));
            const final_line_number = delta === 1 ? cm.lineCount() - 1 : 0;
            if (!selected_lines.has(final_line_number)) {
                Array.from(selected_lines).sort((a8, b3)=>delta * a8 < delta * b3 ? 1 : -1
                ).forEach((line_number)=>{
                    const lines = cm.getValue().split("\n");
                    swap(lines, line_number, line_number + delta);
                    cm.setValue(lines.join("\n"));
                    cm.indentLine(line_number + delta, "smart");
                    cm.indentLine(line_number, "smart");
                });
                cm.setSelections(selections.map((sel)=>{
                    return {
                        head: {
                            line: sel.head.line + delta,
                            ch: sel.head.ch
                        },
                        anchor: {
                            line: sel.anchor.line + delta,
                            ch: sel.anchor.ch
                        }
                    };
                }));
            }
        };
        keys["Alt-Up"] = ()=>alt_move(-1)
        ;
        keys["Alt-Down"] = ()=>alt_move(+1)
        ;
        keys["Backspace"] = keys["Ctrl-Backspace"] = ()=>{
            const BACKSPACE_CELL_DELETE_COOLDOWN = 300;
            const BACKSPACE_AFTER_FORCE_FOCUS_COOLDOWN = 300;
            if (cm.lineCount() === 1 && cm.getValue() === "") {
                let enough_time_passed_since_last_backspace = Date.now() - time_last_genuine_backspace.current > BACKSPACE_CELL_DELETE_COOLDOWN;
                let enough_time_passed_since_force_focus = Date.now() - time_last_being_force_focussed_ref.current > BACKSPACE_AFTER_FORCE_FOCUS_COOLDOWN;
                if (enough_time_passed_since_last_backspace && enough_time_passed_since_force_focus) {
                    on_focus_neighbor(cell_id, -1);
                    on_delete();
                }
            }
            let enough_time_passed_since_force_focus = Date.now() - time_last_being_force_focussed_ref.current > BACKSPACE_AFTER_FORCE_FOCUS_COOLDOWN;
            if (enough_time_passed_since_force_focus) {
                time_last_genuine_backspace.current = Date.now();
                return CodeMirror.Pass;
            } else {
                time_last_being_force_focussed_ref.current = Date.now();
            }
        };
        keys["Delete"] = keys["Ctrl-Delete"] = ()=>{
            if (cm.lineCount() === 1 && cm.getValue() === "") {
                on_focus_neighbor(cell_id, +1);
                on_delete();
            }
            return CodeMirror.Pass;
        };
        let with_time_since_last = (fn1)=>{
            let last_invoke_time = -Infinity;
            return ()=>{
                let result = fn1(Date.now() - last_invoke_time);
                last_invoke_time = Date.now();
                return result;
            };
        };
        const isapprox = (a8, b3)=>Math.abs(a8 - b3) < 3
        ;
        const at_first_line_visually = ()=>isapprox(cm.cursorCoords(null, "div").top, 0)
        ;
        keys["Up"] = with_time_since_last((elapsed)=>{
            if (elapsed > 300 && at_first_line_visually()) {
                on_focus_neighbor(cell_id, -1, Infinity, Infinity);
            } else {
                return CodeMirror.Pass;
            }
        });
        const at_first_position = ()=>cm.findPosH(cm.getCursor(), -1, "char")?.hitSide === true
        ;
        keys["Left"] = with_time_since_last((elapsed)=>{
            if (elapsed > 300 && at_first_position()) {
                on_focus_neighbor(cell_id, -1, Infinity, Infinity);
            } else {
                return CodeMirror.Pass;
            }
        });
        const at_last_line_visually = ()=>isapprox(cm.cursorCoords(null, "div").top, cm.cursorCoords({
                line: Infinity,
                ch: Infinity
            }, "div").top)
        ;
        keys["Down"] = with_time_since_last((elapsed)=>{
            if (elapsed > 300 && at_last_line_visually()) {
                on_focus_neighbor(cell_id, 1, 0, 0);
            } else {
                return CodeMirror.Pass;
            }
        });
        const at_last_position = ()=>cm.findPosH(cm.getCursor(), 1, "char")?.hitSide === true
        ;
        keys["Right"] = with_time_since_last((elapsed)=>{
            if (elapsed > 300 && at_last_position()) {
                on_focus_neighbor(cell_id, 1, 0, 0);
            } else {
                return CodeMirror.Pass;
            }
        });
        const open_close_selection = (opening_char, closing_char)=>()=>{
                if (cm.somethingSelected()) {
                    for (const selection of cm.getSelections()){
                        cm.replaceSelection(`${opening_char}${selection}${closing_char}`, "around");
                    }
                } else {
                    return CodeMirror.Pass;
                }
            }
        ;
        [
            "()",
            "{}",
            "[]"
        ].forEach((pair)=>{
            const [opening_char, closing_char] = pair.split("");
            keys[`'${opening_char}'`] = open_close_selection(opening_char, closing_char);
        });
        cm.setOption("extraKeys", map_cmd_to_ctrl_on_mac(keys));
        let is_good_token = (token)=>{
            if (token.type == null && token.string === "]") {
                return true;
            }
            if (token.type === "builtin" && token.string.startsWith(":") && !token.string.startsWith("::")) {
                return false;
            }
            let bad_token_types = [
                "number",
                "string",
                null
            ];
            if (bad_token_types.includes(token.type)) {
                return false;
            }
            return true;
        };
        cm.on("dragover", (cm_, e2)=>{
            if (e2.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e2);
                return true;
            }
        });
        cm.on("drop", (cm_, e2)=>{
            if (e2.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e2);
                e2.preventDefault();
                return true;
            }
        });
        cm.on("dragenter", (cm_, e2)=>{
            if (e2.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e2);
                return true;
            }
        });
        cm.on("dragleave", (cm_, e2)=>{
            if (e2.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e2);
                return true;
            }
        });
        cm.on("cursorActivity", ()=>{
            setTimeout(()=>{
                if (!cm.hasFocus()) return;
                if (cm.somethingSelected()) {
                    const sel = cm.getSelection();
                    if (!/[\s]/.test(sel)) {
                        on_update_doc_query(sel);
                    }
                } else {
                    const cursor = cm.getCursor();
                    const token = cm.getTokenAt(cursor);
                    if (token.start === 0 && token.type === "operator" && token.string === "?") {
                        const second_token = cm.getTokenAt({
                            ...cursor,
                            ch: 2
                        });
                        on_update_doc_query(second_token.string);
                    } else {
                        const token_before_cursor = cm.getTokenAt(cursor);
                        const token_after_cursor = cm.getTokenAt({
                            ...cursor,
                            ch: cursor.ch + 1
                        });
                        let before_and_after_token = [
                            token_before_cursor,
                            token_after_cursor
                        ];
                        for (let possibly_string_macro of before_and_after_token){
                            let match = possibly_string_macro.string.match(/([a-zA-Z]+)"/);
                            if (possibly_string_macro.type === "string" && match != null) {
                                return on_update_doc_query(`@${match[1]}_str`);
                            }
                        }
                        let good_token = before_and_after_token.find((x3)=>is_good_token(x3)
                        );
                        if (good_token) {
                            let tokens = cm.getLineTokens(cursor.line);
                            let current_token = tokens.findIndex((x3)=>x3.start === good_token.start && x3.end === good_token.end
                            );
                            on_update_doc_query(module_expanded_selection({
                                tokens_before_cursor: tokens.slice(0, current_token + 1),
                                tokens_after_cursor: tokens.slice(current_token + 1)
                            }));
                        }
                    }
                }
            }, 0);
        });
        cm.on("change", (_6, e2)=>{
            const new_value = cm.getValue();
            if (new_value.length > 1 && new_value[0] === "?") {
                window.dispatchEvent(new CustomEvent("open_live_docs"));
            }
            change_handler_ref.current(new_value);
        });
        cm.on("blur", ()=>{
            setTimeout(()=>{
                if (document.hasFocus()) {
                    clear_selection(cm);
                    set_cm_forced_focus(null);
                }
            }, 100);
        });
        cm.on("paste", (e2)=>{
            const topaste = e2.clipboardData.getData("text/plain");
            if (topaste.match(/# ╔═╡ ........-....-....-....-............/g)?.length) {
                e2.codemirrorIgnore = true;
            }
        });
        if (focus_after_creation) {
            cm.focus();
        }
        document.fonts.ready.then(()=>{
            cm.refresh();
        });
    }, []);
    $1(()=>{
        cm_ref.current.options.disableInput = disable_input;
    }, [
        disable_input
    ]);
    $1(()=>{
        if (cm_forced_focus == null) {
            clear_selection(cm_ref.current);
        } else {
            time_last_being_force_focussed_ref.current = Date.now();
            let cm_forced_focus_mapped = cm_forced_focus.map((x3)=>x3.line === Infinity ? {
                    ...x3,
                    line: cm_ref.current.lastLine()
                } : x3
            );
            cm_ref.current.focus();
            cm_ref.current.setSelection(...cm_forced_focus_mapped);
        }
    }, [
        cm_forced_focus
    ]);
    return re`\n        <pluto-input ref=${dom_node_ref}>\n            <button onClick=${on_delete} class="delete_cell" title="Delete cell"><span></span></button>\n            <textarea ref=${text_area_ref}></textarea>\n        </pluto-input>\n    `;
};
const no_autocomplete = " \t\r\n([])+-=/,;'\"!#$%^&*~`<>|";
const on_tab_key = (cm)=>{
    const cursor = cm.getCursor();
    const old_line = cm.getLine(cursor.line);
    if (cm.somethingSelected()) {
        cm.indentSelection();
    } else {
        if (cursor.ch > 0 && no_autocomplete.indexOf(old_line[cursor.ch - 1]) == -1) {
            cm.showHint();
        } else {
            cm.replaceSelection("\t");
        }
    }
};
const juliahints = (cm, options)=>{
    const cursor = cm.getCursor();
    const old_line = cm.getLine(cursor.line);
    const old_line_sliced = old_line.slice(0, cursor.ch);
    return options.pluto_actions.send("complete", {
        query: old_line_sliced
    }, {
        notebook_id: options.notebook_id
    }).then(({ message  })=>{
        const completions = {
            list: message.results.map(([text, type_description, is_exported])=>({
                    text: text,
                    className: (is_exported ? "" : "c_notexported ") + (type_description == null ? "" : "c_" + type_description)
                })
            ),
            from: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, message.start)),
            to: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, message.stop))
        };
        CodeMirror.on(completions, "select", (val)=>{
            let text = typeof val === "string" ? val : val.text;
            let doc_query = module_expanded_selection({
                tokens_before_cursor: [
                    {
                        type: "variable",
                        string: old_line_sliced.slice(0, completions.from.ch)
                    },
                    {
                        type: "variable",
                        string: text
                    }, 
                ],
                tokens_after_cursor: []
            });
            options.on_update_doc_query(doc_query);
        });
        return completions;
    });
};
const module_expanded_selection = ({ tokens_before_cursor , tokens_after_cursor  })=>{
    let i_guess_current_token = tokens_before_cursor[tokens_before_cursor.length - 1];
    if (i_guess_current_token?.type === "builtin" && i_guess_current_token.string.startsWith("::")) {
        let typedef_tokens = [];
        typedef_tokens.push(i_guess_current_token.string.slice(2));
        for (let token of tokens_after_cursor){
            if (token.type !== "builtin") break;
            typedef_tokens.push(token.string);
        }
        return typedef_tokens.join("");
    }
    if (i_guess_current_token?.type === "operator") {
        let operator_tokens = [];
        for (let token of tokens_before_cursor.reverse()){
            if (token.type !== "operator") {
                break;
            }
            operator_tokens.unshift(token.string);
        }
        for (let token1 of tokens_after_cursor){
            if (token1.type !== "operator") {
                break;
            }
            operator_tokens.push(token1.string);
        }
        return operator_tokens.join("");
    }
    let found = [];
    let state = "top";
    for (let token of tokens_before_cursor.slice().reverse()){
        if (state === "top") {
            if (token.type == null && token.string == "]") {
                state = "in-ref";
                found.push(token.string);
                continue;
            }
            if (token.type == null) {
                break;
            }
            if (token.type === "number") {
                break;
            }
            if (token.type === "builtin" && token.string.startsWith("::")) {
                found.push(token.string.slice(2));
                break;
            }
            found.push(token.string);
        } else if (state === "in-ref") {
            if (token.type == null && token.string == "[") {
                state = "top";
                found.push(token.string);
                continue;
            }
            if (token.type === "number" || token.type === "string") {
                found.push(token.string);
                continue;
            }
            break;
        }
    }
    return found.reverse().join("").replace(/\.$/, "");
};
const RunArea = ({ runtime , onClick  })=>{
    return re`\n        <pluto-runarea>\n            <button onClick=${onClick} class="runcell" title="Run"><span></span></button>\n            <span class="runtime">${prettytime(runtime)}</span>\n        </pluto-runarea>\n    `;
};
const prettytime = (time_ns)=>{
    if (time_ns == null) {
        return "---";
    }
    const prefices = [
        "n",
        "μ",
        "m",
        ""
    ];
    let i9 = 0;
    while(i9 < prefices.length - 1 && time_ns >= 1000){
        i9 += 1;
        time_ns /= 1000;
    }
    const roundedtime = time_ns.toFixed(time_ns >= 100 ? 0 : 1);
    return roundedtime + "\xa0" + prefices[i9] + "s";
};
const update_interval = 50;
const useMillisSinceTruthy = (truthy)=>{
    const [now, setNow] = q1(0);
    const [startRunning, setStartRunning] = q1(0);
    $1(()=>{
        let interval;
        if (truthy) {
            const now1 = +new Date();
            setStartRunning(now1);
            setNow(now1);
            interval = setInterval(()=>setNow(+new Date())
            , update_interval);
        }
        return ()=>{
            interval && clearInterval(interval);
        };
    }, [
        truthy
    ]);
    return truthy ? now - startRunning : undefined;
};
const prepareFile = (file)=>new Promise((resolve, reject)=>{
        const { name , type  } = file;
        const fr = new FileReader();
        fr.onerror = ()=>reject("Failed to read file!")
        ;
        fr.onloadstart = ()=>{
        };
        fr.onprogress = ({ loaded , total  })=>{
        };
        fr.onload = ()=>{
        };
        fr.onloadend = ({ target: { result  }  })=>resolve({
                file: result,
                name,
                type
            })
        ;
        fr.readAsArrayBuffer(file);
    })
;
const useDropHandler = ()=>{
    let pluto_actions = Q1(PlutoContext);
    const [saving_file, set_saving_file] = q1(false);
    const [drag_active, set_drag_active_fast] = q1(false);
    const set_drag_active = J1(()=>_.debounce(set_drag_active_fast, 250)
    , [
        set_drag_active_fast
    ]);
    const handler = J1(()=>{
        const uploadAndCreateCodeTemplate = async (file, drop_cell_id)=>{
            if (!(file instanceof File)) return " #  File can't be read";
            set_saving_file(true);
            const { message: { success , code  } ,  } = await prepareFile(file).then((preparedObj)=>{
                return pluto_actions.write_file(drop_cell_id, preparedObj);
            }, ()=>alert("Pluto can't save this file 😥")
            );
            set_saving_file(false);
            set_drag_active_fast(false);
            if (!success) {
                alert("Pluto can't save this file 😥");
                return "# File save failed";
            }
            if (code) return code;
            alert("Pluto doesn't know what to do with this file 😥. Feel that's wrong? Open an issue!");
            return "";
        };
        return (ev)=>{
            if (ev.dataTransfer.types[0] === "text/pluto-cell" || ev.dataTransfer.types[0] === "text/plain") return;
            ev.stopPropagation();
            switch(ev.type){
                case "cmdrop":
                case "drop":
                    ev.preventDefault();
                    const cell_element = (ev.path || ev.composedPath()).find((el)=>el.tagName === "PLUTO-CELL"
                    );
                    const drop_cell_id = cell_element?.id || document.querySelector("pluto-cell:last-child")?.id;
                    const drop_cell_value = cell_element?.querySelector(".CodeMirror")?.CodeMirror?.getValue();
                    const is_empty = drop_cell_value?.length === 0 && !cell_element?.classList?.contains("code_folded");
                    set_drag_active(false);
                    if (!ev.dataTransfer.files.length) {
                        return;
                    }
                    uploadAndCreateCodeTemplate(ev.dataTransfer.files[0], drop_cell_id).then((code)=>{
                        if (code) {
                            if (!is_empty) {
                                pluto_actions.add_remote_cell(drop_cell_id, "after", code);
                            } else {
                                pluto_actions.set_local_cell(drop_cell_id, code, ()=>pluto_actions.set_and_run_multiple([
                                        drop_cell_id
                                    ])
                                );
                            }
                        }
                    });
                    break;
                case "dragover":
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "copy";
                    set_drag_active(true);
                    setTimeout(()=>set_drag_active(false)
                    , 500);
                    break;
                case "dragenter":
                    set_drag_active_fast(true);
                    break;
                case "dragleave":
                    set_drag_active(false);
                    break;
                default:
            }
        };
    }, [
        set_drag_active,
        set_drag_active_fast,
        set_saving_file,
        pluto_actions
    ]);
    return {
        saving_file,
        drag_active,
        handler
    };
};
const cl = (classTable)=>{
    if (!classTable) {
        return null;
    }
    return Object.entries(classTable).reduce((allClasses, [nextClass, enable])=>enable ? nextClass + " " + allClasses : allClasses
    , "");
};
class CellOutput extends d4 {
    constructor(){
        super();
        this.state = {
            error: null
        };
        this.old_height = 0;
        this.resize_observer = new ResizeObserver((entries)=>{
            const new_height = this.base.offsetHeight;
            if (document.body.querySelector("pluto-cell:focus-within")) {
                const cell_outputs_after_focused = document.body.querySelectorAll("pluto-cell:focus-within ~ pluto-cell > pluto-output");
                if (cell_outputs_after_focused.length == 0 || !Array.from(cell_outputs_after_focused).includes(this.base)) {
                    window.scrollBy(0, new_height - this.old_height);
                }
            }
            this.old_height = new_height;
        });
    }
    shouldComponentUpdate({ last_run_timestamp  }) {
        return last_run_timestamp !== this.props.last_run_timestamp;
    }
    componentDidMount() {
        this.resize_observer.observe(this.base);
    }
    componentWillUnmount() {
        this.resize_observer.unobserve(this.base);
    }
    render() {
        return re`\n            <pluto-output\n                class=${cl({
            rich_output: this.props.errored || !this.props.body || this.props.mime !== "application/vnd.pluto.tree+object" && this.props.mime !== "application/vnd.pluto.table+object" && this.props.mime !== "text/plain",
            scroll_y: this.props.mime === "application/vnd.pluto.table+object" || this.props.mime === "text/plain"
        })}\n                mime=${this.props.mime}\n            >\n                <assignee>${this.props.rootassignee}</assignee>\n                ${this.state.error ? re`<div>${this.state.error.message}</div>` : re`<${OutputBody} ...${this.props} />`}\n            </pluto-output>\n        `;
    }
}
let PlutoImage = ({ body , mime  })=>{
    let imgref = z2();
    j(()=>{
        let url = URL.createObjectURL(new Blob([
            body
        ], {
            type: mime
        }));
        imgref.current.onload = imgref.current.onerror = ()=>{
            imgref.current.style.display = null;
        };
        if (imgref.current.src === "") {
            imgref.current.style.display = "none";
        }
        imgref.current.src = url;
        return ()=>URL.revokeObjectURL(url)
        ;
    }, [
        body
    ]);
    return re`<img ref=${imgref} type=${mime} src=${""} />`;
};
const set_input = (input, value)=>{
    if (value == null) {
        input.value = null;
        return;
    }
    switch(input.type){
        case "range":
        case "number":
            {
                if (input.valueAsNumber !== value) {
                    input.valueAsNumber = value;
                }
                return;
            }
        case "date":
            {
                if (input.valueAsDate == null || Number(input.valueAsDate) !== Number(value)) {
                    input.valueAsDate = value;
                }
                return;
            }
        case "checkbox":
            {
                if (input.checked !== value) {
                    input.checked = value;
                }
                return;
            }
        case "file":
            {
                return;
            }
        case "select-multiple":
            {
                for (let option of input.options){
                    option.selected = value.includes(option.value);
                }
                return;
            }
        default:
            {
                if (input.value !== value) {
                    input.value = value;
                }
                return;
            }
    }
};
const set_bound_elements_to_their_value = (node, bond_values)=>{
    for (let bond_node of node.querySelectorAll("bond")){
        let bond_name = bond_node.getAttribute("def");
        if (bond_node.firstElementChild != null && bond_values[bond_name] != null) {
            try {
                set_input(bond_node.firstElementChild, bond_values[bond_name].value);
            } catch (error) {
                console.error(`error while setting input`, bond_node.firstElementChild, `to value`, bond_values[bond_name].value, `:`, error);
            }
        }
    }
};
const add_bonds_listener = (node, on_bond_change)=>{
    var node_is_invalidated = false;
    node.querySelectorAll("bond").forEach(async (bond_node)=>{
        const inputs = observablehq_for_myself.Generators.input(bond_node.firstElementChild);
        var is_first_value = true;
        while(!node_is_invalidated){
            const val = await inputs.next().value;
            if (!node_is_invalidated) {
                const to_send = await transformed_val(val);
                on_bond_change(bond_node.getAttribute("def"), to_send, is_first_value);
            }
            is_first_value = false;
        }
    });
    return function dispose_bond_listener() {
        node_is_invalidated = true;
    };
};
const transformed_val = async (val)=>{
    if (val instanceof FileList) {
        return Promise.all(Array.from(val).map((file)=>transformed_val(file)
        ));
    } else if (val instanceof File) {
        return await new Promise((res)=>{
            const reader = new FileReader();
            reader.onload = ()=>res({
                    name: val.name,
                    type: val.type,
                    data: new Uint8Array(reader.result)
                })
            ;
            reader.onerror = ()=>res({
                    name: val.name,
                    type: val.type,
                    data: null
                })
            ;
            reader.readAsArrayBuffer(val);
        });
    } else {
        return val;
    }
};
const TreeView = ({ mime , body , cell_id , persist_js_state  })=>{
    let pluto_actions = Q1(PlutoContext);
    const node_ref = z2(null);
    const onclick = (e2)=>{
        let self = node_ref.current;
        if (e2.target !== self && !self.classList.contains("collapsed")) {
            return;
        }
        var parent_tree = self.parentElement;
        while(parent_tree.tagName != "PLUTO-OUTPUT"){
            parent_tree = parent_tree.parentElement;
            if (parent_tree.tagName == "JLTREE" && parent_tree.classList.contains("collapsed")) {
                return;
            }
        }
        self.classList.toggle("collapsed");
    };
    const on_click_more = ()=>{
        if (node_ref.current.closest("jltree.collapsed") != null) {
            return false;
        }
        pluto_actions.reshow_cell(cell_id, body.objectid, 1);
    };
    const mimepair_output = (pair)=>re`<${SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} />`
    ;
    const more = re`<r><${More} on_click_more=${on_click_more} /></r>`;
    var inner = null;
    switch(body.type){
        case "Pair":
            const r2 = body.key_value;
            return re`<jlpair class=${body.type}\n                ><r><k>${mimepair_output(r2[0])}</k><v>${mimepair_output(r2[1])}</v></r></jlpair\n            >`;
        case "circular":
            return re`<em>circular reference</em>`;
        case "Array":
        case "Tuple":
            inner = html`${body.prefix}<jlarray class=${body.type}\n                    >${body.elements.map((r9)=>r9 === "more" ? more : html`<r><k>${r9[0]}</k><v>${mimepair_output(r9[1])}</v></r>`
            )}</jlarray\n                >`;
            break;
        case "Dict":
            inner = html`${body.prefix}<jldict class=${body.type}\n                    >${body.elements.map((r9)=>r9 === "more" ? more : html`<r><k>${mimepair_output(r9[0])}</k><v>${mimepair_output(r9[1])}</v></r>`
            )}</jldict\n                >`;
            break;
        case "NamedTuple":
            inner = html`<jldict class=${body.type}\n                >${body.elements.map((r9)=>r9 === "more" ? more : html`<r><k>${r9[0]}</k><v>${mimepair_output(r9[1])}</v></r>`
            )}</jldict\n            >`;
            break;
        case "struct":
            inner = html`${body.prefix}<jlstruct>${body.elements.map((r9)=>html`<r><k>${r9[0]}</k><v>${mimepair_output(r9[1])}</v></r>`
            )}</jlstruct>`;
            break;
    }
    return re`<jltree class="collapsed" onclick=${onclick} ref=${node_ref}>${inner}</jltree>`;
};
const More = ({ on_click_more  })=>{
    const [loading, set_loading] = q1(false);
    return re`<jlmore\n        class=${loading ? "loading" : ""}\n        onclick=${(e2)=>{
        if (!loading) {
            if (on_click_more() !== false) {
                set_loading(true);
            }
        }
    }}\n        >more</jlmore\n    >`;
};
const TableView = ({ mime , body , cell_id , persist_js_state  })=>{
    let pluto_actions = Q1(PlutoContext);
    const node_ref = z2(null);
    const mimepair_output = (pair)=>re`<${SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} />`
    ;
    const more = (dim)=>re`<${More}\n        on_click_more=${()=>{
            pluto_actions.reshow_cell(cell_id, body.objectid, dim);
        }}\n    />`
    ;
    const thead = body.schema == null ? null : re`<thead>\n                  <tr class="schema-names">\n                      ${[
        "",
        ...body.schema.names
    ].map((x3)=>re`<th>${x3 === "more" ? more(2) : x3}</th>`
    )}\n                  </tr>\n                  <tr class="schema-types">\n                      ${[
        "",
        ...body.schema.types
    ].map((x3)=>re`<th>${x3 === "more" ? null : x3}</th>`
    )}\n                  </tr>\n              </thead>`;
    const tbody = re`<tbody>\n        ${body.rows.map((row)=>re`<tr>\n                    ${row === "more" ? re`<td class="jlmore-td" colspan="999">${more(1)}</td>` : re`<th>${row[0]}</th>\n                              ${row[1].map((x3)=>re`<td>${x3 === "more" ? null : mimepair_output(x3)}</td>`
        )}`}\n                </tr>`
    )}\n    </tbody>`;
    return re`<table class="pluto-table">\n        ${thead}${tbody}\n    </table>`;
};
const StackFrameFilename = ({ frame , cell_id  })=>{
    const sep_index = frame.file.indexOf("#==#");
    if (sep_index != -1) {
        const frame_cell_id = frame.file.substr(sep_index + 4);
        const a8 = re`<a\n            href="#"\n            onclick=${(e2)=>{
            window.dispatchEvent(new CustomEvent("cell_focus", {
                detail: {
                    cell_id: frame_cell_id,
                    line: frame.line - 1
                }
            }));
            e2.preventDefault();
        }}\n        >\n            ${frame_cell_id == cell_id ? "Local" : "Other"}: ${frame.line}\n        </a>`;
        return re`<em>${a8}</em>`;
    } else {
        return re`<em>${frame.file}:${frame.line}</em>`;
    }
};
const Funccall = ({ frame  })=>{
    const bracket_index = frame.call.indexOf("(");
    if (bracket_index != -1) {
        return re`<mark><strong>${frame.call.substr(0, bracket_index)}</strong>${frame.call.substr(bracket_index)}</mark>`;
    } else {
        return re`<mark><strong>${frame.call}</strong></mark>`;
    }
};
const ErrorMessage = ({ msg , stacktrace , cell_id  })=>{
    let pluto_actions = Q1(PlutoContext);
    const rewriters = [
        {
            pattern: /syntax: extra token after end of expression/,
            display: (x3)=>{
                const begin_hint = re`<a\n                    href="#"\n                    onClick=${(e2)=>{
                    e2.preventDefault();
                    pluto_actions.wrap_remote_cell(cell_id, "begin");
                }}\n                    >Wrap all code in a <em>begin ... end</em> block.</a\n                >`;
                if (x3.includes("\n\nBoundaries: ")) {
                    const boundaries = JSON.parse(x3.split("\n\nBoundaries: ")[1]).map((x4)=>x4 - 1
                    );
                    const split_hint = re`<p>\n                        <a\n                            href="#"\n                            onClick=${(e2)=>{
                        e2.preventDefault();
                        pluto_actions.split_remote_cell(cell_id, boundaries, true);
                    }}\n                            >Split this cell into ${boundaries.length} cells</a\n                        >, or\n                    </p>`;
                    return re`<p>Multiple expressions in one cell.</p>\n                        <p>How would you like to fix it?</p>\n                        <ul>\n                            <li>${split_hint}</li>\n                            <li>${begin_hint}</li>\n                        </ul>`;
                } else {
                    return re`<p>Multiple expressions in one cell.</p>\n                        <p>${begin_hint}</p>`;
                }
            }
        },
        {
            pattern: /LoadError: cannot assign a value to variable workspace\d+\..+ from module workspace\d+/,
            display: ()=>re`<p>Tried to reevaluate an <code>include</code> call, this is not supported. You might need to restart this notebook from the main menu.</p>\n                    <p>\n                        For a workaround, use the alternative version of <code>include</code> described here:\n                        <a href="https://github.com/fonsp/Pluto.jl/issues/115#issuecomment-661722426">GH issue 115</a>\n                    </p>\n                    <p>In the future, <code>include</code> will be deprecated, and this will be the default.</p>`
        },
        {
            pattern: /MethodError: no method matching .*\nClosest candidates are:/,
            display: (x3)=>x3.split("\n").map((line)=>re`<p style="white-space: nowrap;">${line}</p>`
                )
        },
        {
            pattern: /.?/,
            display: (x3)=>x3.split("\n").map((line)=>re`<p>${line}</p>`
                )
        }, 
    ];
    const matched_rewriter = rewriters.find(({ pattern  })=>pattern.test(msg)
    );
    return re`<jlerror>\n        <header>${matched_rewriter.display(msg)}</header>\n        ${stacktrace.length == 0 ? null : re`<section>\n                  <ol>\n                      ${stacktrace.map((frame)=>re`<li>\n                                  <${Funccall} frame=${frame} />\n                                  <span>@</span>\n                                  <${StackFrameFilename} frame=${frame} cell_id=${cell_id} />\n                                  ${frame.inlined ? re`<span>[inlined]</span>` : null}\n                              </li>`
    )}\n                  </ol>\n              </section>`}\n    </jlerror>`;
};
const OutputBody = ({ mime , body , cell_id , persist_js_state , last_run_timestamp  })=>{
    switch(mime){
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return re`<div><${PlutoImage} mime=${mime} body=${body} /></div>`;
            break;
        case "text/html":
            if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
                return re`<${IframeContainer} body=${body} />`;
            } else {
                return re`<${RawHTMLContainer}\n                    cell_id=${cell_id}\n                    body=${body}\n                    persist_js_state=${persist_js_state}\n                    last_run_timestamp=${last_run_timestamp}\n                />`;
            }
            break;
        case "application/vnd.pluto.tree+object":
            return re`<div>\n                <${TreeView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />\n            </div>`;
            break;
        case "application/vnd.pluto.table+object":
            return re` <${TableView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />`;
            break;
        case "application/vnd.pluto.stacktrace+object":
            return re`<div><${ErrorMessage} cell_id=${cell_id} ...${body} /></div>`;
            break;
        case "text/plain":
        default:
            if (body) {
                return re`<div>\n                    <pre><code>${body}</code></pre>\n                </div>`;
            } else {
                return re`<div></div>`;
            }
            break;
    }
};
let IframeContainer = ({ body  })=>{
    let iframeref = z2();
    j(()=>{
        let url = URL.createObjectURL(new Blob([
            body
        ], {
            type: "text/html"
        }));
        iframeref.current.src = url;
        run(async ()=>{
            await new Promise((resolve)=>iframeref.current.addEventListener("load", ()=>resolve()
                )
            );
            let iframeDocument = iframeref.current.contentWindow.document;
            let x3 = iframeDocument.createElement("script");
            x3.src = "https://cdn.jsdelivr.net/npm/iframe-resizer@4.2.11/js/iframeResizer.contentWindow.min.js";
            x3.integrity = "sha256-EH+7IdRixWtW5tdBwMkTXL+HvW5tAqV4of/HbAZ7nEc=";
            x3.crossOrigin = "anonymous";
            iframeDocument.head.appendChild(x3);
            new Promise((resolve)=>x3.addEventListener("load", ()=>resolve()
                )
            );
            window.iFrameResize({
                checkOrigin: false
            }, iframeref.current);
        });
        return ()=>URL.revokeObjectURL(url)
        ;
    }, [
        body
    ]);
    return re`<iframe style=${{
        width: "100%",
        border: "none"
    }} src="" ref=${iframeref}></div>`;
};
let execute_dynamic_function = async ({ environment , code  })=>{
    const wrapped_code = `"use strict"; return (async () => {${code}})()`;
    let { ["this"]: this_value , ...args } = environment;
    let arg_names = Object.keys(args);
    let arg_values = Object.values(args);
    const result = await Function(...arg_names, wrapped_code).bind(this_value)(...arg_values);
    return result;
};
const execute_scripttags = async ({ root_node , script_nodes , previous_results_map , invalidation  })=>{
    let results_map = new Map();
    for (let node of script_nodes){
        if (node.src != null && node.src !== "") {
            var script_el = Array.from(document.head.querySelectorAll("script")).find((s11)=>s11.src === node.src
            );
            if (script_el == null) {
                script_el = document.createElement("script");
                script_el.src = node.src;
                script_el.type = node.type === "module" ? "module" : "text/javascript";
                script_el.pluto_is_loading_me = true;
            }
            const need_to_await = script_el.pluto_is_loading_me != null;
            if (need_to_await) {
                await new Promise((resolve)=>{
                    script_el.addEventListener("load", resolve);
                    script_el.addEventListener("error", resolve);
                    document.head.appendChild(script_el);
                });
                script_el.pluto_is_loading_me = undefined;
            }
        } else {
            try {
                let script_id = node.id;
                let result = await execute_dynamic_function({
                    environment: {
                        this: script_id ? previous_results_map.get(script_id) : window,
                        currentScript: node,
                        invalidation: invalidation,
                        ...observablehq_for_cells
                    },
                    code: node.innerText
                });
                if (script_id != null) {
                    results_map.set(script_id, result);
                }
                if (result instanceof Element && result.nodeType === Node.ELEMENT_NODE) {
                    node.parentElement.insertBefore(result, node);
                }
            } catch (err) {
                console.error("Couldn't execute script:", node);
                console.error(err);
            }
        }
    }
    return results_map;
};
let run = (f8)=>f8()
;
let RawHTMLContainer = ({ body , persist_js_state =false , last_run_timestamp  })=>{
    let pluto_actions = Q1(PlutoContext);
    let pluto_bonds = Q1(PlutoBondsContext);
    let previous_results_map = z2(new Map());
    let invalidate_scripts = z2(()=>{
    });
    let container = z2();
    j(()=>{
        set_bound_elements_to_their_value(container.current, pluto_bonds);
    }, [
        body,
        persist_js_state,
        pluto_actions,
        pluto_bonds
    ]);
    j(()=>{
        let invalidation = new Promise((resolve)=>{
            invalidate_scripts.current = ()=>{
                resolve();
            };
        });
        container.current.innerHTML = body;
        run(async ()=>{
            previous_results_map.current = await execute_scripttags({
                root_node: container.current,
                script_nodes: Array.from(container.current.querySelectorAll("script")),
                invalidation: invalidation,
                previous_results_map: persist_js_state ? previous_results_map.current : new Map()
            });
            if (pluto_actions != null) {
                set_bound_elements_to_their_value(container.current, pluto_bonds);
                let remove_bonds_listener = add_bonds_listener(container.current, (name, value, is_first_value)=>{
                    pluto_actions.set_bond(name, value, is_first_value);
                });
                invalidation.then(remove_bonds_listener);
            }
            if (window.MathJax?.typeset != undefined) {
                try {
                    window.MathJax.typeset([
                        container.current
                    ]);
                } catch (err) {
                    console.info("Failed to typeset TeX:");
                    console.info(err);
                }
            }
            try {
                for (let code_element of container.current.querySelectorAll("code.language-julia")){
                    highlight_julia(code_element);
                }
            } catch (err) {
            }
        });
        return ()=>{
            invalidate_scripts.current?.();
        };
    }, [
        body,
        persist_js_state,
        last_run_timestamp,
        pluto_actions
    ]);
    return re`<div ref=${container}></div>`;
};
let highlight_julia = (code_element)=>{
    if (code_element.children.length === 0) {
        window.CodeMirror.runMode(code_element.innerText, "julia", code_element);
        code_element.classList.add("cm-s-default");
    }
};
const SimpleOutputBody = ({ mime , body , cell_id , persist_js_state  })=>{
    switch(mime){
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return re`<${PlutoImage} mime=${mime} body=${body} />`;
            break;
        case "text/html":
            return re`<${RawHTMLContainer} body=${body} persist_js_state=${persist_js_state} />`;
            break;
        case "application/vnd.pluto.tree+object":
            return re`<${TreeView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />`;
            break;
        case "application/vnd.pluto.table+object":
            return re` <${TableView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />`;
            break;
        case "text/plain":
        default:
            return re`<pre>${body}</pre>`;
            break;
    }
};
const Cell = ({ cell_input: { cell_id , code , code_folded  } , cell_result: { queued , running , runtime , errored , output  } , cell_input_local , selected , on_change , on_update_doc_query , on_focus_neighbor , disable_input , focus_after_creation , force_hide_input , selected_cells , notebook_id ,  })=>{
    let pluto_actions = Q1(PlutoContext);
    const [cm_forced_focus, set_cm_forced_focus] = q1(null);
    const { saving_file , drag_active , handler  } = useDropHandler();
    const localTimeRunning = 1000000 * useMillisSinceTruthy(running);
    $1(()=>{
        const focusListener = (e2)=>{
            if (e2.detail.cell_id === cell_id) {
                if (e2.detail.line != null) {
                    const ch = e2.detail.ch;
                    if (ch == null) {
                        set_cm_forced_focus([
                            {
                                line: e2.detail.line,
                                ch: 0
                            },
                            {
                                line: e2.detail.line,
                                ch: Infinity
                            },
                            {
                                scroll: true
                            }
                        ]);
                    } else {
                        set_cm_forced_focus([
                            {
                                line: e2.detail.line,
                                ch: ch
                            },
                            {
                                line: e2.detail.line,
                                ch: ch
                            },
                            {
                                scroll: true
                            }
                        ]);
                    }
                }
            }
        };
        window.addEventListener("cell_focus", focusListener);
        return ()=>{
            window.removeEventListener("cell_focus", focusListener);
        };
    }, []);
    const [waiting_to_run, set_waiting_to_run] = q1(false);
    $1(()=>{
        if (waiting_to_run) {
            set_waiting_to_run(false);
        }
    }, [
        queued,
        running,
        output?.last_run_timestamp
    ]);
    const class_code_differs = code !== (cell_input_local?.code ?? code);
    const class_code_folded = code_folded && cm_forced_focus == null;
    let show_input = !force_hide_input && (errored || class_code_differs || !class_code_folded);
    return re`\n        <pluto-cell\n            onDragOver=${handler}\n            onDrop=${handler}\n            onDragEnter=${handler}\n            onDragLeave=${handler}\n            class=${cl({
        queued: queued || waiting_to_run,
        running: running,
        errored: errored,
        selected: selected,
        code_differs: class_code_differs,
        code_folded: class_code_folded,
        drop_target: drag_active,
        saving_file: saving_file
    })}\n            id=${cell_id}\n        >\n            <pluto-shoulder draggable="true" title="Drag to move cell">\n                <button\n                    onClick=${()=>{
        let cells_to_fold = selected ? selected_cells : [
            cell_id
        ];
        pluto_actions.update_notebook((notebook)=>{
            for (let cell_id1 of cells_to_fold){
                notebook.cell_inputs[cell_id1].code_folded = !code_folded;
            }
        });
    }}\n                    class="foldcode"\n                    title="Show/hide code"\n                >\n                    <span></span>\n                </button>\n            </pluto-shoulder>\n            <pluto-trafficlight></pluto-trafficlight>\n            <button\n                onClick=${()=>{
        pluto_actions.add_remote_cell(cell_id, "before");
    }}\n                class="add_cell before"\n                title="Add cell"\n            >\n                <span></span>\n            </button>\n            <${CellOutput} ...${output} cell_id=${cell_id} />\n            ${show_input && re`<${CellInput}\n                local_code=${cell_input_local?.code ?? code}\n                remote_code=${code}\n                disable_input=${disable_input}\n                focus_after_creation=${focus_after_creation}\n                cm_forced_focus=${cm_forced_focus}\n                set_cm_forced_focus=${set_cm_forced_focus}\n                on_drag_drop_events=${handler}\n                on_submit=${()=>{
        set_waiting_to_run(true);
        pluto_actions.set_and_run_multiple([
            cell_id
        ]);
    }}\n                on_delete=${()=>{
        let cells_to_delete = selected ? selected_cells : [
            cell_id
        ];
        pluto_actions.confirm_delete_multiple("Delete", cells_to_delete);
    }}\n                on_add_after=${()=>{
        pluto_actions.add_remote_cell(cell_id, "after");
    }}\n                on_fold=${(new_folded)=>pluto_actions.fold_remote_cell(cell_id, new_folded)
    }\n                on_change=${(new_code)=>{
        if (code_folded && cm_forced_focus != null) {
            pluto_actions.fold_remote_cell(cell_id, false);
        }
        on_change(new_code);
    }}\n                on_update_doc_query=${on_update_doc_query}\n                on_focus_neighbor=${on_focus_neighbor}\n                cell_id=${cell_id}\n                notebook_id=${notebook_id}\n            />`}\n            <${RunArea}\n                onClick=${()=>{
        if (running || queued) {
            pluto_actions.interrupt_remote(cell_id);
        } else {
            let cell_to_run = selected ? selected_cells : [
                cell_id
            ];
            pluto_actions.set_and_run_multiple(cell_to_run);
        }
    }}\n                runtime=${localTimeRunning || runtime}\n            />\n            <button\n                onClick=${()=>{
        pluto_actions.add_remote_cell(cell_id, "after");
    }}\n                class="add_cell after"\n                title="Add cell"\n            >\n                <span></span>\n            </button>\n        </pluto-cell>\n    `;
};
let CellMemo = ({ cell_input , cell_result , selected , cell_input_local , notebook_id , on_update_doc_query , on_cell_input , on_focus_neighbor , disable_input , focus_after_creation , force_hide_input , selected_cells ,  })=>{
    const selected_cells_diffable_primitive = (selected_cells || []).join("");
    const { body , last_run_timestamp , mime , persist_js_state , rootassignee  } = cell_result?.output || {
    };
    const { queued , running , runtime , errored  } = cell_result || {
    };
    const { cell_id , code , code_folded  } = cell_input || {
    };
    return J1(()=>{
        return re`\n            <${Cell}\n                on_change=${(val)=>on_cell_input(cell_input.cell_id, val)
        }\n                cell_input=${cell_input}\n                cell_result=${cell_result}\n                selected=${selected}\n                cell_input_local=${cell_input_local}\n                notebook_id=${notebook_id}\n                on_update_doc_query=${on_update_doc_query}\n                on_focus_neighbor=${on_focus_neighbor}\n                disable_input=${disable_input}\n                focus_after_creation=${focus_after_creation}\n                force_hide_input=${force_hide_input}\n                selected_cells=${selected_cells}\n            />\n        `;
    }, [
        cell_id,
        code,
        code_folded,
        queued,
        running,
        runtime,
        errored,
        body,
        last_run_timestamp,
        mime,
        persist_js_state,
        rootassignee,
        selected,
        cell_input_local,
        notebook_id,
        on_update_doc_query,
        on_cell_input,
        on_focus_neighbor,
        disable_input,
        focus_after_creation,
        force_hide_input,
        selected_cells_diffable_primitive, 
    ]);
};
const render_cell_inputs_delay = (num_cells)=>num_cells > 20 ? 500 : 100
;
const Notebook = ({ is_initializing , notebook , selected_cells , cell_inputs_local , last_created_cell , on_update_doc_query , on_cell_input , on_focus_neighbor , disable_input ,  })=>{
    let pluto_actions = Q1(PlutoContext);
    $1(()=>{
        if (notebook.cell_order.length === 0 && !is_initializing) {
            pluto_actions.add_remote_cell_at(0);
        }
    }, [
        is_initializing,
        notebook.cell_order.length
    ]);
    const [is_first_load, set_is_first_load] = q1(true);
    $1(()=>{
        if (is_first_load && notebook.cell_order.length > 0) {
            setTimeout(()=>{
                set_is_first_load(false);
            }, render_cell_inputs_delay(notebook.cell_order.length));
        }
    }, [
        is_first_load,
        notebook.cell_order.length
    ]);
    return re`\n        <pluto-notebook id=${notebook.notebook_id}>\n            ${notebook.cell_order.map((cell_id, i9)=>re`<${CellMemo}\n                    key=${cell_id}\n                    cell_input=${notebook.cell_inputs[cell_id]}\n                    cell_result=${notebook.cell_results[cell_id] ?? {
            cell_id: cell_id,
            queued: false,
            running: false,
            errored: false,
            runtime: null,
            output: null
        }}\n                    selected=${selected_cells.includes(cell_id)}\n                    cell_input_local=${cell_inputs_local[cell_id]}\n                    notebook_id=${notebook.notebook_id}\n                    on_update_doc_query=${on_update_doc_query}\n                    on_cell_input=${on_cell_input}\n                    on_focus_neighbor=${on_focus_neighbor}\n                    disable_input=${disable_input}\n                    focus_after_creation=${last_created_cell === cell_id}\n                    force_hide_input=${is_first_load && i9 > 5}\n                    selected_cells=${selected_cells}\n                />`
    )}\n        </pluto-notebook>\n    `;
};
const NotebookMemo = Notebook;
let LiveDocs = ({ desired_doc_query , on_update_doc_query , notebook  })=>{
    let pluto_actions = Q1(PlutoContext);
    let container_ref = z2();
    let live_doc_search_ref = z2();
    let [state, set_state] = q1({
        shown_query: null,
        searched_query: null,
        body: "<p>Welcome to the <b>Live docs</b>! Keep this little window open while you work on the notebook, and you will get documentation of everything you type!</p><p>You can also type a query above.</p><hr><p><em>Still stuck? Here are <a href='https://julialang.org/about/help/'>some tips</a>.</em></p>",
        hidden: true,
        loading: false
    });
    let update_state = (mutation)=>set_state(an((state1)=>mutation(state1)
        ))
    ;
    $1(()=>{
        let handler = ()=>{
            update_state((state1)=>{
                state1.hidden = false;
            });
            if (window.getComputedStyle(container_ref.current).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.");
            }
        };
        window.addEventListener("open_live_docs", handler);
        return ()=>window.removeEventListener("open_live_docs", handler)
        ;
    }, []);
    j(()=>{
        for (let code_element of container_ref.current.querySelectorAll("code:not([class])")){
            highlight_julia(code_element);
        }
    }, [
        state.body
    ]);
    $1(()=>{
        if (state.hidden || state.loading) {
            return;
        }
        if (!/[^\s]/.test(desired_doc_query)) {
            return;
        }
        if (state.searched_query !== desired_doc_query) {
            fetch_docs(desired_doc_query);
        }
    }, [
        desired_doc_query,
        state.hidden,
        state.loading,
        state.searched_query
    ]);
    let fetch_docs = (new_query)=>{
        update_state((state1)=>{
            state1.loading = true;
            state1.searched_query = new_query;
        });
        Promise.race([
            observablehq_for_myself.Promises.delay(2000, false),
            pluto_actions.send("docs", {
                query: new_query.replace(/^\?/, "")
            }, {
                notebook_id: notebook.notebook_id
            }).then((u6)=>{
                if (u6.message.status === "⌛") {
                    return false;
                }
                if (u6.message.status === "👍") {
                    update_state((state1)=>{
                        state1.shown_query = new_query;
                        state1.body = u6.message.doc;
                    });
                    return true;
                }
            }), 
        ]).then(()=>{
            update_state((state1)=>{
                state1.loading = false;
            });
        });
    };
    let docs_element = J1(()=>re` <${RawHTMLContainer} body=${state.body} /> `
    , [
        state.body
    ]);
    let no_docs_found = state.loading === false && state.searched_query !== "" && state.searched_query !== state.shown_query;
    return re`\n        <aside id="helpbox-wrapper" ref=${container_ref}>\n            <pluto-helpbox class=${cl({
        hidden: state.hidden,
        loading: state.loading,
        notfound: no_docs_found
    })}>\n                <header\n                    onClick=${()=>{
        if (state.hidden) {
            set_state((state1)=>({
                    ...state1,
                    hidden: false
                })
            );
            setTimeout(()=>live_doc_search_ref.current && live_doc_search_ref.current.focus()
            , 0);
        }
    }}\n                >\n                    ${state.hidden ? "Live docs" : re`\n                        <input\n                            title=${no_docs_found ? `"${state.searched_query}" not found` : ""}\n                            id="live-docs-search"\n                            placeholder="Search docs..."\n                            ref=${live_doc_search_ref}\n                            onInput=${(e2)=>on_update_doc_query(e2.target.value)
    }\n                            value=${desired_doc_query}\n                            type="text"\n                        ></input>\n                        <button onClick=${(e2)=>{
        set_state((state1)=>({
                ...state1,
                hidden: true
            })
        );
        e2.stopPropagation();
        setTimeout(()=>live_doc_search_ref.current && live_doc_search_ref.current.focus()
        , 0);
    }}><span></span></button>\n                    `}\n                </header>\n                <section ref=${(ref)=>ref != null && resolve_doc_reference_links(ref, on_update_doc_query)
    }>\n                    <h1><code>${state.shown_query}</code></h1>\n                    ${docs_element}\n                </section>\n            </pluto-helpbox>\n        </aside>\n    `;
};
const resolve_doc_reference_links = (node, on_update_doc_query)=>{
    for (let anchor of node.querySelectorAll("a")){
        const href = anchor.getAttribute("href");
        if (href != null && href.startsWith("@ref")) {
            const query = href.length > 4 ? href.substr(5) : anchor.textContent;
            anchor.onclick = (e2)=>{
                on_update_doc_query(query);
                e2.preventDefault();
            };
        }
    }
};
class DropRuler extends d4 {
    constructor(){
        super();
        this.dropee = null;
        this.dropped = null;
        this.cell_edges = [];
        this.mouse_position = {
        };
        this.precompute_cell_edges = ()=>{
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"));
            this.cell_edges = cell_nodes.map((el)=>el.offsetTop
            );
            this.cell_edges.push(last(cell_nodes).offsetTop + last(cell_nodes).scrollHeight);
        };
        this.getDropIndexOf = ({ pageX , pageY  })=>{
            const notebook = document.querySelector("pluto-notebook");
            const distances = this.cell_edges.map((p6)=>Math.abs(p6 - pageY - 8)
            );
            return argmin(distances);
        };
        this.state = {
            drag_start: false,
            drag_target: false,
            drop_index: 0
        };
    }
    componentDidMount() {
        document.addEventListener("dragstart", (e2)=>{
            let target = e2.target;
            if (!target.matches("pluto-shoulder")) {
                this.setState({
                    drag_start: false,
                    drag_target: false
                });
                this.props.set_scroller({
                    up: false,
                    down: false
                });
                this.dropee = null;
            } else {
                this.dropee = target.parentElement;
                e2.dataTransfer.setData("text/pluto-cell", this.props.serialize_selected(this.dropee.id));
                this.dropped = false;
                this.precompute_cell_edges();
                this.setState({
                    drag_start: true,
                    drop_index: this.getDropIndexOf(e2)
                });
                this.props.set_scroller({
                    up: true,
                    down: true
                });
            }
        });
        document.addEventListener("dragenter", (e2)=>{
            if (e2.dataTransfer.types[0] !== "text/pluto-cell") return;
            if (!this.state.drag_target) this.precompute_cell_edges();
            this.lastenter = e2.target;
            this.setState({
                drag_target: true
            });
        });
        document.addEventListener("dragleave", (e2)=>{
            if (e2.dataTransfer.types[0] !== "text/pluto-cell") return;
            if (e2.target === this.lastenter) {
                this.setState({
                    drag_target: false
                });
            }
        });
        document.addEventListener("dragover", (e2)=>{
            if (e2.dataTransfer.types[0] !== "text/pluto-cell") return;
            this.mouse_position = e2;
            this.setState({
                drop_index: this.getDropIndexOf(e2)
            });
            e2.preventDefault();
        });
        document.addEventListener("dragend", (e2)=>{
            this.setState({
                drag_start: false,
                drag_target: false
            });
            this.props.set_scroller({
                up: false,
                down: false
            });
        });
        document.addEventListener("drop", (e2)=>{
            if (e2.dataTransfer.types[0] !== "text/pluto-cell") {
                return;
            }
            this.setState({
                drag_target: false
            });
            this.dropped = true;
            if (this.dropee && this.state.drag_start) {
                const drop_index = this.getDropIndexOf(e2);
                const friend_ids = this.props.selected_cells.includes(this.dropee.id) ? this.props.selected_cells : [
                    this.dropee.id
                ];
                this.props.actions.move_remote_cells(friend_ids, drop_index);
            } else {
                const drop_index = this.getDropIndexOf(e2);
                const data = e2.dataTransfer.getData("text/pluto-cell");
                this.props.actions.add_deserialized_cells(data, drop_index);
            }
        });
    }
    render() {
        const styles = this.state.drag_target ? {
            display: "block",
            top: this.cell_edges[this.state.drop_index] + "px"
        } : {
        };
        return re`<dropruler style=${styles}></dropruler>`;
    }
}
const argmin = (x3)=>{
    let best_val = Infinity;
    let best_index = -1;
    let val;
    for(let i9 = 0; i9 < x3.length; i9++){
        val = x3[i9];
        if (val < best_val) {
            best_index = i9;
            best_val = val;
        }
    }
    return best_index;
};
const last = (x3)=>x3[x3.length - 1]
;
const get_element_position_in_document = (element)=>{
    let top = 0;
    let left = 0;
    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    }while (element)
    return {
        top: top,
        left: left
    };
};
const in_request_animation_frame = (fn1)=>{
    let last_known_arguments = null;
    let ticking = false;
    return (...args)=>{
        last_known_arguments = args;
        if (!ticking) {
            window.requestAnimationFrame(()=>{
                fn1(...last_known_arguments);
                ticking = false;
            });
            ticking = true;
        }
    };
};
const SelectionArea = ({ on_selection , set_scroller , cell_order  })=>{
    const mouse_position_ref = z2();
    const is_selecting_ref = z2(false);
    const [selection_start, set_selection_start] = q1(null);
    const [selection_end, set_selection_end] = q1(null);
    $1(()=>{
        const onmousedown = (e2)=>{
            const t2 = e2.target.tagName;
            if (e2.button === 0 && (t2 === "BODY" || t2 === "MAIN" || t2 === "PLUTO-NOTEBOOK" || t2 === "PREAMBLE")) {
                on_selection([]);
                set_selection_start({
                    x: e2.pageX,
                    y: e2.pageY
                });
                set_selection_end({
                    x: e2.pageX,
                    y: e2.pageY
                });
                is_selecting_ref.current = true;
            }
        };
        const onmouseup = (e2)=>{
            if (is_selecting_ref.current) {
                set_selection_start(null);
                set_selection_end(null);
                set_scroller({
                    up: false,
                    down: false
                });
                is_selecting_ref.current = false;
            } else {
                if (!e2.composedPath().some((e10)=>{
                    const tag = e10.tagName;
                    return tag === "PLUTO-SHOULDER" || tag === "BUTTON";
                })) {
                    on_selection([]);
                }
            }
        };
        let update_selection = in_request_animation_frame(({ pageX , pageY  })=>{
            if (!is_selecting_ref.current || selection_start == null) return;
            let new_selection_end = {
                x: pageX,
                y: pageY
            };
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"));
            let A3 = {
                start_left: Math.min(selection_start.x, new_selection_end.x),
                start_top: Math.min(selection_start.y, new_selection_end.y),
                end_left: Math.max(selection_start.x, new_selection_end.x),
                end_top: Math.max(selection_start.y, new_selection_end.y)
            };
            let in_selection = cell_nodes.filter((cell)=>{
                let cell_position = get_element_position_in_document(cell);
                let cell_size = cell.getBoundingClientRect();
                let B3 = {
                    start_left: cell_position.left,
                    start_top: cell_position.top,
                    end_left: cell_position.left + cell_size.width,
                    end_top: cell_position.top + cell_size.height
                };
                return A3.start_left < B3.end_left && A3.end_left > B3.start_left && A3.start_top < B3.end_top && A3.end_top > B3.start_top;
            });
            set_scroller({
                up: selection_start.y > new_selection_end.y,
                down: selection_start.y < new_selection_end.y
            });
            on_selection(in_selection.map((x3)=>x3.id
            ));
            set_selection_end(new_selection_end);
        });
        const onscroll = (e2)=>{
            if (is_selecting_ref.current) {
                update_selection({
                    pageX: mouse_position_ref.current.clientX,
                    pageY: mouse_position_ref.current.clientY + document.documentElement.scrollTop
                });
            }
        };
        const onmousemove = (e2)=>{
            mouse_position_ref.current = e2;
            if (is_selecting_ref.current) {
                update_selection({
                    pageX: e2.pageX,
                    pageY: e2.pageY
                });
                e2.preventDefault();
            }
        };
        const onselectstart = (e2)=>{
            if (is_selecting_ref.current) {
                e2.preventDefault();
            }
        };
        const onkeydown = (e2)=>{
            if (e2.key === "a" && has_ctrl_or_cmd_pressed(e2)) {
                if (document.activeElement === document.body && window.getSelection().isCollapsed) {
                    on_selection(cell_order);
                    e2.preventDefault();
                }
            }
        };
        document.addEventListener("mousedown", onmousedown);
        document.addEventListener("mouseup", onmouseup);
        document.addEventListener("mousemove", onmousemove);
        document.addEventListener("selectstart", onselectstart);
        document.addEventListener("keydown", onkeydown);
        document.addEventListener("scroll", onscroll, {
            passive: true
        });
        return ()=>{
            document.removeEventListener("mousedown", onmousedown);
            document.removeEventListener("mouseup", onmouseup);
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("selectstart", onselectstart);
            document.removeEventListener("keydown", onkeydown);
            document.removeEventListener("scroll", onscroll, {
                passive: true
            });
        };
    }, [
        selection_start
    ]);
    if (selection_start == null) {
        return null;
    }
    return re`\n        <selectarea\n            style=${{
        position: "absolute",
        background: "rgba(40, 78, 189, 0.24)",
        zIndex: 10,
        top: Math.min(selection_start.y, selection_end.y),
        left: Math.min(selection_start.x, selection_end.x),
        width: Math.abs(selection_start.x - selection_end.x),
        height: Math.abs(selection_start.y - selection_end.y)
    }}\n        />\n    `;
};
const UndoDelete = ({ recently_deleted , on_click  })=>{
    const [hidden, set_hidden] = q1(true);
    $1(()=>{
        if (recently_deleted != null) {
            set_hidden(false);
            const interval = setTimeout(()=>{
                set_hidden(true);
            }, 8000 * Math.pow(recently_deleted.length, 1 / 3));
            return ()=>{
                clearTimeout(interval);
            };
        }
    }, [
        recently_deleted
    ]);
    let text = recently_deleted == null ? "" : recently_deleted.length === 1 ? "Cell deleted" : `${recently_deleted.length} cells deleted`;
    return re`\n        <nav\n            id="undo_delete"\n            class=${cl({
        hidden: hidden
    })}\n        >\n            ${text} (<a\n                href="#"\n                onClick=${(e2)=>{
        e2.preventDefault();
        set_hidden(true);
        on_click();
    }}\n                >UNDO</a\n            >)\n        </nav>\n    `;
};
const SlideControls = ()=>{
    const calculate_slide_positions = ()=>{
        const height = window.innerHeight;
        const headers = Array.from(document.querySelectorAll("pluto-output h1, pluto-output h2"));
        const pos = headers.map((el)=>el.getBoundingClientRect()
        );
        const edges = pos.map((rect)=>rect.top + window.pageYOffset
        );
        const notebook_node = document.querySelector("pluto-notebook");
        edges.push(notebook_node.getBoundingClientRect().bottom + window.pageYOffset);
        const scrollPositions = headers.map((el, i9)=>{
            if (el.tagName == "H1") {
                const slideHeight = edges[i9 + 1] - edges[i9] - height;
                return edges[i9] - Math.max(0, (height - slideHeight) / 2);
            } else {
                return edges[i9] - 20;
            }
        });
        return scrollPositions;
    };
    const go_previous_slide = (e2)=>{
        const positions = calculate_slide_positions();
        window.scrollTo(window.pageXOffset, positions.reverse().find((y3)=>y3 < window.pageYOffset - 10
        ));
    };
    const go_next_slide = (e2)=>{
        const positions = calculate_slide_positions();
        window.scrollTo(window.pageXOffset, positions.find((y3)=>y3 - 10 > window.pageYOffset
        ));
    };
    window.present = ()=>{
        document.body.classList.toggle("presentation");
    };
    return re`\n        <nav id="slide_controls">\n            <button class="changeslide prev" title="Previous slide" onClick=${go_previous_slide}><span></span></button>\n            <button class="changeslide next" title="Next slide" onClick=${go_next_slide}><span></span></button>\n        </nav>\n    `;
};
const Scroller = ({ active  })=>{
    const mouse = z2();
    $1(()=>{
        const handler = (e2)=>{
            mouse.current = {
                x: e2.clientX,
                y: e2.clientY
            };
        };
        document.addEventListener("mousemove", handler);
        document.addEventListener("dragover", handler);
        return ()=>{
            document.removeEventListener("mousemove", handler);
            document.removeEventListener("dragover", handler);
        };
    }, []);
    $1(()=>{
        if (active.up || active.down) {
            let prev_time = null;
            let current = true;
            const scroll_update = (timestamp)=>{
                if (current) {
                    if (prev_time == null) {
                        prev_time = timestamp;
                    }
                    const dt = timestamp - prev_time;
                    prev_time = timestamp;
                    if (mouse.current) {
                        const y_ratio = mouse.current.y / window.innerHeight;
                        if (active.up && y_ratio < 0.3) {
                            window.scrollBy(0, -1200 * (0.3 - y_ratio) / 0.3 * dt / 1000);
                        } else if (active.down && y_ratio > 0.7) {
                            window.scrollBy(0, 1200 * (y_ratio - 0.7) / 0.3 * dt / 1000);
                        }
                    }
                    window.requestAnimationFrame(scroll_update);
                }
            };
            window.requestAnimationFrame(scroll_update);
            return ()=>current = false
            ;
        }
    }, [
        active.up,
        active.down
    ]);
    return null;
};
const CDNified = (version, file)=>`https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@${version.substr(1)}/frontend/${file}`
;
const offline_html = async ({ pluto_version , body , head  })=>{
    for (let iframe of body.querySelectorAll("iframe")){
        try {
            let html1 = new XMLSerializer().serializeToString(iframe.contentDocument);
            let dataURI = "data:text/html," + encodeURIComponent(html1);
            iframe.dataset.datauri = dataURI;
        } catch (err) {
        }
    }
    try {
        const oldBody = body;
        body = body.cloneNode(true);
        const oldBodyCMs = oldBody.querySelectorAll("pluto-input .CodeMirror");
        body.querySelectorAll("pluto-input .CodeMirror").forEach((cm, i9)=>{
            const oldCM = oldBodyCMs[i9].CodeMirror;
            oldCM.save();
            cm.outerHTML = `<textarea class="init-cm">${oldCM.getTextArea().value}</textarea>`;
        });
        for (let iframe1 of body.querySelectorAll("iframe")){
            if (iframe1.dataset.datauri) {
                iframe1.src = iframe1.dataset.datauri;
                delete iframe1.dataset.datauri;
            }
        }
        const blob_to_base64_promises = Array.from(body.querySelectorAll("img")).filter((img)=>img.src.match(/^blob:/)
        ).map((img)=>new Promise(async (resolve)=>{
                const blob = await (await fetch(img.src)).blob();
                const reader = new FileReader();
                reader.onload = ()=>{
                    var data = reader.result;
                    img.src = data;
                    resolve();
                };
                reader.readAsDataURL(blob);
            })
        );
        await Promise.all(blob_to_base64_promises);
        return `<!DOCTYPE html>\n            <html lang="en">\n            <head>\n                <meta name="viewport" content="width=device-width" />\n                <title>⚡ Pluto.jl ⚡</title>\n                <meta charset="utf-8" />\n\n                <link rel="stylesheet" href="${CDNified(pluto_version, "editor.css")}" type="text/css" />\n                <link rel="stylesheet" href="${CDNified(pluto_version, "treeview.css")}" type="text/css" />\n                <link rel="stylesheet" href="${CDNified(pluto_version, "hide-ui.css")}" type="text/css" />\n                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.58.1/lib/codemirror.min.css" type="text/css" />\n                <script src="https://cdn.jsdelivr.net/npm/codemirror@5.59.0/lib/codemirror.min.js" defer></script>\n                <script src="https://cdn.jsdelivr.net/npm/codemirror@5.58.1/mode/julia/julia.min.js" defer></script>\n\n                ${head.querySelector("style#MJX-SVG-styles").outerHTML}\n            </head>\n            <body>\n                ${body.querySelector("main").outerHTML}\n                ${body.querySelector("svg#MJX-SVG-global-cache").outerHTML}\n            </body>\n            <script>\n                    const cmOptions = {\n                        lineNumbers: true,\n                        mode: "julia",\n                        lineWrapping: true,\n                        viewportMargin: Infinity,\n                        placeholder: "Enter cell code...",\n                        indentWithTabs: true,\n                        indentUnit: 4,\n                        cursorBlinkRate: -1,\n                        readOnly: false,\n                    }\n                    document.addEventListener("DOMContentLoaded", () => \n                        document.querySelectorAll(".init-cm").forEach(textArea => {\n                            CodeMirror.fromTextArea(textArea, cmOptions)\n                        })\n                    )\n            </script>\n            </html>\n        `;
    } catch (error) {
        let message = "Whoops, failed to export to HTML 😢\nWe would really like to hear from you! Please go to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n";
        console.error(message);
        console.error(error);
        alert(message + error);
        return null;
    }
};
const Circle = ({ fill  })=>re`\n    <svg\n        width="48"\n        height="48"\n        viewBox="0 0 48 48"\n        style="\n        height: .7em;\n        width: .7em;\n        margin-left: .3em;\n        margin-right: .2em;\n    "\n    >\n        <circle cx="24" cy="24" r="24" fill=${fill}></circle>\n    </svg>\n`
;
const Triangle = ({ fill  })=>re`\n    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">\n        <polygon points="24,0 48,40 0,40" fill=${fill} stroke="none" />\n    </svg>\n`
;
const ExportBanner = ({ notebook , pluto_version , onClose , open  })=>{
    let is_chrome = window.chrome == null;
    return re`\n        <aside id="export">\n            <div id="container">\n                <div class="export_title">export</div>\n                <a href="./notebookfile?id=${notebook.notebook_id}" target="_blank" class="export_card">\n                    <header><${Triangle} fill="#a270ba" /> Notebook file</header>\n                    <section>Download a copy of the <b>.jl</b> script.</section>\n                </a>\n                <a\n                    href="#"\n                    class="export_card"\n                    onClick=${(e2)=>{
        offline_html({
            pluto_version: pluto_version,
            head: document.head,
            body: document.body
        }).then((html1)=>{
            if (html1 != null) {
                const fake_anchor = document.createElement("a");
                fake_anchor.setAttribute("download", `${notebook.shortpath}.html`);
                fake_anchor.setAttribute("href", URL.createObjectURL(new Blob([
                    html1
                ], {
                    type: "text/html"
                })));
                document.body.appendChild(fake_anchor);
                setTimeout(()=>{
                    fake_anchor.click();
                    document.body.removeChild(fake_anchor);
                }, 100);
            }
        });
    }}\n                >\n                    <header><${Circle} fill="#E86F51" /> Static HTML</header>\n                    <section>An <b>.html</b> file for your web page, or to share online.</section>\n                </a>\n                <a\n                    href="#"\n                    class="export_card"\n                    style=${!is_chrome ? "opacity: .7;" : ""}\n                    onClick=${()=>{
        if (!is_chrome) {
            alert("PDF generation works best on Google Chome.\n\n(We're working on it!)");
        }
        window.print();
    }}\n                >\n                    <header><${Circle} fill="#3D6117" /> Static PDF</header>\n                    <section>A static <b>.pdf</b> file for print or email.</section>\n                </a>\n                <!--<div class="export_title">\n                future\n            </div>\n            <a class="export_card" style="border-color: #00000021; opacity: .7;">\n                <header>mybinder.org</header>\n                <section>Publish an interactive notebook online.</section>\n            </a>-->\n                <button title="Close" class="toggle_export" onClick=${()=>onClose()
    }>\n                    <span></span>\n                </button>\n            </div>\n        </aside>\n    `;
};
const log_functions = {
    Info: console.info,
    Error: console.error,
    Warn: console.warn,
    Debug: console.debug
};
const handle_log = ({ level , msg , file , line , kwargs  }, filename)=>{
    try {
        const f8 = log_functions[level] || console.log;
        const args = [
            `%c┌ ${level}:\n`,
            `font-weight: bold`,
            msg
        ];
        if (Object.keys(kwargs).length !== 0) {
            args.push(kwargs);
        }
        if (file.startsWith(filename)) {
            const cell_id = file.substring(file.indexOf("#==#") + 4);
            const cell_node = document.getElementById(cell_id);
            args.push(`\n\nfrom`, cell_node);
        }
        f8(...args);
    } catch (err) {
    }
};
const BinderPhase = {
    wait_for_user: 0,
    requesting: 0.4,
    created: 0.6,
    notebook_running: 0.9,
    ready: 1
};
const BinderPhase1 = BinderPhase;
const trailingslash = (s11)=>s11.endsWith("/") ? s11 : s11 + "/"
;
const request_binder = (build_url)=>new Promise(async (resolve, reject)=>{
        let es = new EventSource(build_url);
        es.onerror = (err)=>{
            console.error("Binder error: Lost connection to " + build_url, err);
            es.close();
            reject(err);
        };
        let phase = null;
        es.onmessage = (evt)=>{
            let msg = JSON.parse(evt.data);
            if (msg.phase && msg.phase !== phase) {
                phase = msg.phase.toLowerCase();
                console.log("Binder subphase: " + phase);
                let status = phase;
                if (status === "ready") {
                    status = "server-ready";
                }
            }
            if (msg.message) {
                console.log("Binder message: " + msg.message);
            }
            switch(msg.phase){
                case "failed":
                    console.error("Binder error: Failed to build", build_url, msg);
                    es.close();
                    reject(new Error(msg));
                    break;
                case "ready":
                    es.close();
                    resolve({
                        binder_session_url: trailingslash(msg.url) + "pluto/",
                        binder_session_token: msg.token
                    });
                    break;
                default:
            }
        };
    })
;
const request_binder1 = request_binder;
const base64_arraybuffer = async (data)=>{
    const base64url = await new Promise((r2)=>{
        const reader = new FileReader();
        reader.onload = ()=>r2(reader.result)
        ;
        reader.readAsDataURL(new Blob([
            data
        ]));
    });
    return base64url.split(",", 2)[1];
};
const hash_arraybuffer = async (data)=>{
    const hashed_buffer = await window.crypto.subtle.digest("SHA-256", data);
    return await base64_arraybuffer(hashed_buffer);
};
const hash_str = async (s11)=>{
    const data = new TextEncoder().encode(s11);
    return await hash_arraybuffer(data);
};
const debounced_promises = (async_function)=>{
    let currently_running = false;
    let rerun_when_done = false;
    return async ()=>{
        if (currently_running) {
            rerun_when_done = true;
        } else {
            currently_running = true;
            rerun_when_done = true;
            while(rerun_when_done){
                rerun_when_done = false;
                await async_function();
            }
            currently_running = false;
        }
    };
};
const read_Uint8Array_with_progress = async (response, on_progress)=>{
    if (response.headers.has("Content-Length")) {
        const length = response.headers.get("Content-Length");
        const reader = response.body.getReader();
        let receivedLength = 0;
        let chunks = [];
        while(true){
            const { done , value  } = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
            receivedLength += value.length;
            on_progress(Math.min(1, receivedLength / length));
        }
        on_progress(1);
        const buffer = new Uint8Array(receivedLength);
        let position = 0;
        for (let chunk of chunks){
            buffer.set(chunk, position);
            position += chunk.length;
        }
        return buffer;
    } else {
        return new Uint8Array(await response.arrayBuffer());
    }
};
const FetchProgress = ({ progress  })=>progress == null || progress === 1 ? null : re`<div\n              style="\n              width: 200px;\n              height: 27px;\n              background: white;\n              border: 5px solid #d1d9e4;\n              border-radius: 6px;\n              position: fixed;\n              left: calc(50vw - 100px);\n              top: calc(50vh - 50px);\n              z-index: 300;\n              box-sizing: content-box;\n"\n          >\n              <div\n                  style=${{
        height: "100%",
        width: progress * 200 + "px",
        background: "rgb(117 135 177)"
    }}\n              ></div>\n          </div>`
;
const default_path = "...";
let pending_local_updates = 0;
const uuidv4 = ()=>"10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c8)=>(c8 ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c8 / 4).toString(16)
    )
;
function serialize_cells(cells) {
    return cells.map((cell)=>`# ╔═╡ ${cell.cell_id}\n` + cell.code + "\n"
    ).join("\n");
}
function deserialize_cells(serialized_cells) {
    const segments = serialized_cells.replace(/\r\n/g, "\n").split(/# ╔═╡ \S+\n/);
    return segments.map((s11)=>s11.trim()
    ).filter((s11)=>s11 !== ""
    );
}
const Main = ({ children  })=>{
    const { handler  } = useDropHandler();
    $1(()=>{
        document.body.addEventListener("drop", handler);
        document.body.addEventListener("dragover", handler);
        document.body.addEventListener("dragenter", handler);
        document.body.addEventListener("dragleave", handler);
        return ()=>{
            document.body.removeEventListener("drop", handler);
            document.body.removeEventListener("dragover", handler);
            document.body.removeEventListener("dragenter", handler);
            document.body.removeEventListener("dragleave", handler);
        };
    });
    return re`<main>${children}</main>`;
};
const url_logo_big = document.head.querySelector("link[rel='pluto-logo-big']").getAttribute("href");
const url_logo_small = document.head.querySelector("link[rel='pluto-logo-small']").getAttribute("href");
const __default = window._;
const _6 = __default;
class Editor extends d4 {
    constructor(){
        super();
        const url_params = new URLSearchParams(window.location.search);
        const launch_params = {
            statefile: url_params.get("statefile") ?? window.pluto_statefile,
            notebookfile: url_params.get("notebookfile") ?? window.pluto_notebookfile,
            disable_ui: !!(url_params.get("disable_ui") ?? window.pluto_disable_ui),
            binder_url: (url_params.get("binder_url") ?? window.pluto_binder_url) ?? "https://mybinder.org/build/gh/fonsp/pluto-on-binder/static-to-live-1",
            bind_server_url: url_params.get("bind_server_url") ?? window.pluto_bind_server_url
        };
        this.state = {
            notebook: {
                notebook_id: url_params.get("id"),
                path: default_path,
                shortpath: "",
                in_temp_dir: true,
                cell_inputs: {
                },
                cell_results: {
                },
                cell_order: []
            },
            cell_inputs_local: {
            },
            desired_doc_query: null,
            recently_deleted: null,
            disable_ui: launch_params.disable_ui,
            static_preview: launch_params.statefile != null,
            statefile_download_progress: null,
            offer_binder: launch_params.notebookfile != null,
            binder_phase: null,
            binder_session_url_with_token: null,
            connected: false,
            initializing: true,
            moving_file: false,
            scroller: {
                up: false,
                down: false
            },
            export_menu_open: false,
            last_created_cell: null,
            selected_cells: [],
            update_is_ongoing: false
        };
        this.counter_statistics = create_counter_statistics1();
        this.actions = {
            send: (...args)=>this.client.send(...args)
            ,
            update_notebook: (...args)=>this.update_notebook(...args)
            ,
            set_doc_query: (query)=>this.setState({
                    desired_doc_query: query
                })
            ,
            set_local_cell: (cell_id, new_val, callback)=>{
                return this.setState(immer((state)=>{
                    state.cell_inputs_local[cell_id] = {
                        code: new_val
                    };
                    state.selected_cells = [];
                }), callback);
            },
            focus_on_neighbor: (cell_id, delta, line = delta === -1 ? Infinity : -1, ch)=>{
                const i9 = this.state.notebook.cell_order.indexOf(cell_id);
                const new_i = i9 + delta;
                if (new_i >= 0 && new_i < this.state.notebook.cell_order.length) {
                    window.dispatchEvent(new CustomEvent("cell_focus", {
                        detail: {
                            cell_id: this.state.notebook.cell_order[new_i],
                            line: line,
                            ch: ch
                        }
                    }));
                }
            },
            add_deserialized_cells: async (data, index)=>{
                let new_codes = deserialize_cells(data);
                let new_cells = new_codes.map((code)=>({
                        cell_id: uuidv4(),
                        code: code,
                        code_folded: false
                    })
                );
                if (index === -1) {
                    index = this.state.notebook.cell_order.length;
                }
                await new Promise((resolve)=>this.setState(immer((state)=>{
                        for (let cell of new_cells){
                            state.cell_inputs_local[cell.cell_id] = cell;
                        }
                        state.last_created_cell = new_cells[0]?.cell_id;
                    }), resolve)
                );
                await update_notebook((notebook)=>{
                    for (const cell of new_cells){
                        notebook.cell_inputs[cell.cell_id] = {
                            ...cell,
                            code: ""
                        };
                    }
                    notebook.cell_order = [
                        ...notebook.cell_order.slice(0, index),
                        ...new_cells.map((x3)=>x3.cell_id
                        ),
                        ...notebook.cell_order.slice(index, Infinity), 
                    ];
                });
                for (const cell of new_cells){
                    const cm = document.querySelector(`[id="${cell.cell_id}"] .CodeMirror`).CodeMirror;
                    cm.setValue(cell.code);
                }
            },
            wrap_remote_cell: async (cell_id, block_start = "begin", block_end = "end")=>{
                const cell = this.state.notebook.cell_inputs[cell_id];
                const new_code = `${block_start}\n\t${cell.code.replace(/\n/g, "\n\t")}\n${block_end}`;
                await new Promise((resolve)=>{
                    this.setState(immer((state)=>{
                        state.cell_inputs_local[cell_id] = {
                            ...cell,
                            ...state.cell_inputs_local[cell_id],
                            code: new_code
                        };
                    }), resolve);
                });
                await this.actions.set_and_run_multiple([
                    cell_id
                ]);
            },
            split_remote_cell: async (cell_id, boundaries, submit = false)=>{
                const cell = this.state.notebook.cell_inputs[cell_id];
                const old_code = cell.code;
                const padded_boundaries = [
                    0,
                    ...boundaries
                ];
                const parts = boundaries.map((b3, i9)=>slice_utf81(old_code, padded_boundaries[i9], b3).trim()
                ).filter((x3)=>x3 !== ""
                );
                const cells_to_add = parts.map((code)=>{
                    return {
                        cell_id: uuidv4(),
                        code: code,
                        code_folded: false
                    };
                });
                this.setState(immer((state)=>{
                    for (let cell1 of cells_to_add){
                        state.cell_inputs_local[cell1.cell_id] = cell1;
                    }
                }));
                await update_notebook((notebook)=>{
                    delete notebook.cell_inputs[cell_id];
                    for (let cell1 of cells_to_add){
                        notebook.cell_inputs[cell1.cell_id] = cell1;
                    }
                    notebook.cell_order = notebook.cell_order.flatMap((c8)=>{
                        if (cell_id === c8) {
                            return cells_to_add.map((x3)=>x3.cell_id
                            );
                        } else {
                            return [
                                c8
                            ];
                        }
                    });
                });
                if (submit) {
                    await this.actions.set_and_run_multiple(cells_to_add.map((x3)=>x3.cell_id
                    ));
                }
            },
            interrupt_remote: (cell_id)=>{
                this.client.send("interrupt_all", {
                }, {
                    notebook_id: this.state.notebook.notebook_id
                }, false);
            },
            move_remote_cells: (cell_ids, new_index)=>{
                update_notebook((notebook)=>{
                    let before = notebook.cell_order.slice(0, new_index).filter((x3)=>!cell_ids.includes(x3)
                    );
                    let after = notebook.cell_order.slice(new_index, Infinity).filter((x3)=>!cell_ids.includes(x3)
                    );
                    notebook.cell_order = [
                        ...before,
                        ...cell_ids,
                        ...after
                    ];
                });
            },
            add_remote_cell_at: async (index, code = "")=>{
                let id = uuidv4();
                this.setState({
                    last_created_cell: id
                });
                await update_notebook((notebook)=>{
                    notebook.cell_inputs[id] = {
                        cell_id: id,
                        code,
                        code_folded: false
                    };
                    notebook.cell_order = [
                        ...notebook.cell_order.slice(0, index),
                        id,
                        ...notebook.cell_order.slice(index, Infinity)
                    ];
                });
                await this.client.send("run_multiple_cells", {
                    cells: [
                        id
                    ]
                }, {
                    notebook_id: this.state.notebook.notebook_id
                });
                return id;
            },
            add_remote_cell: async (cell_id, before_or_after, code)=>{
                const index = this.state.notebook.cell_order.indexOf(cell_id);
                const delta = before_or_after == "before" ? 0 : 1;
                return await this.actions.add_remote_cell_at(index + delta, code);
            },
            confirm_delete_multiple: async (verb, cell_ids)=>{
                if (cell_ids.length <= 1 || confirm(`${verb} ${cell_ids.length} cells?`)) {
                    if (cell_ids.some((cell_id)=>this.state.notebook.cell_results[cell_id].running || this.state.notebook.cell_results[cell_id].queued
                    )) {
                        if (confirm("This cell is still running - would you like to interrupt the notebook?")) {
                            this.actions.interrupt_remote(cell_ids[0]);
                        }
                    } else {
                        this.setState({
                            recently_deleted: cell_ids.map((cell_id)=>{
                                return {
                                    index: this.state.notebook.cell_order.indexOf(cell_id),
                                    cell: this.state.notebook.cell_inputs[cell_id]
                                };
                            })
                        });
                        await update_notebook((notebook)=>{
                            for (let cell_id of cell_ids){
                                delete notebook.cell_inputs[cell_id];
                            }
                            notebook.cell_order = notebook.cell_order.filter((cell_id1)=>!cell_ids.includes(cell_id1)
                            );
                        });
                        await this.client.send("run_multiple_cells", {
                            cells: []
                        }, {
                            notebook_id: this.state.notebook.notebook_id
                        });
                    }
                }
            },
            fold_remote_cell: async (cell_id, newFolded)=>{
                if (!newFolded) {
                    this.setState({
                        last_created_cell: cell_id
                    });
                }
                await update_notebook((notebook)=>{
                    notebook.cell_inputs[cell_id].code_folded = newFolded;
                });
            },
            set_and_run_all_changed_remote_cells: ()=>{
                const changed = this.state.notebook.cell_order.filter((cell_id)=>this.state.cell_inputs_local[cell_id] != null && this.state.notebook.cell_inputs[cell_id].code !== this.state.cell_inputs_local[cell_id]?.code
                );
                this.actions.set_and_run_multiple(changed);
                return changed.length > 0;
            },
            set_and_run_multiple: async (cell_ids)=>{
                if (cell_ids.length > 0) {
                    this.counter_statistics.numEvals++;
                    await update_notebook((notebook)=>{
                        for (let cell_id of cell_ids){
                            if (this.state.cell_inputs_local[cell_id]) {
                                notebook.cell_inputs[cell_id].code = this.state.cell_inputs_local[cell_id].code;
                            }
                        }
                    });
                    this.setState(immer((state)=>{
                        for (let cell_id of cell_ids){
                            if (state.notebook.cell_results[cell_id]) {
                                state.notebook.cell_results[cell_id].queued = true;
                            } else {
                            }
                        }
                    }));
                    await this.client.send("run_multiple_cells", {
                        cells: cell_ids
                    }, {
                        notebook_id: this.state.notebook.notebook_id
                    });
                }
            },
            set_bond: async (symbol, value, is_first_value)=>{
                this.counter_statistics.numBondSets++;
                await update_notebook((notebook)=>{
                    notebook.bonds[symbol] = {
                        value: value
                    };
                });
            },
            reshow_cell: (cell_id, objectid, dim)=>{
                this.client.send("reshow_cell", {
                    objectid: objectid,
                    dim: dim,
                    cell_id: cell_id
                }, {
                    notebook_id: this.state.notebook.notebook_id
                }, false);
            },
            write_file: (cell_id, { file , name , type  })=>{
                this.counter_statistics.numFileDrops++;
                return this.client.send("write_file", {
                    file,
                    name,
                    type,
                    path: this.state.notebook.path
                }, {
                    notebook_id: this.state.notebook.notebook_id,
                    cell_id: cell_id
                }, true);
            }
        };
        const apply_notebook_patches = (patches, old_state = undefined)=>new Promise((resolve)=>{
                if (patches.length !== 0) {
                    this.setState(an((state)=>{
                        let new_notebook = vn(old_state ?? state.notebook, patches);
                        if (false) {
                            console.group("Update!");
                            for (let patch of patches){
                                console.group(`Patch :${patch.op}`);
                                console.log(patch.path);
                                console.log(patch.value);
                                console.groupEnd();
                            }
                            console.groupEnd();
                        }
                        let cells_stuck_in_limbo = new_notebook.cell_order.filter((cell_id)=>new_notebook.cell_inputs[cell_id] == null
                        );
                        if (cells_stuck_in_limbo.length !== 0) {
                            console.warn(`cells_stuck_in_limbo:`, cells_stuck_in_limbo);
                            new_notebook.cell_order = new_notebook.cell_order.filter((cell_id)=>new_notebook.cell_inputs[cell_id] != null
                            );
                        }
                        state.notebook = new_notebook;
                    }), resolve);
                } else {
                    resolve();
                }
            })
        ;
        const on_update = (update, by_me)=>{
            if (this.state.notebook.notebook_id === update.notebook_id) {
                const message = update.message;
                switch(update.type){
                    case "notebook_diff":
                        apply_notebook_patches(message.patches);
                        break;
                    case "log":
                        handle_log(message, this.state.notebook.path);
                        break;
                    default:
                        console.error("Received unknown update type!", update);
                        break;
                }
            } else {
            }
        };
        const on_establish_connection = async (client)=>{
            Object.assign(this.client, client);
            window.version_info = this.client.version_info;
            await this.client.send("update_notebook", {
                updates: []
            }, {
                notebook_id: this.state.notebook.notebook_id
            }, false);
            this.setState({
                initializing: false,
                static_preview: false,
                binder_phase: this.state.binder_phase == null ? null : BinderPhase.ready
            });
            await this.client.send("complete", {
                query: "sq"
            }, {
                notebook_id: this.state.notebook.notebook_id
            });
            setTimeout(()=>{
                init_feedback();
                finalize_statistics(this.state, this.client, this.counter_statistics).then(store_statistics_sample);
                setInterval(()=>{
                    finalize_statistics(this.state, this.client, this.counter_statistics).then((statistics)=>{
                        store_statistics_sample(statistics);
                        send_statistics_if_enabled(statistics);
                    });
                    this.counter_statistics = create_counter_statistics1();
                }, 10 * 60 * 1000);
            }, 5 * 1000);
        };
        const on_connection_status = (val)=>this.setState({
                connected: val
            })
        ;
        const on_reconnect = ()=>{
            console.warn("Reconnected! Checking states");
            return true;
        };
        this.client = {
        };
        this.connect = (ws_address = undefined)=>create_pluto_connection1({
                ws_address: ws_address,
                on_unrequested_update: on_update,
                on_connection_status: on_connection_status,
                on_reconnect: on_reconnect,
                connect_metadata: {
                    notebook_id: this.state.notebook.notebook_id
                }
            }).then(on_establish_connection)
        ;
        let real_actions, fake_actions;
        const use_bind_server = launch_params.bind_server_url != null;
        if (use_bind_server) {
            const notebookfile_hash = use_bind_server ? fetch(launch_params.notebookfile).then((r2)=>r2.arrayBuffer()
            ).then(hash_arraybuffer) : null;
            use_bind_server && notebookfile_hash.then((x3)=>console.log("Notebook file hash:", x3)
            );
            const bond_connections = use_bind_server ? notebookfile_hash.then((hash)=>fetch(trailingslash(launch_params.bind_server_url) + "bondconnections/" + encodeURIComponent(hash) + "/")
            ).then((r2)=>r2.arrayBuffer()
            ).then((b3)=>unpack(new Uint8Array(b3))
            ) : null;
            use_bind_server && bond_connections.then((x3)=>console.log("Bond connections:", x3)
            );
            const mybonds = {
            };
            const bonds_to_set = {
                current: new Set()
            };
            const request_bond_response = debounced_promises(async ()=>{
                const base = trailingslash(launch_params.bind_server_url);
                const hash = await notebookfile_hash;
                const graph = await bond_connections;
                console.groupCollapsed("Requesting bonds", bonds_to_set.current);
                if (bonds_to_set.current.size > 0) {
                    const to_send = new Set(bonds_to_set.current);
                    bonds_to_set.current.forEach((varname)=>(graph[varname] ?? []).forEach((x3)=>to_send.add(x3)
                        )
                    );
                    bonds_to_set.current = new Set();
                    const mybonds_filtered = Object.fromEntries(Object.entries(mybonds).filter(([k3, v5])=>to_send.has(k3)
                    ));
                    const packed = pack(mybonds_filtered);
                    const url = base + "staterequest/" + encodeURIComponent(hash) + "/";
                    try {
                        const use_get = url.length + packed.length * 4 / 3 + 20 < 8000;
                        const response = use_get ? await fetch(url + encodeURIComponent(await base64_arraybuffer(packed)), {
                            method: "GET"
                        }) : await fetch(url, {
                            method: "POST",
                            body: packed
                        });
                        const { patches , ids_of_cells_that_ran  } = unpack(new Uint8Array(await response.arrayBuffer()));
                        await apply_notebook_patches(patches, an((state)=>{
                            ids_of_cells_that_ran.forEach((id)=>{
                                state.cell_results[id] = this.original_state.cell_results[id];
                            });
                        })(this.state.notebook));
                        console.log("done!");
                    } catch (e) {
                        console.error(e);
                    }
                }
                console.groupEnd();
            });
            real_actions = this.actions;
            fake_actions = launch_params.bind_server_url == null ? {
            } : {
                set_local_cell: ()=>{
                },
                set_bond: async (symbol, value, is_first_value)=>{
                    this.setState(immer((state)=>{
                        state.notebook.bonds[symbol] = {
                            value: value
                        };
                    }));
                    if (mybonds[symbol] == null || !_6.isEqual(mybonds[symbol].value, value)) {
                        mybonds[symbol] = {
                            value: value
                        };
                        bonds_to_set.current.add(symbol);
                        await request_bond_response();
                    }
                }
            };
        }
        this.on_disable_ui = ()=>{
            document.body.classList.toggle("disable_ui", this.state.disable_ui);
            document.head.querySelector("link[data-pluto-file='hide-ui']").setAttribute("media", this.state.disable_ui ? "all" : "print");
            if (use_bind_server) {
                this.actions = this.state.disable_ui ? fake_actions : real_actions;
            }
        };
        this.on_disable_ui();
        this.original_state = null;
        if (this.state.static_preview) {
            (async ()=>{
                const r2 = await fetch(launch_params.statefile);
                const data = await read_Uint8Array_with_progress(r2, (progress)=>{
                    this.setState({
                        statefile_download_progress: progress
                    });
                    console.log(progress);
                });
                const state = unpack(data);
                this.original_state = state;
                this.setState({
                    notebook: state,
                    initializing: false,
                    binder_phase: this.state.offer_binder ? BinderPhase.wait_for_user : null
                });
            })();
            fetch(`https://cdn.jsdelivr.net/gh/fonsp/pluto-usage-counter@1/article-view.txt?skip_sw`);
        } else {
            this.connect();
        }
        this.start_binder = async ()=>{
            try {
                fetch(`https://cdn.jsdelivr.net/gh/fonsp/pluto-usage-counter@1/binder-start.txt?skip_sw`).catch(()=>{
                });
                this.setState({
                    loading: true,
                    binder_phase: BinderPhase1.requesting,
                    disable_ui: false
                });
                const { binder_session_url , binder_session_token  } = await request_binder1(launch_params.binder_url.replace("mybinder.org/v2/", "mybinder.org/build/"));
                console.log("Binder URL:", `${binder_session_url}?token=${binder_session_token}`);
                const shutdown_url = `${new URL("../api/shutdown", binder_session_url).href}?token=${binder_session_token}`;
                window.shutdown_binder = ()=>{
                    fetch(shutdown_url, {
                        method: "POST"
                    });
                };
                this.setState({
                    binder_phase: BinderPhase1.created,
                    binder_session_url_with_token: `${binder_session_url}?token=${binder_session_token}`
                });
                const with_token = (u6)=>{
                    const new_url = new URL(u6);
                    new_url.searchParams.set("token", binder_session_token);
                    return String(new_url);
                };
                await fetch(with_token(binder_session_url));
                let open_response = null;
                const open_path = new URL("open", binder_session_url);
                open_path.searchParams.set("path", launch_params.notebookfile);
                console.log("open_path: ", String(open_path));
                open_response = await fetch(with_token(String(open_path)), {
                    method: "POST"
                });
                if (!open_response.ok) {
                    const open_url = new URL("open", binder_session_url);
                    open_url.searchParams.set("url", new URL(launch_params.notebookfile, window.location.href).href);
                    console.log("open_url: ", String(open_url));
                    open_response = await fetch(with_token(String(open_url)), {
                        method: "POST"
                    });
                }
                const new_notebook_id = await open_response.text();
                console.info("notebook_id:", new_notebook_id);
                this.setState((old_state)=>({
                        notebook: {
                            ...old_state.notebook,
                            notebook_id: new_notebook_id
                        },
                        binder_phase: BinderPhase1.notebook_running
                    })
                , ()=>{
                    this.connect(with_token(ws_address_from_base1(binder_session_url) + "channels"));
                });
            } catch (err) {
                console.error("Failed to initialize binder!", err);
                alert("Something went wrong! 😮\n\nWe failed to initialize the binder connection. Please try again with a different browser, or come back later.");
            }
        };
        this.bonds_changes_to_apply_when_done = [];
        this.notebook_is_idle = ()=>!Object.values(this.state.notebook.cell_results).some((cell)=>cell.running || cell.queued
            ) && !this.state.update_is_ongoing
        ;
        let update_notebook = async (mutate_fn)=>{
            let [new_notebook, changes, inverseChanges] = fn(this.state.notebook, (notebook)=>{
                mutate_fn(notebook);
            });
            if (!this.notebook_is_idle()) {
                let changes_involving_bonds = changes.filter((x3)=>x3.path[0] === "bonds"
                );
                this.bonds_changes_to_apply_when_done = [
                    ...this.bonds_changes_to_apply_when_done,
                    ...changes_involving_bonds
                ];
                changes = changes.filter((x3)=>x3.path[0] !== "bonds"
                );
            }
            if (false) {
                try {
                    let previous_function_name = new Error().stack.split("\n")[2].trim().split(" ")[1];
                    console.log(`Changes to send to server from "${previous_function_name}":`, changes);
                } catch (error) {
                }
            }
            if (changes.length === 0) {
                return;
            }
            for (let change of changes){
                if (change.path.some((x3)=>typeof x3 === "number"
                )) {
                    throw new Error("This sounds like it is editting an array!!!");
                }
            }
            pending_local_updates++;
            this.setState({
                update_is_ongoing: pending_local_updates > 0
            });
            try {
                await Promise.all([
                    this.client.send("update_notebook", {
                        updates: changes
                    }, {
                        notebook_id: this.state.notebook.notebook_id
                    }, false).then((response)=>{
                        if (response.message.response.update_went_well === "👎") {
                            throw new Error(`Pluto update_notebook error: ${response.message.response.why_not})`);
                        }
                    }),
                    new Promise((resolve)=>{
                        this.setState({
                            notebook: new_notebook
                        }, resolve);
                    }), 
                ]);
            } finally{
                pending_local_updates--;
                this.setState({
                    update_is_ongoing: pending_local_updates > 0
                });
            }
        };
        this.update_notebook = update_notebook;
        this.submit_file_change = async (new_path, reset_cm_value)=>{
            const old_path = this.state.notebook.path;
            if (old_path === new_path) {
                return;
            }
            if (!this.state.notebook.in_temp_dir) {
                if (!confirm("Are you sure? Will move from\n\n" + old_path + "\n\nto\n\n" + new_path)) {
                    throw new Error("Declined by user");
                }
            }
            this.setState({
                moving_file: true
            });
            try {
                await update_notebook((notebook)=>{
                    notebook.in_temp_dir = false;
                    notebook.path = new_path;
                });
                document.activeElement?.blur();
            } catch (error) {
                alert("Failed to move file:\n\n" + error.message);
            } finally{
                this.setState({
                    moving_file: false
                });
            }
        };
        this.delete_selected = (verb)=>{
            if (this.state.selected_cells.length > 0) {
                this.actions.confirm_delete_multiple(verb, this.state.selected_cells);
                return true;
            }
        };
        this.run_selected = ()=>{
            return this.actions.set_and_run_multiple(this.state.selected_cells);
        };
        this.serialize_selected = (cell_id = null)=>{
            const cells_to_serialize = cell_id == null || this.state.selected_cells.includes(cell_id) ? this.state.selected_cells : [
                cell_id
            ];
            if (cells_to_serialize.length) {
                return serialize_cells(cells_to_serialize.map((id)=>this.state.notebook.cell_inputs[id]
                ));
            }
        };
        document.addEventListener("keydown", (e2)=>{
            if (e2.key === "q" && has_ctrl_or_cmd_pressed(e2)) {
                if (Object.values(this.state.notebook.cell_results).some((c8)=>c8.running || c8.queued
                )) {
                    this.actions.interrupt_remote();
                }
                e2.preventDefault();
            } else if (e2.key === "s" && has_ctrl_or_cmd_pressed(e2)) {
                const some_cells_ran = this.actions.set_and_run_all_changed_remote_cells();
                if (!some_cells_ran) {
                }
                e2.preventDefault();
            } else if (e2.key === "Backspace" || e2.key === "Delete") {
                if (this.delete_selected("Delete")) {
                    e2.preventDefault();
                }
            } else if (e2.key === "Enter" && e2.shiftKey) {
                this.run_selected();
            } else if (e2.key === "?" && has_ctrl_or_cmd_pressed(e2) || e2.key === "F1") {
                alert(`Shortcuts 🎹\n\n    Shift+Enter:   run cell\n    ${ctrl_or_cmd_name}+Enter:   run cell and add cell below\n    Delete or Backspace:   delete empty cell\n\n    PageUp or fn+Up:   select cell above\n    PageDown or fn+Down:   select cell below\n\n    ${ctrl_or_cmd_name}+Q:   interrupt notebook\n    ${ctrl_or_cmd_name}+S:   submit all changes\n\n    ${ctrl_or_cmd_name}+C:   copy selected cells\n    ${ctrl_or_cmd_name}+X:   cut selected cells\n    ${ctrl_or_cmd_name}+V:   paste selected cells\n\n    The notebook file saves every time you run`);
                e2.preventDefault();
            }
        });
        document.addEventListener("copy", (e2)=>{
            if (!in_textarea_or_input()) {
                const serialized = this.serialize_selected();
                if (serialized) {
                    navigator.clipboard.writeText(serialized).catch((err)=>{
                        alert(`Error copying cells: ${e2}`);
                    });
                }
            }
        });
        document.addEventListener("paste", async (e2)=>{
            const topaste = e2.clipboardData.getData("text/plain");
            if (!in_textarea_or_input() || topaste.match(/# ╔═╡ ........-....-....-....-............/g)?.length) {
                this.setState({
                    selected_cells: []
                });
                const data = e2.clipboardData.getData("text/plain");
                this.actions.add_deserialized_cells(data, -1);
                e2.preventDefault();
            }
        });
        window.addEventListener("beforeunload", (event)=>{
            const unsaved_cells = this.state.notebook.cell_order.filter((id)=>this.state.cell_inputs_local[id] && this.state.notebook.cell_inputs[id].code !== this.state.cell_inputs_local[id].code
            );
            const first_unsaved = unsaved_cells[0];
            if (first_unsaved != null) {
                window.dispatchEvent(new CustomEvent("cell_focus", {
                    detail: {
                        cell_id: first_unsaved
                    }
                }));
                console.log("Preventing unload");
                event.stopImmediatePropagation();
                event.preventDefault();
                event.returnValue = "";
            } else {
                console.warn("unloading 👉 disconnecting websocket");
            }
        });
    }
    componentDidUpdate(old_props, old_state) {
        window.editor_state = this.state;
        document.title = "🎈 " + this.state.notebook.shortpath + " ⚡ Pluto.jl ⚡";
        if (old_state?.notebook?.path !== this.state.notebook.path) {
            update_stored_recent_notebooks(this.state.notebook.path, old_state?.notebook?.path);
        }
        const any_code_differs = this.state.notebook.cell_order.some((cell_id)=>this.state.cell_inputs_local[cell_id] != null && this.state.notebook.cell_inputs[cell_id].code !== this.state.cell_inputs_local[cell_id].code
        );
        document.body.classList.toggle("update_is_ongoing", pending_local_updates > 0);
        document.body.classList.toggle("binder", this.state.offer_binder || this.state.binder_phase != null);
        document.body.classList.toggle("static_preview", this.state.static_preview);
        document.body.classList.toggle("code_differs", any_code_differs);
        document.body.classList.toggle("loading", BinderPhase.wait_for_user < this.state.binder_phase && this.state.binder_phase < BinderPhase.ready || this.state.initializing || this.state.moving_file);
        if (this.state.connected || this.state.initializing || this.state.static_preview) {
            document.querySelector("meta[name=theme-color]").content = "#fff";
            document.body.classList.remove("disconnected");
        } else {
            document.querySelector("meta[name=theme-color]").content = "#DEAF91";
            document.body.classList.add("disconnected");
        }
        if (this.notebook_is_idle() && this.bonds_changes_to_apply_when_done.length !== 0) {
            let bonds_patches = this.bonds_changes_to_apply_when_done;
            this.bonds_changes_to_apply_when_done = [];
            this.update_notebook((notebook)=>{
                vn(notebook, bonds_patches);
            });
        }
        if (old_state.binder_phase !== this.state.binder_phase && this.state.binder_phase != null) {
            const phase = Object.entries(BinderPhase).find(([k3, v5])=>v5 == this.state.binder_phase
            )[0];
            console.info(`Binder phase: ${phase} at ${new Date().toLocaleTimeString()}`);
        }
        if (old_state.disable_ui !== this.state.disable_ui) {
            this.on_disable_ui();
        }
    }
    render() {
        let { export_menu_open  } = this.state;
        return re`\n            <${PlutoContext.Provider} value=${this.actions}>\n                <${PlutoBondsContext.Provider} value=${this.state.notebook.bonds}>\n                    <${Scroller} active=${this.state.scroller} />\n                    <header className=${export_menu_open ? "show_export" : ""}>\n                        <${ExportBanner}\n                            pluto_version=${this.client?.version_info?.pluto}\n                            notebook=${this.state.notebook}\n                            open=${export_menu_open}\n                            onClose=${()=>this.setState({
                export_menu_open: false
            })
        }\n                        />\n                        <loading-bar style=${`width: ${100 * this.state.binder_phase}vw`}></loading-bar>\n                        <div id="binder_spinners">\n                    <binder-spinner id="ring_1"></binder-spinner>\n                    <binder-spinner id="ring_2"></binder-spinner>\n                    <binder-spinner id="ring_3"></binder-spinner>\n                    </div>\n\n                        <nav id="at_the_top">\n                            <a href=${this.state.static_preview || this.state.binder_phase != null ? this.state.binder_session_url_with_token ?? "#" : "./"}>\n                                <h1><img id="logo-big" src=${url_logo_big} alt="Pluto.jl" /><img id="logo-small" src=${url_logo_small} /></h1>\n                            </a>\n                            <${FilePicker}\n                                client=${this.client}\n                                value=${this.state.notebook.in_temp_dir ? "" : this.state.notebook.path}\n                                on_submit=${this.submit_file_change}\n                                suggest_new_file=${{
            base: this.client.session_options == null ? "" : this.client.session_options.server.notebook_path_suggestion,
            name: this.state.notebook.shortpath
        }}\n                                placeholder="Save notebook..."\n                                button_label=${this.state.notebook.in_temp_dir ? "Choose" : "Move"}\n                            />\n                            <button class="toggle_export" title="Export..." onClick=${()=>{
            this.setState({
                export_menu_open: !export_menu_open
            });
        }}>\n                                <span></span>\n                            </button>\n                        </nav>\n                    </header>\n                    ${this.state.binder_phase === BinderPhase.wait_for_user ? re`<button id="launch_binder" onClick=${this.start_binder}>\n                                  <span>Run with </span\n                                  ><img src="https://cdn.jsdelivr.net/gh/jupyterhub/binderhub@0.2.0/binderhub/static/logo.svg" height="30" alt="binder" />\n                              </button>` : null}\n                    <${FetchProgress} progress=${this.state.statefile_download_progress} />\n                    <${Main}>\n                        <preamble>\n                            <button\n                                onClick=${()=>{
            this.actions.set_and_run_all_changed_remote_cells();
        }}\n                                class="runallchanged"\n                                title="Save and run all changed cells"\n                            >\n                                <span></span>\n                            </button>\n                        </preamble>\n                        <${NotebookMemo}\n                            is_initializing=${this.state.initializing}\n                            notebook=${this.state.notebook}\n                            selected_cells=${this.state.selected_cells}\n                            cell_inputs_local=${this.state.cell_inputs_local}\n                            on_update_doc_query=${this.actions.set_doc_query}\n                            on_cell_input=${this.actions.set_local_cell}\n                            on_focus_neighbor=${this.actions.focus_on_neighbor}\n                            disable_input=${this.state.disable_ui || !this.state.connected}\n                            last_created_cell=${this.state.last_created_cell}\n                        />\n                        <${DropRuler} \n                            actions=${this.actions}\n                            selected_cells=${this.state.selected_cells} \n                            set_scroller=${(enabled)=>{
            this.setState({
                scroller: enabled
            });
        }}\n                            serialize_selected=${this.serialize_selected}\n                        />\n                        ${this.state.disable_ui || re`<${SelectionArea}\n                                actions=${this.actions}\n                                cell_order=${this.state.notebook.cell_order}\n                                selected_cell_ids=${this.state.selected_cell_ids}\n                                set_scroller=${(enabled)=>{
            this.setState({
                scroller: enabled
            });
        }}\n                                on_selection=${(selected_cell_ids)=>{
            if (selected_cell_ids.length !== this.state.selected_cells || __default.difference(selected_cell_ids, this.state.selected_cells).length !== 0) {
                this.setState({
                    selected_cells: selected_cell_ids
                });
            }
        }}\n                            />`}\n                    </${Main}>\n                    <${LiveDocs}\n                        desired_doc_query=${this.state.desired_doc_query}\n                        on_update_doc_query=${this.actions.set_doc_query}\n                        notebook=${this.state.notebook}\n                    />\n                    <${UndoDelete}\n                        recently_deleted=${this.state.recently_deleted}\n                        on_click=${()=>{
            this.update_notebook((notebook)=>{
                for (let { index , cell  } of this.state.recently_deleted){
                    notebook.cell_inputs[cell.cell_id] = cell;
                    notebook.cell_order = [
                        ...notebook.cell_order.slice(0, index),
                        cell.cell_id,
                        ...notebook.cell_order.slice(index, Infinity)
                    ];
                }
            }).then(()=>{
                this.actions.set_and_run_multiple(this.state.recently_deleted.map(({ cell  })=>cell.cell_id
                ));
            });
        }}\n                    />\n                    <${SlideControls} />\n                    <footer>\n                        <div id="info">\n                            <form id="feedback" action="#" method="post">\n                                <a href="statistics-info">Statistics</a>\n                                <a href="https://github.com/fonsp/Pluto.jl/wiki">FAQ</a>\n                                <span style="flex: 1"></span>\n                                <label for="opinion">🙋 How can we make <a href="https://github.com/fonsp/Pluto.jl">Pluto.jl</a> better?</label>\n                                <input type="text" name="opinion" id="opinion" autocomplete="off" placeholder="Instant feedback..." />\n                                <button>Send</button>\n                            </form>\n                        </div>\n                    </footer>\n                </${PlutoBondsContext.Provider}>\n            </${PlutoContext.Provider}>\n        `;
    }
}
const update_stored_recent_notebooks = (recent_path, also_delete = undefined)=>{
    const storedString = localStorage.getItem("recent notebooks");
    const storedList = storedString != null ? JSON.parse(storedString) : [];
    const oldpaths = storedList;
    const newpaths = [
        recent_path
    ].concat(oldpaths.filter((path)=>{
        return path !== recent_path && path !== also_delete;
    }));
    localStorage.setItem("recent notebooks", JSON.stringify(newpaths.slice(0, 50)));
};
T2(re`<${Editor} />`, document.body);
