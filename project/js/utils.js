// utils.js
(function (ns) {
  "use strict";

  function Utils() {}

  // -----------------------------
  // Normalize
  // -----------------------------
  Utils.prototype.normalizeText = function (s) {
    s = String(s == null ? "" : s);

    // FULLWIDTH -> ASCII (digits, ASCII letters, basic punctuation)
    s = s.replace(/[\uFF10-\uFF19]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    s = s.replace(/[\uFF21-\uFF3A]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    s = s.replace(/[\uFF41-\uFF5A]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });

    // brackets (角括弧のみ正規化; 丸括弧は全角のままにする)
    s = s.replace(/[［【]/g, "[");
    s = s.replace(/[］】]/g, "]");

    // various dashes -> "-"
    // NOTE: do NOT convert Japanese long vowel mark "ー" (U+30FC)
    s = s.replace(/[‐\-‒–—―－−]/g, "-");

    // normalize spaces
    s = s.replace(/\u00A0/g, " "); // NBSP
    s = s.replace(/\u3000/g, " "); // IDEOGRAPHIC SPACE

    return s;
  };

  // -----------------------------
  // Number parsing helpers
  // -----------------------------
  Utils.prototype.parseNumberRanges = function (s) {
    s = String(s == null ? "" : s);
    s = this.normalizeText(s);

    s = s.replace(/[〜~]/g, "-");
    s = s.replace(/[，、]/g, ",");

    var parts = s.split(/[\s,]+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;

      var m = p.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) continue;

      var a = parseInt(m[1], 10);
      var b = m[2] ? parseInt(m[2], 10) : a;
      if (!isFinite(a) || !isFinite(b)) continue;

      if (b < a) { var tmp = a; a = b; b = tmp; }
      for (var n = a; n <= b; n++) out.push(n);
    }
    return out;
  };

  Utils.prototype.claimsToCompactRanges = function (claims) {
    claims = claims || [];
    if (!claims.length) return "";

    var arr = this.uniq(claims).sort(function (a, b) { return a - b; });

    var out = [];
    var start = arr[0], prev = arr[0];

    for (var i = 1; i < arr.length; i++) {
      var x = arr[i];
      if (x === prev + 1) {
        prev = x;
        continue;
      }
      out.push(start === prev ? String(start) : (start + "-" + prev));
      start = prev = x;
    }
    out.push(start === prev ? String(start) : (start + "-" + prev));

    return out.join(",");
  };

  Utils.prototype.uniq = function (arr) {
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var k = String(arr[i]);
      if (seen[k]) continue;
      seen[k] = true;
      out.push(arr[i]);
    }
    return out;
  };

  Utils.prototype.pad4 = function (n) {
    n = String(n == null ? "" : n);
    while (n.length < 4) n = "0" + n;
    return n;
  };

  // -----------------------------
  // Small string helpers (shared)
  // -----------------------------
  Utils.prototype.padRight = function (s, n) {
    s = String(s == null ? "" : s);
    if (s.length >= n) return s;
    return s + new Array(n - s.length + 1).join(" ");
  };

  Utils.prototype.charDisplayWidth = function (code) {
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x303F) ||
      (code >= 0x3040 && code <= 0x309F) ||
      (code >= 0x30A0 && code <= 0x30FF) ||
      (code >= 0x3200 && code <= 0x4DBF) ||
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6)
    ) return 2;
    return 1;
  };

  Utils.prototype.displayWidth = function (s) {
    s = String(s == null ? "" : s);
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      w += this.charDisplayWidth(s.charCodeAt(i));
    }
    return w;
  };

  Utils.prototype.padRightDisplay = function (s, n) {
    s = String(s == null ? "" : s);
    var dw = this.displayWidth(s);
    if (dw >= n) return s;
    return s + new Array(n - dw + 1).join(" ");
  };

  // Title normalization for reason keyword matching:
  // - normalize dash variants ("サポ-ト" -> "サポート")
  // - remove all whitespace
  Utils.prototype.normReasonTitleKey = function (t) {
    t = String(t == null ? "" : t);
    t = this.normalizeText(t);
    // OCR often breaks "ー" into hyphen-like chars
    t = t.replace(/[‐\-‒–—―－−]/g, "ー");
    t = t.replace(/[\s\u3000]+/g, "");
    return t;
  };

  ns.Utils = Utils;
})(window.ROA);
