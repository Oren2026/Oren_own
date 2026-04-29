#!/usr/bin/env python3
# update.py — 跨平台更新腳本（Windows/Mac/Linux Ubuntu）
"""
hiwin_pool 更新腳本

功能：
  1. git pull 拉取最新程式碼
  2. 顯示版本差異（local vs remote）
  3. 簡單版本比對

用法：
  python update.py
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.resolve()


def run(cmd, capture=True):
    """執行 shell 命令"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=REPO_ROOT,
            capture_output=capture,
            text=True,
        )
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)


def get_local_version():
    """讀取 local version"""
    version_file = REPO_ROOT / "config" / "version"
    if version_file.exists():
        content = version_file.read_text()
        for line in content.splitlines():
            if "__version__" in line:
                # 解析 __version__ = "0.1.0"
                import re
                m = re.search(r'"([^"]+)"', line)
                if m:
                    return m.group(1)
    return "unknown"


def get_remote_version():
    """嘗試取得 remote 最新版本標籤"""
    # 取 remote 最新 commit 的 hash（簡單當作 version）
    code, out, err = run("git fetch --quiet 2>&1")
    if code != 0:
        return "unknown (git fetch failed)"

    code, tag_out, _ = run("git describe --tags --abbrev=0 2>/dev/null || echo ''")
    tag = tag_out.strip()

    code, sha_out, _ = run("git rev-parse --short HEAD")
    sha = sha_out.strip()

    if tag:
        return f"{tag} ({sha})" if sha else tag
    return sha if sha else "unknown"


def check_git_status():
    """檢查 git 狀態"""
    code, out, err = run("git status --short")
    if code != 0:
        print(f"[!] git 不可用：{err}")
        return False
    if out.strip():
        print(f"[!] 本地有未提交的變更：")
        for line in out.strip().splitlines():
            print(f"    {line}")
        return False
    return True


def git_pull():
    """執行 git pull"""
    print("\n執行 git pull...")
    code, out, err = run("git pull --rebase --autostash")
    if code == 0:
        print(f"[✓] 更新成功")
        print(out)
        return True
    else:
        print(f"[✗] 更新失敗：{err}")
        return False


def main():
    print("=" * 60)
    print("  hiwin_pool Update")
    print("=" * 60)

    # 檢查是否為 git 專案
    if not (REPO_ROOT / ".git").exists():
        print("[!] 此目錄不是 git 專案，無法使用 update.py")
        sys.exit(1)

    # 顯示版本
    local = get_local_version()
    remote = get_remote_version()
    print(f"\n版本資訊：")
    print(f"  Local：{local}")
    print(f"  Remote：{remote}")

    # 檢查狀態
    if not check_git_status():
        print("\n[!] 建議：先 commit 或 stash 你的變更，再執行更新")
        proceed = input("是否繼續？ [y/N]: ").strip().lower()
        if proceed not in ("y", "yes"):
            print("取消更新")
            sys.exit(0)

    # 嘗試 fetch 並比較
    code, fetch_out, _ = run("git fetch --quiet 2>&1")
    if code == 0:
        code, diff_out, _ = run("git log HEAD..origin/HEAD --oneline 2>/dev/null || git log HEAD..origin --oneline 2>/dev/null || echo ''")
        if diff_out.strip():
            print(f"\n即將拉取 {len(diff_out.strip().splitlines())} 個 commit：")
            for line in diff_out.strip().splitlines()[:10]:
                print(f"  {line}")
            if len(diff_out.strip().splitlines()) > 10:
                print(f"  ... 還有更多")
        else:
            print("\n[+] 已是最新，無需更新")

    # 執行更新
    success = git_pull()

    if success:
        new_local = get_local_version()
        print(f"\n完成！")
        print(f"  新版本：{new_local}")

        # 檢查 requirements.txt 是否有變化
        req = REPO_ROOT / "requirements.txt"
        if req.exists():
            code, out, _ = run("git diff HEAD -- requirements.txt")
            if out.strip():
                print("\n[!] requirements.txt 有變化，建議執行：")
                print("    pip install -r requirements.txt")

    print("\n完成！")


if __name__ == "__main__":
    main()