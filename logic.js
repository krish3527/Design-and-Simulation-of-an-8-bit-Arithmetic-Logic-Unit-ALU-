/**
 * ============================================================================
 * 8-BIT LOGIC & SHIFT UNIT CONTROLLER (logic.js)
 * Features:
 * - Automatically opens input popup on every page entry
 * - Modern Bluish Reminder / Productivity App Theme
 * - Modal Popup for Register Inputs (A, B) & Operation Selection (AND, OR, XOR, NOT, SHL, SHR)
 * - Automatic Register B Dim/Ignore for Single-Operand Operations (NOT, SHL, SHR)
 * - Automatic 6-Stage Execution Sequence upon "Confirm & Execute"
 * - Accurate 8-bit Logic & Shift Computation & CCR Flags (C, Z, N, V)
 * - Mathematically aligned SVG signal flow arrows & ports
 * - Bit-by-bit dynamic computation matrix breakdown table
 * - Slower, Readable Signal Pulse Flow (2.0s pulse, 1.5s per stage in Run All)
 * - Pause / Resume and Manual Step Forward Controls
 * ============================================================================
 */

"use strict";

(function () {
  // Machine State
  const state = {
    regA: 0,
    regB: 0,
    hasUserEntered: false,
    operation: "AND",    // "AND", "OR", "XOR", "NOT", "SHL", "SHR"
    currentStage: 1,     // 1 to 6
    intermediateResult: 0,
    committedResult: 0,
    flags: { C: 0, Z: 1, N: 0, V: 0 },
    shiftedOut: null,

    // Modal Staging State
    modalA: null,
    modalB: null,
    modalOp: "AND",

    // Sequencer controls
    isRunning: false,
    isPaused: false,
    timerId: null,
    stepIntervalMs: 1500 // 1.5s per stage
  };

  const OPS_DATA = {
    AND: { code: "010", name: "AND — Bitwise AND",     isSingle: false, desc: "A & B",           gateId: "gateBlockAND" },
    OR:  { code: "011", name: "OR — Bitwise OR",       isSingle: false, desc: "A | B",           gateId: "gateBlockOR" },
    XOR: { code: "100", name: "XOR — Bitwise XOR",     isSingle: false, desc: "A ^ B",           gateId: "gateBlockXOR" },
    NOT: { code: "101", name: "NOT — Bitwise Invert",  isSingle: true,  desc: "(~A) & 255",      gateId: "gateBlockNOT" },
    SHL: { code: "110", name: "SHIFT LEFT",            isSingle: true,  desc: "(A << 1) & 255",  gateId: "gateBlockSHL" },
    SHR: { code: "111", name: "SHIFT RIGHT",           isSingle: true,  desc: "A >> 1",          gateId: "gateBlockSHR" }
  };

  function toBin8(num) {
    return (num & 0xFF).toString(2).padStart(8, "0");
  }

  function toHex8(num) {
    return "0x" + (num & 0xFF).toString(16).toUpperCase().padStart(2, "0");
  }

  // --- Core Logic & Shift Computation ---
  function computeLogic(a, b, op) {
    const A = a & 0xFF;
    const B = b & 0xFF;
    let result = 0;
    let C = 0;
    let Z = 0;
    let N = 0;
    let V = 0;
    let shifted = null;

    switch (op) {
      case "AND":
        result = (A & B) & 0xFF;
        C = 0;
        V = 0;
        break;
      case "OR":
        result = (A | B) & 0xFF;
        C = 0;
        V = 0;
        break;
      case "XOR":
        result = (A ^ B) & 0xFF;
        C = 0;
        V = 0;
        break;
      case "NOT":
        result = (~A) & 0xFF;
        C = 0;
        V = 0;
        break;
      case "SHL":
        shifted = (A >> 7) & 1; // Bit 7 shifted out
        result = (A << 1) & 0xFF;
        C = shifted;
        V = 0;
        break;
      case "SHR":
        shifted = A & 1;        // Bit 0 shifted out
        result = (A >> 1) & 0xFF;
        C = shifted;
        V = 0;
        break;
    }

    Z = (result === 0) ? 1 : 0;
    N = (result >> 7) & 1;

    return { result, flags: { C, Z, N, V }, shifted };
  }

  // DOM Elements Cache
  const dom = {
    // Popup Launcher & Latched Config
    btnStartAluModal: document.getElementById("btnStartAluModal"),
    btnConfigureAlu: document.getElementById("btnConfigureAlu"),
    displayValA: document.getElementById("displayValA"),
    displayBinA: document.getElementById("displayBinA"),
    displayValB: document.getElementById("displayValB"),
    displayBinB: document.getElementById("displayBinB"),
    displayOpPill: document.getElementById("displayOpPill"),

    // Modal Popup Elements
    aluConfigModal: document.getElementById("aluConfigModal"),
    modalBtnClose: document.getElementById("modalBtnClose"),
    modalBtnCancel: document.getElementById("modalBtnCancel"),
    modalBtnConfirm: document.getElementById("modalBtnConfirm"),
    modalInputA: document.getElementById("modalInputA"),
    modalBinA: document.getElementById("modalBinA"),
    modalErrA: document.getElementById("modalErrA"),
    modalIncA: document.getElementById("modalIncA"),
    modalDecA: document.getElementById("modalDecA"),

    modalBlockB: document.getElementById("modalBlockB"),
    modalInputB: document.getElementById("modalInputB"),
    modalBinB: document.getElementById("modalBinB"),
    modalErrB: document.getElementById("modalErrB"),
    modalIncB: document.getElementById("modalIncB"),
    modalDecB: document.getElementById("modalDecB"),

    modalOpItems: document.querySelectorAll(".modal-op-item"),

    // Sequencer Controls
    btnStepForward: document.getElementById("btnStepForward"),
    btnPauseResume: document.getElementById("btnPauseResume"),
    btnRunAll: document.getElementById("btnRunAll"),
    btnReset: document.getElementById("btnReset"),

    // Diagram elements
    schematicBadge: document.getElementById("schematicBadge"),
    svgValA: document.getElementById("svgValA"),
    svgValB: document.getElementById("svgValB"),
    svgRectB: document.getElementById("svgRectB"),
    svgOpcodeText: document.getElementById("svgOpcodeText"),
    svgResultRegText: document.getElementById("svgResultRegText"),
    svgFlagC: document.getElementById("svgFlagC"),
    svgFlagZ: document.getElementById("svgFlagZ"),
    svgFlagN: document.getElementById("svgFlagN"),
    svgFlagV: document.getElementById("svgFlagV"),
    svgFlagStatus: document.getElementById("svgFlagStatus"),
    svgTextRegLoad: document.getElementById("svgTextRegLoad"),

    // Wires
    wireA_trunk: document.getElementById("wireA_trunk"),
    wireA_branch: document.getElementById("wireA_branch"),
    wireB_trunk: document.getElementById("wireB_trunk"),
    wireB_branch: document.getElementById("wireB_branch"),
    wireGateToMux: document.getElementById("wireGateToMux"),
    wireDecMux: document.getElementById("wireDecMux"),
    wireMuxOut: document.getElementById("wireMuxOut"),
    wireToReg: document.getElementById("wireToReg"),
    wireToFlags: document.getElementById("wireToFlags"),
    wireRegLoad: document.getElementById("wireRegLoad"),

    // Stepper
    currentStageBadge: document.getElementById("currentStageBadge"),
    stages: [
      document.getElementById("stage1"),
      document.getElementById("stage2"),
      document.getElementById("stage3"),
      document.getElementById("stage4"),
      document.getElementById("stage5"),
      document.getElementById("stage6")
    ],

    // Bitwise Breakdown
    bitwiseCardTitle: document.getElementById("bitwiseCardTitle"),
    calcFormulaBadge: document.getElementById("calcFormulaBadge"),
    bitwiseExplanation: document.getElementById("bitwiseExplanation"),
    bitwiseTableBody: document.getElementById("bitwiseTableBody"),

    // Results & Flags
    outAluDec: document.getElementById("outAluDec"),
    outAluBin: document.getElementById("outAluBin"),
    outAluHex: document.getElementById("outAluHex"),
    outRegDec: document.getElementById("outRegDec"),
    outRegBin: document.getElementById("outRegBin"),
    outRegHex: document.getElementById("outRegHex"),
    outCommitStatus: document.getElementById("outCommitStatus"),

    cardFlagC: document.getElementById("cardFlagC"),
    valFlagC: document.getElementById("valFlagC"),
    cardFlagZ: document.getElementById("cardFlagZ"),
    valFlagZ: document.getElementById("valFlagZ"),
    cardFlagN: document.getElementById("cardFlagN"),
    valFlagN: document.getElementById("valFlagN"),
    cardFlagV: document.getElementById("cardFlagV"),
    valFlagV: document.getElementById("valFlagV"),
    flagSummaryText: document.getElementById("flagSummaryText")
  };

  // --- Render Latched On-Page Configuration ---
  function renderLatchedConfig() {
    dom.displayValA.textContent = state.regA;
    dom.displayBinA.textContent = toBin8(state.regA);

    const opData = OPS_DATA[state.operation];
    if (opData.isSingle) {
      dom.displayValB.textContent = "— (Ignored)";
      dom.displayBinB.textContent = "--------";
    } else {
      dom.displayValB.textContent = state.regB;
      dom.displayBinB.textContent = toBin8(state.regB);
    }

    dom.displayOpPill.textContent = `${opData.code}: ${opData.name}`;
  }

  // --- Recompute ---
  function recompute() {
    const calc = computeLogic(state.regA, state.regB, state.operation);
    state.intermediateResult = calc.result;
    state.flags = calc.flags;
    state.shiftedOut = calc.shifted;

    if (state.currentStage === 6) {
      state.committedResult = calc.result;
    }
  }

  // --- Render Schematic ---
  function renderSchematic() {
    const stage = state.currentStage;
    const opData = OPS_DATA[state.operation];

    dom.schematicBadge.textContent = `OPCODE: ${opData.code} (${state.operation})`;
    dom.svgValA.textContent = `${state.regA} (${toHex8(state.regA)})`;
    dom.svgOpcodeText.textContent = `OP = ${opData.code} (${state.operation})`;

    // Single-operand Register B display in diagram
    if (opData.isSingle) {
      dom.svgRectB.setAttribute("opacity", "0.35");
      dom.svgValB.textContent = "IGNORED";
    } else {
      dom.svgRectB.removeAttribute("opacity");
      dom.svgValB.textContent = `${state.regB} (${toHex8(state.regB)})`;
    }

    // Highlight only the active gate block in SVG
    const gateBlocks = ["gateBlockAND", "gateBlockOR", "gateBlockXOR", "gateBlockNOT", "gateBlockSHL", "gateBlockSHR"];
    gateBlocks.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle("svg-active-unit", id === opData.gateId);
      }
    });

    // Exact gate centers in SVG coordinate space
    const yTargets = {
      AND: 40,
      OR: 94,
      XOR: 148,
      NOT: 202,
      SHL: 256,
      SHR: 310
    };
    const targetY = yTargets[state.operation] || 40;

    // Reposition SVG wire branch to connect directly into active gate
    if (opData.isSingle) {
      // Connects directly to dead-center of single-operand gate
      dom.wireA_branch.setAttribute("d", `M 210 ${targetY} L 270 ${targetY}`);
      dom.wireB_branch.style.display = "none";
    } else {
      // Connects to A port (center - 6) and B port (center + 6)
      dom.wireA_branch.setAttribute("d", `M 210 ${targetY - 6} L 270 ${targetY - 6}`);
      dom.wireB_branch.setAttribute("d", `M 235 ${targetY + 6} L 270 ${targetY + 6}`);
      dom.wireB_branch.style.display = "block";
    }

    // Active gate to MUX channel (dead-center horizontal connection from x=410 to x=490)
    dom.wireGateToMux.setAttribute("d", `M 410 ${targetY} L 490 ${targetY}`);

    // Result Register latch
    if (stage === 6) {
      dom.svgResultRegText.textContent = `${state.committedResult} (${toHex8(state.committedResult)})`;
      dom.svgResultRegText.setAttribute("fill", "var(--secondary)");
      dom.svgTextRegLoad.textContent = "REG_LOAD (ACTIVE)";
      dom.svgTextRegLoad.setAttribute("fill", "var(--secondary)");
    } else {
      dom.svgResultRegText.textContent = `${state.committedResult} [HOLD]`;
      dom.svgResultRegText.setAttribute("fill", "var(--text-muted)");
      dom.svgTextRegLoad.textContent = "REG_LOAD (HOLD)";
      dom.svgTextRegLoad.setAttribute("fill", "var(--text-muted)");
    }

    // Flags in diagram
    dom.svgFlagC.textContent = state.flags.C;
    dom.svgFlagZ.textContent = state.flags.Z;
    dom.svgFlagN.textContent = state.flags.N;
    dom.svgFlagV.textContent = state.flags.V;

    if (state.flags.N === 1) {
      dom.svgFlagStatus.textContent = "Negative (Bit 7 Set)";
      dom.svgFlagStatus.setAttribute("fill", "var(--wire-alert)");
    } else if (state.flags.C === 1) {
      dom.svgFlagStatus.textContent = "Shift Carry Out";
      dom.svgFlagStatus.setAttribute("fill", "var(--secondary)");
    } else {
      dom.svgFlagStatus.textContent = "Flags Normal";
      dom.svgFlagStatus.setAttribute("fill", "var(--secondary)");
    }

    // Wire styling with smooth pulse
    function setWire(wire, isActive, pulse = false) {
      if (!wire) return;
      wire.classList.toggle("wire-active", isActive);
      wire.classList.toggle("pulse-flow", pulse);
      wire.setAttribute("marker-end", isActive ? "url(#arr-active)" : "url(#arr-idle)");
    }

    const hasLoaded = stage >= 1;
    const hasDecoded = stage >= 2;
    const hasEnabled = stage >= 3;
    const hasComputed = stage >= 4;
    const hasFlags = stage >= 5;
    const hasWritten = stage === 6;

    setWire(dom.wireA_trunk, hasLoaded);
    setWire(dom.wireA_branch, hasLoaded, stage === 1 || stage === 4);

    setWire(dom.wireB_trunk, hasLoaded && !opData.isSingle);
    setWire(dom.wireB_branch, hasLoaded && !opData.isSingle, stage === 1 || stage === 4);

    setWire(dom.wireDecMux, hasDecoded);
    setWire(dom.wireGateToMux, hasComputed, stage === 4);
    setWire(dom.wireMuxOut, hasComputed, stage === 4);
    setWire(dom.wireToReg, hasComputed);
    setWire(dom.wireToFlags, hasFlags);
    setWire(dom.wireRegLoad, hasWritten);
  }

  // --- Render Stepper ---
  function renderStepper() {
    const stageNames = ["LOAD", "DECODE", "ENABLE", "COMPUTE", "FLAGS", "WRITE"];
    dom.currentStageBadge.textContent = `STAGE ${state.currentStage}: ${stageNames[state.currentStage - 1]}`;

    dom.stages.forEach((card, idx) => {
      const s = idx + 1;
      card.classList.toggle("stage-active", s === state.currentStage);
      card.classList.toggle("stage-done", s < state.currentStage);
    });
  }

  // --- Render Bitwise Breakdown ---
  function renderBitwiseBreakdown() {
    const opData = OPS_DATA[state.operation];
    dom.calcFormulaBadge.textContent = `${state.operation}: ${state.intermediateResult} (${toHex8(state.intermediateResult)})`;

    // Dynamic explanation
    let expl = "";
    if (state.operation === "AND") {
      expl = "Bitwise AND: each bit Ri = Ai AND Bi. Output bit is 1 only when both corresponding input bits are 1.";
    } else if (state.operation === "OR") {
      expl = "Bitwise OR: each bit Ri = Ai OR Bi. Output bit is 1 if either input bit is 1.";
    } else if (state.operation === "XOR") {
      expl = "Bitwise XOR: each bit Ri = Ai XOR Bi. Output bit is 1 where input bits differ; identical bits produce 0.";
    } else if (state.operation === "NOT") {
      expl = `Bitwise NOT (Invert): each bit Ri = ~Ai. Complements all 8 bits of Register A. (~${state.regA} & 255 = ${state.intermediateResult}).`;
    } else if (state.operation === "SHL") {
      expl = `Shift Left (A << 1): bits shift left by 1 position. Original bit 7 (${state.shiftedOut}) is pushed into Carry flag; bit 0 receives 0.`;
    } else if (state.operation === "SHR") {
      expl = `Shift Right (A >> 1): bits shift right by 1 position. Original bit 0 (${state.shiftedOut}) is pushed into Carry flag; bit 7 receives 0.`;
    }
    dom.bitwiseExplanation.textContent = expl;

    // Render Table
    const binA = toBin8(state.regA);
    const binB = toBin8(state.regB);
    const binRes = toBin8(state.intermediateResult);

    dom.bitwiseTableBody.innerHTML = "";

    function createRow(label, binStr, hexStr, decStr, isRes = false) {
      const tr = document.createElement("tr");
      if (isRes) tr.className = "result-row";

      const tdLbl = document.createElement("td");
      tdLbl.style.textAlign = "left";
      tdLbl.textContent = label;
      tr.appendChild(tdLbl);

      for (let i = 0; i < 8; i++) {
        const td = document.createElement("td");
        td.textContent = binStr[i];
        tr.appendChild(td);
      }

      const tdHex = document.createElement("td");
      tdHex.textContent = hexStr;
      tr.appendChild(tdHex);

      const tdDec = document.createElement("td");
      tdDec.textContent = decStr;
      tr.appendChild(tdDec);

      return tr;
    }

    dom.bitwiseTableBody.appendChild(createRow("Register A", binA, toHex8(state.regA), state.regA.toString()));

    if (!opData.isSingle) {
      dom.bitwiseTableBody.appendChild(createRow("Register B", binB, toHex8(state.regB), state.regB.toString()));
    }

    dom.bitwiseTableBody.appendChild(createRow(`Result (${state.operation})`, binRes, toHex8(state.intermediateResult), state.intermediateResult.toString(), true));
  }

  // --- Render Results & Flags ---
  function renderResults() {
    const isStep4OrLater = state.currentStage >= 4;
    const isStep6 = state.currentStage === 6;

    // Intermediate
    if (isStep4OrLater) {
      dom.outAluDec.textContent = state.intermediateResult.toString();
      dom.outAluBin.textContent = toBin8(state.intermediateResult);
      dom.outAluHex.textContent = toHex8(state.intermediateResult);
    } else {
      dom.outAluDec.textContent = "--";
      dom.outAluBin.textContent = "--------";
      dom.outAluHex.textContent = "----";
    }

    // Committed
    dom.outRegDec.textContent = state.committedResult.toString();
    dom.outRegBin.textContent = toBin8(state.committedResult);
    dom.outRegHex.textContent = toHex8(state.committedResult);

    dom.outCommitStatus.textContent = isStep6
      ? "Committed output: Latched into Result Register at Step 6."
      : "Holding previous latch until Step 6 (WRITE) commits.";

    // Flags
    const flags = state.currentStage >= 5 ? state.flags : { C: 0, Z: 0, N: 0, V: 0 };
    dom.valFlagC.textContent = flags.C;
    dom.valFlagZ.textContent = flags.Z;
    dom.valFlagN.textContent = flags.N;
    dom.valFlagV.textContent = flags.V;

    dom.cardFlagC.classList.toggle("flg-set", flags.C === 1);
    dom.cardFlagZ.classList.toggle("flg-set", flags.Z === 1);
    dom.cardFlagN.classList.toggle("flg-set", flags.N === 1);
    dom.cardFlagV.classList.toggle("flg-set", flags.V === 1);

    // Summary Text
    let summary = `Flags: `;
    summary += flags.C ? `Shift-out bit saved (C=1) ` : `No shift-out (C=0) `;
    summary += `&bull; `;
    summary += flags.Z ? `Zero Result (Z=1) ` : `Non-zero (Z=0) `;
    summary += `&bull; `;
    summary += flags.N ? `Bit 7 is 1 (N=1) ` : `Bit 7 is 0 (N=0) `;
    summary += `&bull; `;
    summary += `Overflow is 0 for logical operations.`;
    dom.flagSummaryText.innerHTML = summary;
  }

  // --- Master Update ---
  function updateAll() {
    recompute();
    renderLatchedConfig();
    renderSchematic();
    renderStepper();
    renderBitwiseBreakdown();
    renderResults();
  }

  // --- Sequencer & Flow Management ---
  function stopRunning() {
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
    state.isRunning = false;
    state.isPaused = false;
    dom.btnPauseResume.disabled = true;
    dom.btnPauseResume.textContent = "Pause";
    dom.btnRunAll.disabled = false;
  }

  function advanceOneStage() {
    if (state.currentStage >= 6) {
      state.currentStage = 1;
    } else {
      state.currentStage += 1;
    }
    updateAll();
  }

  function scheduleNextStep() {
    if (!state.isRunning || state.isPaused) return;

    if (state.currentStage < 6) {
      state.timerId = setTimeout(() => {
        state.currentStage += 1;
        updateAll();
        if (state.currentStage < 6) {
          scheduleNextStep();
        } else {
          stopRunning();
          updateAll();
        }
      }, state.stepIntervalMs);
    } else {
      stopRunning();
    }
  }

  function startSequence(fromStage = 1) {
    stopRunning();
    state.isRunning = true;
    state.isPaused = false;
    dom.btnPauseResume.disabled = false;
    dom.btnPauseResume.textContent = "Pause";
    dom.btnRunAll.disabled = true;

    state.currentStage = fromStage;
    updateAll();
    scheduleNextStep();
  }

  function togglePauseResume() {
    if (!state.isRunning) return;

    if (state.isPaused) {
      state.isPaused = false;
      dom.btnPauseResume.textContent = "Pause";
      scheduleNextStep();
    } else {
      state.isPaused = true;
      dom.btnPauseResume.textContent = "Resume";
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
    }
  }

  function resetAll() {
    stopRunning();
    state.regA = 0;
    state.regB = 0;
    state.hasUserEntered = false;
    state.operation = "AND";
    state.currentStage = 1;
    state.intermediateResult = 0;
    state.committedResult = 0;
    dom.modalErrA.textContent = "";
    dom.modalErrB.textContent = "";
    dom.modalInputA.classList.remove("has-error");
    dom.modalInputB.classList.remove("has-error");
    updateAll();
  }

  // --- Modal Popup Management ---
  function syncModalOpUI(opKey) {
    const opInfo = OPS_DATA[opKey];
    dom.modalOpItems.forEach((item) => {
      item.classList.toggle("active-op-choice", item.dataset.op === opKey);
    });

    if (opInfo.isSingle) {
      dom.modalBlockB.classList.add("disabled-block");
      dom.modalInputB.disabled = true;
      dom.modalBinB.textContent = "IGNORED";
      dom.modalErrB.textContent = "";
      dom.modalInputB.classList.remove("has-error");
    } else {
      dom.modalBlockB.classList.remove("disabled-block");
      dom.modalInputB.disabled = false;
      const raw = dom.modalInputB.value.trim();
      const curB = parseInt(raw, 10);
      dom.modalBinB.textContent = (!isNaN(curB) && curB >= 0 && curB <= 255) ? toBin8(curB) : "--------";
    }
  }

  function openModal() {
    state.modalOp = state.operation || "AND";

    if (state.hasUserEntered) {
      dom.modalInputA.value = state.regA;
      dom.modalBinA.textContent = toBin8(state.regA);
      dom.modalInputB.value = state.regB;
      dom.modalBinB.textContent = toBin8(state.regB);
    } else {
      dom.modalInputA.value = "";
      dom.modalBinA.textContent = "--------";
      dom.modalInputB.value = "";
      dom.modalBinB.textContent = "--------";
    }

    dom.modalErrA.textContent = "";
    dom.modalInputA.classList.remove("has-error");
    dom.modalErrB.textContent = "";
    dom.modalInputB.classList.remove("has-error");

    syncModalOpUI(state.modalOp);

    dom.aluConfigModal.classList.add("modal-visible");
    setTimeout(() => {
      dom.modalInputA.focus();
    }, 80);
  }

  function closeModal() {
    dom.aluConfigModal.classList.remove("modal-visible");
  }

  function validateModalA() {
    const raw = dom.modalInputA.value.trim();
    if (raw === "") {
      dom.modalErrA.textContent = "Please enter an integer (0–255).";
      dom.modalInputA.classList.add("has-error");
      dom.modalBinA.textContent = "--------";
      return null;
    }
    const val = Number(raw);
    if (!Number.isInteger(val) || val < 0 || val > 255) {
      dom.modalErrA.textContent = "Value must be an integer between 0 and 255.";
      dom.modalInputA.classList.add("has-error");
      dom.modalBinA.textContent = "--------";
      return null;
    }
    dom.modalErrA.textContent = "";
    dom.modalInputA.classList.remove("has-error");
    dom.modalBinA.textContent = toBin8(val);
    state.modalA = val;
    return val;
  }

  function validateModalB() {
    const opInfo = OPS_DATA[state.modalOp];
    if (opInfo.isSingle) return 0; // Register B is ignored for single-operand operations

    const raw = dom.modalInputB.value.trim();
    if (raw === "") {
      dom.modalErrB.textContent = "Please enter an integer (0–255).";
      dom.modalInputB.classList.add("has-error");
      dom.modalBinB.textContent = "--------";
      return null;
    }
    const val = Number(raw);
    if (!Number.isInteger(val) || val < 0 || val > 255) {
      dom.modalErrB.textContent = "Value must be an integer between 0 and 255.";
      dom.modalInputB.classList.add("has-error");
      dom.modalBinB.textContent = "--------";
      return null;
    }
    dom.modalErrB.textContent = "";
    dom.modalInputB.classList.remove("has-error");
    dom.modalBinB.textContent = toBin8(val);
    state.modalB = val;
    return val;
  }

  function handleConfirmAndExecute() {
    const valA = validateModalA();
    const valB = validateModalB();

    if (valA === null || valB === null) {
      return; // Invalid input, keep modal open and display error
    }

    state.hasUserEntered = true;
    state.regA = valA;
    const opInfo = OPS_DATA[state.modalOp];
    if (!opInfo.isSingle) {
      state.regB = valB;
    }
    state.operation = state.modalOp;

    closeModal();
    startSequence(1);
  }

  // --- Attach Event Listeners ---
  function initEvents() {
    // Open Modal Triggers (Reopen button)
    dom.btnStartAluModal.addEventListener("click", openModal);
    dom.btnConfigureAlu.addEventListener("click", openModal);

    // Modal Close
    dom.modalBtnClose.addEventListener("click", closeModal);
    dom.modalBtnCancel.addEventListener("click", closeModal);
    dom.aluConfigModal.addEventListener("click", (e) => {
      if (e.target === dom.aluConfigModal) {
        closeModal();
      }
    });

    // Modal Inputs
    dom.modalInputA.addEventListener("input", validateModalA);
    dom.modalInputB.addEventListener("input", validateModalB);

    dom.modalIncA.addEventListener("click", () => {
      const cur = parseInt(dom.modalInputA.value, 10);
      const next = isNaN(cur) ? 1 : Math.min(255, cur + 1);
      dom.modalInputA.value = next;
      validateModalA();
    });
    dom.modalDecA.addEventListener("click", () => {
      const cur = parseInt(dom.modalInputA.value, 10);
      const next = isNaN(cur) ? 0 : Math.max(0, cur - 1);
      dom.modalInputA.value = next;
      validateModalA();
    });

    dom.modalIncB.addEventListener("click", () => {
      if (OPS_DATA[state.modalOp].isSingle) return;
      const cur = parseInt(dom.modalInputB.value, 10);
      const next = isNaN(cur) ? 1 : Math.min(255, cur + 1);
      dom.modalInputB.value = next;
      validateModalB();
    });
    dom.modalDecB.addEventListener("click", () => {
      if (OPS_DATA[state.modalOp].isSingle) return;
      const cur = parseInt(dom.modalInputB.value, 10);
      const next = isNaN(cur) ? 0 : Math.max(0, cur - 1);
      dom.modalInputB.value = next;
      validateModalB();
    });

    // Modal Operation Choices
    dom.modalOpItems.forEach((item) => {
      item.addEventListener("click", () => {
        state.modalOp = item.dataset.op;
        syncModalOpUI(state.modalOp);
      });
    });

    // Confirm & Execute
    dom.modalBtnConfirm.addEventListener("click", handleConfirmAndExecute);

    // Sequencer Controls
    dom.btnStepForward.addEventListener("click", () => {
      stopRunning();
      advanceOneStage();
    });

    dom.btnRunAll.addEventListener("click", () => {
      startSequence(1);
    });

    dom.btnPauseResume.addEventListener("click", togglePauseResume);
    dom.btnReset.addEventListener("click", resetAll);

    // Click stage boxes directly
    dom.stages.forEach((stgBox) => {
      stgBox.addEventListener("click", () => {
        stopRunning();
        const num = parseInt(stgBox.dataset.step, 10);
        state.currentStage = num;
        updateAll();
      });
    });

    // Automatic popup opening on every page entry
    openModal();
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) {
        openModal();
      }
    });
  }

  initEvents();
  updateAll();
})();
