/*
 * test_print.c — print / println 測試
 * 驗證：字串輸出、數字輸出、換行行為
 */
#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("=== print/println test ===\n");

    printf("print: Hello ");
    printf("print: World\n");

    printf("print number: %d\n", 42);
    printf("print hex: 0x%x\n", 255);
    printf("print negative: %d\n", -17);

    printf("\nTest complete.\n");
    return 0;
}