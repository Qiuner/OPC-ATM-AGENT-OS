/**
 * Phase 1.5 集成测试 — Approval Center 优化
 *
 * node:test + node:assert 源码静态检查
 *
 * 覆盖范围：
 * - Settings API 扩展（approval mode + autoThreshold）
 * - DELETE /api/contents/[id] 删除接口
 * - Approval Center UI（批量操作、全选、对话框）
 * - Pipeline Status Bar（T1.5-04）
 * - 审批模式切换 Auto/Manual（T1.5-05）
 * - 列表快速操作 + 删除功能（T1.5-06）
 * - Mock 数据 brandScore（T1.5-07）
 * - 回归测试（已有批量通过/拒绝、全选）
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const WEB_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/web";
const APPROVAL_PAGE = join(WEB_DIR, "src/app/approval/page.tsx");
const SETTINGS_API = join(WEB_DIR, "src/app/api/settings/route.ts");
const CONTENTS_ID_ROUTE = join(WEB_DIR, "src/app/api/contents/[id]/route.ts");
const CONTENTS_STORE = join(WEB_DIR, "src/lib/store/contents.ts");
const APPROVALS_STORE = join(WEB_DIR, "src/lib/store/approvals.ts");
const TYPES_FILE = join(WEB_DIR, "src/types/index.ts");

function readSrc(path: string): string {
  return readFileSync(path, "utf-8");
}

// ============================================================
// 一、Settings API — approval 配置扩展
// ============================================================

describe("Settings API — Approval Config (T1.5-02)", () => {
  const src = readSrc(SETTINGS_API);

  it("TC-1.5-01: Settings API 文件存在", () => {
    assert.ok(existsSync(SETTINGS_API), "Settings API route missing");
  });

  it("TC-1.5-02: Settings 包含 approval.mode 字段（auto/manual）", () => {
    assert.ok(
      src.includes('"auto"') && src.includes('"manual"'),
      "Missing approval mode types (auto/manual)"
    );
  });

  it("TC-1.5-03: Settings 包含 autoThreshold 字段", () => {
    assert.ok(
      src.includes("autoThreshold"),
      "Missing autoThreshold field in Settings"
    );
  });

  it("TC-1.5-04: 默认 approval 配置 — manual mode, threshold 7", () => {
    assert.ok(
      src.includes('mode: "manual"'),
      "Default approval mode should be 'manual'"
    );
    assert.ok(
      src.includes("autoThreshold: 7"),
      "Default autoThreshold should be 7"
    );
  });

  it("TC-1.5-05: GET 返回 approval 默认值", () => {
    // readSettings() should inject approval defaults if missing
    assert.ok(
      src.includes("!settings.approval"),
      "Missing approval defaults injection in readSettings()"
    );
  });

  it("TC-1.5-06: PUT merge 逻辑保留已有设置", () => {
    assert.ok(
      src.includes("{ ...current, ...body }"),
      "Missing merge logic in PUT handler"
    );
  });
});

// ============================================================
// 二、DELETE API — /api/contents/[id]
// ============================================================

describe("DELETE API — /api/contents/[id] (T1.5-03)", () => {
  const routeSrc = readSrc(CONTENTS_ID_ROUTE);
  const storeSrc = readSrc(CONTENTS_STORE);

  it("TC-1.5-07: DELETE handler 存在", () => {
    assert.ok(
      routeSrc.includes("export async function DELETE"),
      "Missing DELETE handler in contents/[id]/route.ts"
    );
  });

  it("TC-1.5-08: DELETE 调用 deleteContent", () => {
    assert.ok(
      routeSrc.includes("deleteContent"),
      "DELETE handler should call deleteContent"
    );
  });

  it("TC-1.5-09: deleteContent 从 store 中移除记录", () => {
    assert.ok(
      storeSrc.includes("items.filter((item) => item.id !== id)"),
      "deleteContent should filter out the item by id"
    );
  });

  it("TC-1.5-10: deleteContent 不存在时抛错", () => {
    assert.ok(
      storeSrc.includes("Content not found"),
      "deleteContent should throw when content not found"
    );
  });

  it("TC-1.5-11: DELETE 返回 404 when not found", () => {
    assert.ok(
      routeSrc.includes("404"),
      "DELETE should return 404 for missing content"
    );
  });

  it("TC-1.5-12: DELETE 关联审批记录级联删除", () => {
    const approvalStoreSrc = readSrc(APPROVALS_STORE);
    assert.ok(
      approvalStoreSrc.includes("deleteApprovalsByContentId"),
      "Missing deleteApprovalsByContentId in approvals store"
    );
    assert.ok(
      routeSrc.includes("deleteApprovalsByContentId"),
      "Missing cascade delete call in DELETE handler"
    );
  });
});

// ============================================================
// 三、Pipeline Status Bar (T1.5-04)
// ============================================================

describe("Pipeline Status Bar (T1.5-04)", () => {
  const src = readSrc(APPROVAL_PAGE);

  it("TC-1.5-13: Pipeline Status Bar 组件存在", () => {
    assert.ok(src.includes("PIPELINE_STAGES"), "Missing PIPELINE_STAGES definition");
    assert.ok(src.includes("PipelineStageKey"), "Missing PipelineStageKey type");
    assert.ok(src.includes("PipelineStageDef"), "Missing PipelineStageDef interface");
  });

  it("TC-1.5-14: Pipeline 7 个阶段完整定义", () => {
    const stages = ["generating", "adapting", "ai-review", "pending", "approved", "publishing", "published"];
    for (const stage of stages) {
      assert.ok(src.includes(`"${stage}"`), `Missing pipeline stage: ${stage}`);
    }
  });

  it("TC-1.5-15: Pipeline 各阶段带图标和数量", () => {
    assert.ok(src.includes("stage.icon"), "Missing stage icon rendering");
    assert.ok(src.includes("stageCounts"), "Missing stageCounts for stage quantities");
    assert.ok(src.includes("stage.label"), "Missing stage label rendering");
  });

  it("TC-1.5-44: Pipeline 点击阶段筛选", () => {
    assert.ok(src.includes("handleStageFilter"), "Missing handleStageFilter function");
    assert.ok(src.includes("activeStage"), "Missing activeStage state");
    assert.ok(
      src.includes("item.pipelineStage === activeStage"),
      "Missing pipeline stage filter logic"
    );
  });

  it("TC-1.5-45: Pipeline 阶段间连接箭头", () => {
    assert.ok(src.includes("ChevronRight"), "Missing ChevronRight connector between stages");
  });
});

// ============================================================
// 四、审批模式切换 Auto/Manual (T1.5-05)
// ============================================================

describe("Approval Mode Toggle — Auto/Manual (T1.5-05)", () => {
  const src = readSrc(APPROVAL_PAGE);

  it("TC-1.5-16: Auto/Manual 模式状态管理", () => {
    assert.ok(src.includes("ApprovalMode"), "Missing ApprovalMode type");
    assert.ok(src.includes("approvalMode"), "Missing approvalMode state");
    assert.ok(src.includes("setApprovalMode"), "Missing setApprovalMode setter");
    assert.ok(src.includes("handleModeToggle"), "Missing handleModeToggle function");
  });

  it("TC-1.5-17: 自动审批逻辑 — brandScore >= autoThreshold 且无 risk", () => {
    assert.ok(src.includes("autoThreshold"), "Missing autoThreshold state");
    assert.ok(
      src.includes("brandScore >= autoThreshold"),
      "Missing auto-approval threshold comparison"
    );
    assert.ok(
      src.includes("!item.risk"),
      "Missing risk check in auto-approval logic"
    );
  });

  it("TC-1.5-18: Settings 持久化 — /api/settings 调用", () => {
    assert.ok(src.includes("/api/settings"), "Missing /api/settings API call");
    assert.ok(src.includes("fetchSettings"), "Missing fetchSettings function");
  });

  it("TC-1.5-46: 模式切换确认对话框", () => {
    assert.ok(
      src.includes("Switch Approval Mode"),
      "Missing mode switch confirmation dialog title"
    );
    assert.ok(
      src.includes("Confirm Switch"),
      "Missing confirm switch button text"
    );
  });

  it("TC-1.5-47: Auto 模式 UI 提示 — Score >= 7 auto-approved", () => {
    assert.ok(
      src.includes("auto-approved"),
      "Missing auto-approved label in UI"
    );
  });

  it("TC-1.5-51: 自动审批 reviewer 为 brand-reviewer-agent", () => {
    assert.ok(
      src.includes("brand-reviewer-agent"),
      "Missing brand-reviewer-agent as auto-approval reviewer"
    );
  });
});

// ============================================================
// 五、快速操作按钮 (T1.5-06)
// ============================================================

describe("Quick Actions — Hover Buttons (T1.5-06)", () => {
  const src = readSrc(APPROVAL_PAGE);

  it("TC-1.5-19: 列表行 hover 快速操作按钮", () => {
    assert.ok(src.includes("group-hover:opacity-100"), "Missing group-hover opacity transition");
    assert.ok(src.includes("opacity-0"), "Missing initial opacity-0 for hover actions");
    assert.ok(src.includes("Hover quick actions"), "Missing hover quick actions comment marker");
  });

  it("TC-1.5-20: 快速操作 — Approve/Reject/Delete 三个按钮", () => {
    assert.ok(src.includes('title="Approve"'), "Missing Approve quick action button");
    assert.ok(src.includes('title="Reject"'), "Missing Reject quick action button");
    assert.ok(src.includes('title="Delete"'), "Missing Delete quick action button");
    assert.ok(src.includes("Check"), "Missing Check icon for approve");
    assert.ok(src.includes("Trash2"), "Missing Trash2 icon for delete");
  });

  it("TC-1.5-21: 单条删除确认对话框", () => {
    assert.ok(src.includes("deleteConfirm"), "Missing deleteConfirm state");
    assert.ok(src.includes("openDeleteConfirm"), "Missing openDeleteConfirm function");
    assert.ok(src.includes("handleConfirmDelete"), "Missing handleConfirmDelete function");
    assert.ok(
      src.includes("This action cannot be undone"),
      "Missing delete warning text"
    );
  });

  it("TC-1.5-22: 批量删除功能", () => {
    assert.ok(src.includes("openBulkDeleteConfirm"), "Missing openBulkDeleteConfirm function");
    assert.ok(src.includes("Bulk Delete"), "Missing Bulk Delete button text");
  });

  it("TC-1.5-48: 删除调用 DELETE API", () => {
    assert.ok(
      src.includes('method: "DELETE"'),
      "Missing DELETE method call to API"
    );
  });

  it("TC-1.5-49: 删除后从列表移除", () => {
    assert.ok(
      src.includes("prev.filter((i) => !deleteConfirm.ids.includes(i.id))"),
      "Missing item removal after delete"
    );
  });
});

// ============================================================
// 六、Mock 数据更新 (T1.5-07)
// ============================================================

describe("Mock Data — brandScore & Pipeline Stages (T1.5-07)", () => {
  const src = readSrc(APPROVAL_PAGE);

  it("TC-1.5-23: Mock 数据包含 brandScore 字段", () => {
    assert.ok(src.includes("brandScore:"), "Missing brandScore field in mock data");
    // Verify various score values exist
    assert.ok(src.includes("8.2"), "Missing brandScore 8.2 in mock data");
    assert.ok(src.includes("6.5"), "Missing brandScore 6.5 in mock data");
    assert.ok(src.includes("4.2"), "Missing brandScore 4.2 (low score) in mock data");
  });

  it("TC-1.5-24: Mock 数据包含 pipelineStage 字段", () => {
    assert.ok(src.includes("pipelineStage:"), "Missing pipelineStage field in mock data");
    // Verify mock items span multiple stages
    assert.ok(src.includes('"generating"'), "Missing generating stage mock item");
    assert.ok(src.includes('"adapting"'), "Missing adapting stage mock item");
    assert.ok(src.includes('"ai-review"'), "Missing ai-review stage mock item");
    assert.ok(src.includes('"publishing"'), "Missing publishing stage mock item");
    assert.ok(src.includes('"published"'), "Missing published stage mock item");
  });

  it("TC-1.5-50: brandScore 颜色分级 — >= 7 cyan, >= 5 amber, < 5 red", () => {
    assert.ok(src.includes("brandScore >= 7"), "Missing brandScore >= 7 threshold");
    assert.ok(src.includes("brandScore >= 5"), "Missing brandScore >= 5 threshold");
    assert.ok(
      src.includes("bg-[#22d3ee]") && src.includes("bg-amber-500") && src.includes("bg-red-500"),
      "Missing color-coded score badges"
    );
  });
});

// ============================================================
// 七、回归测试 — 已有功能
// ============================================================

describe("Regression — Existing Features", () => {
  const src = readSrc(APPROVAL_PAGE);

  it("TC-1.5-25: 批量通过功能", () => {
    assert.ok(
      src.includes("Bulk Approve") || src.includes("批量通过"),
      "Missing bulk approve button"
    );
    assert.ok(
      src.includes("openBulkDialog") || src.includes("submitBulkDecision"),
      "Missing bulk dialog logic"
    );
  });

  it("TC-1.5-26: 批量拒绝功能", () => {
    assert.ok(
      src.includes("Bulk Reject") || src.includes("批量拒绝"),
      "Missing bulk reject button"
    );
  });

  it("TC-1.5-27: 全选 checkbox 功能", () => {
    assert.ok(src.includes("toggleAllPending"), "Missing toggleAllPending function");
  });

  it("TC-1.5-28: 审批确认对话框 — Dialog 组件", () => {
    assert.ok(src.includes("Dialog"), "Missing Dialog component");
    assert.ok(src.includes("DialogContent"), "Missing DialogContent");
    assert.ok(src.includes("DialogHeader"), "Missing DialogHeader");
    assert.ok(src.includes("DialogFooter"), "Missing DialogFooter");
  });

  it("TC-1.5-29: 审批确认对话框 — 通过/退回", () => {
    assert.ok(
      src.includes("确认通过") || src.includes("approve"),
      "Missing approve confirmation logic"
    );
    assert.ok(
      src.includes("退回修改") || src.includes("reject"),
      "Missing reject confirmation logic"
    );
  });

  it("TC-1.5-30: 退回必填原因校验", () => {
    assert.ok(
      src.includes("退回时必须填写原因") || src.includes("Rejection reason is required"),
      "Missing reject comment validation"
    );
  });

  it("TC-1.5-31: Optimistic UI 更新", () => {
    assert.ok(
      src.includes("Optimistic") || src.includes("optimistic"),
      "Missing optimistic update pattern (comment marker)"
    );
  });

  it("TC-1.5-32: 审批记录历史", () => {
    assert.ok(src.includes("fetchApprovalHistory"), "Missing fetchApprovalHistory function");
    assert.ok(src.includes("approvalHistory"), "Missing approvalHistory state");
  });

  it("TC-1.5-33: 风险检测展示", () => {
    assert.ok(
      src.includes("Risk") || src.includes("风险"),
      "Missing risk detection display"
    );
    assert.ok(
      src.includes("Safe") || src.includes("安全"),
      "Missing safe detection display"
    );
  });

  it("TC-1.5-34: Tab 筛选 — all/pending/approved/rejected", () => {
    assert.ok(src.includes('"all"'), "Missing 'all' tab");
    assert.ok(src.includes('"pending"'), "Missing 'pending' tab");
    assert.ok(src.includes('"approved"'), "Missing 'approved' tab");
    assert.ok(src.includes('"rejected"'), "Missing 'rejected' tab");
  });

  it("TC-1.5-35: 内容预览面板", () => {
    assert.ok(
      src.includes("Content Preview") || src.includes("selected.body"),
      "Missing content preview panel"
    );
  });

  it("TC-1.5-36: API 集成 — /api/contents + /api/approvals", () => {
    assert.ok(src.includes("/api/contents"), "Missing /api/contents API call");
    assert.ok(src.includes("/api/approvals"), "Missing /api/approvals API call");
  });
});

// ============================================================
// 八、DELETE API 回归
// ============================================================

describe("Regression — API Routes", () => {
  it("TC-1.5-37: Approve API 存在", () => {
    const path = join(WEB_DIR, "src/app/api/contents/[id]/approve/route.ts");
    assert.ok(existsSync(path), "Missing approve API route");
    const src = readSrc(path);
    assert.ok(src.includes("approved"), "Approve route should set status to approved");
  });

  it("TC-1.5-38: Reject API 存在", () => {
    const path = join(WEB_DIR, "src/app/api/contents/[id]/reject/route.ts");
    assert.ok(existsSync(path), "Missing reject API route");
    const src = readSrc(path);
    assert.ok(src.includes("rejected"), "Reject route should set status to rejected");
  });

  it("TC-1.5-39: Approvals API GET/POST", () => {
    const path = join(WEB_DIR, "src/app/api/approvals/route.ts");
    assert.ok(existsSync(path), "Missing approvals API route");
    const src = readSrc(path);
    assert.ok(src.includes("export async function GET"), "Missing GET handler");
    assert.ok(src.includes("export async function POST"), "Missing POST handler");
  });

  it("TC-1.5-40: Contents API GET/POST/PUT/DELETE", () => {
    const listRoute = readSrc(join(WEB_DIR, "src/app/api/contents/route.ts"));
    const idRoute = readSrc(CONTENTS_ID_ROUTE);
    assert.ok(listRoute.includes("export async function GET"), "Missing GET in contents list");
    assert.ok(listRoute.includes("export async function POST"), "Missing POST in contents list");
    assert.ok(idRoute.includes("export async function GET"), "Missing GET in contents/[id]");
    assert.ok(idRoute.includes("export async function PUT"), "Missing PUT in contents/[id]");
    assert.ok(idRoute.includes("export async function DELETE"), "Missing DELETE in contents/[id]");
  });
});

// ============================================================
// 九、Types 完整性
// ============================================================

describe("Types — Data Model Integrity", () => {
  const src = readSrc(TYPES_FILE);

  it("TC-1.5-41: ContentStatus 类型完整", () => {
    assert.ok(src.includes("draft"), "Missing draft status");
    assert.ok(src.includes("review"), "Missing review status");
    assert.ok(src.includes("approved"), "Missing approved status");
    assert.ok(src.includes("rejected"), "Missing rejected status");
    assert.ok(src.includes("published"), "Missing published status");
  });

  it("TC-1.5-42: ApprovalDecision 类型完整", () => {
    assert.ok(src.includes("pending"), "Missing pending decision");
    assert.ok(src.includes("approved"), "Missing approved decision");
    assert.ok(src.includes("rejected"), "Missing rejected decision");
    assert.ok(src.includes("revision"), "Missing revision decision");
  });

  it("TC-1.5-43: ApprovalRecord 类型定义", () => {
    assert.ok(src.includes("ApprovalRecord"), "Missing ApprovalRecord type");
    assert.ok(src.includes("content_id"), "Missing content_id in ApprovalRecord");
    assert.ok(src.includes("reviewer"), "Missing reviewer in ApprovalRecord");
  });
});
