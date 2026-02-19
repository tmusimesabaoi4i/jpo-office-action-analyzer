// app.js
(function (ns, global) {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function AppController() {
    this.elIn = $("input");
    this.elNovelty = $("outNovelty");
    this.elOther = $("outOther");
    this.elOpen = $("outOpen");
    this.elDbg = $("outDebug");
    this.elDbgBox = $("debugBox");

    this.btnAnalyze = $("btnAnalyze");
    this.btnClear = $("btnClear");
    this.optDebug = $("optDebug");

    this.btnCopyNovelty = $("btnCopyNovelty");
    this.btnCopyOther = $("btnCopyOther");
    this.btnCopyOpen = $("btnCopyOpen");

    this.u = new ns.Utils();
    this.table = new ns.AsciiTable(this.u);
    this.parser = new ns.RejectionParser(this.u);
    this.analyzer = new ns.RejectionAnalyzer(this.u, this.parser);
    this.io = new ns.IO(this.u);

    this.lastResult = null;

    ns._debugGetTitle = this.parser.getEffectiveTitle.bind(this.parser);

    this._bind();
  }

  AppController.prototype._bind = function () {
    var self = this;

    this.btnAnalyze.addEventListener("click", function () { self.analyze(); });
    this.btnClear.addEventListener("click", function () { self.clear(); });

    this.optDebug.addEventListener("change", function () {
      self.elDbgBox.style.display = self.optDebug.checked ? "block" : "none";
    });

    this.elIn.addEventListener("keydown", function (e) {
      var isMac = /Mac|iPhone|iPad|iPod/.test(global.navigator.platform);
      var cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && e.keyCode === 13) self.analyze();
    });

    document.addEventListener("keydown", function (e) {
      var isMac = /Mac|iPhone|iPad|iPod/.test(global.navigator.platform);
      var cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && e.shiftKey && e.keyCode === 80) {
        e.preventDefault();
        self.printReport();
      }
    });

    if (this.btnCopyNovelty) this.btnCopyNovelty.addEventListener("click", function () { self.copyNovelty(); });
    if (this.btnCopyOther) this.btnCopyOther.addEventListener("click", function () { self.copyOther(); });
    if (this.btnCopyOpen) this.btnCopyOpen.addEventListener("click", function () { self.copyOpen(); });
  };

  AppController.prototype.clear = function () {
    this.elIn.value = "";
    this.elNovelty.textContent = "";
    this.elOther.textContent = "";
    this.elOpen.textContent = "";
    this.elDbg.textContent = "";
    this.elDbgBox.style.display = "none";
    this.optDebug.checked = false;
    this.lastResult = null;
  };

  AppController.prototype.analyze = function () {
    var raw = this.elIn.value || "";
    var result = this.analyzer.analyze(raw);
    this.lastResult = result;

    this.elNovelty.textContent = this.table.render(
      ["Claim(s)", "Type", "Article", "References", "Paragraphs/FIG"],
      result.rowsNovelty
    );

    this.elOther.textContent = this.table.render(
      ["Claim(s)", "Reason", "Article"],
      result.rowsOther
    );

    var openText = "";
    if (result.explicitOpen !== null) openText += "Source: ＜拒絶の理由を発見しない請求項＞ section\n";
    else openText += "Source: inferred (claims not mentioned in any reason)\n";

    var noneLabel = result.explicitOpen !== null ? "(none)" : "(none or unknown)";
    openText += "Open claims: " + (result.openClaims && result.openClaims.length ? this.u.claimsToCompactRanges(result.openClaims) : noneLabel) + "\n\n";
    openText += "Assigned claims: " + (result.assignedClaims && result.assignedClaims.length ? this.u.claimsToCompactRanges(result.assignedClaims) : "(none)") + "\n";
    this.elOpen.textContent = openText;

    if (this.optDebug.checked) {
      this.elDbgBox.style.display = "block";
      this.elDbg.textContent =
        "refMap:\n" + JSON.stringify(result.refMap, null, 2) + "\n\n" +
        "blocks:\n" + JSON.stringify(result.blocks.map(function (x) {
          return {
            no: x.no,
            style: x.style,
            headerLine: x.headerLine,
            reasonTitle: x.reasonTitle,
            effectiveTitle: window.ROA && window.ROA._debugGetTitle ? window.ROA._debugGetTitle(x) : undefined,
            article: x.article,
            bodyPreview: (x.body || "").slice(0, 240) + "..."
          };
        }), null, 2) + "\n\n" +
        "rowsNovelty:\n" + JSON.stringify(result.rowsNovelty, null, 2) + "\n\n" +
        "rowsOther:\n" + JSON.stringify(result.rowsOther, null, 2) + "\n\n" +
        "debugParaByRef:\n" + JSON.stringify(result._debugParaByRef, null, 2);
    } else {
      this.elDbgBox.style.display = "none";
      this.elDbg.textContent = "";
    }
  };

  // -------------------------------------------------------
  // Print (Ctrl/Cmd + Shift + P)
  // -------------------------------------------------------

  AppController.prototype.printReport = function () {
    if (!this.lastResult) {
      this.io.showToast("先に解析を実行してください", false);
      return;
    }
    var r = this.lastResult;
    var sections = [];

    if (r.rowsNovelty.length) {
      sections.push({
        title: "新規性・進歩性（29条）",
        headers: ["Claim(s)", "Type", "Article", "References", "Paragraphs/FIG"],
        rows: r.rowsNovelty
      });
    }
    if (r.rowsOther.length) {
      sections.push({
        title: "その他理由（36条など）",
        headers: ["Claim(s)", "Reason", "Article"],
        rows: r.rowsOther
      });
    }

    var openStr = r.openClaims && r.openClaims.length
      ? this.u.claimsToCompactRanges(r.openClaims)
      : (r.explicitOpen !== null ? "(none)" : "(none or unknown)");
    var assignedStr = r.assignedClaims && r.assignedClaims.length
      ? this.u.claimsToCompactRanges(r.assignedClaims) : "(none)";
    sections.push({
      title: "空いている請求項",
      text: "Open claims: " + openStr + "\nAssigned claims: " + assignedStr
    });

    var html = this.io.toA4PrintHtml(sections);
    this.io.openPrintWindow(html);
  };

  // -------------------------------------------------------
  // CSV copy
  // -------------------------------------------------------

  AppController.prototype.copyNovelty = function () {
    if (!this.lastResult || !this.lastResult.rowsNovelty.length) {
      this.io.showToast("データがありません", false);
      return;
    }
    var csv = this.io.csvFromRows(
      ["Claim(s)", "Type", "Article", "References", "Paragraphs/FIG"],
      this.lastResult.rowsNovelty
    );
    var io = this.io;
    io.copyToClipboard(csv, function (ok) {
      io.showToast(ok ? "29条データをコピーしました" : "コピーに失敗しました", ok);
    });
  };

  AppController.prototype.copyOther = function () {
    if (!this.lastResult || !this.lastResult.rowsOther.length) {
      this.io.showToast("データがありません", false);
      return;
    }
    var csv = this.io.csvFromRows(
      ["Claim(s)", "Reason", "Article"],
      this.lastResult.rowsOther
    );
    var io = this.io;
    io.copyToClipboard(csv, function (ok) {
      io.showToast(ok ? "その他理由をコピーしました" : "コピーに失敗しました", ok);
    });
  };

  AppController.prototype.copyOpen = function () {
    if (!this.lastResult) {
      this.io.showToast("データがありません", false);
      return;
    }
    var r = this.lastResult;
    var openStr = r.openClaims && r.openClaims.length ? this.u.claimsToCompactRanges(r.openClaims) : "";
    var assignedStr = r.assignedClaims && r.assignedClaims.length ? this.u.claimsToCompactRanges(r.assignedClaims) : "";
    var csv = this.io.csvFromRows(
      ["Open Claims", "Assigned Claims"],
      [[openStr, assignedStr]]
    );
    var io = this.io;
    io.copyToClipboard(csv, function (ok) {
      io.showToast(ok ? "空き請求項をコピーしました" : "コピーに失敗しました", ok);
    });
  };

  global.addEventListener("DOMContentLoaded", function () {
    new AppController();
  });

})(window.ROA, window);
