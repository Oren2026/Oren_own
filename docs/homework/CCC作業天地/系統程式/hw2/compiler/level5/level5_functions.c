#include <stdio.h>

int main() {
    printf("Level 5: Function call demo\n\n");

    int bytecode[] = {
        0, 5,      // IMM 5
        0, 3,      // IMM 3
        6, 0,      // ADD
        11, 0      // STORE result (var 0)
    };

    int pc = 0;
    int sp = -1;
    int stack[20];
    int vars[10];

    printf("Executing: 5 + 3 = ?\n\n");

    while (pc < 8) {
        int op = bytecode[pc++];
        int arg = bytecode[pc++];

        switch(op) {
            case 0:  // IMM
                stack[++sp] = arg;
                printf("IMM %d -> stack[%d]=%d\n", arg, sp, stack[sp]);
                break;
            case 6:  // ADD
                int b = stack[sp--];
                int a = stack[sp--];
                stack[++sp] = a + b;
                printf("ADD -> stack[%d]=%d\n", sp, stack[sp]);
                break;
            case 11:  // STORE
                vars[arg] = stack[sp--];
                printf("STORE var[%d]=%d\n", arg, vars[arg]);
                break;
            case 12:  // EOF
                printf("\nResult: %d\n", vars[0]);
                return 0;
        }
    }
    return 0;
}