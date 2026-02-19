// paragraph_ref_set.js
(function (ns) {
  "use strict";

  function ParagraphRefSet(utils) {
    this.u = utils;
    this.paras = {};
    this.figs = {};
  }

  ParagraphRefSet.prototype.addToken = function (tok) {
    tok = String(tok == null ? "" : tok).trim();
    if (!tok) return;

    var mFig = tok.match(/^FIG:\[(.+)\]$/);
    if (mFig) {
      this.figs[mFig[1]] = true;
      return;
    }

    var m = tok.match(/^\[(\d+)\](?:-\[(\d+)\])?$/);
    if (!m) return;

    var a = parseInt(m[1], 10);
    var b = m[2] ? parseInt(m[2], 10) : a;
    if (!isFinite(a) || !isFinite(b)) return;
    if (b < a) { var t = a; a = b; b = t; }

    for (var n = a; n <= b; n++) this.paras[n] = true;
  };

  ParagraphRefSet.prototype.format = function (opts) {
    opts = opts || {};

    if (opts.groupOrder || opts.rangeDirection) {
      return this._formatGrouped(opts);
    }

    var desc = !!opts.desc;
    var multiline = !!opts.multiline;

    var nums = [];
    var keys = Object.keys(this.paras);
    for (var i = 0; i < keys.length; i++) nums.push(parseInt(keys[i], 10));

    if (desc) {
      nums.sort(function (a, b) { return b - a; });
    } else {
      nums.sort(function (a, b) { return a - b; });
    }

    var parts = [];
    if (nums.length) {
      var rs = nums[0], rp = nums[0];
      for (var j = 1; j < nums.length; j++) {
        var diff = desc ? (rp - nums[j]) : (nums[j] - rp);
        if (diff === 1) {
          rp = nums[j];
        } else {
          parts.push(rs === rp
            ? "[" + this.u.pad4(rs) + "]"
            : "[" + this.u.pad4(rs) + "]-[" + this.u.pad4(rp) + "]");
          rs = rp = nums[j];
        }
      }
      parts.push(rs === rp
        ? "[" + this.u.pad4(rs) + "]"
        : "[" + this.u.pad4(rs) + "]-[" + this.u.pad4(rp) + "]");
    }

    var figKeys = Object.keys(this.figs);
    figKeys.sort();
    if (desc) figKeys.reverse();
    var figParts = [];
    for (var k = 0; k < figKeys.length; k++) {
      figParts.push("FIG:[" + figKeys[k] + "]");
    }

    if (multiline && parts.length && figParts.length) {
      return parts.join(" ") + "\n" + figParts.join(" ");
    }

    return parts.concat(figParts).join(" ");
  };

  /**
   * New grouped mode: groupOrder controls group sort, rangeDirection
   * controls whether ranges display as [high]-[low] or [low]-[high].
   */
  ParagraphRefSet.prototype._formatGrouped = function (opts) {
    var groupOrder = opts.groupOrder || "asc";
    var rangeDir = opts.rangeDirection || "asc";
    var multiline = !!opts.multiline;

    var nums = [];
    var keys = Object.keys(this.paras);
    for (var i = 0; i < keys.length; i++) nums.push(parseInt(keys[i], 10));

    nums.sort(function (a, b) { return a - b; });

    var groups = [];
    if (nums.length) {
      var gs = nums[0], ge = nums[0];
      for (var j = 1; j < nums.length; j++) {
        if (nums[j] - ge === 1) {
          ge = nums[j];
        } else {
          groups.push([gs, ge]);
          gs = ge = nums[j];
        }
      }
      groups.push([gs, ge]);
    }

    if (groupOrder === "desc") {
      groups.sort(function (a, b) { return b[0] - a[0]; });
    }

    var u = this.u;
    var parts = [];
    for (var g = 0; g < groups.length; g++) {
      var lo = groups[g][0], hi = groups[g][1];
      if (lo === hi) {
        parts.push("[" + u.pad4(lo) + "]");
      } else if (rangeDir === "desc") {
        parts.push("[" + u.pad4(hi) + "]-[" + u.pad4(lo) + "]");
      } else {
        parts.push("[" + u.pad4(lo) + "]-[" + u.pad4(hi) + "]");
      }
    }

    var figKeys = Object.keys(this.figs);
    figKeys.sort();
    if (groupOrder === "desc") figKeys.reverse();
    var figParts = [];
    for (var k = 0; k < figKeys.length; k++) {
      figParts.push("FIG:[" + figKeys[k] + "]");
    }

    if (multiline && parts.length && figParts.length) {
      return parts.join(" ") + "\n" + figParts.join(" ");
    }

    return parts.concat(figParts).join(" ");
  };

  ns.ParagraphRefSet = ParagraphRefSet;
})(window.ROA);
