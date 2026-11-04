# fizgig-zh-pack

**Fizgig 中文界面汉化包（热更新分发源）**

这个仓库只做一件事：让已经部署的 Fizgig 镜像**不用重新制作、不用重新审核**就能拿到最新中文译文。

## 文件

| 文件 | 作用 |
|---|---|
| `version.json` | 版本号 + 每个文件的 sha256（更新器据此判断与校验） |
| `fizgig-zh.js` | 汉化引擎（DOM 翻译、中/EN 切换、未译串记录） |
| `fizgig-zh-dict.js` | 中文词表 + 动态规则 |
| `apply_zh.py` | 注入脚本（向 `index.html` 插入两行 script） |
| `apply_zh_server.py` | 白名单补丁（让 `server.py` 放行汉化 js） |

## 客户端怎么用

镜像内已装好命令：

```bash
fizgig-zh-update            # 检查并更新（有新版才动）
fizgig-zh-update --check    # 只看有没有新版
fizgig-zh-update --restart  # 更新后自动重启 Fizgig
```

更新流程：拉 `version.json` → 按 sha256 校验每个文件 → 备份当前版本 → 原子替换 → 重新注入/打补丁 → 验证注入存在 → 失败自动回滚。

分发源配置在镜像内 `/root/fizgig-zh-deploy/source.json`，按顺序尝试，任一可用即可：

```json
{"sources": [
  "https://raw.githubusercontent.com/VividMuse-AGI/fizgig-zh-pack/main",
  "https://cdn.jsdelivr.net/gh/VividMuse-AGI/fizgig-zh-pack@main",
  "https://gh-proxy.com/https://raw.githubusercontent.com/VividMuse-AGI/fizgig-zh-pack/main"
]}
```

## 怎么发新版

```bash
# 1. 在本地汉化工作区打包（版本号建议递增，如 1.1.1）
python make_zh_pack.py 1.1.1 "补 MOSS/Klein 家族文案"

# 2. 把 dist/ 里的 5 个文件同步到本仓库
#    （或直接运行本仓库的 publish.sh <版本号> "<说明>"）

# 3. 提交推送
git add -A && git commit -m "zh 1.1.1: 补 MOSS/Klein 家族文案" && git push
```

版本号规则：数字递增，支持预发布后缀（`1.1.0-test1 < 1.1.0`）。

> 说明：仓库内容为原创中文译文与注入脚本，Fizgig 本体（Apache-2.0）不在此仓库内。
