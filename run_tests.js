// Standalone test runner using Node.js
const fs = require('fs');
const vm = require('vm');

// Mock window object
const window = { ROA: {} };
const document = {
  getElementById: () => ({ innerHTML: '', addEventListener: function(){} }),
  addEventListener: function(){},
  createElement: function() { return { style: {}, value: '', select: function(){} }; },
  execCommand: function() { return true; },
  body: { appendChild: function(){}, removeChild: function(){} }
};

// Load all source files in order
const files = [
  './project/js/namespace.js',
  './project/js/utils.js',
  './project/js/paragraph_ref_set.js',
  './project/js/rejection_parser.js',
  './project/js/rejection_analyzer.js',
  './project/js/ascii_table.js',
  './project/js/io.js'
];

for (const file of files) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    const script = new vm.Script(code);
    const context = vm.createContext({ window, document, setTimeout: function(){}, navigator: { platform: 'Win32', clipboard: null } });
    script.runInContext(context);
  } catch (e) {
    console.log(`Skipping ${file}: ${e.message}`);
  }
}

// Test framework
let log = '';
let passed = 0, failed = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    log += 'PASS ' + label + '\n';
    passed++;
  } else {
    log += 'FAIL ' + label + '\n';
    log += '  expected: ' + JSON.stringify(expected) + '\n';
    log += '  actual:   ' + JSON.stringify(actual) + '\n';
    failed++;
  }
}

function assertDeep(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    log += 'PASS ' + label + '\n';
    passed++;
  } else {
    log += 'FAIL ' + label + '\n';
    log += '  expected: ' + e + '\n';
    log += '  actual:   ' + a + '\n';
    failed++;
  }
}

// Initialize objects
const u = new window.ROA.Utils();
const parser = new window.ROA.RejectionParser(u);
const table = new window.ROA.AsciiTable(u);

// ============================================================
// Modification 1: ParagraphRefSet descending + re-compression
// ============================================================
log += '\n=== Mod 1: ParagraphRefSet (legacy desc mode) ===\n';

(function() {
  // Test 1: [0079] [0058]-[0061] FIG:[図1]
  const s1 = new window.ROA.ParagraphRefSet(u);
  s1.addToken('[0079]');
  s1.addToken('[0058]-[0061]');
  s1.addToken('FIG:[図1]');
  assert('Test1 desc', s1.format({desc:true}), '[0079] [0061]-[0058] FIG:[図1]');

  // Test 2: [0058]-[0061] [0060] [0061] → [0061]-[0058]
  const s2 = new window.ROA.ParagraphRefSet(u);
  s2.addToken('[0058]-[0061]');
  s2.addToken('[0060]');
  s2.addToken('[0061]');
  assert('Test2 dedup+compress', s2.format({desc:true}), '[0061]-[0058]');

  // Test 3: [0001]-[0003] [0005] → [0005] [0003]-[0001]
  const s3 = new window.ROA.ParagraphRefSet(u);
  s3.addToken('[0001]-[0003]');
  s3.addToken('[0005]');
  assert('Test3 gap', s3.format({desc:true}), '[0005] [0003]-[0001]');

  // Test multiline
  const s4 = new window.ROA.ParagraphRefSet(u);
  s4.addToken('[0079]');
  s4.addToken('[0058]-[0061]');
  s4.addToken('FIG:[図1]');
  assert('Test4 multiline', s4.format({desc:true, multiline:true}), '[0079] [0061]-[0058]\nFIG:[図1]');

  // Test ascending
  const s5 = new window.ROA.ParagraphRefSet(u);
  s5.addToken('[0001]-[0003]');
  s5.addToken('[0005]');
  assert('Test5 asc', s5.format({desc:false}), '[0001]-[0003] [0005]');
})();

// ============================================================
// Mod 1b: ParagraphRefSet NEW grouped mode
// ============================================================
log += '\n=== Mod 1b: ParagraphRefSet (new groupOrder/rangeDirection mode) ===\n';

