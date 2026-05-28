/*
 * test_time.c — time / sleep / rand 測試
 * 驗證：時間戳取得、睡眠、亂數範圍
 */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>

int main() {
    printf("=== time/sleep/rand test ===\n");

    /* 時間戳 */
    time_t now = time(NULL);
    printf("Current time: %ld\n", (long)now);

    /* 亂數（用時間戳當 seed） */
    srand((unsigned)now);
    printf("Random [0-99]: %d\n", rand() % 100);
    printf("Random [0-9]: %d\n", rand() % 10);
    printf("Random [0-1]: %d\n", rand() % 2);
    printf("Random [1-6] (dice): %d\n", (rand() % 6) + 1);

    /* 睡眠 */
    printf("Sleeping 1 second...\n");
    sleep(1);
    printf("Wake up!\n");

    time_t later = time(NULL);
    printf("Time after sleep: %ld (diff=%ld sec)\n",
           (long)later, (long)(later - now));

    printf("\nTest complete.\n");
    return 0;
}