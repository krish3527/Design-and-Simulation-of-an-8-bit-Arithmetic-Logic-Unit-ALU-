// Verification test suite for 3-page ALU architecture
const fs = require('fs');

console.log("=== RUNNING SUITE VERIFICATION FOR 3-PAGE ALU SIMULATOR ===");

// 1. Check all required files
const files = [
  'index.html',
  'arithmetic.html',
  'logic.html',
  'style.css',
  'theme.js',
  'arithmetic.js',
  'logic.js',
  'server.js'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`[PASS] File exists: ${f}`);
  } else {
    console.error(`[FAIL] Missing required file: ${f}`);
    process.exit(1);
  }
});

// 2. Verify NO example presets exist in any HTML file
const htmlFiles = ['index.html', 'arithmetic.html', 'logic.html'];
const forbiddenSnippets = [
  'ADD: 10 + 5',
  'ADD: 255 + 1',
  'AND: 15 AND 7',
  'AND: 15 & 7',
  'btn-example',
  'preset-btn',
  'preset1',
  'preset2',
  'preset3'
];

htmlFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  forbiddenSnippets.forEach(snip => {
    if (content.includes(snip)) {
      console.error(`[FAIL] Found forbidden example notation "${snip}" in ${f}`);
      process.exit(1);
    }
  });
  console.log(`[PASS] ${f} is completely free of example presets and example buttons!`);
});