(function() {
  // Primary acceptance test: [0011] [0020]-[0017] [0023] [0027]
  var s1 = new window.ROA.ParagraphRefSet(u);
  [11,17,18,19,20,23,27].forEach(function(n) { s1.addToken('[' + u.pad4(n) + ']'); });
  assert('NewMode primary', s1.format({groupOrder:"asc", rangeDirection:"desc"}),
    '[0011] [0020]-[0017] [0023] [0027]');

  // Range with groupOrder asc + rangeDirection desc
  var s2 = new window.ROA.ParagraphRefSet(u);
  s2.addToken('[0001]-[0003]');
  s2.addToken('[0005]');
  assert('NewMode asc+desc range', s2.format({groupOrder:"asc", rangeDirection:"desc"}),
    '[0003]-[0001] [0005]');

  // Range with groupOrder asc + rangeDirection asc
  var s3 = new window.ROA.ParagraphRefSet(u);
  s3.addToken('[0001]-[0003]');
  s3.addToken('[0005]');
  assert('NewMode asc+asc range', s3.format({groupOrder:"asc", rangeDirection:"asc"}),
    '[0001]-[0003] [0005]');

  // Range with groupOrder desc + rangeDirection desc
  var s4 = new window.ROA.ParagraphRefSet(u);
  s4.addToken('[0001]-[0003]');
  s4.addToken('[0005]');
  assert('NewMode desc+desc range', s4.format({groupOrder:"desc", rangeDirection:"desc"}),
    '[0005] [0003]-[0001]');

  // With FIG and multiline
  var s5 = new window.ROA.ParagraphRefSet(u);
  s5.addToken('[0058]-[0061]');
  s5.addToken('[0079]');
  s5.addToken('FIG:[図1]');
  assert('NewMode multiline asc+desc', s5.format({groupOrder:"asc", rangeDirection:"desc", multiline:true}),
    '[0061]-[0058] [0079]\nFIG:[図1]');

  // Without multiline, FIG on same line
  var s6 = new window.ROA.ParagraphRefSet(u);
  s6.addToken('[0058]-[0061]');
  s6.addToken('[0079]');
  s6.addToken('FIG:[図1]');
  assert('NewMode flat asc+desc', s6.format({groupOrder:"asc", rangeDirection:"desc", multiline:false}),
    '[0061]-[0058] [0079] FIG:[図1]');

  // Dedup: overlapping ranges merge
  var s7 = new window.ROA.ParagraphRefSet(u);
  s7.addToken('[0017]-[0020]');
  s7.addToken('[0019]');
  s7.addToken('[0020]');
  assert('NewMode dedup', s7.format({groupOrder:"asc", rangeDirection:"desc"}),
    '[0020]-[0017]');
})();

// ============================================================
// Modification 2: ASCII Table
// ============================================================
log += '\n=== Mod 2: ASCII Table ===\n';

(function() {
  // displayWidth
  assert('displayWidth ASCII', u.displayWidth('abc'), 3);
  assert('displayWidth CJK', u.displayWidth('進歩性'), 6);
  assert('displayWidth mixed', u.displayWidth('ab進歩'), 6);
  assert('displayWidth FW paren', u.displayWidth('（）'), 4);

  // padRightDisplay
  assert('padRightDisplay ASCII', u.padRightDisplay('abc', 6), 'abc   ');
  assert('padRightDisplay CJK', u.padRightDisplay('進歩', 6), '進歩  ');

  // Simple table
  const t1 = table.render(['A', 'B'], [['x', 'y']]);
  log += 'Simple table:\n' + t1 + '\n';

  // CJK table
  const t2 = table.render(
    ['Claim(s)', 'Type', 'Article'],
    [['1-3', '進歩性', '特許法第29条第2項']]
  );
  log += 'CJK table:\n' + t2 + '\n';

  // Multiline cell
  const t3 = table.render(
    ['Claim(s)', 'Paragraphs/FIG'],
    [['1-3', '[0079] [0061]-[0058]\nFIG:[図1]']]
  );
  log += 'Multiline table:\n' + t3 + '\n';
})();

// ============================================================
// Modification 3: extractOpenClaims
// ============================================================
log += '\n=== Mod 3: extractOpenClaims ===\n';

(function() {
  // Fullwidth brackets with Japanese comma
  const text1 = '＜拒絶の理由を発見しない請求項＞\n請求項（１－１０、１２－１４）に係る発明については、拒絶の理由を発見しない。';
  const r1 = parser.extractOpenClaims(text1);
  assertDeep('OpenClaims fullwidth parens', r1, [1,2,3,4,5,6,7,8,9,10,12,13,14]);

  // Half-width brackets
  const text2 = '拒絶の理由を発見しない請求項\n請求項(1-10,12-14)に係る発明';
  const r2 = parser.extractOpenClaims(text2);
  assertDeep('OpenClaims halfwidth parens', r2, [1,2,3,4,5,6,7,8,9,10,12,13,14]);

  // No brackets (existing behavior)
  const text3 = '拒絶の理由を発見しない請求項\n請求項 1-3,5\n';
  const r3 = parser.extractOpenClaims(text3);
  assertDeep('OpenClaims no parens', r3, [1,2,3,5]);

  // No section → null
  const text4 = '何もない文章';
  const r4 = parser.extractOpenClaims(text4);
  assert('OpenClaims absent', r4, null);
})();

