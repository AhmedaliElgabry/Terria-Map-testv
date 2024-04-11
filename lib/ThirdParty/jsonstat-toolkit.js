// jsonstat-toolkit v1.0.8 Copyright 2019 Xavier Badosa https://jsonstat.com
"use strict";
function _interopDefault(t) {
  return t && "object" == typeof t && "default" in t ? t.default : t;
}
var fetch = _interopDefault(require("node-fetch")),
  version = "1.0.8";
function jsonstat(t) {
  var e,
    n,
    i,
    r,
    s = function(t, e) {
      var n,
        i = [];
      if (("string" == typeof t && (t = [t]), Array.isArray(t))) {
        if (t.length === e) return t;
        if (1 === t.length) {
          for (n = 0; n < e; n++) i.push(t[0]);
          return i;
        }
      }
      for (n = 0; n < e; n++) {
        var r = void 0 === t[n] ? null : t[n];
        i.push(r);
      }
      return i;
    };
  if (((this.length = 0), (this.id = []), null != t))
    switch (((this.class = t.class || "bundle"), this.class)) {
      case "bundle":
        var l = [],
          a = 0;
        if (
          ((this.error = null),
          (this.length = 0),
          null === t || "object" != typeof t)
        )
          return void (this.class = null);
        if (t.hasOwnProperty("error")) return void (this.error = t.error);
        if (
          "dataset" === t.class ||
          "collection" === t.class ||
          "dimension" === t.class
        )
          return new jsonstat(t);
        for (n in t) a++, l.push(n);
        (this.__tree__ = t), (this.length = a), (this.id = l);
        break;
      case "dataset":
        t.hasOwnProperty("__tree__")
          ? (this.__tree__ = e = t.__tree__)
          : (this.__tree__ = e = t),
          (this.label = e.label || null),
          (this.note = e.note || null),
          (this.link = e.link || null),
          (this.href = e.href || null),
          (this.updated = e.updated || null),
          (this.source = e.source || null),
          (this.extension = e.extension || null);
        var o,
          u = 0,
          h = e.size || (e.dimension && e.dimension.size);
        if (
          ((this.size = h), e.hasOwnProperty("value") && Array.isArray(e.value))
        )
          u = e.value.length;
        else {
          var f = 1;
          for (o = h.length; o--; ) f *= h[o];
          u = f;
        }
        if (
          ((this.value = s(e.value, u)),
          (this.status = e.hasOwnProperty("status") ? s(e.status, u) : null),
          e.hasOwnProperty("dimension"))
        ) {
          var c = e.dimension,
            d = e.role || (!e.version && c.role) || null,
            v = e.id || c.id,
            p = h.length,
            y = function(t) {
              d.hasOwnProperty(t) || (d[t] = null);
            };
          if (!Array.isArray(v) || !Array.isArray(h) || v.length != p) return;
          if (
            ((this.length = p),
            (this.id = v),
            d && (y("time"), y("geo"), y("metric"), y("classification")),
            d && null === d.classification)
          ) {
            var g = [],
              _ = ["time", "geo", "metric"],
              b = function(t, e) {
                for (var n = e.length; n--; ) if (t === e[n]) return !0;
                return !1;
              };
            for (o = 0; o < 3; o++) {
              var m = d[_[o]];
              null !== m && (g = g.concat(m));
            }
            for (d.classification = [], o = 0; o < p; o++)
              b(v[o], g) || d.classification.push(v[o]);
            0 === d.classification.length && (d.classification = null);
          }
          (this.role = d), (this.n = u);
          for (var x = 0, j = this.length; x < j; x++)
            if (c[v[x]].category.hasOwnProperty("index")) {
              if (Array.isArray(c[v[x]].category.index)) {
                var w = {},
                  O = c[v[x]].category.index;
                for (i = O.length, r = 0; r < i; r++) w[O[r]] = r;
                c[v[x]].category.index = w;
              }
            } else {
              var A = 0;
              for (n in ((c[v[x]].category.index = {}), c[v[x]].category.label))
                c[v[x]].category.index[n] = A++;
            }
        } else this.length = 0;
        break;
      case "dimension":
        if (!t.hasOwnProperty("__tree__"))
          return new jsonstat({
            version: "2.0",
            class: "dataset",
            dimension: { d: t },
            id: ["d"],
            size: [
              (function(t) {
                var e = void 0 === t.index ? t.label : t.index;
                return Array.isArray(e) ? e.length : Object.keys(e).length;
              })(t.category)
            ],
            value: [null]
          }).Dimension(0);
        var k = [],
          D = (e = t.__tree__).category;
        if (!e.hasOwnProperty("category")) return;
        if (!D.hasOwnProperty("label"))
          for (n in ((D.label = {}), D.index)) D.label[n] = n;
        for (n in D.index) k[D.index[n]] = n;
        (this.__tree__ = e),
          (this.label = e.label || null),
          (this.note = e.note || null),
          (this.link = e.link || null),
          (this.href = e.href || null),
          (this.id = k),
          (this.length = k.length),
          (this.role = t.role),
          (this.hierarchy = D.hasOwnProperty("child")),
          (this.extension = e.extension || null);
        break;
      case "category":
        var z = t.child;
        (this.id = z),
          (this.length = null === z ? 0 : z.length),
          (this.index = t.index),
          (this.label = t.label),
          (this.note = t.note || null),
          (this.unit = t.unit),
          (this.coordinates = t.coord);
        break;
      case "collection":
        if (
          ((this.length = 0),
          (this.label = t.label || null),
          (this.note = t.note || null),
          (this.link = t.link || null),
          (this.href = t.href || null),
          (this.updated = t.updated || null),
          (this.source = t.source || null),
          (this.extension = t.extension || null),
          null !== this.link && t.link.item)
        ) {
          var P = t.link.item;
          if (((this.length = Array.isArray(P) ? P.length : 0), this.length))
            for (r = 0; r < this.length; r++) this.id[r] = P[r].href;
        }
    }
}
function responseJSON(t) {
  if (!t.ok) throw new Error(t.status + " " + t.statusText);
  return t.json();
}
function JSONstat(t, e) {
  return "object" == typeof t
    ? new jsonstat(t)
    : "version" === t
    ? version
    : fetch
    ? fetch(t, e)
        .then(responseJSON)
        .then(function(t) {
          return new jsonstat(t);
        })
    : void 0;
}
(jsonstat.prototype.Item = function(t) {
  if (null === this || "collection" !== this.class || !this.length) return null;
  if ("number" == typeof t)
    return t > this.length || t < 0 ? null : this.link.item[t];
  var e,
    n = [];
  if ("object" == typeof t) {
    if (!t.class && !t.follow) return null;
    t.class &&
      (e =
        "dataset" === t.class && "boolean" == typeof t.embedded
          ? !0 === t.embedded
            ? function(t, e, i) {
                var r = t.link.item[e];
                i.class === r.class &&
                  r.id &&
                  r.size &&
                  r.dimension &&
                  n.push(r);
              }
            : function(t, e, i) {
                var r = t.link.item[e];
                i.class !== r.class ||
                  (r.id && r.size && r.dimension) ||
                  n.push(r);
              }
          : function(t, e, i) {
              i.class === t.link.item[e].class && n.push(t.link.item[e]);
            });
  } else
    e = function(t, e) {
      n.push(t.link.item[e]);
    };
  for (var i = 0; i < this.length; i++) e(this, i, t);
  return n;
}),
  (jsonstat.prototype.Dataset = function(t) {
    if (null === this) return null;
    if ("dataset" === this.class) return void 0 !== t ? this : [this];
    var e,
      n = [],
      i = 0;
    if ("collection" === this.class) {
      var r = this.Item({ class: "dataset", embedded: !0 });
      if (void 0 === t) {
        for (e = r.length; i < e; i++) n.push(new jsonstat(r[i]));
        return n;
      }
      if ("number" == typeof t && t >= 0 && t < r.length)
        return new jsonstat(r[t]);
      if ("string" == typeof t)
        for (e = r.length; i < e; i++)
          if (r[i].href === t) return new jsonstat(r[i]);
      return null;
    }
    if ("bundle" !== this.class) return null;
    if (void 0 === t) {
      for (e = this.id.length; i < e; i++) n.push(this.Dataset(this.id[i]));
      return n;
    }
    if ("number" == typeof t) {
      var s = this.id[t];
      return void 0 !== s ? this.Dataset(s) : null;
    }
    var l = this.__tree__[t];
    return void 0 === l
      ? null
      : new jsonstat({ class: "dataset", __tree__: l });
  }),
  (jsonstat.prototype.Dimension = function(t, e) {
    e = "boolean" != typeof e || e;
    var n,
      i = [],
      r = this.id.length,
      s = function(t, e) {
        if (null !== t)
          for (var n in t)
            for (var i = null !== t[n] ? t[n].length : 0; i--; )
              if (t[n][i] === e) return n;
        return null;
      };
    if (null === this || "dataset" !== this.class) return null;
    if (void 0 === t) {
      for (n = 0; n < r; n++) i.push(this.Dimension(this.id[n]));
      return i;
    }
    if ("number" == typeof t) {
      var l = this.id[t];
      return void 0 !== l ? this.Dimension(l, e) : null;
    }
    var a = this.role;
    if ("object" == typeof t) {
      if (t.hasOwnProperty("role")) {
        for (n = 0; n < r; n++) {
          var o = this.id[n];
          s(a, o) === t.role && i.push(this.Dimension(o, e));
        }
        return void 0 === i[0] ? null : i;
      }
      return null;
    }
    var u = this.__tree__.dimension;
    if (void 0 === u) return null;
    var h = u[t];
    return void 0 === h
      ? null
      : e
      ? new jsonstat({ class: "dimension", __tree__: h, role: s(a, t) })
      : (function(t, e) {
          var n = [];
          for (var i in t) n[t[i]] = e[i];
          return n;
        })(h.category.index, h.category.label);
  }),
  (jsonstat.prototype.Category = function(t) {
    if (null === this || "dimension" !== this.class) return null;
    if (void 0 === t) {
      for (var e = [], n = 0, i = this.id.length; n < i; n++)
        e.push(this.Category(this.id[n]));
      return e;
    }
    if ("number" == typeof t) {
      var r = this.id[t];
      return void 0 !== r ? this.Category(r) : null;
    }
    var s = this.__tree__.category;
    if (void 0 === s) return null;
    var l = s.index[t];
    if (void 0 === l) return null;
    var a = (s.unit && s.unit[t]) || null,
      o = (s.coordinates && s.coordinates[t]) || null,
      u = (s.child && s.child[t]) || null,
      h = (s.note && s.note[t]) || null;
    return new jsonstat({
      class: "category",
      index: l,
      label: s.label[t],
      note: h,
      child: u,
      unit: a,
      coord: o
    });
  }),
  (jsonstat.prototype.Slice = function(t) {
    if (null === this || "dataset" !== this.class) return null;
    if (void 0 === t) return this;
    if (!Array.isArray(t)) {
      var e,
        n = [];
      for (e in t) n.push([e, t[e]]);
      t = n;
    }
    var i = this,
      r = t.length,
      s = i.toTable({ field: "id", content: "id", status: !0 }),
      l = i.status,
      a = s.shift(),
      o = !1,
      u = [],
      h = [],
      f = [],
      c = [];
    return (
      t.forEach(function(t) {
        var e = i.Dimension(t[0]);
        if (null !== e) {
          var n = e.id.indexOf(t[1]);
          -1 !== n
            ? (f.push([i.id.indexOf(t[0]), n]), c.push(e.Category(n).label))
            : (o = !0);
        } else o = !0;
      }),
      o
        ? null
        : (s.forEach(function(e) {
            var n,
              i = {},
              s = 0;
            for (n = e.length; n--; ) i[a[n]] = e[n];
            t.forEach(function(t) {
              i[t[0]] === t[1] && s++;
            }),
              r === s && (u.push(i.value), h.push(i.status));
          }),
          (i.n = u.length),
          (i.value = i.__tree__.value = u),
          (i.status = i.__tree__.status = null !== l ? h : null),
          t.forEach(function(t, e) {
            (i.size[f[e][0]] = 1),
              (i.__tree__.dimension[t[0]].category.index = {}),
              (i.__tree__.dimension[t[0]].category.index[t[1]] = 0),
              (i.__tree__.dimension[t[0]].category.label = {}),
              (i.__tree__.dimension[t[0]].category.label[t[1]] = c[e]);
          }),
          i)
    );
  }),
  (jsonstat.prototype.Data = function(t, e) {
    var n,
      i,
      r = [],
      s = function(t) {
        for (var e in t) if (t.hasOwnProperty(e)) return e;
      };
    if (null === this || "dataset" !== this.class) return null;
    if (void 0 === t) {
      for (i = this.value.length, n = 0; n < i; n++) r.push(this.Data(n));
      return r;
    }
    if (("boolean" != typeof e && (e = !0), "number" == typeof t)) {
      var l = this.value[t];
      return void 0 === l
        ? null
        : e
        ? { value: l, status: this.status ? this.status[t] : null }
        : l;
    }
    var a = "object",
      o = this.__tree__,
      u = o.size || (o.dimension && o.dimension.size),
      h = u.length;
    if (Array.isArray(t)) {
      if (!Array.isArray(t[0])) {
        if (this.length !== t.length) return null;
        var f = 1,
          c = 0,
          d = [],
          v = [];
        for (n = 0; n < h; n++)
          if (void 0 !== t[n]) {
            if ("number" != typeof t[n] || t[n] >= u[n]) return null;
            c += (f *= n > 0 ? u[h - n] : 1) * t[h - n - 1];
          } else d.push(n), v.push(u[n]);
        if (d.length > 1) return null;
        if (1 === d.length) {
          for (var p = 0, y = v[0]; p < y; p++) {
            var g = [];
            for (n = 0; n < h; n++) n !== d[0] ? g.push(t[n]) : g.push(p);
            r.push(this.Data(g, e));
          }
          return r;
        }
        return e
          ? {
              value: this.value[c],
              status: this.status ? this.status[c] : null
            }
          : this.value[c];
      }
      a = "array";
    }
    var _ = (function(t, e, n) {
        var i,
          r = [],
          l = {},
          a = t.dimension,
          o = t.id || a.id,
          u = t.size || (a && a.size);
        if ("array" === n) {
          for (i = e.length; i--; ) l[e[i][0]] = e[i][1];
          e = l;
        }
        for (var h = 0, f = o.length; h < f; h++) {
          var c = o[h],
            d = e[c];
          r.push(
            "string" == typeof d
              ? d
              : 1 === u[h]
              ? s(a[c].category.index)
              : null
          );
        }
        return r;
      })(o, t, a),
      b = [],
      m = o.dimension,
      x = o.id || m.id;
    for (n = 0, i = _.length; n < i; n++) b.push(m[x[n]].category.index[_[n]]);
    return this.Data(b, e);
  }),
  (jsonstat.prototype.toTable = function(t, e) {
    if (null === this || "dataset" !== this.class) return null;
    1 == arguments.length && "function" == typeof t && ((e = t), (t = null)),
      (t = t || {
        field: "label",
        content: "label",
        vlabel: "Value",
        slabel: "Status",
        type: "array",
        status: !1,
        unit: !1,
        by: null,
        prefix: "",
        drop: [],
        meta: !1,
        comma: !1,
        bylabel: !1
      });
    var n,
      i,
      r,
      s,
      l,
      a = this.__tree__,
      o = !0 === t.status;
    if ("function" == typeof e) {
      n = this.toTable(t);
      var u = [],
        h = "array" !== t.type ? 0 : 1;
      for (
        l = (S = "object" !== t.type ? n.slice(h) : n.rows.slice(0)).length,
          i = 0;
        i < l;
        i++
      ) {
        var f = e.call(this, S[i], i);
        void 0 !== f && u.push(f);
      }
      return "object" === t.type
        ? { cols: n.cols, rows: u }
        : ("array" === t.type && u.unshift(n[0]), u);
    }
    if ("arrobj" === t.type) {
      var c = [],
        d = (n = this.toTable({
          field: "id",
          content: t.content,
          status: o
        })).shift(),
        v = a.role && a.role.metric,
        p = function() {},
        y = {},
        g = this,
        _ = g.id,
        b = t.by && -1 !== _.indexOf(t.by) ? t.by : null,
        m = !0 === t.meta,
        x = void 0 !== t.drop && Array.isArray(t.drop) ? t.drop : [],
        j = !0 === t.comma,
        w = !0 === t.bylabel,
        O = function(e) {
          if (m) {
            var n = {};
            return (
              _.forEach(function(t) {
                var e = g.Dimension(t);
                n[t] = {
                  label: e.label,
                  role: e.role,
                  categories: { id: e.id, label: g.Dimension(t, !1) }
                };
              }),
              {
                meta: {
                  label: g.label,
                  source: g.source,
                  updated: g.updated,
                  id: _,
                  status: o,
                  unit: t.unit,
                  by: b,
                  bylabel: w,
                  drop: null !== b && x.length > 0 ? x : null,
                  prefix: null !== b ? T || "" : null,
                  comma: j,
                  dimensions: n
                },
                data: e
              }
            );
          }
          return e;
        };
      if (null === b && t.unit && v) {
        if ("id" !== t.content)
          for (var A = v.length; A--; ) {
            var k = this.Dimension(v[A]);
            y[v[A]] = {};
            for (var D = k.length; D--; )
              y[v[A]][k.Category(D).label] = k.id[D];
          }
        (p = function(e, n) {
          if (-1 !== v.indexOf(e)) {
            var i = a.dimension[e].category;
            i.unit
              ? (z.unit = i.unit["id" !== t.content ? y[e][n] : n])
              : (z.unit = null);
          }
        }),
          (t.unit = !0);
      } else t.unit = !1;
      for (l = n.length, i = 0; i < l; i++) {
        var z = {};
        for (r = n[i].length; r--; ) (z[d[r]] = n[i][r]), p(d[r], n[i][r]);
        c.push(z);
      }
      if (
        (j &&
          c.forEach(function(t) {
            null !== t.value && (t.value = ("" + t.value).replace(".", ","));
          }),
        null !== b)
      ) {
        var P,
          E = {},
          S = [],
          C = {},
          T = void 0 !== t.prefix ? t.prefix : "";
        x.forEach(function(t, e) {
          (!g.Dimension(t) || g.Dimension(t).length > 1) && (x[e] = "");
        });
        var J = _.filter(function(t) {
            return t !== b && -1 === x.indexOf(t);
          }),
          N = g.Dimension(b),
          V = function(t, e) {
            var n = [];
            return (
              e.forEach(function(e) {
                n.push(t[e]);
              }),
              n.join("\t")
            );
          },
          I = function(t, e) {
            var n = {};
            return (
              e.forEach(function(e) {
                n[e] = t[e];
              }),
              n
            );
          };
        for (var q in ("id" !== t.content
          ? w
            ? (P = function(t, e, n) {
                t[e][T + n[b]] = n.value;
              })
            : (N.Category().forEach(function(t, e) {
                C[t.label] = N.id[e];
              }),
              (P = function(t, e, n) {
                t[e][T + C[n[b]]] = n.value;
              }))
          : (P = function(t, e, n) {
              t[e][T + n[b]] = n.value;
            }),
        c.forEach(function(t) {
          var e = V(t, J);
          void 0 === E[e] && (E[e] = I(t, J)), P(E, e, t, b);
        }),
        E))
          S.push(E[q]);
        return (o = !1), O(S);
      }
      return O(c);
    }
    var B,
      F,
      G,
      H,
      K = "id" === t.field;
    if ("object" === t.type) {
      var L =
        "number" == typeof this.value[0] || null === this.value[0]
          ? "number"
          : "string";
      (B = function(t, e) {
        var n = (K && t) || e || t;
        et.push({ id: t, label: n, type: "string" });
      }),
        (F = function(t, e, n) {
          var i = (K ? "value" : t) || "Value",
            r = (K ? "status" : e) || "Status";
          n && et.push({ id: "status", label: r, type: "string" }),
            et.push({ id: "value", label: i, type: L });
        }),
        (G = function(t) {
          vt.push({ v: t });
        }),
        (H = function(t) {
          vt.push({ v: t }), nt.push({ c: vt });
        });
    } else
      (B = function(t, e) {
        var n = (K && t) || e || t;
        et.push(n);
      }),
        (F = function(t, e, n) {
          var i = (K ? "value" : t) || "Value",
            r = (K ? "status" : e) || "Status";
          n && et.push(r), et.push(i), tt.push(et);
        }),
        (G = function(t) {
          vt.push(t);
        }),
        (H = function(t) {
          vt.push(t), tt.push(vt);
        });
    var M = a.dimension,
      Q = a.id || M.id,
      R = a.size || M.size,
      U = Q.length;
    if (U != R.length) return !1;
    var W = [],
      X = 1,
      Y = ((A = 1), []),
      Z = [],
      $ = [],
      tt = [],
      et = [],
      nt = [];
    for (i = 0; i < U; i++) {
      var it = Q[i],
        rt = M[it].label;
      B(it, rt), (X *= R[i]), (A *= R[i]);
      var st = [];
      for (r = 0; r < R[i]; r++)
        for (var lt in M[Q[i]].category.index)
          if (M[Q[i]].category.index[lt] === r) {
            var at =
              "id" !== t.content && M[Q[i]].category.label
                ? M[Q[i]].category.label[lt]
                : lt;
            st.push(at);
          }
      W.push(st), Y.push(A);
    }
    for (F(t.vlabel, t.slabel, o), l = W.length, i = 0; i < l; i++) {
      for (var ot = [], ut = 0, ht = W[i].length; ut < ht; ut++)
        for (var ft = 0; ft < X / Y[i]; ft++) ot.push(W[i][ut]);
      Z.push(ot);
    }
    for (l = Z.length, i = 0; i < l; i++) {
      var ct = [],
        dt = 0;
      for (s = 0; s < X; s++)
        ct.push(Z[i][dt]), ++dt === Z[i].length && (dt = 0);
      $.push(ct);
    }
    for (s = 0; s < X; s++) {
      var vt = [];
      l = Z.length;
      for (var pt = 0; pt < l; pt++) G($[pt][s]);
      o && G(this.status ? this.status[s] : null), H(this.value[s]);
    }
    return "object" === t.type ? { cols: et, rows: nt } : tt;
  }),
  (jsonstat.prototype.node = function() {
    return this.__tree__;
  }),
  (jsonstat.prototype.toString = function() {
    return this.class;
  }),
  (module.exports = JSONstat);