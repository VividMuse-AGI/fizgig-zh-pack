#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fizgig 汉化层部署脚本（幂等）
用法：
  python apply_zh.py <static目录>          # 复制汉化文件 + 注入 index.html
  python apply_zh.py <static目录> --revert # 移除注入（汉化文件保留，可再注入）
目标 static 目录示例：
  本地快照:  ./upstream
  云实例:    /root/Fizgig/src/fizgig/web/static
"""
import sys
from pathlib import Path

SRC = Path(__file__).parent
FILES = ["fizgig-zh.js", "fizgig-zh-dict.js"]
MARK = "fizgig-zh.js"
ANCHOR = '<script src="/app.js" onerror="fizgigRetry(this)"></script>'
INJECT = (
    ANCHOR + "\n"
    '  <script src="/fizgig-zh-dict.js" onerror="fizgigRetry(this)"></script>\n'
    '  <script src="/fizgig-zh.js" onerror="fizgigRetry(this)"></script>'
)


def main():
    args = [a for a in sys.argv[1:]]
    revert = "--revert" in args
    args = [a for a in args if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    target = Path(args[0])
    if not target.is_dir():
        print(f"!! 目标目录不存在: {target}")
        sys.exit(1)

    idx = target / "index.html"
    if not idx.exists():
        print(f"!! 未找到 {idx}")
        sys.exit(1)

    if revert:
        s = idx.read_text(encoding="utf-8")
        if MARK not in s:
            print("index.html 未注入过，无需回退")
            return
        s = s.replace(INJECT, ANCHOR)
        idx.write_text(s, encoding="utf-8")
        print("已回退 index.html 注入（汉化文件仍在，可重新注入）")
        return

    # 1) 拷贝汉化文件
    for f in FILES:
        src = SRC / f
        if not src.exists():
            print(f"!! 缺少源文件 {src}")
            sys.exit(1)
        (target / f).write_bytes(src.read_bytes())
        print(f"已复制 {f} -> {target}")

    # 2) 注入 index.html（幂等）
    s = idx.read_text(encoding="utf-8")
    if MARK in s:
        print("index.html 已注入过（跳过，如需更新词表重启服务/强刷即可）")
    else:
        if ANCHOR not in s:
            print("!! 未找到锚点（app.js 那行），请人工检查 index.html 结构")
            sys.exit(2)
        s = s.replace(ANCHOR, INJECT, 1)
        idx.write_text(s, encoding="utf-8")
        print("已注入 index.html（词表 + 引擎）")
    print("完成。")


if __name__ == "__main__":
    main()
