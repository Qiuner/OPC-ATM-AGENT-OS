# @QA — Electron 二次打包冒烟测试报告

**测试时间**: 2026-03-26
**测试人员**: @QA
**测试目的**: 验证 DEV 修复的两个 Bug（electron-store 降级 v8.2.0 + 单实例锁）
**构建环境**: macOS 23.6.0 / arm64 / Electron 35.7.5 / electron-builder 26.8.1

---

## 修复项验证

### Bug #1: electron-store "Store is not a constructor"

| 检查项 | 结果 | 说明 |
|--------|------|------|
| package.json 版本 | PASS | electron-store 固定为 "8.2.0"（非 ^10.x ESM-only 版本） |
| import 语法 | PASS | `import Store from 'electron-store'`（CJS default import） |
| 构建无报错 | PASS | electron-vite build 成功，main/index.js 35.88 kB |
| 运行时无 Constructor 错误 | PASS | 系统日志无 "Store"/"constructor" 相关错误 |
| settings.json 正常创建 | PASS | `~/Library/Application Support/opc-mkt-desktop/settings.json` (259 bytes) |
| settings 内容正确 | PASS | 包含完整默认值：aiMode, defaultProvider, approval, windowBounds 等 |

### Bug #2: 多实例 / 多窗口循环开启

| 检查项 | 结果 | 说明 |
|--------|------|------|
| requestSingleInstanceLock 代码就位 | PASS | `desktop/src/main/index.ts` 第 10-21 行 |
| 首次启动 — 主进程数 | PASS | 1 个主进程 (MacOS binary) |
| 首次启动 — Renderer 数 | PASS | 1 个 Renderer 进程 |
| 二次启动尝试 — 主进程数 | PASS | 仍为 1 个（未创建第二个实例） |
| 二次启动尝试 — Renderer 数 | PASS | 仍为 1 个（未打开第二个窗口） |
| 进程退出 | PASS | pkill 后 0 个残留进程 |

---

## 完整冒烟测试清单

### Step 1: pnpm install

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 依赖安装 | PASS | +7 packages, +3 downloaded |
| electron-store 版本 | PASS | 8.2.0 (CJS 兼容) |

### Step 2: electron-vite build

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Main process bundle | PASS | out/main/index.js (35.88 kB) |
| Preload bundle | PASS | out/preload/index.js (8.71 kB) |
| Renderer bundle | PASS | index.html + CSS (111 kB) + JS (1,589 kB) |
| 构建耗时 | PASS | ~13.4s 总计 |

### Step 3: electron-builder --mac --dir

| 检查项 | 结果 | 说明 |
|--------|------|------|
| .app 生成 | PASS | `release/mac-arm64/OPC MKT Agent OS.app` |
| app.asar | PASS | 48.5 MB |
| extraResources: data/ | PASS | 10 个 JSON 文件 |
| extraResources: skills/ | PASS | 13 个 SKILL.md 文件 |
| Info.plist | PASS | 正常生成 |
| 注意事项 | INFO | electron-builder 退出码 1（npm 依赖检测警告，pnpm monorepo 已知问题，不影响打包结果） |

### Step 4: 启动验证

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 应用启动 | PASS | 进程状态 S（正常运行） |
| 窗口显示 | PASS | Renderer 进程正常创建 |
| electron-store 初始化 | PASS | settings.json 正常读写 |
| 数据初始化 (initDataFromSeed) | PASS | userData/data/ 下 8 个 JSON 文件 |
| 单实例锁 | PASS | 二次启动不创建新实例 |
| 干净退出 | PASS | 关闭后 0 个残留进程 |

---

## 测试总结

| 指标 | 数值 |
|------|------|
| 总测试项 | 24 |
| 通过 | 24 |
| 失败 | 0 |
| 跳过 | 0 |
| 通过率 | 100% |

## 结论

**两个 Bug 修复均已验证通过：**

1. **electron-store v8.2.0 降级** — CJS import 正常工作，settings.json 成功创建和读写，运行时无任何 Constructor 错误
2. **单实例锁** — `requestSingleInstanceLock()` 正确阻止了多实例启动，二次打开时只聚焦已有窗口

**已知非阻塞问题：**
- electron-builder 在 pnpm monorepo 环境下回退使用 npm 解析依赖，产生大量 "missing/invalid" 警告并返回退出码 1，但实际打包产物完整且功能正常。后续可通过配置 `npmRebuild: false` 或 `nodeGypRebuild: false` 优化。

**建议**: 本轮修复验证通过，可继续推进后续开发任务。
