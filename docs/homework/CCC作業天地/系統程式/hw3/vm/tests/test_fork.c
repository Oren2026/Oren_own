/*
 * test_fork.c — fork() 測試
 * 驗證：fork() 能正確建立子程序，父子各自運作
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    printf("=== fork() test ===\n");
    pid_t pid = fork();

    if (pid == 0) {
        /* Child */
        printf("Child: I am child, PID=%d\n", getpid());
        printf("Child: exiting with code 42\n");
        exit(42);
    } else {
        /* Parent */
        printf("Parent: child PID=%d\n", pid);
        int status;
        waitpid(pid, &status, 0);
        printf("Parent: child exited with %d\n", WEXITSTATUS(status));
    }

    printf("Test complete.\n");
    return 0;
}