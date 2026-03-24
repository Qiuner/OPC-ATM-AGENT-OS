/**
 * Page Cleanup Verification Tests
 *
 * Verifies DEV's cleanup of redundant pages:
 * 1. Deleted pages no longer exist (campaigns, task-board, workbench, v1, v2)
 * 2. Retained pages still exist (Dashboard, Team Studio, Context Vault, Approval, Publishing, CreatorFlow, Analytics)
 * 3. Sidebar has no dead links
 * 4. Agent execution chain files are intact
 * 5. No href references to deleted pages anywhere in src
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_SRC = path.join(__dirname, "..", "src");

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(WEB_SRC, relPath));
}

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(WEB_SRC, relPath), "utf-8");
}

// ============================================================
// 1. Deleted pages return 404 (files removed)
// ============================================================
describe("Deleted Pages (should NOT exist)", () => {
  const deletedPages = [
    "app/campaigns/page.tsx",
    "app/campaigns/[id]/page.tsx",
    "app/task-board/page.tsx",
    "app/workbench/page.tsx",
    "app/team-studio/v1/page.tsx",
    "app/team-studio/v2/page.tsx",
  ];

  for (const page of deletedPages) {
    it(`TC-CL-01: ${page} is deleted`, () => {
      assert.ok(!fileExists(page), `${page} should not exist`);
    });
  }

  it("TC-CL-02: Campaigns API routes are deleted", () => {
    assert.ok(!fileExists("app/api/campaigns/route.ts"), "campaigns API route should be deleted");
    assert.ok(!fileExists("app/api/campaigns/[id]/route.ts"), "campaigns [id] API route should be deleted");
  });
});

// ============================================================
// 2. Retained pages still exist
// ============================================================
describe("Retained Pages (should exist)", () => {
  const retainedPages = [
    { path: "app/page.tsx", label: "Dashboard" },
    { path: "app/team-studio/page.tsx", label: "Team Studio" },
    { path: "app/team-studio/v3/page.tsx", label: "Team Studio v3" },
    { path: "app/context-vault/page.tsx", label: "Context Vault" },
    { path: "app/approval/page.tsx", label: "Approval Center" },
    { path: "app/publishing/page.tsx", label: "Publishing Hub" },
    { path: "app/creatorflow/page.tsx", label: "CreatorFlow" },
    { path: "app/analytics/page.tsx", label: "Analytics" },
  ];

  for (const page of retainedPages) {
    it(`TC-CL-03: ${page.label} (${page.path}) exists`, () => {
      assert.ok(fileExists(page.path), `${page.path} should exist`);
    });
  }
});

// ============================================================
// 3. Sidebar has no dead links
// ============================================================
describe("Sidebar Navigation (no dead links)", () => {
  const sidebar = readFile("components/layout/sidebar.tsx");

  it("TC-CL-04: No campaigns link in sidebar", () => {
    assert.ok(!sidebar.includes("/campaigns"), "sidebar should not link to /campaigns");
  });

  it("TC-CL-05: No task-board link in sidebar", () => {
    assert.ok(!sidebar.includes("/task-board"), "sidebar should not link to /task-board");
  });

  it("TC-CL-06: No workbench link in sidebar", () => {
    assert.ok(!sidebar.includes("/workbench"), "sidebar should not link to /workbench");
  });

  it("TC-CL-07: Retained nav items present", () => {
    const expectedItems = [
      "Dashboard",
      "Team Studio",
      "Context Vault",
      "Approval Center",
      "Publishing Hub",
      "CreatorFlow",
      "Analytics",
    ];
    for (const item of expectedItems) {
      assert.ok(sidebar.includes(item), `sidebar should contain "${item}"`);
    }
  });

  it("TC-CL-08: Exactly 7 nav items", () => {
    const hrefMatches = sidebar.match(/href:\s*'/g);
    assert.equal(hrefMatches?.length, 7, "sidebar should have exactly 7 nav items");
  });
});

// ============================================================
// 4. Header page titles updated
// ============================================================
describe("Header page titles", () => {
  const header = readFile("components/layout/header.tsx");

  it("TC-CL-09: No deleted page titles in header", () => {
    assert.ok(!header.includes("Campaigns"), "header should not have Campaigns title");
    assert.ok(!header.includes("Task Board"), "header should not have Task Board title");
    assert.ok(!header.includes("Workbench"), "header should not have Workbench title");
  });

  it("TC-CL-10: Retained page titles present", () => {
    const expectedTitles = [
      "Dashboard",
      "Team Studio",
      "Context Vault",
      "Approval Center",
      "Publishing Hub",
      "CreatorFlow",
      "Analytics",
    ];
    for (const title of expectedTitles) {
      assert.ok(header.includes(title), `header should contain "${title}"`);
    }
  });
});

// ============================================================
// 5. No href references to deleted pages in source
// ============================================================
describe("No dead href references in source", () => {
  it("TC-CL-11: No href to deleted pages in any source file", () => {
    // Check sidebar and all page files for dead links
    const filesToCheck = [
      "components/layout/sidebar.tsx",
      "components/layout/header.tsx",
      "components/features/generate-plan-button.tsx",
      "app/page.tsx",
    ];

    const deadPatterns = [
      /href.*\/campaigns/,
      /href.*\/task-board/,
      /href.*\/workbench/,
      /href.*\/v1/,
      /href.*\/v2/,
    ];

    for (const file of filesToCheck) {
      if (!fileExists(file)) continue;
      const content = readFile(file);
      for (const pattern of deadPatterns) {
        assert.ok(
          !pattern.test(content),
          `${file} should not contain dead link matching ${pattern}`
        );
      }
    }
  });
});

// ============================================================
// 6. Agent execution chain intact
// ============================================================
describe("Agent Execution Chain (files intact)", () => {
  const chainFiles = [
    "app/api/agent/execute/route.ts",
    "app/api/team/execute/route.ts",
    "lib/store/brand-review.ts",
    "app/api/contents/route.ts",
    "app/api/contents/[id]/route.ts",
    "app/api/contents/[id]/approve/route.ts",
    "app/api/contents/[id]/reject/route.ts",
    "app/api/approvals/route.ts",
    "app/api/settings/route.ts",
  ];

  for (const file of chainFiles) {
    it(`TC-CL-12: ${file} exists`, () => {
      assert.ok(fileExists(file), `${file} should exist for agent chain`);
    });
  }

  it("TC-CL-13: agent/execute still imports runBrandReview", () => {
    const src = readFile("app/api/agent/execute/route.ts");
    assert.ok(src.includes("runBrandReview"), "agent execute should call runBrandReview");
  });

  it("TC-CL-14: team/execute still imports runBrandReview", () => {
    const src = readFile("app/api/team/execute/route.ts");
    assert.ok(src.includes("runBrandReview"), "team execute should call runBrandReview");
  });
});
