export const CONTEXT_ASSET_TYPES = ['product', 'brand', 'audience', 'content'] as const

export type ContextAssetType = typeof CONTEXT_ASSET_TYPES[number]

export const EXPERT_ROLE_DEFINITIONS = [
  { id: 'xhs_creator', label: '小红书创作专家' },
  { id: 'growth_marketer', label: '增长营销专家' },
  { id: 'brand_risk_reviewer', label: '品牌风控审查' },
  { id: 'data_flywheel_analyst', label: '数据飞轮分析师' },
  { id: 'podcast_producer', label: '播客制作专家' },
  { id: 'global_content_creator', label: '全球内容创作' },
  { id: 'x_twitter_creator', label: 'X/Twitter 创作' },
  { id: 'seo_specialist', label: 'SEO 专家' },
  { id: 'visual_content_generator', label: '视觉内容生成' },
  { id: 'marketing_strategist', label: '营销策略师' },
] as const

export type ExpertRoleId = typeof EXPERT_ROLE_DEFINITIONS[number]['id']

export const DEFAULT_EXPERT_ROLE_ID: ExpertRoleId = 'xhs_creator'

const LEGACY_EXPERT_ROLE_MAP: Record<string, ExpertRoleId> = {
  xiaohongshu_expert: 'xhs_creator',
  risk_review_knowledge: 'brand_risk_reviewer',
  marketing_knowledge: 'growth_marketer',
}

export function isContextAssetType(value: string): value is ContextAssetType {
  return (CONTEXT_ASSET_TYPES as readonly string[]).includes(value)
}

export function isExpertRoleId(value: string): value is ExpertRoleId {
  return EXPERT_ROLE_DEFINITIONS.some((role) => role.id === value)
}

export function getOwnershipScope(type: ContextAssetType, expertRoleId: ExpertRoleId): string {
  return `${type}:${expertRoleId}`
}

export function getOwnershipKey(type: ContextAssetType, expertRoleId: ExpertRoleId): string {
  return `context:${getOwnershipScope(type, expertRoleId)}`
}

export function getExpertRoleLabel(expertRoleId: ExpertRoleId): string {
  return EXPERT_ROLE_DEFINITIONS.find((role) => role.id === expertRoleId)?.label ?? EXPERT_ROLE_DEFINITIONS[0].label
}

function normalizeLegacyExpertRoleId(value: string | undefined): ExpertRoleId | null {
  if (!value) return null
  if (isExpertRoleId(value)) return value
  return LEGACY_EXPERT_ROLE_MAP[value] ?? null
}

function extractExpertRoleIdFromScopedValue(value: string | undefined): ExpertRoleId | null {
  if (!value) return null
  const segments = value.split(':').filter(Boolean)
  for (const segment of segments.reverse()) {
    const normalized = normalizeLegacyExpertRoleId(segment)
    if (normalized) return normalized
  }
  return null
}

function extractTypeFromScopedValue(value: string | undefined): ContextAssetType | null {
  if (!value) return null
  const segments = value.split(':').filter(Boolean)
  for (const segment of segments) {
    if (isContextAssetType(segment)) return segment
  }
  return null
}

export interface ContextOwnershipFields {
  type: ContextAssetType
  scope: string
  expert_role_id: ExpertRoleId
  ownership_key: string
}

type AssetLike = {
  type?: string
  scope?: string
  expert_role_id?: string
  ownership_key?: string
  metadata?: Record<string, unknown> | null
}

function inferType(asset: AssetLike): ContextAssetType {
  const metadata = asset.metadata ?? {}
  const candidates = [
    asset.type,
    typeof metadata.type === 'string' ? metadata.type : undefined,
    typeof metadata.parent_type === 'string' ? metadata.parent_type : undefined,
    extractTypeFromScopedValue(asset.scope),
    extractTypeFromScopedValue(asset.ownership_key),
  ]

  for (const candidate of candidates) {
    if (candidate && isContextAssetType(candidate)) {
      return candidate
    }
  }

  return 'product'
}

function inferExpertRoleId(asset: AssetLike): ExpertRoleId {
  const metadata = asset.metadata ?? {}
  const candidates = [
    asset.expert_role_id,
    typeof metadata.expert_role_id === 'string' ? metadata.expert_role_id : undefined,
    typeof metadata.expert_role === 'string' ? metadata.expert_role : undefined,
    extractExpertRoleIdFromScopedValue(asset.scope),
    extractExpertRoleIdFromScopedValue(asset.ownership_key),
    asset.type,
    typeof metadata.type === 'string' ? metadata.type : undefined,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const normalized = normalizeLegacyExpertRoleId(candidate)
    if (normalized) return normalized
  }

  return DEFAULT_EXPERT_ROLE_ID
}

export function normalizeContextOwnership<T extends AssetLike>(asset: T): T & ContextOwnershipFields {
  const type = inferType(asset)
  const expertRoleId = inferExpertRoleId(asset)

  return {
    ...asset,
    type,
    scope: getOwnershipScope(type, expertRoleId),
    expert_role_id: expertRoleId,
    ownership_key: getOwnershipKey(type, expertRoleId),
  }
}
