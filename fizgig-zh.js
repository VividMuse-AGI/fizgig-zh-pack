/* ============================================================
 * Fizgig 中文化层（运行时翻译覆盖）v0.2.0
 * 原理：不改动 Fizgig 源码本体——
 *   1) 加载后用词表把界面文本、placeholder、title 提示替换为中文；
 *   2) MutationObserver 持续翻译后续动态渲染的内容（表单/下拉/登录页/日志区外）；
 *   3) 右下角「中 / EN」悬浮开关（localStorage 记忆，点击刷新切换）；
 *   4) 调试模式可导出"未翻译文本"清单，用于持续补全词表。
 * 依赖：/fizgig-zh-dict.js 提供 window.__FIZGIG_ZH_DICT__ / _RULES_ / _SKIP_
 * ============================================================ */
(function () {
  "use strict";
  var LS_KEY = "fizgig_zh";

  var mode = null;
  try { mode = localStorage.getItem(LS_KEY); } catch (e) {}
  if (mode === null) { mode = "1"; try { localStorage.setItem(LS_KEY, "1"); } catch (e) {} }

  var DICT = window.__FIZGIG_ZH_DICT__ || {};
  var RULES = window.__FIZGIG_ZH_RULES__ || [];
  var SKIP = window.__FIZGIG_ZH_SKIP__ || [];
  var ZH_RE = /[\u4e00-\u9fff]/;

  function makeToggle() {
    if (document.getElementById("fizgig-zh-toggle")) return;
    var b = document.createElement("button");
    b.id = "fizgig-zh-toggle";
    b.type = "button";
    var on = mode === "1";
    b.textContent = on ? "中" : "EN";
    b.title = on ? "当前：中文（点击切换为英文原版）" : "Current: English (click for 中文)";
    b.style.cssText = "position:fixed;right:10px;bottom:10px;z-index:99999;" +
      "padding:4px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.25);" +
      "background:rgba(20,26,34,.85);color:#cfd8e3;font-size:12px;cursor:pointer;opacity:.75";
    b.addEventListener("click", function () {
      try { localStorage.setItem(LS_KEY, on ? "0" : "1"); } catch (e) {}
      location.reload();
    });
    (document.body || document.documentElement).appendChild(b);
  }

  // 英文模式：只保留开关，不做任何翻译
  if (mode === "0") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", makeToggle);
    else makeToggle();
    console.log("[Fizgig-ZH] 英文原版模式（点击右下角按钮可切回中文）");
    return;
  }

  /* ---------------- 工具 ---------------- */
  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }

  function inSkip(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return false;
    for (var i = 0; i < SKIP.length; i++) {
      try { if (el.closest(SKIP[i])) return true; } catch (e) {}
    }
    return false;
  }

  var misses = window.__FIZGIG_ZH_MISSES__ = window.__FIZGIG_ZH_MISSES__ || {};
  var DEBUG = /(^|[?&])zhdebug=1/.test(location.search);

  function looksCandidate(t) {
    if (!t || t.length < 3 || t.length > 400) return false;
    if (!/[A-Za-z]/.test(t)) return false;
    if (ZH_RE.test(t)) return false;
    return true;
  }
  function recordMiss(t) {
    if (!DEBUG || !looksCandidate(t)) return;
    misses[t] = (misses[t] || 0) + 1;
  }

  function translate(str) {
    var key = norm(str);
    if (!key) return null;
    var hit = DICT[key];
    if (hit !== undefined) return hit;
    // 冒号回退：如 "Width:" / "Port：" → 查去掉冒号的主体（中文输出统一用全角冒号）
    var last = key.charAt(key.length - 1);
    if ((last === ":" || last === "：") && key.length > 2) {
      hit = DICT[key.slice(0, -1)];
      if (hit !== undefined) return hit + "：";
    }
    // 符号前缀回退：如 "▼ Training Parameters" / "✨ Identity (…)" / "💡 Tips…"
    // （星形 emoji 是代理对，必须用 /u + \u{...}，不能放进普通字符类）
    var pm = key.match(/^((?:[\u25BC\u25B6\u25C0\u2B06\u2728\u2611\u23F8\u23FA\u23F3]|\u{1F4A1}|\u{1F399}|\u{1F4D6}|\u{1F50A})\uFE0F?\s+)([\s\S]+)$/u);
    if (pm) {
      var inner = translate(pm[2]);
      if (inner !== null) return pm[1] + inner;
    }
    for (var i = 0; i < RULES.length; i++) {
      var m = key.match(RULES[i][0]);
      if (m) {
        var out = RULES[i][1];
        for (var g = 1; g < m.length; g++) {
          out = out.split("$" + g).join(m[g]);
        }
        return out;
      }
    }
    return null;
  }

  /* 防回扫：记录"我们自己写入的值"，MutationObserver 回调时跳过，
     避免纯英文译文（如 "Base DiT *："）被二次扫描误记为未翻译 */
  var sets = new WeakMap();
  function markSet(obj, name, val) {
    var m = sets.get(obj);
    if (!m) { m = {}; sets.set(obj, m); }
    m[name] = val;
  }
  function wasSet(obj, name, val) {
    var m = sets.get(obj);
    return !!(m && m[name] === val);
  }

  function translateTextNode(node) {
    if (node.nodeType !== 3 || inSkip(node)) return;
    var raw = node.nodeValue;
    if (!raw) return;
    if (wasSet(node, "@", raw)) return;
    var m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m || !m[2]) return;
    var zh = translate(m[2]);
    if (zh !== null) {
      node.nodeValue = m[1] + zh + m[3];
      markSet(node, "@", node.nodeValue);
    } else {
      recordMiss(norm(m[2]));
    }
  }

  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  function translateAttrs(el) {
    if (!el || el.nodeType !== 1 || inSkip(el)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (!v) continue;
      if (wasSet(el, ATTRS[i], v)) continue;
      var zh = translate(v);
      if (zh !== null) {
        el.setAttribute(ATTRS[i], zh);
        markSet(el, ATTRS[i], el.getAttribute(ATTRS[i]));
      } else {
        recordMiss(norm(v));
      }
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) translateAttrs(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && inSkip(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 3) translateTextNode(n);
      else translateAttrs(n);
    }
  }

  /* ---------------- 批处理调度 ---------------- */
  var queued = [];
  var scheduled = false;
  function queue(root) {
    if (!root) return;
    queued.push(root);
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        var batch = queued; queued = [];
        for (var i = 0; i < batch.length; i++) walk(batch[i]);
      }, 0);
    }
  }

  function start() {
    makeToggle();
    walk(document.body);
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === "childList") {
          if (mu.addedNodes) for (var j = 0; j < mu.addedNodes.length; j++) queue(mu.addedNodes[j]);
        } else if (mu.type === "characterData") {
          queue(mu.target);
        } else if (mu.type === "attributes") {
          queue(mu.target);
        }
      }
    });
    obs.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    console.log("[Fizgig-ZH] 汉化层 v0.2 已启用 · 词条 " + Object.keys(DICT).length + " 条" +
      (DEBUG ? " · 调试模式：fizgigZhDump() 导出未翻译清单" : ""));
  }

  window.fizgigZhDump = function () { console.log(JSON.stringify(misses, null, 2)); return misses; };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
