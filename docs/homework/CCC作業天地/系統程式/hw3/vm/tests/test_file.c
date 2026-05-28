/*
 * test_file.c — file I/O 測試
 * 驗證：fopen / fgets / fprintf / fclose
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    printf("=== file I/O test ===\n");

    /* 寫入測試 */
    FILE* fp = fopen("test_output.txt", "w");
    if (!fp) {
        perror("fopen write failed");
        return 1;
    }
    fprintf(fp, "Hello from Solang VM!\n");
    fprintf(fp, "Line 2: %d + %d = %d\n", 1, 2, 3);
    fprintf(fp, "Line 3: random=%d\n", 42);
    fclose(fp);
    printf("Wrote to test_output.txt\n");

    /* 讀取測試 */
    fp = fopen("test_output.txt", "r");
    if (!fp) {
        perror("fopen read failed");
        return 1;
    }
    char buf[256];
    int line = 0;
    while (fgets(buf, sizeof(buf), fp)) {
        line++;
        /* 移除換行 */
        size_t len = strlen(buf);
        if (len > 0 && buf[len-1] == '\n') buf[len-1] = '\0';
        printf("Read line %d: %s\n", line, buf);
    }
    fclose(fp);

    printf("\nTest complete.\n");
    return 0;
}