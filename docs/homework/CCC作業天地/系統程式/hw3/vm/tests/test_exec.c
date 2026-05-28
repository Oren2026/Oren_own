/*
 * test_exec.c — exec / system 測試
 * 驗證：執行外部命令、取得回傳值
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    printf("=== exec/system test ===\n");

    /* system() — 直接執行 shell 命令 */
    int r;
    r = system("echo 'Hello from shell'");
    printf("system(echo) returned: %d\n", r);

    r = system("ls -la /tmp | head -3");
    printf("system(ls) returned: %d\n", r);

    r = system("echo $((1+2+3))");
    printf("system(arithmetic) returned: %d\n", r);

    /* exit code 測試 */
    printf("\nTesting exit codes...\n");
    r = system("exit 0");
    printf("exit 0 -> %d\n", r);

    r = system("exit 1");
    printf("exit 1 -> %d\n", r);

    printf("\nTest complete.\n");
    return 0;
}