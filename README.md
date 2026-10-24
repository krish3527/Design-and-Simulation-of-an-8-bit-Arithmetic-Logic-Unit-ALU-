# Design and Simulation of an 8-bit Arithmetic Logic Unit (ALU)

## About the Project

This project demonstrates the design and simulation of an **8-bit Arithmetic Logic Unit (ALU)** using HTML, CSS, and JavaScript. It provides an interactive way to understand how a processor performs arithmetic and logical operations on 8-bit data.

## Features

- **Arithmetic Operations:** Addition and subtraction.
- **Logical Operations:** AND, OR, XOR, and NOT.
- **Shift Operations:** Left shift and right shift.
- **Register Inputs:** Enter values for Register A and Register B.
- **Interactive Simulation:** Visualize the ALU's operation through an animated hardware block diagram.
- **Six-Stage Signal Flow:** LOAD → DECODE → ENABLE → COMPUTE → FLAGS → WRITE.
- **Result Display:** View results in decimal, binary, and hexadecimal formats.
- **Status Flags:** Observe applicable ALU status flags.
- **Modern UI:** Blue-themed interface with light and dark modes.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- SVG for hardware block diagrams and signal-flow animation

## How to Run

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Open `index.html` using the **Live Server** extension.
4. Select the Arithmetic Unit or Logic & Shift Unit.
5. Enter register values, choose an operation, and execute the simulation.
6. Observe the animated signal flow and output.

Alternatively, open `index.html` directly in a web browser if the project works without a local server.

## Project Structure

```text
.
├── index.html
├── arithmetic.html
├── arithmetic.js
├── logic.html
├── logic.js
├── script.js
├── style.css
├── theme.js
├── server.js
└── test-alu.js
```

## Learning Objectives

- Understand the basic functionality of an ALU.
- Explore arithmetic, logical, and shift operations on 8-bit data.
- Visualize data flow through ALU hardware components.
- Understand the stages involved in executing an ALU operation.
- Observe the relationship between inputs, results, and status flags.

## Academic Project

**Subject:** Computer Organization and Architecture (COA)

This project is intended for educational purposes and demonstrates fundamental ALU concepts through an interactive web-based simulation.