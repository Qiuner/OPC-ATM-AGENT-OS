-- Marketing Agent OS — 核心数据库 Schema
-- 部署目标：Supabase PostgreSQL

-- ============================================================
-- 1. 内容表：每条 Agent 生成的营销内容
-- ============================================================
CREATE TABLE content_pieces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         TEXT NOT NULL,           -- 'xhs' | 'douyin' | 'x' | 'email' | 'video'
  title           TEXT,                    -- 标题/主题行
  body            TEXT NOT NULL,           -- 正文内容
  hook_type       TEXT,                    -- 'question' | 'number' | 'story' | 'controversy' | 'pain_point'
  emotion_trigger TEXT,                    -- 'curiosity' | 'urgency' | 'social_proof' | 'fomo' | 'aspiration'
  tags            TEXT[],                  -- 话题标签
  campaign_id     UUID,                    -- 关联营销活动（可选）
  external_id     TEXT,                    -- 平台侧 ID（发布后回填）
  status          TEXT DEFAULT 'draft',    -- 'draft' | 'review' | 'approved' | 'published' | 'rejected'
  created_by      TEXT NOT NULL,           -- agent name: 'xhs-agent' | 'x-agent' 等
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ
);

CREATE INDEX idx_content_channel ON content_pieces(channel);
CREATE INDEX idx_content_status ON content_pieces(status);
CREATE INDEX idx_content_created ON content_pieces(created_at DESC);

-- ============================================================
-- 2. 性能指标表：各渠道数据（webhook 或定期拉取写入）
-- ============================================================
CREATE TABLE performance_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      UUID REFERENCES content_pieces(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,

  -- 通用指标
  impressions     INTEGER DEFAULT 0,       -- 曝光量
  likes           INTEGER DEFAULT 0,       -- 点赞
  comments        INTEGER DEFAULT 0,       -- 评论
  shares          INTEGER DEFAULT 0,       -- 分享/转发

  -- 小红书特有
  collects        INTEGER DEFAULT 0,       -- 收藏（小红书核心指标）

  -- 视频指标
  view_count      INTEGER DEFAULT 0,       -- 播放量
  completion_rate DECIMAL(5,4),            -- 完播率 0.0000-1.0000

  -- 邮件指标
  open_rate       DECIMAL(5,4),
  click_rate      DECIMAL(5,4),

  -- 广告指标
  ctr             DECIMAL(5,4),
  roas            DECIMAL(8,2),
  cpm             DECIMAL(8,2),

  -- Analyst 计算的综合评分（飞轮核心信号）
  performance_score DECIMAL(5,2),          -- 0-100

  recorded_at     TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id)                       -- 一条内容一条指标
);

CREATE INDEX idx_metrics_channel ON performance_metrics(channel);
CREATE INDEX idx_metrics_score ON performance_metrics(performance_score DESC NULLS LAST);

-- ============================================================
-- 3. 胜出模式表：Analyst Agent 提炼的规律
-- ============================================================
CREATE TABLE winning_patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         TEXT NOT NULL,
  hook_type       TEXT,
  emotion_trigger TEXT,
  format_notes    TEXT,                    -- 格式特征描述
  example_content TEXT,                    -- 胜出案例正文片段
  avg_score       DECIMAL(5,2),            -- 该模式平均分
  sample_size     INTEGER,                 -- 基于多少条内容统计
  active          BOOLEAN DEFAULT TRUE,    -- false = 已过时
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_channel ON winning_patterns(channel);
CREATE INDEX idx_patterns_active ON winning_patterns(active) WHERE active = TRUE;

-- ============================================================
-- 4. 任务队列表：CEO Agent 的调度记录
-- ============================================================
CREATE TABLE task_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL,           -- 'xhs-agent' | 'x-agent' | 'analyst-agent' 等
  task_type       TEXT NOT NULL,           -- 'create_content' | 'analyze' | 'update_skill'
  priority        INTEGER DEFAULT 5,       -- 1=最高, 10=最低
  payload         JSONB,                   -- 任务参数
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'running' | 'done' | 'failed'
  result          JSONB,                   -- 执行结果
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_tasks_status ON task_queue(status);
CREATE INDEX idx_tasks_agent ON task_queue(agent_name);
CREATE INDEX idx_tasks_priority ON task_queue(priority) WHERE status = 'pending';

-- ============================================================
-- 5. 性能视图：Top 20% 内容（Analyst Agent 查询用）
-- ============================================================
CREATE VIEW top_performing_content AS
SELECT
  cp.*,
  pm.performance_score,
  pm.impressions,
  pm.likes,
  pm.comments,
  pm.shares,
  pm.collects,
  pm.view_count,
  pm.completion_rate,
  PERCENT_RANK() OVER (
    PARTITION BY cp.channel
    ORDER BY pm.performance_score DESC
  ) AS percentile_rank
FROM content_pieces cp
JOIN performance_metrics pm ON cp.id = pm.content_id
WHERE pm.performance_score IS NOT NULL
  AND cp.created_at > NOW() - INTERVAL '90 days';

-- ============================================================
-- 6. 各渠道评分公式（用 SQL function，Analyst 可直接调用）
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_score(
  p_channel TEXT,
  p_impressions INTEGER,
  p_likes INTEGER,
  p_comments INTEGER,
  p_shares INTEGER,
  p_collects INTEGER DEFAULT 0,
  p_view_count INTEGER DEFAULT 0,
  p_completion_rate DECIMAL DEFAULT 0
) RETURNS DECIMAL AS $$
BEGIN
  CASE p_channel
    -- 小红书: (收藏×3 + 点赞 + 评论×2) / 曝光 × 100
    WHEN 'xhs' THEN
      IF p_impressions > 0 THEN
        RETURN LEAST(100, (p_collects * 3 + p_likes + p_comments * 2)::DECIMAL / p_impressions * 100);
      END IF;
    -- 抖音: 完播率×50 + (点赞 + 分享×3) / 播放量 × 50
    WHEN 'douyin' THEN
      IF p_view_count > 0 THEN
        RETURN LEAST(100, p_completion_rate * 50 + (p_likes + p_shares * 3)::DECIMAL / p_view_count * 50);
      END IF;
    -- X/Twitter: (likes + retweets×3 + replies×2) / impressions × 100
    WHEN 'x' THEN
      IF p_impressions > 0 THEN
        RETURN LEAST(100, (p_likes + p_shares * 3 + p_comments * 2)::DECIMAL / p_impressions * 100);
      END IF;
    ELSE
      RETURN 0;
  END CASE;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
