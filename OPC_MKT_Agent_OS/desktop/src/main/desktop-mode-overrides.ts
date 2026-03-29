/**
 * Desktop Mode Overrides — 在 Desktop 模式下对 Agent SKILL.md 的补充指令
 *
 * SKILL.md 是 Standalone CLI 的完整 SOP（含登录、发布等步骤）。
 * Desktop 模式下，登录和发布由 Publishing Hub 负责，
 * Agent 只需专注内容创作 + 配图生成。
 *
 * 本模块返回的覆盖指令会注入到 prompt 中，优先级高于 SOP。
 */

/**
 * 返回 Desktop 模式下对指定 agent 的 SOP 覆盖指令。
 * 返回 null 表示该 agent 无需覆盖。
 */
export function buildDesktopModeOverride(agentId: string): string | null {
  switch (agentId) {
    case 'xhs-agent':
      return XHS_DESKTOP_OVERRIDE
    case 'global-content-agent':
      return GLOBAL_CONTENT_DESKTOP_OVERRIDE
    case 'x-twitter-agent':
      return GENERIC_NO_PUBLISH_OVERRIDE
    case 'email-agent':
      return GENERIC_NO_PUBLISH_OVERRIDE
    case 'visual-gen-agent':
      return VISUAL_GEN_DESKTOP_OVERRIDE
    default:
      return null
  }
}

const XHS_DESKTOP_OVERRIDE = `你正在 Desktop 应用内运行。请遵循以下规则（优先级高于 SOP 中的所有步骤）：

**跳过的步骤（绝对不要执行）：**
- 跳过 Step 0（登录检查）— 登录由 Desktop 的设置页面负责
- 跳过 Step 7（发布）— 发布由 Desktop 的 Publishing Hub 负责
- 不要调用 xhs_check_login 和 xhs_publish_note

**必须执行的步骤：**
- Step 1-4：研究 + 内容创作
- Step 5：配图生成 — 你必须调用 generate_image 工具生成至少 1 张封面图（1:1，1080x1080）。generate_image 是你的已授权工具，直接调用即可，不要输出"需要授权"之类的文字。如果工具调用失败，记录错误继续。
- Step 6：展示完整内容预览

**工具使用规则：**
- generate_image 是你的已授权工具，直接调用即可。不要输出"需要授权 MCP 工具权限"等文字，直接调用工具。
- 如果 xhs_search_top_posts / xhs_get_post_detail 工具可用就使用，不可用就走降级策略（基于记忆库历史模式直接创作）
- 所有写文件操作完成后，你必须在最终回复中包含完整内容（见下方输出格式）

**⚠️ 最终输出格式（强制要求，不可省略）：**
你的最终回复必须以下面的格式输出完整的结构化内容。不要只输出摘要或描述。
Desktop 应用会直接解析你最终回复中的文本。如果你只写"正文（698字）：以对比切入..."这样的概括，系统无法提取到实际内容。

\`\`\`
标题：[完整标题文本，≤20字]

正文：
[在这里输出完整的正文内容，每一个字都要写出来，≤1000字]
[不要用"以XX切入，XX拆解"这样的描述代替正文]
[不要省略，不要用摘要]

标签：#标签1 #标签2 #标签3 #标签4 #标签5

配图：[generate_image 生成的文件路径，如果有的话]
\`\`\`

绝对不要用"正文（698字）：以XXX切入..."这种概括性描述替代实际正文。你必须输出每一个字。`

const GLOBAL_CONTENT_DESKTOP_OVERRIDE = `你正在 Desktop 应用内运行。
- 专注于内容创作和多平台适配，不要尝试发布到任何平台
- 发布由 Desktop 的 Publishing Hub 统一处理
- 最终输出格式化的内容即可`

const GENERIC_NO_PUBLISH_OVERRIDE = `你正在 Desktop 应用内运行。
- 专注于内容创作，不要尝试发布
- 发布由 Desktop 的 Publishing Hub 统一处理`

const VISUAL_GEN_DESKTOP_OVERRIDE = `你正在 Desktop 应用内运行。
- 直接调用 generate_image 工具生成图片，不要输出"需要授权"之类的文字
- generate_image 是你的已授权工具
- 生成完成后输出图片文件路径`