// ============================================================
// Mod 4: extractParagraphRefsByCitation attribution
// ============================================================
log += '\n=== Mod 4: Citation-specific paragraph attribution ===\n';

(function() {
  // Case 1: 引用文献1 has parens with tokens, 引用文献2/3 have none
  var note1 = '引用文献1（段落[0021]、図8）には、信号の強さを視覚化して矢印で表わす場合、' +
    '障害のない理想的な空間において理論的に算出される受信電力と比べて、' +
    '減衰率が小さい場合には実線の矢印で表わし、減衰率が大きい場合には破線の矢印で表わす。\n' +
    'したがって、引用文献1に記載された発明に引用文献2及び引用文献3に記載された発明を適用し、' +
    '本願の請求項6に係る発明の構成に至ることは、当業者が容易に想到し得ることである。';
  var r1 = parser.extractParagraphRefsByCitation(note1);
  var r1k = Object.keys(r1).sort().join(',');
  assert('Cite-attr keys', r1k, '1,2,3');

  var has1 = r1[1] && r1[1].length > 0;
  assert('Cite-attr ref1 has tokens', has1, true);

  var has2 = !r1[2] || r1[2].length === 0;
  assert('Cite-attr ref2 empty', has2, true);

  var has3 = !r1[3] || r1[3].length === 0;
  assert('Cite-attr ref3 empty', has3, true);

  var ref1HasPara = r1[1] && r1[1].some(function(t) { return t.indexOf('[0021]') >= 0; });
  assert('Cite-attr ref1 has [0021]', !!ref1HasPara, true);

  var ref1HasFig = r1[1] && r1[1].some(function(t) { return t.indexOf('FIG:') >= 0 && t.indexOf('図8') >= 0; });
  assert('Cite-attr ref1 has FIG:[図8]', !!ref1HasFig, true);

  // Case 2: separate citations with own paragraphs
  var note2 = '引用文献1の段落[0058]-[0061]及び[0079]、図1を参照。引用文献2の段落[0010]を参照。';
  var r2 = parser.extractParagraphRefsByCitation(note2);
  var r2_1para = r2[1] && r2[1].some(function(t) { return t.indexOf('[0079]') >= 0; });
  assert('Cite-attr2 ref1 has [0079]', !!r2_1para, true);
  var r2_1fig = r2[1] && r2[1].some(function(t) { return t.indexOf('FIG:') >= 0; });
  assert('Cite-attr2 ref1 has FIG', !!r2_1fig, true);
  var r2_2para = r2[2] && r2[2].some(function(t) { return t.indexOf('[0010]') >= 0; });
  assert('Cite-attr2 ref2 has [0010]', !!r2_2para, true);
  var r2_2fig = r2[2] && r2[2].some(function(t) { return t.indexOf('FIG:') >= 0; });
  assert('Cite-attr2 ref2 no FIG', !r2_2fig, true);

  // Case 3: no citation references → all tokens go to key 0
  var note3 = '段落[0050]及び図3を参照。';
  var r3 = parser.extractParagraphRefsByCitation(note3);
  assert('Cite-attr3 key 0 exists', !!(r3[0] && r3[0].length > 0), true);
})();

// ============================================================
// Mod 4b: Citation duplication prevention (refs=1-3 edge case)
// ============================================================
log += '\n=== Mod 4b: Citation duplication prevention ===\n';

(function() {
  var note = '引用文献1の段落[0021]。引用文献2及び引用文献3。';
  var r = parser.extractParagraphRefsByCitation(note);
  var has1 = r[1] && r[1].length > 0;
  assert('Cite-dup ref1 has tokens', has1, true);
  var has2 = !r[2] || r[2].length === 0;
  assert('Cite-dup ref2 empty', has2, true);
  var has3 = !r[3] || r[3].length === 0;
  assert('Cite-dup ref3 empty', has3, true);
})();

// ============================================================
// Mod 5: Analyzer join separator (no "FIG: / N:" on same line)
// ============================================================
log += '\n=== Mod 5: Analyzer join separator ===\n';

