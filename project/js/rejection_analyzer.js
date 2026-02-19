// rejection_analyzer.js
(function (ns) {
  "use strict";

  function RejectionAnalyzer(utils, parser) {
    this.u = utils;
    this.p = parser;
  }

  // -----------------------------
  // Reason classification helpers
  // -----------------------------

  RejectionAnalyzer.prototype.isOtherReasonTitle = function (title) {
    var t = this.u.normReasonTitleKey(title || "");
    return (
      t.indexOf("サポート") >= 0 ||
      t.indexOf("明確") >= 0 ||
      t.indexOf("記載要件") >= 0 ||
      t.indexOf("実施可能") >= 0 ||
      t.indexOf("拡張") >= 0
    );
  };

  RejectionAnalyzer.prototype.classifyBlock = function (block) {
    var title = this.p.getEffectiveTitle(block);

    if (this.isOtherReasonTitle(title)) return "other";

    var key = this.u.normReasonTitleKey(title);
    if (key.indexOf("新規性") >= 0) return "novelty";
    if (key.indexOf("進歩性") >= 0) return "inventive";

    var a = String((block && block.article) || "");
    if (a.indexOf("特許法第29条第1項") >= 0) return "novelty";
    if (a.indexOf("特許法第29条第2項") >= 0) return "inventive";

    return "other";
  };

  // -----------------------------
  // Paragraph/FIG compaction
  // -----------------------------

  RejectionAnalyzer.prototype.compactParaTokens = function (tokens, opts) {
    opts = opts || {};
    if (!tokens || !tokens.length) return "";

    var set = new ns.ParagraphRefSet(this.u);
    for (var i = 0; i < tokens.length; i++) set.addToken(tokens[i]);

    if (!opts.groupOrder && !opts.rangeDirection && opts.desc == null) {
      opts.groupOrder = "asc";
      opts.rangeDirection = "desc";
    }
    return set.format(opts);
  };

  RejectionAnalyzer.prototype.buildParaLabel = function (refNo, tokens, opts) {
    opts = opts || { groupOrder: "asc", rangeDirection: "desc", multiline: true };
    var compacted = this.compactParaTokens(tokens, opts);
    if (!compacted) return "";
    if (!refNo) return compacted;
    return String(refNo) + ":" + compacted;
  };

  // -----------------------------
  // Claim helpers
  // -----------------------------

  RejectionAnalyzer.prototype.inferMaxClaim = function (allClaims, openClaims) {
    var max = 0;
    var i;
    if (allClaims) {
      for (i = 0; i < allClaims.length; i++) if (allClaims[i] > max) max = allClaims[i];
    }
    if (openClaims) {
      for (i = 0; i < openClaims.length; i++) if (openClaims[i] > max) max = openClaims[i];
    }
    return max || 0;
  };

  // -----------------------------
  // Main
  // -----------------------------

  RejectionAnalyzer.prototype.analyze = function (rawText) {
    var u = this.u;
    var p = this.p;

    var text = u.normalizeText(rawText || "");

    var refMap = p.extractCitedReferencesList(text);
    var blocks = p.parseReasonBlocks(text);

    // --- propagate article by (reasonNo + effectiveTitle) ---
    var articleByKey = {};
    for (var i = 0; i < blocks.length; i++) {
      var ti = p.getEffectiveTitle(blocks[i]);
      var k = String(blocks[i].no) + ":" + u.normReasonTitleKey(ti);
      if (blocks[i].no && blocks[i].article) articleByKey[k] = blocks[i].article;
    }
    for (var j = 0; j < blocks.length; j++) {
      var tj = p.getEffectiveTitle(blocks[j]);
      var k2 = String(blocks[j].no) + ":" + u.normReasonTitleKey(tj);
      if (!blocks[j].article && blocks[j].no && articleByKey[k2]) {
        blocks[j].article = articleByKey[k2];
      }
    }

    // --- sanitize: サポート等に 29条が紛れたら捨てる ---
    for (var s = 0; s < blocks.length; s++) {
      var tt = p.getEffectiveTitle(blocks[s]);
      if (this.isOtherReasonTitle(tt) && String(blocks[s].article || "").indexOf("特許法第29条") >= 0) {
        blocks[s].article = "";
      }
    }

    var rowsNovelty = [];
    var rowsOther = [];
    var assignedClaims = [];
    var allClaimsSeen = [];
    var _debugParaByRef = [];

    var explicitOpen = p.extractOpenClaims(text);

    // summary ブロックは同じ理由番号の非 summary ブロックがある場合のみスキップ
    var nonSummaryNos = {};
    for (var ns2 = 0; ns2 < blocks.length; ns2++) {
      if (blocks[ns2].style !== "summary") nonSummaryNos[blocks[ns2].no] = true;
    }

    for (var b = 0; b < blocks.length; b++) {
      var blk = blocks[b];
      var kind = this.classifyBlock(blk);

      if (blk.style === "summary" && nonSummaryNos[blk.no]) continue;

      var minis = p.extractMiniItemsFromBlock(blk.body);
      for (var mi = 0; mi < minis.length; mi++) {
        var claims = minis[mi].claims || [];
        var refs = minis[mi].refs || [];
        var note = minis[mi].noteText || "";

        allClaimsSeen = allClaimsSeen.concat(claims);
        assignedClaims = assignedClaims.concat(claims);

        if (kind === "novelty" || kind === "inventive") {
          var paraByRef = p.extractParagraphRefsByCitation(note);
          _debugParaByRef.push({ claims: claims, refs: refs, paraByRef: paraByRef });

          var refLabels = [];
          var paraLabels = [];

          if (refs.length) {
            for (var r = 0; r < refs.length; r++) {
              var n = refs[r];
              var label = refMap[n] ? (n + ":" + refMap[n]) : String(n);
              refLabels.push(label);

              var refsText = paraByRef[n] || [];
              if (!refsText.length && paraByRef[0]) refsText = paraByRef[0];
              if (refsText.length) paraLabels.push(this.buildParaLabel(n, refsText));
            }
          } else {
            if (paraByRef[0] && paraByRef[0].length) paraLabels.push(this.buildParaLabel(0, paraByRef[0]));
          }

          rowsNovelty.push([
            u.claimsToCompactRanges(claims),
            (kind === "novelty" ? "新規性" : "進歩性"),
            blk.article || "(unknown)",
            refLabels.join("\n"),
            paraLabels.join("\n")
          ]);
        } else {
          rowsOther.push([
            u.claimsToCompactRanges(claims),
            p.getEffectiveTitle(blk) || "(unknown)",
            blk.article || "(unknown)"
          ]);
        }
      }
    }

    assignedClaims = u.uniq(assignedClaims).sort(function (a, b) { return a - b; });
    allClaimsSeen = u.uniq(allClaimsSeen).sort(function (a, b) { return a - b; });

    var openClaims;
    if (explicitOpen !== null) {
      openClaims = explicitOpen;
    } else {
      var maxC = this.inferMaxClaim(allClaimsSeen, null);
      if (maxC > 0) {
        openClaims = [];
        for (var c = 1; c <= maxC; c++) {
          if (assignedClaims.indexOf(c) === -1) openClaims.push(c);
        }
      } else {
        openClaims = [];
      }
    }

    return {
      refMap: refMap,
      blocks: blocks,
      rowsNovelty: rowsNovelty,
      rowsOther: rowsOther,
      assignedClaims: assignedClaims,
      explicitOpen: explicitOpen,
      openClaims: openClaims,
      _debugParaByRef: _debugParaByRef
    };
  };

  ns.RejectionAnalyzer = RejectionAnalyzer;
})(window.ROA);
