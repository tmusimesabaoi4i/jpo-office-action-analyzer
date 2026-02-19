// io.js — UI output helpers: CSV, clipboard, print, toast
(function (ns, global) {
  "use strict";

  function IO(utils) {
    this.u = utils;
  }

  // -------------------------------------------------------
  // CSV generation (Excel-compatible)
  // -------------------------------------------------------

  IO.prototype._escCsv = function (val) {
    var s = String(val == null ? "" : val).replace(/\n/g, " ");
    if (s.indexOf('"') >= 0 || s.indexOf(",") >= 0 || s.indexOf("\r") >= 0) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  IO.prototype.csvFromRows = function (headers, rows) {
    var self = this;
    var lines = [];
    lines.push(headers.map(function (h) { return self._escCsv(h); }).join(","));
    for (var i = 0; i < rows.length; i++) {
      lines.push(rows[i].map(function (c) { return self._escCsv(c); }).join(","));
    }
    return lines.join("\r\n") + "\r\n";
  };

  // -------------------------------------------------------
  // Clipboard
  // -------------------------------------------------------

  IO.prototype.copyToClipboard = function (text, onDone) {
    onDone = onDone || function () {};
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(
        function () { onDone(true); },
        function () { IO._fallbackCopy(text, onDone); }
      );
    } else {
      IO._fallbackCopy(text, onDone);
    }
  };

  IO._fallbackCopy = function (text, onDone) {
    try {
      var ta = global.document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      global.document.body.appendChild(ta);
      ta.select();
      var ok = global.document.execCommand("copy");
      global.document.body.removeChild(ta);
      onDone(!!ok);
    } catch (e) {
      onDone(false);
    }
  };

  // -------------------------------------------------------
  // Toast
  // -------------------------------------------------------

  IO.prototype.showToast = function (msg, success) {
    var el = global.document.createElement("div");
    el.textContent = msg;
    el.className = "toast " + (success ? "toast-ok" : "toast-err");
    global.document.body.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }, 2000);
  };

  // -------------------------------------------------------
  // HTML table rendering (for print)
  // -------------------------------------------------------

  IO.prototype._escHtml = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  IO.prototype.renderHtmlTable = function (headers, rows) {
    var self = this;
    var h = "<table><thead><tr>";
    for (var i = 0; i < headers.length; i++) {
      h += "<th>" + self._escHtml(headers[i]) + "</th>";
    }
    h += "</tr></thead><tbody>";
    for (var r = 0; r < rows.length; r++) {
      h += "<tr>";
      for (var c = 0; c < headers.length; c++) {
        var val = c < rows[r].length ? rows[r][c] : "";
        h += "<td>" + self._escHtml(String(val == null ? "" : val).replace(/\n/g, " ")) + "</td>";
      }
      h += "</tr>";
    }
    h += "</tbody></table>";
    return h;
  };

  // -------------------------------------------------------
  // A4 print HTML
  // -------------------------------------------------------

  IO.prototype.toA4PrintHtml = function (sections, title) {
    var self = this;
    var body = "";
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      body += "<h2>" + self._escHtml(sec.title) + "</h2>";
      if (sec.headers && sec.rows) {
        body += self.renderHtmlTable(sec.headers, sec.rows);
      } else if (sec.text) {
        body += "<pre>" + self._escHtml(sec.text) + "</pre>";
      }
    }

    return "<!DOCTYPE html><html lang=\"ja\"><head><meta charset=\"utf-8\"/>" +
      "<title>" + self._escHtml(title || "拒絶理由通知 分析レポート") + "</title>" +
      "<style>" +
      "@page{size:A4;margin:10mm;}" +
      "body{font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,\"Hiragino Kaku Gothic ProN\",\"Meiryo\",sans-serif;" +
      "font-size:11px;color:#000;margin:0;padding:8mm;}" +
      "h2{font-size:14px;margin:16px 0 6px 0;border-bottom:1px solid #888;padding-bottom:4px;}" +
      "table{border-collapse:collapse;width:100%;margin-bottom:12px;}" +
      "th,td{border:1px solid #444;padding:4px 6px;text-align:left;vertical-align:top;font-size:11px;}" +
      "th{background:#e8e8e8;font-weight:bold;}" +
      "tr{break-inside:avoid;}" +
      "pre{white-space:pre-wrap;font-size:11px;}" +
      "</style></head><body>" + body + "</body></html>";
  };

  IO.prototype.openPrintWindow = function (html) {
    var w = global.open("", "_blank");
    if (!w) {
      this.showToast("ポップアップがブロックされました。許可してください。", false);
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 300);
  };

  ns.IO = IO;
})(window.ROA, window);
