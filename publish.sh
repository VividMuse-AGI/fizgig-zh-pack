#!/bin/bash
# 发布一版新汉化包：打包 → 同步文件 → 提交 → 推送
# 用法：./publish.sh 1.1.1 "补 MOSS/Klein 家族文案"
set -e

VER="${1:?用法: ./publish.sh <版本号> \"<说明>\"}"
NOTES="${2:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(cd "$HERE/../fizgig-zh" && pwd)"

PY="$WORK/../.venv/Scripts/python.exe"
[ -x "$PY" ] || PY="C:/Users/HOWIE/.workbuddy/binaries/python/envs/default/Scripts/python.exe"

echo "== 1. 打包 $VER =="
"$PY" "$WORK/make_zh_pack.py" "$VER" "$NOTES"

echo "== 2. 同步文件 =="
for f in version.json fizgig-zh.js fizgig-zh-dict.js apply_zh.py apply_zh_server.py; do
  cp "$WORK/dist/$f" "$HERE/$f"
  echo "   $f"
done

echo "== 3. 提交 =="
cd "$HERE"
git add -A
git commit -m "zh $VER: ${NOTES:-更新汉化}" || echo "(无变更)"

echo "== 4. 推送 =="
git push

echo "== 完成：zh $VER 已发布（粉丝跑 fizgig-zh-update 即可拿到）=="
