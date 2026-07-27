-- 为内容表添加审核状态字段
-- review_status: 'pending' (待审核), 'approved' (已通过), 'rejected' (已拒绝)
-- 默认 'approved' 保证现有内容向后兼容

ALTER TABLE news ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE news ADD COLUMN review_comment TEXT;
ALTER TABLE news ADD COLUMN reviewed_by INTEGER;
ALTER TABLE news ADD COLUMN reviewed_at TEXT;

ALTER TABLE community_posts ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE community_posts ADD COLUMN review_comment TEXT;
ALTER TABLE community_posts ADD COLUMN reviewed_by INTEGER;
ALTER TABLE community_posts ADD COLUMN reviewed_at TEXT;

ALTER TABLE reviews ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE reviews ADD COLUMN review_comment TEXT;
ALTER TABLE reviews ADD COLUMN reviewed_by INTEGER;
ALTER TABLE reviews ADD COLUMN reviewed_at TEXT;

ALTER TABLE guides ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE guides ADD COLUMN review_comment TEXT;
ALTER TABLE guides ADD COLUMN reviewed_by INTEGER;
ALTER TABLE guides ADD COLUMN reviewed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_news_review_status ON news(review_status);
CREATE INDEX IF NOT EXISTS idx_community_posts_review_status ON community_posts(review_status);
CREATE INDEX IF NOT EXISTS idx_reviews_review_status ON reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_guides_review_status ON guides(review_status);
