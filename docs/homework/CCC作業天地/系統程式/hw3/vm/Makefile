CC = gcc
CFLAGS = -Wall -Wextra -std=c99

TEST_SRC = tests/test_fork.c tests/test_print.c tests/test_file.c tests/test_time.c tests/test_exec.c

all: test_fork test_print test_file test_time test_exec

test_fork: tests/test_fork.c
	$(CC) $(CFLAGS) -o $@ $<

test_print: tests/test_print.c
	$(CC) $(CFLAGS) -o $@ $<

test_file: tests/test_file.c
	$(CC) $(CFLAGS) -o $@ $<

test_time: tests/test_time.c
	$(CC) $(CFLAGS) -o $@ $<

test_exec: tests/test_exec.c
	$(CC) $(CFLAGS) -o $@ $<

clean:
	rm -f test_fork test_print test_file test_time test_exec
	rm -f test_output.txt

test_all: all
	@echo "=== Running fork test ==="
	./test_fork
	@echo ""
	@echo "=== Running print test ==="
	./test_print
	@echo ""
	@echo "=== Running file test ==="
	./test_file
	@echo ""
	@echo "=== Running time test ==="
	./test_time
	@echo ""
	@echo "=== Running exec test ==="
	./test_exec
	@echo ""
	@echo "=== All tests done ==="

.PHONY: all clean test_all