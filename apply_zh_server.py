#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fizgig 汉化层 · server.py 白名单补丁（幂等）

官方 server.py 的静态服务是白名单制，只放行 /app.js、/style.css、/qrcode.js。
本补丁把汉化层两个文件加入该白名单，使浏览器能加载 /fizgig-zh.js 与 /fizgig-zh-dict.js。

用法：
    python3 apply_zh_server.py [repo_dir]     # repo_dir 默认 /root/Fizgig

退出码：0 = 已应用/已存在 ｜ 1 = 文件缺失 ｜ 2 = 目标行未命中（上游结构变化，需人工）
"""
import sys
from pathlib import Path

OLD = 'if path in ("/app.js", "/style.css", "/qrcode.js"):'
NEW = 'if path in ("/app.js", "/style.css", "/qrcode.js", "/fizgig-zh.js", "/fizgig-zh-dict.js"):'


def main():
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else "/root/Fizgig")
    sp = repo / "src" / "fizgig" / "web" / "server.py"
    if not sp.exists():
        print(f"!! 未找到 {sp}")
        return 1
    s = sp.read_text(encoding="utf-8")
    if NEW in s:
        print("server.py 补丁已存在（跳过）")
        return 0
    if OLD not in s:
        print("!! 未找到目标行（上游结构可能已变化），补丁未应用")
        return 2
    s = s.replace(OLD, NEW, 1)
    sp.write_text(s, encoding="utf-8")
    print("server.py 白名单补丁已应用")
    return 0


if __name__ == "__main__":
    sys.exit(main())
