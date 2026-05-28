/*
 * HW3 Solang VM — Extended from HW2 CalcLang
 * 新增功能：fork / print / read / file I/O / time / sleep / rand
 *
 * Bytecode 指令集：
 *   0  IMM        n       將立即值 n 壓入堆疊
 *   1  LOAD       idx     將 vars[idx] 壓入堆疊
 *   2  STORE      idx     彈出堆疊頂存入 vars[idx]
 *   3  ADD                 彈出兩個值相加，壓回結果
 *   4  SUB                 彈出兩個值相減
 *   5  MUL                 彈出兩個值相乘
 *   6  DIV                 彈出兩個值相除
 *   7  CMP_LT              a < b → 1 或 0
 *   8  CMP_GT              a > b → 1 或 0
 *   9  CMP_EQ              a == b → 1 或 0
 *  10  JMP_FALSE  addr     若堆疊頂為 0，跳至 addr
 *  11  JMP        addr     無條件跳至 addr
 *  12  EOF                 程式結束
 *
 *  HW3 新增指令：
 *  13  FORK                fork() 程序複製，回傳 PID
 *  14  EXIT       code     exit(code)
 *  15  EXEC       str      執行外部命令，結果壓入堆疊
 *  16  PRINT      str      輸出字串（不換行）
 *  17  PRINTLN    str      輸出字串（換行）
 *  18  READ                讀取一行 stdin，回傳字串指標
 *  19  FOPEN      mode     fopen(filename, mode)，回傳指標
 *  20  FREAD      fp       fgets 讀一行，回傳字串
 *  21  FWRITE     fp       寫入字串到檔案
 *  22  FCLOSE     fp       fclose
 *  23  TIME                time(NULL) 回傳時間戳
 *  24  SLEEP      sec      sleep(sec)
 *  25  RAND       max      rand() % max，回傳亂數
 *  26  STRLEN     str      回傳字串長度
 *  27  STRCMP     str      比較兩字串，回傳 0/1/-1
 *  28  INT_TO_STR val      整數轉字串，壓入堆疊
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/wait.h>
#include <ctype.h>

#define MAX_CODE  1000
#define MAX_STACK  200
#define MAX_VARS   100
#define MAX_STR    256

typedef enum {
    OP_IMM=0, OP_LOAD, OP_STORE,
    OP_ADD, OP_SUB, OP_MUL, OP_DIV,
    OP_CMP_LT, OP_CMP_GT, OP_CMP_EQ,
    OP_JMP_FALSE, OP_JMP, OP_EOF,
    /* === HW3 新增 === */
    OP_FORK, OP_EXIT,
    OP_EXEC,
    OP_PRINT, OP_PRINTLN,
    OP_READ,
    OP_FOPEN, OP_FREAD, OP_FWRITE, OP_FCLOSE,
    OP_TIME, OP_SLEEP, OP_RAND,
    OP_STRLEN, OP_STRCMP, OP_INT_TO_STR
} OpCode;

/* ===== String Pool（字串池） ===== */
typedef struct {
    char pool[MAX_STR][256];
    int count;
} StrPool;

void strpool_init(StrPool* sp) { sp->count = 0; }

int strpool_add(StrPool* sp, const char* s) {
    if (sp->count >= MAX_STR) return -1;
    strncpy(sp->pool[sp->count], s, 255);
    sp->pool[sp->count][255] = '\0';
    return sp->count++;
}

const char* strpool_get(StrPool* sp, int idx) {
    if (idx < 0 || idx >= sp->count) return "";
    return sp->pool[idx];
}

/* ===== VM Registers ===== */
int bytecode[MAX_CODE];
int pc;
int stack[MAX_STACK];
int sp;
int vars[MAX_VARS];
int var_count;
StrPool strings;

/* ===== Stack helpers ===== */
void push(int v) { stack[++sp] = v; }
int  pop()       { return stack[sp--]; }

/* ===== Output buffer（用於字串輸出） ===== */
char output_buf[MAX_STR * 10];
int  out_pos = 0;

