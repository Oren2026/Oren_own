# AGENTS.md

## 260311compiler - Compiler Learning Project

### Structure

```
260311compiler/
├── interpreter/     # Interpreter tutorial (Level 1-5)
│   └── level{1,2,3,4,5}/
└── compiler/       # Compiler tutorial (Level 1-5)
    └── level{1,2,3,4,5}/
```

### Build & Run

```bash
# Interpreter Level 5
gcc interpreter/level5/level5_calc.c -o calc && ./calc

# Compiler Levels
gcc compiler/level2/level2_compiler.c -o level2 && ./level2
gcc compiler/level3/level3_variables.c -o level3 && ./level3
gcc compiler/level4/level4_control_flow.c -o level4 && ./level4
gcc compiler/level5/level5_functions.c -o level5 && ./level5
```

### Compiler Levels

| Level | File | Feature | Test |
|-------|------|---------|------|
| 2 | level2_compiler.c | Basic ops (+ - * /) | 1+2*3=7 ✓ |
| 3 | level3_variables.c | Variables | x=5,y=3,x+y ✓ |
| 4 | level4_control_flow.c | while loop | x=3 ✓ |
| 5 | level5_functions.c | Bytecode demo | 5+3=8 ✓ |

### Bytecode Opcodes

| Op | Description |
|----|-------------|
| IMM | Load immediate value |
| ADD/SUB/MUL/DIV | Arithmetic |
| LOAD/STORE | Variable access |
| CMP_LT/GT/EQ | Comparison |
| JMP/JMP_FALSE | Branch |