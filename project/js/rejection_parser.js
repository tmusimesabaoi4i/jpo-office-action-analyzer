// rejection_parser.js
(function (ns) {
  "use strict";

  function RejectionParser(utils) {
    this.u = utils;
  }

  // ------------------------------------------------------------
  // refs list
  // ------------------------------------------------------------
  RejectionParser.prototype.extractCitedReferencesList = function (text) {
    text = this.u.normalizeText(text || "");

    // <引用文献等一覧> 以降を優先
    var idx = text.indexOf("引用文献等一覧");
    if (idx < 0) idx = text.indexOf("引用文献一覧");
    var tail = idx >= 0 ? text.slice(idx) : text;

    var out = {};
    var re = /(^|\n)\s*(\d+)\s*[\.．]\s*([^\n]+?)(?=\n|$)/g;
    var m;
    while ((m = re.exec(tail))) {
      var no = parseInt(m[2], 10);
      var name = (m[3] || "").trim();
      if (no && name) out[String(no)] = name;
    }
    return out;
  };

  // ------------------------------------------------------------
  // reason block parsing
  // ------------------------------------------------------------
  RejectionParser.prototype._scanSummaryReasonHeads = function (t) {
    var heads = [];
    var reReason = /(^|\n)\s*理由\s*(?=\n)/;
    var mReason = t.match(reReason);
    if (!mReason) return heads;

    var startReasonIdx = t.search(reReason);
    if (startReasonIdx < 0) return heads;

    var m2 = reReason.exec(t.slice(startReasonIdx));
    var base = startReasonIdx + (m2 ? m2[0].length : 0);

    var tail = t.slice(base);
    var mKi = tail.match(/(^|\n)\s*記\s*(?=\n)/);
    var end = mKi ? base + tail.search(/(^|\n)\s*記\s*(?=\n)/) : t.length;

    var summary = t.slice(base, end);

    // 1．（サポート要件）...
    var re = /(^|\n)\s*(\d+)\s*[\.．]\s*（([^\)）]+)）/g;
    var mm;
    while ((mm = re.exec(summary))) {
      var idx = base + mm.index + (mm[1] ? mm[1].length : 0);
      heads.push({
        idx: idx,
        style: "summary",
        no: parseInt(mm[2], 10),
        title: (mm[3] || "").trim()
      });
    }
    return heads;
  };

  RejectionParser.prototype.parseReasonBlocks = function (rawText) {
    var t = this.u.normalizeText(rawText || "");
    var heads = [];
    var m;

    // A) bullet style "●理由1（...）について"
    var reA = /(^|\n)\s*[●・]\s*理由\s*(\d+)\s*（([^\)）]+)）/g;
    while ((m = reA.exec(t))) {
      heads.push({
        idx: m.index + (m[1] ? m[1].length : 0),
        style: "bullet",
        no: parseInt(m[2], 10),
        title: (m[3] || "").trim()
      });
    }

    // A2) summary heads inside "理由" section (1．（...）)
    var summaryHeads = this._scanSummaryReasonHeads(t);
    heads = heads.concat(summaryHeads);

    // B) plain style "理由N.（...）"
    // IMPORTANT: 改行を許容しない（スペース/タブ/全角スペースのみ許容）
    // "理由\n\n1．（...）" のような誤マッチを防止
    var reB = /(^|\n)[ \t\u3000]*理由[ \t\u3000]*(\d+)[ \t\u3000]*[\.．][ \t\u3000]*（([^\)）]+)）/g;
    while ((m = reB.exec(t))) {
      heads.push({
        idx: m.index + (m[1] ? m[1].length : 0),
        style: "plain",
        no: parseInt(m[2], 10),
        title: (m[3] || "").trim()
      });
    }

    // sort heads by idx
    heads.sort(function (a, b) {
      if (a.idx !== b.idx) return a.idx - b.idx;
      var pri = { bullet: 3, summary: 2, plain: 1 };
      return (pri[b.style] || 0) - (pri[a.style] || 0);
    });

    // de-dup by idx+no+style
    var uniq = [];
    var seen = {};
    for (var i = 0; i < heads.length; i++) {
      var k = heads[i].idx + "|" + heads[i].no + "|" + heads[i].style;
      if (seen[k]) continue;
      seen[k] = true;
      uniq.push(heads[i]);
    }
    heads = uniq;

    var blocks = [];
    for (var j = 0; j < heads.length; j++) {
      var start = heads[j].idx;
      var end2 = (j + 1 < heads.length) ? heads[j + 1].idx : t.length;
      var chunk = t.slice(start, end2);

      var lines = chunk.split("\n");
      var headerLine = "";
      for (var k2 = 0; k2 < lines.length; k2++) {
        if (lines[k2].trim()) { headerLine = lines[k2].trim(); break; }
      }

      var headPart = chunk.slice(0, 1200);
      var am = headPart.match(/特許法\s*第\s*\d+\s*条(?:\s*第\s*\d+\s*項)?/);
      var article = am ? am[0].replace(/\s+/g, "") : "";

      var body = chunk.trim();

      blocks.push({
        no: heads[j].no,
        style: heads[j].style,
        headerLine: headerLine,
        reasonTitle: heads[j].title,
        article: article,
        body: body
      });
    }
    return blocks;
  };

  // ------------------------------------------------------------
  // effective title
  // ------------------------------------------------------------
  RejectionParser.prototype.getEffectiveTitle = function (block) {
    if (!block) return "";
    var t = String(block.reasonTitle || "").trim();
    if (t) return t;

    var h = String(block.headerLine || "");
    var m = h.match(/（([^\)）]+)）/);
    return m ? (m[1] || "").trim() : "";
  };

  // ------------------------------------------------------------
  // mini items (claims/refs/notes) extraction
  // ------------------------------------------------------------
  RejectionParser.prototype.extractMiniItemsFromBlock = function (blockBody) {
    var t = this.u.normalizeText(blockBody || "");

    var out = [];
    var re = /(^|\n)\s*[・●]\s*請求項\s*([^\n]+)(?=\n|$)/g;
    var m;

    while ((m = re.exec(t))) {
      var claimsText = (m[2] || "").trim();
      var claims = this.u.parseNumberRanges(claimsText);

      var start = m.index;
      var end = t.length;
      var skip = m.index + m[0].length;
      var next = t.slice(skip).search(/(^|\n)\s*[・●]\s*請求項\s*/);
      if (next >= 0) end = skip + next;

      var chunk = t.slice(start, end);

      var refs = [];
      var rm = chunk.match(/(^|\n)\s*[・●]\s*引用文献等\s*([^\n]+)/);
      if (rm) refs = this.u.parseNumberRanges(rm[2] || "");

      var noteText = "";
      var bm = chunk.match(/(^|\n)\s*[・●]\s*備考\s*(?:\n|$)/);
      if (bm) {
        var bidx = chunk.search(/(^|\n)\s*[・●]\s*備考\s*(?:\n|$)/);
        noteText = chunk.slice(bidx).replace(/(^|\n)\s*[・●]\s*備考\s*(?:\n|$)/, "").trim();
      } else {
        noteText = chunk;
      }

      out.push({
        claimsText: claimsText,
        claims: claims,
        refs: refs,
        noteText: noteText
      });
    }

    return out;
  };

  // ------------------------------------------------------------
  // paragraph + figure extraction (by citation string)
  // ------------------------------------------------------------
  RejectionParser.prototype.extractParagraphStrings = function (noteText) {
    var t = this.u.normalizeText(noteText || "");

    var out = [];

    var reRange = /\[(\d+)\]\s*-\s*\[(\d+)\]/g;
    var m;
    while ((m = reRange.exec(t))) {
      out.push("[" + this.u.pad4(m[1]) + "]-[" + this.u.pad4(m[2]) + "]");
    }

    var reTok = /\[(\d+)\]/g;
    while ((m = reTok.exec(t))) {
      out.push("[" + this.u.pad4(m[1]) + "]");
    }

    return out;
  };

  RejectionParser.prototype.extractFigureTokens = function (noteText) {
    var t = this.u.normalizeText(noteText || "");
    var out = [];

    var re = /図\s*([0-9]+)/g;
    var m;
    var seen = {};
    while ((m = re.exec(t))) {
      var key = "図" + String(m[1]);
      if (seen[key]) continue;
      seen[key] = true;
      out.push("FIG:[" + key + "]");
    }
    return out;
  };

  RejectionParser.prototype.extractParagraphRefsByCitation = function (noteText) {
    var t = this.u.normalizeText(noteText || "");
    var self = this;
    var out = {};

    var reCite = /引用文献\s*(\d+)/g;
    var matches = [];
    var m;
    while ((m = reCite.exec(t))) {
      matches.push({ idx: m.index, refNo: parseInt(m[1], 10) });
    }

    if (!matches.length) {
      var paras = self.extractParagraphStrings(t);
      var figs = self.extractFigureTokens(t);
      var all = paras.concat(figs);
      if (all.length) out[0] = all;
      return out;
    }

    var prolog = t.slice(0, matches[0].idx);
    var preParas = self.extractParagraphStrings(prolog);
    var preFigs = self.extractFigureTokens(prolog);
    if (preParas.length || preFigs.length) {
      out[0] = preParas.concat(preFigs);
    }

    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].idx;
      var end = (i + 1 < matches.length) ? matches[i + 1].idx : t.length;
      var segment = t.slice(start, end);
      var refNo = matches[i].refNo;

      var segParas = self.extractParagraphStrings(segment);
      var segFigs = self.extractFigureTokens(segment);
      var tokens = segParas.concat(segFigs);

      if (!out[refNo]) out[refNo] = [];
      out[refNo] = out[refNo].concat(tokens);
    }

    return out;
  };

  // ------------------------------------------------------------
  // open claims section extraction
  // ------------------------------------------------------------
  RejectionParser.prototype.extractOpenClaims = function (text) {
    text = this.u.normalizeText(text || "");

    var idx = text.indexOf("拒絶の理由を発見しない請求項");
    if (idx < 0) return null;

    var tail = text.slice(idx, idx + 1200);
    var m = tail.match(/請求項\s*[（(]?\s*(\d[\d,\- \t、，〜~]*)\s*[）)]?/);
    if (!m) return [];
    return this.u.parseNumberRanges(m[1] || "");
  };

  ns.RejectionParser = RejectionParser;
})(window.ROA);
