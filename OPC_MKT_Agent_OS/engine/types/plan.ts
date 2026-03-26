/**
 * Plan-Execute Model — 执行计划数据结构
 *
 * CEO Agent 收到任务后先生成 ExecutionPlan，
 * 用户审批通过后再按计划逐步执行。
 */

/** 执行计划状态 */
export type PlanStatus =
  | "pending"    // 等待审批
  | "approved"   // 已批准，准备执行
  | "rejected"   // 已驳回
  | "modified"   // 已修改，重新提交
  | "executing"  // 执行中
  | "completed"  // 全部完成
  | "failed";    // 执行失败

/** 单步骤状态 */
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/** 执行计划的单个步骤 */
export interface PlanStep {
  id: string;
  order: number;
  agentId: string;
  action: string;
  inputs: Record<string, unknown>;
  dependencies: string[];
  status: StepStatus;
  result?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/** 完整的执行计划 */
export interface ExecutionPlan {
  id: string;
  taskSummary: string;
  steps: PlanStep[];
  estimatedAgents: string[];
  status: PlanStatus;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  modifiedAt?: string;
  completedAt?: string;
  /** 用户原始指令 */
  originalPrompt: string;
  /** 驳回/修改时的用户反馈 */
  feedback?: string;
}

/** Plan 相关的 SSE 消息类型 */
export type PlanStreamEvent =
  | { type: "plan"; plan: ExecutionPlan }
  | { type: "plan_approved"; planId: string }
  | { type: "plan_rejected"; planId: string; feedback?: string }
  | { type: "step_start"; planId: string; stepId: string; agentId: string }
  | { type: "step_progress"; planId: string; stepId: string; agentId: string; content: string }
  | { type: "step_complete"; planId: string; stepId: string; agentId: string; success: boolean; result?: string }
  | { type: "plan_complete"; planId: string }
  | { type: "plan_error"; planId: string; message: string };
