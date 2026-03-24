import fs from 'fs';
import path from 'path';

// ==========================================
// Learning Store — 闭环学习系统
// 记录每轮 Agent 运行的假设、结果、经验教训
// 下一轮生成时自动检索历史数据，实现累积学习
// ==========================================

export interface LearningRecord {
  id: string;
  /** 运行时间 */
  createdAt: string;
  /** 使用的 Agent 类型 (social/article/video/email) */
  agentType: string;
  /** 目标平台 */
  platform: string;
  /** 内容主题 */
  theme: string;
  /** 生成前的假设：为什么这组内容会有效 */
  hypothesis: string;
  /** 实验结果：投放后的实际数据 */
  experimentResult: ExperimentResult | null;
  /** AI 提炼的经验教训 */
  learnings: string;
  /** 内容是否被标记为成功 */
  isSuccessful: boolean | null;
  /** 关联的 content_id */
  contentId: string | null;
}

export interface ExperimentResult {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  leads: number;
  /** 用户主观评价 (1-5) */
  qualityScore: number | null;
  /** 补充说明 */
  notes: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LEARNINGS_FILE = path.join(DATA_DIR, 'learnings.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function generateId(): string {
  return `learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class LearningStore {
  private records: LearningRecord[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    ensureDataDir();
    if (fs.existsSync(LEARNINGS_FILE)) {
      try {
        const raw = fs.readFileSync(LEARNINGS_FILE, 'utf-8');
        this.records = JSON.parse(raw) as LearningRecord[];
      } catch {
        this.records = [];
      }
    }
  }

  private save(): void {
    ensureDataDir();
    fs.writeFileSync(LEARNINGS_FILE, JSON.stringify(this.records, null, 2), 'utf-8');
  }

  /**
   * 记录一条新的学习数据（Agent 生成内容后调用）
   */
  addRecord(params: {
    agentType: string;
    platform: string;
    theme: string;
    hypothesis: string;
    contentId?: string;
  }): LearningRecord {
    const record: LearningRecord = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      agentType: params.agentType,
      platform: params.platform,
      theme: params.theme,
      hypothesis: params.hypothesis,
      experimentResult: null,
      learnings: '',
      isSuccessful: null,
      contentId: params.contentId ?? null,
    };

    this.records.push(record);
    this.save();
    return record;
  }

  /**
   * 更新实验结果（内容发布后、回填数据时调用）
   */
  updateResult(id: string, result: ExperimentResult, learnings: string, isSuccessful: boolean): void {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record.experimentResult = result;
      record.learnings = learnings;
      record.isSuccessful = isSuccessful;
      this.save();
    }
  }

  /**
   * 查询历史学习数据 — 供 Agent 在生成内容前参考
   * 返回格式化的文本摘要，直接注入 prompt
   */
  queryLearnings(platform: string, agentType: string, limit: number = 10): string | null {
    // 筛选有结果的同平台/同 Agent 类型记录
    const relevant = this.records
      .filter(r =>
        r.experimentResult !== null &&
        (r.platform === platform || r.agentType === agentType)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    if (relevant.length === 0) return null;

    const successful = relevant.filter(r => r.isSuccessful === true);
    const failed = relevant.filter(r => r.isSuccessful === false);

    let summary = '';

    if (successful.length > 0) {
      summary += '### 有效的内容模式\n';
      for (const r of successful) {
        summary += `- 主题「${r.theme}」(${r.platform}): ${r.learnings}\n`;
        if (r.experimentResult) {
          summary += `  数据: 曝光${r.experimentResult.impressions} 互动${r.experimentResult.comments + r.experimentResult.likes} 线索${r.experimentResult.leads}\n`;
        }
      }
    }

    if (failed.length > 0) {
      summary += '\n### 无效的内容模式（避免重复）\n';
      for (const r of failed) {
        summary += `- 主题「${r.theme}」(${r.platform}): ${r.learnings}\n`;
      }
    }

    return summary || null;
  }

  /**
   * 获取所有记录
   */
  getAllRecords(): LearningRecord[] {
    return [...this.records];
  }

  /**
   * 按 contentId 查找记录
   */
  findByContentId(contentId: string): LearningRecord | undefined {
    return this.records.find(r => r.contentId === contentId);
  }

  /**
   * 获取学习统计摘要
   */
  getSummary(): {
    total: number;
    withResults: number;
    successful: number;
    failed: number;
    byPlatform: Record<string, number>;
    byAgent: Record<string, number>;
  } {
    const withResults = this.records.filter(r => r.experimentResult !== null);
    const byPlatform: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    for (const r of this.records) {
      byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1;
      byAgent[r.agentType] = (byAgent[r.agentType] ?? 0) + 1;
    }

    return {
      total: this.records.length,
      withResults: withResults.length,
      successful: withResults.filter(r => r.isSuccessful === true).length,
      failed: withResults.filter(r => r.isSuccessful === false).length,
      byPlatform,
      byAgent,
    };
  }
}
