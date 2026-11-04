#!/bin/bash
# 发布一版新汉化包：打包 → 同步文件 → 提交 → 推送
# 用法：./publish.sh 1.1.1 "补 MOSS/Klein 家族文案"
#
# 说明：本机 SSH 到 GitHub 的 22/443 会被代理拦截，因此推送优先走 HTTPS，
#      凭据从系统凭据库读取（git credential fill），不写盘、不回显。
set -e

VER="${1:?用法: ./publish.sh <版本号> \"<说明>\"}"
NOTES="${2:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(cd "$HERE/../fizgig-zh" && pwd)"
REPO="VividMuse-AGI/fizgig-zh-pack"
BRANCH="main"

PY="C:/Users/HOWIE/.workbuddy/binaries/python/envs/default/Scripts/python.exe"
[ -x "$PY" ] || PY="python"

echo "== 1. 打包 zh $VER =="
"$PY" "$WORK/make_zh_pack.py" "$VER" "$NOTES"

echo "== 2. 同步文件 =="
for f in version.json fizgig-zh.js fizgig-zh-dict.js apply_zh.py apply_zh_server.py; do
  cp "$WORK/dist/$f" "$HERE/$f"
  echo "   $f"
done

echo "== 3. 提交 =="
cd "$HERE"
git add -A
git commit -m "zh $VER: ${NOTES:-更新汉化}" || echo "   （无变更）"

echo "== 4. 推送 =="
TOK=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
if [ -n "$TOK" ]; then
  AUTH="Basic $(printf '%s' "VividMuse-AGI:$TOK" | base64 -w0)"
  umask 077
  CFG="/tmp/.gitgh.$$"
  printf '[http]\n\textraheader = Authorization: %s\n' "$AUTH" > "$CFG"
  GIT_CONFIG_GLOBAL="$CFG" GIT_TERMINAL_PROMPT=0 \
    git push "https://github.com/$REPO.git" "HEAD:$BRANCH"
  rm -f "$CFG"
else
  echo "   无凭据 → 尝试 SSH"
  git push origin "HEAD:$BRANCH"
fi

echo "== 完成：zh $VER 已发布（粉丝跑 fizgig-zh-update 即可拿到）=="
