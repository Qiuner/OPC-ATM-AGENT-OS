-- ============================================================
-- Migration 001: Global Expansion — 出海字段扩展
-- Date: 2026-03-24
-- Description: Add language, target market, published URL,
--              and GEO optimization fields to content_pieces.
--              Extend scoring function for global channels.
-- ============================================================

-- ============================================================
-- 1. content_pieces 新增字段
-- ============================================================

-- 内容语言（默认英文，支持多语言出海）
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- 目标市场（us/eu/uk/sea/latam/global）
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS target_market TEXT DEFAULT 'us';

-- 发布后的外部 URL（用于 SEO/GEO 追踪）
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS published_url TEXT;

-- GEO 优化标记（是否经过 GEO Agent 优化）
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS geo_optimized BOOLEAN DEFAULT FALSE;

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_content_language ON content_pieces(language);
CREATE INDEX IF NOT EXISTS idx_content_market ON content_pieces(target_market);
CREATE INDEX IF NOT EXISTS idx_content_geo ON content_pieces(geo_optimized) WHERE geo_optimized = TRUE;

-- ============================================================
-- 2. 扩展 Channel 类型注释（供代码参考）
-- ============================================================
-- 原始: 'xhs' | 'douyin' | 'x' | 'email' | 'video'
-- 扩展: + 'meta' | 'tiktok' | 'linkedin' | 'blog'
-- content_pieces.channel 为 TEXT 类型，无需 ALTER

COMMENT ON COLUMN content_pieces.channel IS
  'Marketing channel: meta | x | tiktok | linkedin | email | blog | xhs | douyin | video';

-- ============================================================
-- 3. 扩展评分函数覆盖出海渠道
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_score(
  p_channel TEXT,
  p_impressions INTEGER,
  p_likes INTEGER,
  p_comments INTEGER,
  p_shares INTEGER,
  p_collects INTEGER DEFAULT 0,
  p_view_count INTEGER DEFAULT 0,
  p_completion_rate DECIMAL DEFAULT 0,
  p_open_rate DECIMAL DEFAULT 0,
  p_click_rate DECIMAL DEFAULT 0,
  p_ctr DECIMAL DEFAULT 0,
  p_roas DECIMAL DEFAULT 0
) RETURNS DECIMAL AS $$
BEGIN
  CASE p_channel
    -- 小红书: (收藏x3 + 点赞 + 评论x2) / 曝光 x 100
    WHEN 'xhs' THEN
      IF p_impressions > 0 THEN
        RETURN LEAST(100, (p_collects * 3 + p_likes + p_comments * 2)::DECIMAL / p_impressions * 100);
      END IF;

    -- 抖音: 完播率x50 + (点赞 + 分享x3) / 播放量 x 50
    WHEN 'douyin' THEN
      IF p_view_count > 0 THEN
        RETURN LEAST(100, p_completion_rate * 50 + (p_likes + p_shares * 3)::DECIMAL / p_view_count * 50);
      END IF;

    -- X/Twitter: (likes + retweets x 3 + replies x 2) / impressions x 100
    WHEN 'x' THEN
      IF p_impressions > 0 THEN
        RETURN LEAST(100, (p_likes + p_shares * 3 + p_comments * 2)::DECIMAL / p_impressions * 100);
      END IF;

    -- Meta (Facebook/Instagram): (likes + comments x 2 + shares x 3) / impressions x 100
    WHEN 'meta' THEN
      IF p_impressions > 0 THEN
        RETURN LEAST(100, (p_likes + p_comments * 2 + p_shares * 3)::DECIMAL / p_impressions * 100);
      END IF;

    -- TikTok: 完播率 x 40 + (likes + shares x 3 + comments x 2) / views x 60
    WHEN 'tiktok' THEN
      IF p_view_count > 0 THEN
        RETURN LEAST(100, p_completion_rate * 40 + (p_likes + p_shares * 3 + p_comments * 2)::DECIMAL / p_view_count * 60);
      END IF;

    -- LinkedIn: (likes + comments x 3 + shares x 2) / impressions x 100
    WHEN 'linkedin' THEN
      IF p_impressions > 0 THEN
        RETURN LEAST(100, (p_likes + p_comments * 3 + p_shares * 2)::DECIMAL / p_impressions * 100);
      END IF;

    -- Email: open_rate x 40 + click_rate x 60 (both 0-1 scale, output 0-100)
    WHEN 'email' THEN
      RETURN LEAST(100, p_open_rate * 40 + p_click_rate * 60);

    -- Blog: based on engagement (time signals via comments/shares vs impressions)
    WHEN 'blog' THEN
      IF p_impressions > 0 THEN
        RETURN LEAST(100, (p_comments * 5 + p_shares * 3)::DECIMAL / p_impressions * 100);
      END IF;

    ELSE
      RETURN 0;
  END CASE;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
