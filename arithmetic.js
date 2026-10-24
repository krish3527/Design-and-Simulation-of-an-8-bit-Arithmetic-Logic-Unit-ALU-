/**
 * ============================================================================
 * 8-BIT ARITHMETIC UNIT CONTROLLER (arithmetic.js)
 * Features:
 * - Automatically opens input popup on every page entry
 * - Modern Bluish Reminder / Productivity App Theme
 * - Modal Popup for Register Inputs (A, B) & Operation Selection (ADD, SUB)
 * - Automatic 6-Stage Execution Sequence upon "Confirm & Execute"
 * - Accurate 8-bit Arithmetic Logic & CCR Flags (C, Z, N, V)
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
    operation: "ADD",    // "ADD" (000) or "SUB" (001)
    currentStage: 1,     // 1 to 6
    intermediateResult: 0,
    committedResult: 0,
    flags: { C: 0, Z: 1, N: 0, V: 0 },

    // Temporary modal state
    modalA: null,
    modalB: null,
    modalOp: "ADD",

    // Sequencer controls
    isRunning: false,
    isPaused: false,
    timerId: null,
    stepIntervalMs: 1500 // 1.5s per stage
  };

  function toBin8(num) {
    return (num & 0xFF).toString(2).padStart(8, "0");
  }

  function toHex8(num) {
    return "0x" + (num & 0xFF).toString(16).toUpperCase().padStart(2, "0");
  }

  // --- Core Calculation ---
  function computeArithmetic(a, b, op) {
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
      // Signed overflow: added two numbers with same sign, result has inverted sign
      V = ((~(A ^ B) & (A ^ result) & 0x80) !== 0) ? 1 : 0;
    } else {
      // SUB
      const raw = A - B;
      result = (raw + 256) & 0xFF;
      // In hardware subtraction (A + ~B + 1), Carry = NOT borrow: 1 if A >= B
      C = (A >= B) ? 1 : 0;
      // Signed overflow: subtracted numbers with different signs, result has inverted sign
      V = (((A ^ B) & (A ^ result) & 0x80) !== 0) ? 1 : 0;
    }

    Z = (result === 0) ? 1 : 0;
    N = (result >> 7) & 1;

    return { result, flags: { C, Z, N, V } };
  }

  // DOM Elements
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

    modalInputB: document.getElementById("modalInputB"),
    modalBinB: document.getElementById("modalBinB"),
    modalErrB: document.getElementById("modalErrB"),
    modalIncB: document.getElementById("modalIncB"),
    modalDecB: document.getElementById("modalDecB"),

    modalOpItems: document.querySelectorAll(".modal-op-item"),

    // Controls
    btnStepForward: document.getElementById("btnStepForward"),
    btnPauseResume: document.getElementById("btnPauseResume"),
    btnRunAll: document.getElementById("btnRunAll"),
    btnReset: document.getElementById("btnReset"),

    // Diagram elements
    schematicBadge: document.getElementById("schematicBadge"),
    svgValA: document.getElementById("svgValA"),
    svgValB: document.getElementById("svgValB"),
    svgOpcodeText: document.getElementById("svgOpcodeText"),
    svgArithOpTitle: document.getElementById("svgArithOpTitle"),
    svgResultRegText: document.getElementById("svgResultRegText"),
    svgFlagC: document.getElementById("svgFlagC"),
    svgFlagZ: document.getElementById("svgFlagZ"),
    svgFlagN: document.getElementById("svgFlagN"),
    svgFlagV: document.getElementById("svgFlagV"),
    svgFlagStatus: document.getElementById("svgFlagStatus"),
    svgTextRegLoad: document.getElementById("svgTextRegLoad"),

    // Wires
    wireA: document.getElementById("wireA"),
    wireB: document.getElementById("wireB"),
    wireDecCtrl: document.getElementById("wireDecCtrl"),
    wireArithMux: document.getElementById("wireArithMux"),
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

    // Results & Flags
    calcFormulaBadge: document.getElementById("calcFormulaBadge"),
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

    dom.displayValB.textContent = state.regB;
    dom.displayBinB.textContent = toBin8(state.regB);

    const isAdd = state.operation === "ADD";
    dom.displayOpPill.textContent = isAdd ? "000: ADD — A + B" : "001: SUB — A - B";
  }

  // --- Recompute ---
  function recompute() {
    const calc = computeArithmetic(state.regA, state.regB, state.operation);
    state.intermediateResult = calc.result;
    state.flags = calc.flags;

    if (state.currentStage === 6) {
      state.committedResult = calc.result;
    }
  }

  // --- Render SVG Schematic ---
  function renderSchematic() {
    const stage = state.currentStage;
    const isAdd = state.operation === "ADD";
    const opCode = isAdd ? "000" : "001";

    dom.schematicBadge.textContent = `OPCODE: ${opCode} (${state.operation})`;
    dom.svgValA.textContent = `${state.regA} (${toHex8(state.regA)})`;
    dom.svgValB.textContent = `${state.regB} (${toHex8(state.regB)})`;
    dom.svgOpcodeText.textContent = `OP = ${opCode} (${state.operation})`;

    if (isAdd) {
      dom.svgArithOpTitle.textContent = `SUM = ${state.intermediateResult} | Cout=${state.flags.C}`;
    } else {
      dom.svgArithOpTitle.textContent = `DIFF = ${state.intermediateResult} | Cout=${state.flags.C}`;
    }

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

    if (state.flags.V === 1 || state.flags.N === 1) {
      dom.svgFlagStatus.textContent = "Signed Status Set";
      dom.svgFlagStatus.setAttribute("fill", "var(--wire-alert)");
    } else {
      dom.svgFlagStatus.textContent = "Flags Normal";
      dom.svgFlagStatus.setAttribute("fill", "var(--secondary)");
    }

    // Wires animation & active highlighting
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

    setWire(dom.wireA, hasLoaded, stage === 1 || stage === 4);
    setWire(dom.wireB, hasLoaded, stage === 1 || stage === 4);
    setWire(dom.wireDecCtrl, hasEnabled);
    setWire(dom.wireArithMux, hasComputed, stage === 4);
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

  // --- Render Results & Flags ---
  function renderResults() {
    const isStep4OrLater = state.currentStage >= 4;
    const isStep6 = state.currentStage === 6;

    // Formula Badge
    if (state.operation === "ADD") {
      dom.calcFormulaBadge.textContent = `${state.regA} + ${state.regB} = ${state.regA + state.regB}${state.regA + state.regB > 255 ? ` (wraps to ${state.intermediateResult})` : ""}`;
    } else {
      dom.calcFormulaBadge.textContent = `${state.regA} - ${state.regB} = ${state.regA - state.regB}${state.regA - state.regB < 0 ? ` (wraps to ${state.intermediateResult})` : ""}`;
    }

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
    summary += flags.C ? `Carry/Borrow (C=1) ` : `No Carry (C=0) `;
    summary += `&bull; `;
    summary += flags.Z ? `Zero Result (Z=1) ` : `Non-zero (Z=0) `;
    summary += `&bull; `;
    summary += flags.N ? `Negative Sign (N=1) ` : `Positive Sign (N=0) `;
    summary += `&bull; `;
    summary += flags.V ? `Signed Overflow Detected (V=1)!` : `No Signed Overflow (V=0).`;
    dom.flagSummaryText.innerHTML = summary;
  }

  // --- Master Update ---
  function updateAll() {
    recompute();
    renderLatchedConfig();
    renderSchematic();
    renderStepper();
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
    state.operation = "ADD";
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
  function openModal() {
    state.modalOp = state.operation || "ADD";

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

    dom.modalOpItems.forEach((item) => {
      item.classList.toggle("active-op-choice", item.dataset.op === state.modalOp);
    });

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
      return; // Invalid input, keep modal open
    }

    state.hasUserEntered = true;
    state.regA = valA;
    state.regB = valB;
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
      const cur = parseInt(dom.modalInputB.value, 10);
      const next = isNaN(cur) ? 1 : Math.min(255, cur + 1);
      dom.modalInputB.value = next;
      validateModalB();
    });
    dom.modalDecB.addEventListener("click", () => {
      const cur = parseInt(dom.modalInputB.value, 10);
      const next = isNaN(cur) ? 0 : Math.max(0, cur - 1);
      dom.modalInputB.value = next;
      validateModalB();
    });

    // Modal Operation Choices
    dom.modalOpItems.forEach((item) => {
      item.addEventListener("click", () => {
        state.modalOp = item.dataset.op;
        dom.modalOpItems.forEach((i) => i.classList.remove("active-op-choice"));
        item.classList.add("active-op-choice");
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
