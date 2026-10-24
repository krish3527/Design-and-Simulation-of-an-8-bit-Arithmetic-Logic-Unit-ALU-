/**
 * ============================================================================
 * 8-BIT ARITHMETIC LOGIC UNIT (ALU) SIMULATOR
 * Simple, student-built digital logic simulator
 * ============================================================================
 */

"use strict";

(function () {
  // --- DOM Elements ---
  const inputA = document.getElementById("inputA");
  const inputB = document.getElementById("inputB");
  const binA = document.getElementById("binA");
  const binB = document.getElementById("binB");
  const errA = document.getElementById("errA");
  const errB = document.getElementById("errB");
  const cardB = document.getElementById("cardB");

  const selectOp = document.getElementById("selectOp");
  const opNote = document.getElementById("opNote");

  const stepInput = document.getElementById("stepInput");
  const stepOp = document.getElementById("stepOp");
  const stepResult = document.getElementById("stepResult");

  const btnExecute = document.getElementById("btnExecute");
  const btnReset = document.getElementById("btnReset");

  const resultPlaceholder = document.getElementById("resultPlaceholder");
  const resultBody = document.getElementById("resultBody");
  const outOpName = document.getElementById("outOpName");
  const outCalc = document.getElementById("outCalc");
  const outDec = document.getElementById("outDec");
  const outBin = document.getElementById("outBin");

  const flagC = document.getElementById("flagC");
  const flagZ = document.getElementById("flagZ");
  const flagN = document.getElementById("flagN");
  const flagV = document.getElementById("flagV");

  const exBtn1 = document.getElementById("exBtn1");
  const exBtn2 = document.getElementById("exBtn2");
  const exBtn3 = document.getElementById("exBtn3");

  // Helper: Convert integer to 8-bit binary string
  function toBinary8(val) {
    if (isNaN(val) || val === null || val === undefined) return "00000000";
    return (val & 0xFF).toString(2).padStart(8, "0");
  }

  // --- Real-Time Input Validation and Binary Display ---
  function validateAndSyncA() {
    const raw = inputA.value.trim();
    if (raw === "") {
      binA.textContent = "00000000";
      errA.textContent = "Please enter a value (0–255).";
      inputA.classList.add("input-error");
      return null;
    }
    const val = Number(raw);
    if (!Number.isInteger(val) || val < 0 || val > 255) {
      binA.textContent = "--------";
      errA.textContent = "Value must be an integer from 0 to 255.";
      inputA.classList.add("input-error");
      return null;
    }
    inputA.classList.remove("input-error");
    errA.textContent = "";
    binA.textContent = toBinary8(val);
    updateFlowStep("input");
    return val;
  }

  function validateAndSyncB() {
    const raw = inputB.value.trim();
    const op = selectOp.value;
    const isSingleOperand = (op === "NOT" || op === "SHL" || op === "SHR");

    if (isSingleOperand) {
      inputB.classList.remove("input-error");
      errB.textContent = "";
      binB.textContent = raw === "" ? "--------" : toBinary8(Number(raw));
      return Number(raw) || 0;
    }

    if (raw === "") {
      binB.textContent = "00000000";
      errB.textContent = "Please enter a value (0–255).";
      inputB.classList.add("input-error");
      return null;
    }
    const val = Number(raw);
    if (!Number.isInteger(val) || val < 0 || val > 255) {
      binB.textContent = "--------";
      errB.textContent = "Value must be an integer from 0 to 255.";
      inputB.classList.add("input-error");
      return null;
    }
    inputB.classList.remove("input-error");
    errB.textContent = "";
    binB.textContent = toBinary8(val);
    updateFlowStep("input");
    return val;
  }

  // --- Operation Change Handling ---
  function handleOpChange() {
    const op = selectOp.value;
    if (op === "NOT" || op === "SHL" || op === "SHR") {
      cardB.classList.add("disabled-card");
      inputB.disabled = true;
      opNote.textContent = "Note: Register B is not used for this operation.";
    } else {
      cardB.classList.remove("disabled-card");
      inputB.disabled = false;
      opNote.textContent = "";
    }
    updateFlowStep("op");
  }

  // --- Flow Indicator Updater ---
  function updateFlowStep(current) {
    stepInput.className = "flow-step";
    stepOp.className = "flow-step";
    stepResult.className = "flow-step";

    if (current === "input") {
      stepInput.classList.add("active-step");
    } else if (current === "op") {
      stepInput.classList.add("completed-step");
      stepOp.classList.add("active-step");
    } else if (current === "result") {
      stepInput.classList.add("completed-step");
      stepOp.classList.add("completed-step");
      stepResult.classList.add("completed-step");
    }
  }

  // --- Execute ALU Calculation ---
  function executeAlu() {
    const valA = validateAndSyncA();
    const op = selectOp.value;
    const isSingleOperand = (op === "NOT" || op === "SHL" || op === "SHR");
    const valB = isSingleOperand ? 0 : validateAndSyncB();

    if (valA === null || (!isSingleOperand && valB === null)) {
      return; // Validation failed
    }

    const A = valA & 0xFF;
    const B = valB & 0xFF;

    let result = 0;
    let C = 0;
    let Z = 0;
    let N = 0;
    let V = 0;

    let opDescription = "";
    let calcText = "";

    switch (op) {
      case "ADD": {
        opDescription = "Addition (A + B)";
        const rawSum = A + B;
        result = rawSum & 0xFF;
        C = rawSum > 255 ? 1 : 0;
        V = ((~(A ^ B) & (A ^ result) & 0x80) !== 0) ? 1 : 0;
        calcText = `${A} + ${B} = ${rawSum}${rawSum > 255 ? ` (wraps to ${result})` : ""}`;
        break;
      }

      case "SUB": {
        opDescription = "Subtraction (A - B)";
        const rawDiff = A - B;
        result = (rawDiff + 256) & 0xFF;
        // Carry in subtraction is defined as NOT borrow: 1 if A >= B, 0 if A < B
        C = (A >= B) ? 1 : 0;
        V = (((A ^ B) & (A ^ result) & 0x80) !== 0) ? 1 : 0;
        calcText = `${A} - ${B} = ${rawDiff}${rawDiff < 0 ? ` (wraps to ${result})` : ""}`;
        break;
      }

      case "AND": {
        opDescription = "Bitwise AND (A AND B)";
        result = (A & B) & 0xFF;
        C = 0;
        V = 0;
        calcText = `${A} AND ${B} = ${result} (${toBinary8(A)} & ${toBinary8(B)} = ${toBinary8(result)})`;
        break;
      }

      case "OR": {
        opDescription = "Bitwise OR (A OR B)";
        result = (A | B) & 0xFF;
        C = 0;
        V = 0;
        calcText = `${A} OR ${B} = ${result} (${toBinary8(A)} | ${toBinary8(B)} = ${toBinary8(result)})`;
        break;
      }

      case "XOR": {
        opDescription = "Bitwise XOR (A XOR B)";
        result = (A ^ B) & 0xFF;
        C = 0;
        V = 0;
        calcText = `${A} XOR ${B} = ${result} (${toBinary8(A)} ^ ${toBinary8(B)} = ${toBinary8(result)})`;
        break;
      }

      case "NOT": {
        opDescription = "Bitwise NOT (~A)";
        result = (~A) & 0xFF;
        C = 0;
        V = 0;
        calcText = `~${toBinary8(A)} = ${toBinary8(result)} (Result = ${result})`;
        break;
      }

      case "SHL": {
        opDescription = "Left Shift (A << 1)";
        C = (A >> 7) & 1; // Bit shifted out (original MSB)
        result = (A << 1) & 0xFF;
        V = 0;
        calcText = `${toBinary8(A)} << 1 = ${toBinary8(result)} (Shifted-out bit = ${C}, Result = ${result})`;
        break;
      }

      case "SHR": {
        opDescription = "Right Shift (A >> 1)";
        C = A & 1; // Bit shifted out (original LSB)
        result = (A >> 1) & 0xFF;
        V = 0;
        calcText = `${toBinary8(A)} >> 1 = ${toBinary8(result)} (Shifted-out bit = ${C}, Result = ${result})`;
        break;
      }
    }

    // Zero Flag (Z): 1 when 8-bit result equals 0
    Z = (result === 0) ? 1 : 0;

    // Negative Flag (N): equals bit 7 of the 8-bit result
    N = (result >> 7) & 1;

    // --- Render Output ---
    outOpName.textContent = opDescription;
    outCalc.textContent = calcText;
    outDec.textContent = result.toString();
    outBin.textContent = toBinary8(result);

    // Flags display
    flagC.textContent = C.toString();
    flagZ.textContent = Z.toString();
    flagN.textContent = N.toString();
    flagV.textContent = V.toString();

    // Toggle active flag box style
    flagC.parentElement.classList.toggle("flag-active", C === 1);
    flagZ.parentElement.classList.toggle("flag-active", Z === 1);
    flagN.parentElement.classList.toggle("flag-active", N === 1);
    flagV.parentElement.classList.toggle("flag-active", V === 1);

    // Show result section, hide placeholder
    resultPlaceholder.style.display = "none";
    resultBody.style.display = "flex";

    updateFlowStep("result");
  }

  // --- Reset Function ---
  function resetSimulator() {
    inputA.value = "";
    inputB.value = "";
    binA.textContent = "00000000";
    binB.textContent = "00000000";
    errA.textContent = "";
    errB.textContent = "";
    inputA.classList.remove("input-error");
    inputB.classList.remove("input-error");

    selectOp.value = "ADD";
    handleOpChange();

    resultBody.style.display = "none";
    resultPlaceholder.style.display = "block";
    resultPlaceholder.textContent = "Enter inputs and select an operation.";

    stepInput.className = "flow-step";
    stepOp.className = "flow-step";
    stepResult.className = "flow-step";
  }

  // --- Example Buttons ---
  function loadExample(a, b, op) {
    inputA.value = a;
    inputB.value = b;
    selectOp.value = op;

    validateAndSyncA();
    validateAndSyncB();
    handleOpChange();

    // Do NOT auto-execute; remind user to click Execute ALU
    resultBody.style.display = "none";
    resultPlaceholder.style.display = "block";
    resultPlaceholder.textContent = `Example loaded (A=${a}, B=${b}, ${op}). Click "Execute ALU" to calculate.`;
    updateFlowStep("op");
  }

  // --- Attach Event Listeners ---
  inputA.addEventListener("input", validateAndSyncA);
  inputB.addEventListener("input", validateAndSyncB);
  selectOp.addEventListener("change", handleOpChange);

  btnExecute.addEventListener("click", executeAlu);
  btnReset.addEventListener("click", resetSimulator);

  exBtn1.addEventListener("click", () => loadExample(10, 5, "ADD"));
  exBtn2.addEventListener("click", () => loadExample(255, 1, "ADD"));
  exBtn3.addEventListener("click", () => loadExample(15, 7, "AND"));

  // Initial Sync
  validateAndSyncA();
  validateAndSyncB();
  handleOpChange();
})();