void out_append(const char* s) {
    if (out_pos < (int)(sizeof(output_buf) - 256))
        strncat(output_buf + out_pos, s, 200);
}

/* ===== VM Execution ===== */
int vm_run() {
    pc = 0;
    sp = -1;
    out_pos = 0;
    output_buf[0] = '\0';
    int loop_guard = 0;

    printf("\n=== VM Execution ===\n");

    while (pc < MAX_CODE && loop_guard++ < 10000) {
        OpCode op = bytecode[pc++];
        int  arg = bytecode[pc++];

        switch (op) {

            /* === 基本運算 === */
            case OP_IMM:
                push(arg);
                printf("  IMM %d -> stack[%d]\n", arg, sp);
                break;

            case OP_LOAD:
                push(vars[arg]);
                printf("  LOAD var[%d]=%d\n", arg, vars[arg]);
                break;

            case OP_STORE:
                vars[arg] = pop();
                printf("  STORE var[%d]=%d\n", arg, vars[arg]);
                break;

            case OP_ADD: {
                int b = pop(), a = pop();
                push(a + b);
                printf("  ADD -> %d\n", stack[sp]);
                break;
            }
            case OP_SUB: {
                int b = pop(), a = pop();
                push(a - b);
                printf("  SUB -> %d\n", stack[sp]);
                break;
            }
            case OP_MUL: {
                int b = pop(), a = pop();
                push(a * b);
                printf("  MUL -> %d\n", stack[sp]);
                break;
            }
            case OP_DIV: {
                int b = pop(), a = pop();
                push(a / b);
                printf("  DIV -> %d\n", stack[sp]);
                break;
            }

            /* === 比較 === */
            case OP_CMP_LT: {
                int b = pop(), a = pop();
                push(a < b);
                printf("  CMP_LT -> %d\n", stack[sp]);
                break;
            }
            case OP_CMP_GT: {
                int b = pop(), a = pop();
                push(a > b);
                printf("  CMP_GT -> %d\n", stack[sp]);
                break;
            }
            case OP_CMP_EQ: {
                int b = pop(), a = pop();
                push(a == b);
                printf("  CMP_EQ -> %d\n", stack[sp]);
                break;
            }

            /* === 跳躍 === */
            case OP_JMP_FALSE:
                if (pop() == 0) {
                    pc = arg;
                    printf("  JMP_FALSE -> pc=%d\n", pc);
                    continue;
                }
                break;

            case OP_JMP:
                pc = arg;
                printf("  JMP -> pc=%d\n", pc);
                continue;

            case OP_EOF:
                printf("\n=== Program finished ===\n");
                goto done;

            /* ========== HW3 新增 ========== */

            /* === 程序控制 === */
            case OP_FORK: {
                int pid = fork();
                push(pid);
                printf("  FORK -> pid=%d\n", pid);
                break;
            }

            case OP_EXIT: {
                int code = pop();
                printf("  EXIT(%d)\n", code);
                exit(code);
                break;
            }

            case OP_EXEC: {
                /* arg = 字串池索引 */
                const char* cmd = strpool_get(&strings, arg);
                printf("  EXEC: %s\n", cmd);
                int result = system(cmd);
                push(result);
                printf("  EXEC result=%d\n", result);
                break;
            }

            /* === I/O === */
            case OP_PRINT: {
                const char* s = strpool_get(&strings, arg);
                printf("%s", s);
                out_append(s);
                break;
            }

            case OP_PRINTLN: {
                const char* s = strpool_get(&strings, arg);
                printf("%s\n", s);
                out_append(s);
                out_append("\n");
                break;
            }

            case OP_READ: {
                /* 讀取一行 stdin，存入字串池，回傳索引 */
                char buf[256];
                if (fgets(buf, sizeof(buf), stdin) != NULL) {
                    /* 移除換行 */
                    size_t len = strlen(buf);
                    if (len > 0 && buf[len-1] == '\n') buf[len-1] = '\0';
                    int idx = strpool_add(&strings, buf);
                    push(idx);
                    printf("  READ -> strpool[%d]=\"%s\"\n", idx, buf);
                } else {
                    push(-1);
                }
                break;
            }

            /* === 檔案 I/O === */
            case OP_FOPEN: {
                /* arg 分成兩個部分：filename_idx (高8位) + mode_idx (低8位) */
                int filename_idx = (arg >> 8) & 0xFF;
                int mode_idx = arg & 0xFF;
                const char* fn = strpool_get(&strings, filename_idx);
                const char* mode = strpool_get(&strings, mode_idx);
                FILE* fp = fopen(fn, mode);
                push((int)(intptr_t)fp);
                printf("  FOPEN(\"%s\", \"%s\") -> %p\n", fn, mode, fp);
                break;
            }

            case OP_FREAD: {
                FILE* fp = (FILE*)(intptr_t)pop();
                char buf[256] = {0};
                if (fp && fgets(buf, sizeof(buf), fp) != NULL) {
                    size_t len = strlen(buf);
                    if (len > 0 && buf[len-1] == '\n') buf[len-1] = '\0';
                    int idx = strpool_add(&strings, buf);
                    push(idx);
                    printf("  FREAD -> strpool[%d]=\"%s\"\n", idx, buf);
                } else {
                    push(-1);
                }
                break;
            }

            case OP_FWRITE: {
                FILE* fp = (FILE*)(intptr_t)pop();
                int str_idx = pop();
                const char* s = strpool_get(&strings, str_idx);
                if (fp) {
                    fprintf(fp, "%s", s);
                    push(0);
                    printf("  FWRITE wrote %zu bytes\n", strlen(s));
                } else {
                    push(-1);
                }
                break;
            }

            case OP_FCLOSE: {
                FILE* fp = (FILE*)(intptr_t)pop();
                if (fp) {
                    fclose(fp);
                    printf("  FCLOSE -> 0\n");
                    push(0);
                } else {
                    push(-1);
                }
                break;
            }

            /* === 時間與睡眠 === */
            case OP_TIME: {
                time_t now = time(NULL);
                push((int)now);
                printf("  TIME -> %ld\n", (long)now);
                break;
            }

            case OP_SLEEP: {
                int sec = arg;
                sleep(sec);
                printf("  SLEEP(%d) done\n", sec);
                break;
            }

            /* === 亂數 === */
            case OP_RAND: {
                int max = (arg <= 0) ? 100 : arg;
                int r = rand() % max;
                push(r);
                printf("  RAND(%d) -> %d\n", max, r);
                break;
            }

            /* === 字串操作 === */
            case OP_STRLEN: {
                int idx = pop();
                const char* s = strpool_get(&strings, idx);
                push((int)strlen(s));
                printf("  STRLEN -> %zu\n", strlen(s));
                break;
            }

            case OP_STRCMP: {
                int idx2 = pop();
                int idx1 = pop();
                const char* s1 = strpool_get(&strings, idx1);
                const char* s2 = strpool_get(&strings, idx2);
                push(strcmp(s1, s2));
                printf("  STRCMP(\"%s\", \"%s\") -> %d\n", s1, s2, strcmp(s1, s2));
                break;
            }

            case OP_INT_TO_STR: {
                int val = pop();
                char buf[64];
                snprintf(buf, sizeof(buf), "%d", val);
                int idx = strpool_add(&strings, buf);
                push(idx);
                printf("  INT_TO_STR(%d) -> strpool[%d]\n", val, idx);
                break;
            }

            default:
                fprintf(stderr, "Unknown opcode: %d\n", op);
                return 1;
        }
    }

done:
    /* 輸出收集到的內容 */
    if (out_pos > 0) {
        printf("\n--- Program output ---\n%s", output_buf);
    }

    /* 印出最終變數狀態 */
    printf("\n--- Variables ---\n");
    for (int i = 0; i < var_count; i++)
        printf("  var[%d] = %d\n", i, vars[i]);

    printf("\n--- Stack ---\n");
    for (int i = 0; i <= sp; i++)
        printf("  stack[%d] = %d\n", i, stack[i]);

    return 0;
}