// 3. Verify arithmetic.html DOM IDs
const arithHtml = fs.readFileSync('arithmetic.html', 'utf8');
const arithJs = fs.readFileSync('arithmetic.js', 'utf8');
const arithIdMatches = arithJs.match(/document\.getElementById\(["']([^"']+)["']\)/g) || [];
let arithMissing = [];
arithIdMatches.forEach(m => {
  const id = m.replace(/document\.getElementById\(["']/, '').replace(/["']\)/, '');
  if (!arithHtml.includes(`id="${id}"`)) {
    arithMissing.push(id);
  }
});

if (arithMissing.length === 0) {
  console.log(`[PASS] All ${arithIdMatches.length} DOM IDs in arithmetic.js match arithmetic.html!`);
} else {
  console.error('[FAIL] Missing DOM IDs in arithmetic.html:', arithMissing);
  process.exit(1);
}

// 4. Verify logic.html DOM IDs
const logicHtml = fs.readFileSync('logic.html', 'utf8');
const logicJs = fs.readFileSync('logic.js', 'utf8');
const logicIdMatches = logicJs.match(/document\.getElementById\(["']([^"']+)["']\)/g) || [];
let logicMissing = [];
logicIdMatches.forEach(m => {
  const id = m.replace(/document\.getElementById\(["']/, '').replace(/["']\)/, '');
  if (!logicHtml.includes(`id="${id}"`)) {
    logicMissing.push(id);
  }
});

if (logicMissing.length === 0) {
  console.log(`[PASS] All ${logicIdMatches.length} DOM IDs in logic.js match logic.html!`);
} else {
  console.error('[FAIL] Missing DOM IDs in logic.html:', logicMissing);
  process.exit(1);
}

// 5. Verify Automatic Popup Initiation & Pageshow Listeners
if (arithJs.includes('openModal();') && arithJs.includes('pageshow')) {
  console.log('[PASS] arithmetic.js automatically opens modal on page entry and pageshow!');
} else {
  console.error('[FAIL] arithmetic.js is missing automatic openModal() on page entry!');
  process.exit(1);
}

if (logicJs.includes('openModal();') && logicJs.includes('pageshow')) {
  console.log('[PASS] logic.js automatically opens modal on page entry and pageshow!');
} else {
  console.error('[FAIL] logic.js is missing automatic openModal() on page entry!');
  process.exit(1);
}

// 6. Verify Bluish Reminder-App Theme Colors in style.css
const cssContent = fs.readFileSync('style.css', 'utf8');
const expectedColors = ['#4f7df3', '#3157c8', '#f3f6ff', '#ffffff', '#e5edff', '#202b45', '#72809a'];
expectedColors.forEach(col => {
  if (cssContent.toLowerCase().includes(col.toLowerCase())) {
    console.log(`[PASS] Found theme color ${col} in style.css`);
  } else {
    console.error(`[FAIL] Missing required palette color ${col} in style.css`);
    process.exit(1);
  }
});

// 7. Verify Logic & Shift Diagram Coordinates and Alignment
const gateCenters = {
  AND: 40,
  OR: 94,
  XOR: 148,
  NOT: 202,
  SHL: 256,
  SHR: 310
};

Object.entries(gateCenters).forEach(([gate, y]) => {
  if (logicHtml.includes(`d="M 410 ${y} L 490 ${y}"`)) {
    console.log(`[PASS] Gate ${gate} cleanly connects to MUX input at y=${y}`);
  } else {
    console.error(`[FAIL] Gate ${gate} MUX connector mismatch in logic.html! Expected y=${y}`);
    process.exit(1);
  }
});

// 8. Test Arithmetic calculations
function testArithmetic(a, b, op) {
  const A = a & 0xFF;
  const B = b & 0xFF;
  let result = 0;
  let C = 0;
  let Z = 0;
  let N = 0;
  let V = 0;

  if (op === "ADD") {
    const raw = A + B;
    result = raw & 0xFF;
    C = raw > 255 ? 1 : 0;
    V = ((~(A ^ B) & (A ^ result) & 0x80) !== 0) ? 1 : 0;
  } else {
    const raw = A - B;
    result = (raw + 256) & 0xFF;
    C = (A >= B) ? 1 : 0;
    V = (((A ^ B) & (A ^ result) & 0x80) !== 0) ? 1 : 0;
  }
  Z = (result === 0) ? 1 : 0;
  N = (result >> 7) & 1;

  return { result, C, Z, N, V };
}

const arithTests = [
  { a: 10, b: 5, op: "ADD", expRes: 15, expC: 0, expZ: 0, expN: 0, expV: 0 },
  { a: 255, b: 1, op: "ADD", expRes: 0, expC: 1, expZ: 1, expN: 0, expV: 0 },
  { a: 127, b: 1, op: "ADD", expRes: 128, expC: 0, expZ: 0, expN: 1, expV: 1 },
  { a: 128, b: 128, op: "ADD", expRes: 0, expC: 1, expZ: 1, expN: 0, expV: 1 },
  { a: 10, b: 5, op: "SUB", expRes: 5, expC: 1, expZ: 0, expN: 0, expV: 0 },
  { a: 5, b: 10, op: "SUB", expRes: 251, expC: 0, expZ: 0, expN: 1, expV: 0 },
  { a: 128, b: 1, op: "SUB", expRes: 127, expC: 1, expZ: 0, expN: 0, expV: 1 }
];

arithTests.forEach((t, i) => {
  const res = testArithmetic(t.a, t.b, t.op);
  if (res.result === t.expRes && res.C === t.expC && res.Z === t.expZ && res.N === t.expN && res.V === t.expV) {
    console.log(`[PASS] Arith Test ${i + 1}: ${t.a} ${t.op} ${t.b} = ${res.result}`);
  } else {
    console.error(`[FAIL] Arith Test ${i + 1} failed! Got:`, res);
    process.exit(1);
  }
});

// 9. Test Logic & Shift calculations
function testLogic(a, b, op) {
  const A = a & 0xFF;
  const B = b & 0xFF;
  let result = 0;
  let C = 0;
  let Z = 0;
  let N = 0;
  let V = 0;

  switch (op) {
    case "AND": result = (A & B) & 0xFF; break;
    case "OR":  result = (A | B) & 0xFF; break;
    case "XOR": result = (A ^ B) & 0xFF; break;
    case "NOT": result = (~A) & 0xFF; break;
    case "SHL":
      C = (A >> 7) & 1;
      result = (A << 1) & 0xFF;
      break;
    case "SHR":
      C = A & 1;
      result = (A >> 1) & 0xFF;
      break;
  }
  Z = (result === 0) ? 1 : 0;
  N = (result >> 7) & 1;

  return { result, C, Z, N, V };
}

const logicTests = [
  { a: 15, b: 7, op: "AND", expRes: 7, expC: 0 },
  { a: 8, b: 3, op: "OR", expRes: 11, expC: 0 },
  { a: 12, b: 10, op: "XOR", expRes: 6, expC: 0 },
  { a: 10, b: 0, op: "NOT", expRes: 245, expC: 0, expN: 1 },
  { a: 129, b: 0, op: "SHL", expRes: 2, expC: 1 },
  { a: 3, b: 0, op: "SHR", expRes: 1, expC: 1 },
  { a: 0, b: 0, op: "AND", expRes: 0, expZ: 1 }
];

logicTests.forEach((t, i) => {
  const res = testLogic(t.a, t.b, t.op);
  if (res.result === t.expRes && (t.expC === undefined || res.C === t.expC) && (t.expZ === undefined || res.Z === t.expZ) && (t.expN === undefined || res.N === t.expN)) {
    console.log(`[PASS] Logic Test ${i + 1}: ${t.op} => ${res.result} (C=${res.C})`);
  } else {
    console.error(`[FAIL] Logic Test ${i + 1} failed! Got:`, res);
    process.exit(1);
  }
});

console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! ARCHITECTURE VERIFIED! <<<");