(function() {
  var analyzer = new window.ROA.RejectionAnalyzer(u, parser);
  var testInput =
    '＜引用文献等一覧＞\n' +
    '１．特開2004-064133号公報\n' +
    '２．特開2019-103077号公報\n' +
    '３．特開2015-167284号公報\n\n' +
    '●理由1（進歩性）について\n' +
    '特許法第29条第2項の規定により特許を受けることができない。\n\n' +
    '・請求項 ６\n' +
    '・引用文献等 １－３\n' +
    '・備考\n' +
    '　引用文献１（段落［００２１］、図８）には、信号の強さを視覚化して矢印で\n' +
    '表わす場合、障害のない理想的な空間において理論的に算出される受信電力（信\n' +
    '号の強さ）と比べて、減衰率が小さい（所定の範囲内）の場合には実線の矢印で\n' +
    '表わし、減衰率が大きい場合には破線の矢印で表わすものとすることと、実線と\n' +
    '破線の２種類の矢印で表わしているが、より細分化して多種の矢印等を用いて表\n' +
    'わしても良いことが記載されている。\n\n' +
    '　したがって、引用文献１に記載された発明に引用文献２及び引用文献３に記載\n' +
    'された発明を適用し、本願の請求項６に係る発明の構成に至ることは、当業者が\n' +
    '容易に想到し得ることである。\n';

  var result = analyzer.analyze(testInput);

  // rowsNovelty[0] should be the claim 6 row
  var row = result.rowsNovelty[0];
  assert('Pipeline claim6 claims', row[0], '6');
  assert('Pipeline claim6 kind', row[1], '進歩性');

  // Paragraphs/FIG column (index 4): should NOT contain "FIG:[...] / N:" pattern
  var paraCol = row[4];
  var hasBadJoin = /FIG:\[.*\]\s*\/\s*\d+:/.test(paraCol);
  assert('Pipeline claim6 no FIG-/-N: pattern', hasBadJoin, false);

  // Only ref 1 should have paragraph/FIG attribution
  var hasRef1Label = paraCol.indexOf('1:') >= 0;
  assert('Pipeline claim6 has ref1 label', hasRef1Label, true);
  var hasRef2Label = /\b2:/.test(paraCol);
  assert('Pipeline claim6 no ref2 label in paras', hasRef2Label, false);
  var hasRef3Label = /\b3:/.test(paraCol);
  assert('Pipeline claim6 no ref3 label in paras', hasRef3Label, false);

  // References column (index 3): should use newline, not " / "
  var refCol = row[3];
  var refHasSlash = refCol.indexOf(' / ') >= 0;
  assert('Pipeline claim6 refs no slash-join', refHasSlash, false);

  // Debug: _debugParaByRef should be populated
  assert('Pipeline has _debugParaByRef', Array.isArray(result._debugParaByRef), true);
  assert('Pipeline _debugParaByRef length', result._debugParaByRef.length > 0, true);
})();

// ============================================================
// Mod 6: IO CSV generation
// ============================================================
log += '\n=== Mod 6: IO CSV ===\n';

(function() {
  var io = new window.ROA.IO(u);

  // Basic CSV
  var csv1 = io.csvFromRows(["A","B"], [["hello","world"]]);
  assert('CSV basic', csv1, 'A,B\r\nhello,world\r\n');

  // Escaping: comma and double-quote
  var csv2 = io.csvFromRows(["X"], [["foo,bar"], ['baz"qux']]);
  assert('CSV escape comma', csv2, 'X\r\n"foo,bar"\r\n"baz""qux"\r\n');

  // Newline in cell → flattened to space
  var csv3 = io.csvFromRows(["Col"], [["line1\nline2"]]);
  assert('CSV newline flatten', csv3, 'Col\r\nline1 line2\r\n');

  // Empty rows
  var csv4 = io.csvFromRows(["H"], []);
  assert('CSV empty rows', csv4, 'H\r\n');
})();

// ============================================================
// Utils: claimsToCompactRanges + uniq
// ============================================================
log += '\n=== Utils ===\n';

(function() {
  assertDeep('uniq', u.uniq([1,2,2,3,1]), [1,2,3]);
  assert('claimsToCompactRanges', u.claimsToCompactRanges([1,2,3,5,7,8,9]), '1-3,5,7-9');
})();

// ============================================================
// Summary
// ============================================================
log += '\n=== Summary ===\n';
log += 'Passed: ' + passed + ', Failed: ' + failed + '\n';

console.log(log);
process.exitCode = (failed > 0) ? 1 : 0;
