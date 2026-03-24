/**
 * Brand Reviewer scoring pipeline.
 * Called after content is saved by agent/team execute endpoints.
 *
 * Scores content on brand alignment, risk, and quality.
 * If auto-approval mode is enabled and score meets threshold, auto-approves.
 */

import fs from "fs";
import path from "path";
import { updateContent } from "./contents";
import { readCollection, writeCollection, generateId, nowISO } from "./index";
import type { Content, ApprovalRecord } from "@/types";

const SETTINGS_FILE = path.join(process.cwd(), "src", "data", "settings.json");

interface ApprovalSettings {
  mode: "auto" | "manual";
  autoThreshold: number;
}

function readApprovalSettings(): ApprovalSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const settings = JSON.parse(raw) as { approval?: ApprovalSettings };
      if (settings.approval) {
        return settings.approval;
      }
    }
  } catch {
    // defaults
  }
  return { mode: "manual", autoThreshold: 7 };
}

// Risk keyword patterns
const RISK_PATTERNS = [
  /保证效果|guaranteed results/i,
  /100%|百分之百/,
  /第一名|#1 rated|best in class/i,
  /永久|permanent(ly)?/i,
  /无副作用|no side effects/i,
  /立即见效|instant results/i,
  /免费赠送|free giveaway/i,
];

/**
 * Score content for brand alignment and quality.
 * Returns a score from 1-10 and optional risk warnings.
 */
function scoreContent(content: Content): { brandScore: number; riskWarnings: string[] } {
  let score = 5; // base score
  const riskWarnings: string[] = [];
  const text = `${content.title} ${content.body}`;

  // Length bonus: longer, more detailed content scores higher
  if (text.length > 500) score += 1;
  if (text.length > 1000) score += 0.5;
  if (text.length > 2000) score += 0.5;

  // Structure bonus: headings, lists, sections
  if (/^#{1,3}\s/m.test(content.body)) score += 0.5;
  if (/^[-*]\s/m.test(content.body) || /^\d+[./)]\s/m.test(content.body)) score += 0.5;

  // Tags bonus
  const tags = (content.metadata as { tags?: string[] })?.tags;
  if (tags && tags.length >= 3) score += 0.5;

  // Risk check
  for (const pattern of RISK_PATTERNS) {
    if (pattern.test(text)) {
      riskWarnings.push(`Detected risky expression matching: ${pattern.source}`);
      score -= 1;
    }
  }

  // Platform appropriateness
  if (content.platform && content.platform !== "xiaohongshu") {
    score += 0.3; // global platform content gets slight boost
  }

  // Clamp to 1-10
  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  return { brandScore: score, riskWarnings };
}

/**
 * Run brand review pipeline on a content item.
 * Updates content metadata with score, risk, and pipeline stage.
 * Auto-approves if settings allow.
 */
export async function runBrandReview(contentId: string): Promise<void> {
  const contents = readCollection<Content>("contents");
  const content = contents.find((c) => c.id === contentId);
  if (!content) return;

  const { brandScore, riskWarnings } = scoreContent(content);
  const settings = readApprovalSettings();
  const hasRisk = riskWarnings.length > 0;

  // Determine pipeline stage and status
  let pipelineStage: string;
  let newStatus: string;

  if (
    settings.mode === "auto" &&
    brandScore >= settings.autoThreshold &&
    !hasRisk
  ) {
    // Auto-approve
    pipelineStage = "approved";
    newStatus = "approved";

    // Record auto-approval
    const approvals = readCollection<ApprovalRecord>("approvals");
    const approval: ApprovalRecord = {
      id: generateId("apr"),
      content_id: contentId,
      reviewer: "brand-reviewer-agent",
      decision: "approved",
      comment: `Auto-approved: brandScore ${brandScore} >= ${settings.autoThreshold}, no risk detected`,
      created_at: nowISO(),
    };
    approvals.push(approval);
    writeCollection("approvals", approvals);
  } else {
    // Needs manual review
    pipelineStage = hasRisk ? "pending" : "pending";
    newStatus = "review";
  }

  // Update content with scoring results
  const existingMetadata = (content.metadata ?? {}) as Record<string, unknown>;
  await updateContent(contentId, {
    status: newStatus as Content["status"],
    metadata: {
      ...existingMetadata,
      brandScore,
      pipelineStage,
      riskCheck: hasRisk
        ? { passed: false, warnings: riskWarnings }
        : { passed: true, warnings: [] },
      reviewedBy: "brand-reviewer-agent",
      reviewedAt: nowISO(),
    },
  });
}
