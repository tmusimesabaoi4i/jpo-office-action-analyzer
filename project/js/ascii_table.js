// ascii_table.js
(function (ns) {
  "use strict";

  function AsciiTable(utils) {
    this.u = utils;
  }

  AsciiTable.prototype._colWidths = function (headers, rows) {
    var u = this.u;
    var w = headers.map(function (h) { return u.displayWidth(String(h)); });
    for (var i = 0; i < rows.length; i++) {
      for (var c = 0; c < rows[i].length && c < w.length; c++) {
        var s = String(rows[i][c] == null ? "" : rows[i][c]);
        var lines = s.split("\n");
        for (var l = 0; l < lines.length; l++) {
          var dw = u.displayWidth(lines[l]);
          if (dw > w[c]) w[c] = dw;
        }
      }
    }
    return w;
  };

  AsciiTable.prototype._line = function (w) {
    var parts = ["+"];
    for (var i = 0; i < w.length; i++) parts.push(new Array(w[i] + 3).join("-") + "+");
    return parts.join("");
  };

  AsciiTable.prototype._row = function (w, cells) {
    var parts = ["|"];
    for (var i = 0; i < w.length; i++) {
      var s = String((cells[i] == null ? "" : cells[i]));
      parts.push(" " + this.u.padRightDisplay(s, w[i]) + " |");
    }
    return parts.join("");
  };

  AsciiTable.prototype.render = function (headers, rows) {
    rows = rows || [];
    var w = this._colWidths(headers, rows);
    var out = [];
    out.push(this._line(w));
    out.push(this._row(w, headers));
    out.push(this._line(w));
    for (var i = 0; i < rows.length; i++) {
      var cellLines = [];
      var maxH = 1;
      for (var c = 0; c < w.length; c++) {
        var val = c < rows[i].length ? rows[i][c] : null;
        var s = String(val == null ? "" : val);
        var lines = s.split("\n");
        cellLines.push(lines);
        if (lines.length > maxH) maxH = lines.length;
      }
      for (var l = 0; l < maxH; l++) {
        var sub = [];
        for (var c2 = 0; c2 < w.length; c2++) {
          sub.push(cellLines[c2] && l < cellLines[c2].length ? cellLines[c2][l] : "");
        }
        out.push(this._row(w, sub));
      }
      out.push(this._line(w));
    }
    return out.join("\n");
  };

  ns.AsciiTable = AsciiTable;
})(window.ROA);
