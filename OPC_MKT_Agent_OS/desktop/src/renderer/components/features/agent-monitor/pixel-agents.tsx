/**
 * Agent Characters — lil-agents vinyl-toy illustration style
 *
 * Design principles (matching lil-agents):
 * - NO outlines — shapes defined by fill color contrast only
 * - Flat fills, no gradients
 * - Minimal facial features (just a smile or accessory like sunglasses)
 * - Stocky boxy proportions — wide torso, short legs, chunky boots
 * - Pink skin tone (#E8B4C8)
 * - Oversized streetwear clothing
 * - Designer vinyl toy / fashion figure aesthetic
 */

export type MarketingAgentId =
  | 'ceo'
  | 'xhs-agent'
  | 'growth-agent'
  | 'brand-reviewer'
  | 'analyst-agent'
  | 'podcast-agent'
  | 'visual-agent'
  | 'strategist-agent'
  | 'email-agent'
  | 'seo-expert-agent'
  | 'geo-expert-agent'
  | 'x-twitter-agent'
  | 'meta-ads-agent'
  | 'global-content-agent';

export type PixelAgentStatus = 'busy' | 'online' | 'offline' | 'review';

interface CharacterProps {
  status: PixelAgentStatus;
  walking?: boolean;
  walkFrame?: 0 | 1;
}

interface PixelAgentSVGProps extends CharacterProps {
  agentId: MarketingAgentId;
  className?: string;
  style?: React.CSSProperties;
}

const SKIN = '#E8B4C8';

const CHARACTER_MAP: Record<MarketingAgentId, React.FC<CharacterProps>> = {
  'ceo': CEOCharacter,
  'xhs-agent': XHSCharacter,
  'growth-agent': GrowthCharacter,
  'brand-reviewer': ReviewerCharacter,
  'analyst-agent': AnalystCharacter,
  'podcast-agent': PodcastCharacter,
  'visual-agent': VisualCharacter,
  'strategist-agent': StrategistCharacter,
  'email-agent': EmailCharacter,
  'seo-expert-agent': SEOCharacter,
  'geo-expert-agent': GEOCharacter,
  'x-twitter-agent': XTwitterCharacter,
  'meta-ads-agent': MetaAdsCharacter,
  'global-content-agent': GlobalContentCharacter,
};

export function PixelAgentSVG({ agentId, status = 'online', className, style, walking, walkFrame = 0 }: PixelAgentSVGProps) {
  const opacity = status === 'offline' ? 0.4 : 1;
  const Character = CHARACTER_MAP[agentId];

  return (
    <svg
      className={className}
      viewBox="0 0 48 72"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <g opacity={opacity}>
        {Character && <Character status={status} walking={walking} walkFrame={walkFrame} />}
      </g>

    </svg>
  );
}

/** Walk animation — alternate leg positions */
function legY(walking?: boolean, walkFrame?: 0 | 1, side?: 'L' | 'R'): number {
  if (!walking) return 0;
  if (side === 'L') return walkFrame === 0 ? -2 : 1;
  return walkFrame === 0 ? 1 : -2;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CEO 营销总监 — 红西装、金领带、黑色平顶帽
// Style: Bruce-inspired — cap + jacket + smile
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CEOCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Cap */}
      <rect x="10" y="2" width="28" height="8" rx="3" fill="#1A1A2E" />
      <rect x="8" y="8" width="32" height="3" rx="1.5" fill="#1A1A2E" />
      {/* Face */}
      <rect x="12" y="9" width="24" height="16" rx="5" fill={SKIN} />
      {/* Smile — just a small arc, no eyes */}
      <path d="M19 20 Q24 23 29 20" stroke="#1A1A2E" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Red blazer — boxy oversized */}
      <rect x="7" y="25" width="34" height="22" rx="4" fill="#C0392B" />
      {/* Lapels / darker sides */}
      <rect x="7" y="25" width="10" height="22" rx="4" fill="#A93226" />
      <rect x="31" y="25" width="10" height="22" rx="4" fill="#A93226" />
      {/* Cream shirt underneath */}
      <rect x="18" y="25" width="12" height="14" rx="2" fill="#F0E6E0" />
      {/* Gold tie */}
      <rect x="22" y="26" width="4" height="12" rx="1.5" fill="#F1C40F" />
      <path d="M22 38 L24 41 L26 38" fill="#D4AC0D" />
      {/* Pocket detail — left breast */}
      <rect x="10" y="28" width="6" height="4" rx="1" fill="#A93226" />
      <line x1="10" y1="30" x2="16" y2="30" stroke="#8E2720" strokeWidth="0.6" />

      {/* ── Arms ── */}
      <rect x="1" y="26" width="7" height="16" rx="3.5" fill="#C0392B" />
      <ellipse cx="4.5" cy="43" rx="3.5" ry="2.5" fill={SKIN} />
      <rect x="40" y="26" width="7" height="16" rx="3.5" fill="#C0392B" />
      <ellipse cx="43.5" cy="43" rx="3.5" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="46" width="7" height="10" rx="2" fill="#2C3E50" />
        <rect x="11" y="54" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="58" width="11" height="2" rx="1" fill="#D4C870" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="46" width="7" height="10" rx="2" fill="#2C3E50" />
        <rect x="26" y="54" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="58" width="11" height="2" rx="1" fill="#D4C870" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 小红书创作专家 — 圆墨镜、橙色背带裤、蓝色外套
// Style: Jazz-inspired — oversized sunglasses + layers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function XHSCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      <rect x="12" y="4" width="24" height="18" rx="6" fill={SKIN} />
      {/* Round oversized sunglasses — the signature feature */}
      <circle cx="18" cy="13" r="5.5" fill="#3A3078" />
      <circle cx="30" cy="13" r="5.5" fill="#3A3078" />
      {/* Bridge */}
      <rect x="23" y="12" width="2" height="2" rx="1" fill="#3A3078" />
      {/* Star sparkles in lenses */}
      <circle cx="16.5" cy="12" r="1" fill="#6B5ED0" opacity="0.7" />
      <circle cx="19.5" cy="14" r="0.6" fill="#8B7FE0" opacity="0.5" />
      <circle cx="28.5" cy="12" r="1" fill="#6B5ED0" opacity="0.7" />
      <circle cx="31.5" cy="14" r="0.6" fill="#8B7FE0" opacity="0.5" />

      {/* ── Body ── */}
      {/* Blue oversized coat */}
      <rect x="6" y="22" width="36" height="20" rx="4" fill="#5B7DC8" />
      {/* Orange jumpsuit underneath */}
      <rect x="14" y="24" width="20" height="22" rx="3" fill="#E86830" />
      {/* Navy scarf */}
      <rect x="16" y="21" width="16" height="5" rx="2" fill="#2A2878" />
      <rect x="20" y="26" width="4" height="8" rx="1" fill="#2A2878" />
      <rect x="19" y="33" width="6" height="2" rx="1" fill="#2A2878" />
      {/* Tote bag strap */}
      <rect x="33" y="22" width="3" height="20" rx="1" fill="#3A8888" />

      {/* ── Arms ── */}
      <rect x="0" y="24" width="7" height="14" rx="3.5" fill="#5B7DC8" />
      <ellipse cx="3.5" cy="39" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="24" width="7" height="14" rx="3.5" fill="#5B7DC8" />
      <ellipse cx="44.5" cy="39" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="14" y="44" width="7" height="10" rx="2" fill="#E86830" />
        <rect x="12" y="52" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="12" y="56" width="11" height="2" rx="1" fill="#E89888" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="27" y="44" width="7" height="10" rx="2" fill="#E86830" />
        <rect x="25" y="52" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="25" y="56" width="11" height="2" rx="1" fill="#E89888" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 增长营销专家 — 圆框眼镜、青色帽衫、运动鞋
// Style: Techy-casual, hoodie + round glasses
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GrowthCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Beanie */}
      <rect x="11" y="1" width="26" height="6" rx="3" fill="#00A8A3" />
      <rect x="10" y="5" width="28" height="3" rx="1.5" fill="#008C87" />
      {/* Face */}
      <rect x="12" y="6" width="24" height="17" rx="6" fill={SKIN} />
      {/* Round glasses — defining feature */}
      <circle cx="18" cy="14" r="4.5" fill="none" stroke="#00CEC9" strokeWidth="1.5" />
      <circle cx="30" cy="14" r="4.5" fill="none" stroke="#00CEC9" strokeWidth="1.5" />
      <line x1="22.5" y1="14" x2="25.5" y2="14" stroke="#00CEC9" strokeWidth="1" />
      {/* Tiny dot eyes behind glasses */}
      <circle cx="18" cy="14" r="1.2" fill="#1A1A2E" />
      <circle cx="30" cy="14" r="1.2" fill="#1A1A2E" />
      {/* Smile */}
      <path d="M20 19 Q24 21.5 28 19" stroke="#1A1A2E" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Teal hoodie — boxy oversized */}
      <rect x="6" y="23" width="36" height="22" rx="5" fill="#00CEC9" />
      {/* Hood */}
      <path d="M10 23 Q10 20 15 19 L33 19 Q38 20 38 23" fill="#00A8A3" />
      {/* Front pocket */}
      <rect x="14" y="34" width="20" height="8" rx="3" fill="#00A8A3" />
      {/* Drawstrings */}
      <line x1="21" y1="23" x2="20" y2="30" stroke="#fff" strokeWidth="0.6" opacity="0.5" />
      <line x1="27" y1="23" x2="28" y2="30" stroke="#fff" strokeWidth="0.6" opacity="0.5" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#00CEC9" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#00CEC9" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#2D3436" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#00A8A3" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#2D3436" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#00A8A3" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 品牌风控审查 — 紫色大衣、围巾、整洁严肃
// Style: Formal streetwear — long coat + scarf
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ReviewerCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Neat hair block */}
      <rect x="11" y="1" width="26" height="10" rx="4" fill="#16213E" />
      {/* Side part */}
      <line x1="20" y1="1" x2="19" y2="9" stroke="#0D1520" strokeWidth="0.8" />
      {/* Face */}
      <rect x="12" y="7" width="24" height="16" rx="5" fill={SKIN} />
      {/* Just a neutral line mouth — serious */}
      <line x1="19" y1="18" x2="29" y2="18" stroke="#1A1A2E" strokeWidth="1.2" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Purple long coat */}
      <rect x="6" y="23" width="36" height="24" rx="4" fill="#A855F7" />
      {/* Darker sides */}
      <rect x="6" y="23" width="10" height="24" rx="4" fill="#9333EA" />
      <rect x="32" y="23" width="10" height="24" rx="4" fill="#9333EA" />
      {/* Light inner layer */}
      <rect x="17" y="23" width="14" height="16" rx="2" fill="#ECF0F1" />
      {/* Scarf — dark indigo */}
      <rect x="15" y="21" width="18" height="5" rx="2" fill="#2A1545" />
      <rect x="18" y="26" width="5" height="10" rx="1.5" fill="#2A1545" />
      <rect x="17" y="35" width="7" height="2" rx="1" fill="#2A1545" />
      {/* Badge on lapel */}
      <circle cx="14" cy="28" r="2.5" fill="#22C55E" />
      <path d="M12.8 28 L14 29.2 L15.5 27" stroke="#fff" strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="16" rx="3.5" fill="#A855F7" />
      <ellipse cx="3.5" cy="42" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="16" rx="3.5" fill="#A855F7" />
      <ellipse cx="44.5" cy="42" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="46" width="7" height="10" rx="2" fill="#1A1A2E" />
        <rect x="11" y="54" width="11" height="6" rx="3" fill="#111" />
        <rect x="11" y="58" width="11" height="2" rx="1" fill="#444" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="46" width="7" height="10" rx="2" fill="#1A1A2E" />
        <rect x="26" y="54" width="11" height="6" rx="3" fill="#111" />
        <rect x="26" y="58" width="11" height="2" rx="1" fill="#444" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 数据分析师 — 蓝色护目镜、白色实验服、数据板
// Style: Lab-tech — visor goggles + lab coat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnalystCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Short neat hair */}
      <rect x="12" y="2" width="24" height="8" rx="4" fill="#2C3E50" />
      {/* Face */}
      <rect x="12" y="6" width="24" height="17" rx="5" fill={SKIN} />
      {/* Blue visor goggles — signature */}
      <rect x="10" y="10" width="28" height="6" rx="3" fill="#22D3EE" />
      <rect x="14" y="11" width="8" height="4" rx="2" fill="#0E7490" />
      <rect x="26" y="11" width="8" height="4" rx="2" fill="#0E7490" />
      {/* Lens shine */}
      <rect x="15" y="11.5" width="3" height="1.5" rx="0.75" fill="#67E8F9" opacity="0.6" />
      <rect x="27" y="11.5" width="3" height="1.5" rx="0.75" fill="#67E8F9" opacity="0.6" />
      {/* Small smile */}
      <path d="M20 19 Q24 21 28 19" stroke="#1A1A2E" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* White lab coat */}
      <rect x="6" y="23" width="36" height="22" rx="4" fill="#ECF0F1" />
      {/* Darker sides */}
      <rect x="6" y="23" width="8" height="22" rx="4" fill="#D5DBDB" />
      <rect x="34" y="23" width="8" height="22" rx="4" fill="#D5DBDB" />
      {/* Blue shirt underneath */}
      <rect x="16" y="24" width="16" height="12" rx="2" fill="#3498DB" />
      {/* Clipboard detail on coat */}
      <rect x="10" y="30" width="5" height="7" rx="1" fill="#22D3EE" />
      <rect x="11" y="31" width="3" height="1" fill="#0E7490" />
      <rect x="11" y="33" width="3" height="1" fill="#0E7490" />
      <rect x="11" y="35" width="2" height="1" fill="#0E7490" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#ECF0F1" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#ECF0F1" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#22D3EE" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#22D3EE" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 播客制作专家 — 大耳机、橙色飞行夹克、麦克风
// Style: DJ/Producer — oversized headphones + bomber
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PodcastCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Messy hair */}
      <rect x="12" y="2" width="24" height="9" rx="5" fill="#2C1810" />
      <rect x="10" y="4" width="4" height="5" rx="2" fill="#2C1810" />
      <rect x="34" y="4" width="4" height="5" rx="2" fill="#2C1810" />
      {/* Face */}
      <rect x="12" y="7" width="24" height="16" rx="5" fill={SKIN} />
      {/* Headphones — signature oversized */}
      <rect x="6" y="6" width="6" height="12" rx="3" fill="#F97316" />
      <rect x="36" y="6" width="6" height="12" rx="3" fill="#F97316" />
      {/* Headband */}
      <rect x="10" y="2" width="28" height="3" rx="1.5" fill="#E17055" />
      {/* Cushion pads */}
      <rect x="7" y="8" width="4" height="8" rx="2" fill="#E17055" />
      <rect x="37" y="8" width="4" height="8" rx="2" fill="#E17055" />
      {/* Wide grin */}
      <path d="M18 18 Q24 22 30 18" stroke="#1A1A2E" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Orange bomber jacket */}
      <rect x="6" y="23" width="36" height="21" rx="4" fill="#F97316" />
      {/* Darker yoke */}
      <rect x="6" y="23" width="36" height="6" rx="4" fill="#E17055" />
      {/* Zip line */}
      <rect x="23" y="25" width="2" height="16" rx="1" fill="#B45309" />
      {/* Inner tee */}
      <rect x="16" y="24" width="16" height="8" rx="2" fill="#1A1A2E" />
      {/* Sound wave on tee */}
      <rect x="20" y="26" width="1" height="4" rx="0.5" fill="#F97316" />
      <rect x="22" y="25" width="1" height="6" rx="0.5" fill="#F97316" />
      <rect x="24" y="27" width="1" height="2" rx="0.5" fill="#F97316" />
      <rect x="26" y="25" width="1" height="6" rx="0.5" fill="#F97316" />
      <rect x="28" y="26" width="1" height="4" rx="0.5" fill="#F97316" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#F97316" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#F97316" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="43" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="11" y="52" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="56" width="11" height="2" rx="1" fill="#F97316" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="43" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="26" y="52" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="56" width="11" height="2" rx="1" fill="#F97316" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 视觉设计专家 — 粉色贝雷帽、画笔、围裙
// Style: Artist — beret + paint-splatter apron
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VisualCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Beret — signature */}
      <ellipse cx="24" cy="5" rx="14" ry="5" fill="#F472B6" />
      <circle cx="24" cy="2" r="2" fill="#EC4899" />
      {/* Face */}
      <rect x="12" y="6" width="24" height="17" rx="6" fill={SKIN} />
      {/* Blush cheeks */}
      <circle cx="16" cy="16" r="2.5" fill="#F9A8D4" opacity="0.5" />
      <circle cx="32" cy="16" r="2.5" fill="#F9A8D4" opacity="0.5" />
      {/* Cute smile */}
      <path d="M19 18 Q24 21 29 18" stroke="#1A1A2E" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Cream turtleneck */}
      <rect x="7" y="23" width="34" height="22" rx="4" fill="#F5E6D3" />
      {/* Paint apron over it */}
      <rect x="12" y="26" width="24" height="18" rx="3" fill="#FD79A8" />
      {/* Apron neck strap */}
      <rect x="20" y="22" width="8" height="5" rx="2" fill="#F472B6" />
      {/* Paint splatters on apron */}
      <circle cx="18" cy="32" r="2" fill="#6C5CE7" />
      <circle cx="28" cy="30" r="1.5" fill="#00CEC9" />
      <circle cx="22" cy="38" r="1.8" fill="#FDCB6E" />
      <circle cx="30" cy="36" r="1.2" fill="#E74C3C" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#F5E6D3" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#F5E6D3" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#2D3436" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#F472B6" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#2D3436" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#F472B6" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 策略师 — 单片眼镜、紫粉色马甲、领结
// Style: Dandy scholar — monocle + vest + bowtie
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StrategistCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Slicked-back hair */}
      <rect x="11" y="1" width="26" height="10" rx="4" fill="#1A1A2E" />
      <rect x="12" y="3" width="24" height="4" rx="2" fill="#2C2C54" />
      {/* Face */}
      <rect x="12" y="7" width="24" height="16" rx="5" fill={SKIN} />
      {/* Monocle on right eye — signature */}
      <circle cx="30" cy="13" r="5" fill="none" stroke="#EC4899" strokeWidth="1.5" />
      {/* Monocle chain */}
      <line x1="35" y1="13" x2="38" y2="20" stroke="#EC4899" strokeWidth="0.6" />
      {/* Left eye dot */}
      <circle cx="18" cy="13" r="1.5" fill="#1A1A2E" />
      {/* Right eye dot behind monocle */}
      <circle cx="30" cy="13" r="1.5" fill="#1A1A2E" />
      {/* Confident smirk */}
      <path d="M20 19 Q24 20.5 28 19" stroke="#1A1A2E" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* White dress shirt */}
      <rect x="7" y="23" width="34" height="22" rx="4" fill="#ECF0F1" />
      {/* Purple-pink vest */}
      <rect x="10" y="24" width="28" height="18" rx="3" fill="#6C5CE7" />
      {/* Vest darker sides */}
      <rect x="10" y="24" width="8" height="18" rx="3" fill="#5B4CC7" />
      <rect x="30" y="24" width="8" height="18" rx="3" fill="#5B4CC7" />
      {/* Bowtie */}
      <path d="M20 24 L24 26 L28 24 L24 22 Z" fill="#EC4899" />
      {/* Vest buttons */}
      <circle cx="24" cy="30" r="1" fill="#4834A8" />
      <circle cx="24" cy="34" r="1" fill="#4834A8" />
      <circle cx="24" cy="38" r="1" fill="#4834A8" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#ECF0F1" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#ECF0F1" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#6C5CE7" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#6C5CE7" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 邮件营销专家 — 琥珀色邮差帽、信封图案卫衣
// Style: Retro mailman — postman cap + letter motif
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EmailCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Postman cap */}
      <rect x="10" y="2" width="28" height="7" rx="3" fill="#F59E0B" />
      <rect x="8" y="7" width="32" height="3" rx="1.5" fill="#D97706" />
      {/* Cap brim */}
      <rect x="6" y="9" width="16" height="2" rx="1" fill="#D97706" />
      {/* Face */}
      <rect x="12" y="8" width="24" height="16" rx="5" fill={SKIN} />
      {/* Friendly dots for eyes */}
      <circle cx="18" cy="14" r="1.5" fill="#1A1A2E" />
      <circle cx="30" cy="14" r="1.5" fill="#1A1A2E" />
      {/* Friendly smile */}
      <path d="M19 19 Q24 22 29 19" stroke="#1A1A2E" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Amber sweatshirt */}
      <rect x="7" y="24" width="34" height="21" rx="4" fill="#F59E0B" />
      {/* Darker yoke */}
      <rect x="7" y="24" width="34" height="5" rx="4" fill="#D97706" />
      {/* Envelope motif on chest */}
      <rect x="16" y="29" width="16" height="10" rx="2" fill="#FDE68A" />
      {/* Envelope flap */}
      <path d="M16 29 L24 35 L32 29" fill="#FBBF24" />
      {/* Seal dot */}
      <circle cx="24" cy="36" r="2" fill="#B45309" />

      {/* ── Arms ── */}
      <rect x="0" y="26" width="7" height="14" rx="3.5" fill="#F59E0B" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="26" width="7" height="14" rx="3.5" fill="#F59E0B" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#78350F" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#F59E0B" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#78350F" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#F59E0B" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEO 专家 — 绿色侦探帽、放大镜、风衣
// Style: Detective — magnifier + trench coat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SEOCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Detective fedora */}
      <rect x="8" y="4" width="32" height="3" rx="1.5" fill="#059669" />
      <rect x="12" y="1" width="24" height="6" rx="3" fill="#047857" />
      {/* Hat band */}
      <rect x="12" y="5" width="24" height="2" rx="1" fill="#065F46" />
      {/* Face */}
      <rect x="12" y="7" width="24" height="16" rx="5" fill={SKIN} />
      {/* Magnifying glass — held near face, signature */}
      <circle cx="34" cy="14" r="5" fill="none" stroke="#22C55E" strokeWidth="1.5" />
      <circle cx="34" cy="14" r="3" fill="#D1FAE5" opacity="0.3" />
      <line x1="38" y1="18" x2="42" y2="22" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
      {/* Left eye */}
      <circle cx="18" cy="14" r="1.5" fill="#1A1A2E" />
      {/* Focused expression */}
      <line x1="20" y1="19" x2="28" y2="19" stroke="#1A1A2E" strokeWidth="1" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Green trench coat */}
      <rect x="6" y="23" width="36" height="23" rx="4" fill="#059669" />
      {/* Darker lapels */}
      <rect x="6" y="23" width="10" height="23" rx="4" fill="#047857" />
      <rect x="32" y="23" width="10" height="23" rx="4" fill="#047857" />
      {/* Belt */}
      <rect x="8" y="34" width="32" height="3" rx="1.5" fill="#065F46" />
      <rect x="22" y="33" width="4" height="5" rx="1" fill="#22C55E" />
      {/* Inner shirt */}
      <rect x="17" y="24" width="14" height="10" rx="2" fill="#D1FAE5" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#059669" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#059669" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="45" width="7" height="10" rx="2" fill="#2C3E50" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#059669" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="45" width="7" height="10" rx="2" fill="#2C3E50" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#059669" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GEO 专家 — 紫罗兰色探险帽、地球仪图案、工装
// Style: Explorer — pith helmet + globe motif + utility
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GEOCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Explorer pith helmet */}
      <ellipse cx="24" cy="5" rx="16" ry="4" fill="#8B5CF6" />
      <rect x="12" y="1" width="24" height="6" rx="3" fill="#7C3AED" />
      {/* Helmet band */}
      <rect x="12" y="5" width="24" height="2" fill="#6D28D9" />
      {/* Face */}
      <rect x="12" y="7" width="24" height="16" rx="5" fill={SKIN} />
      {/* Square glasses */}
      <rect x="14" y="11" width="8" height="5" rx="1.5" fill="none" stroke="#8B5CF6" strokeWidth="1.2" />
      <rect x="26" y="11" width="8" height="5" rx="1.5" fill="none" stroke="#8B5CF6" strokeWidth="1.2" />
      <line x1="22" y1="13.5" x2="26" y2="13.5" stroke="#8B5CF6" strokeWidth="0.8" />
      {/* Eyes */}
      <circle cx="18" cy="13.5" r="1.2" fill="#1A1A2E" />
      <circle cx="30" cy="13.5" r="1.2" fill="#1A1A2E" />
      {/* Small smile */}
      <path d="M20 19 Q24 21 28 19" stroke="#1A1A2E" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Violet utility jacket */}
      <rect x="7" y="23" width="34" height="22" rx="4" fill="#8B5CF6" />
      {/* Pockets */}
      <rect x="9" y="28" width="8" height="6" rx="1.5" fill="#7C3AED" />
      <rect x="31" y="28" width="8" height="6" rx="1.5" fill="#7C3AED" />
      {/* Globe motif on chest */}
      <circle cx="24" cy="32" r="5" fill="#6D28D9" />
      <ellipse cx="24" cy="32" rx="5" ry="2" fill="none" stroke="#A78BFA" strokeWidth="0.6" />
      <line x1="24" y1="27" x2="24" y2="37" stroke="#A78BFA" strokeWidth="0.6" />
      {/* Compass on shoulder */}
      <circle cx="12" cy="26" r="2.5" fill="#DDD6FE" />
      <line x1="12" y1="24" x2="12" y2="28" stroke="#7C3AED" strokeWidth="0.8" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#8B5CF6" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#8B5CF6" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#44403C" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#8B5CF6" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#44403C" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#8B5CF6" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// X/Twitter 专家 — X logo 帽衫、蓝黑色调、潮流
// Style: Techwear streetwear — X branding + hood up
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function XTwitterCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Hood up — signature techwear */}
      <path d="M10 8 Q10 1 24 0 Q38 1 38 8 L38 14 L10 14 Z" fill="#1A1A2E" />
      {/* Face peeking from hood */}
      <rect x="14" y="8" width="20" height="14" rx="5" fill={SKIN} />
      {/* Slim eyes — cool expression */}
      <rect x="16" y="13" width="5" height="2" rx="1" fill="#1A1A2E" />
      <rect x="27" y="13" width="5" height="2" rx="1" fill="#1A1A2E" />
      {/* Slight smirk */}
      <path d="M21 19 Q25 20 28 18" stroke="#1A1A2E" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Black hoodie */}
      <rect x="6" y="22" width="36" height="22" rx="5" fill="#1A1A2E" />
      {/* Hood connection */}
      <rect x="14" y="20" width="20" height="5" rx="3" fill="#1A1A2E" />
      {/* X logo on chest — big and bold */}
      <line x1="18" y1="28" x2="30" y2="38" stroke="#1DA1F2" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="28" x2="18" y2="38" stroke="#1DA1F2" strokeWidth="2.5" strokeLinecap="round" />
      {/* Front pocket */}
      <rect x="14" y="35" width="20" height="7" rx="3" fill="#111" />

      {/* ── Arms ── */}
      <rect x="0" y="24" width="7" height="15" rx="3.5" fill="#1A1A2E" />
      <ellipse cx="3.5" cy="40" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="24" width="7" height="15" rx="3.5" fill="#1A1A2E" />
      <ellipse cx="44.5" cy="40" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="43" width="7" height="12" rx="2" fill="#111" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#0A0A0F" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#1DA1F2" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="43" width="7" height="12" rx="2" fill="#111" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#0A0A0F" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#1DA1F2" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Meta Ads 专家 — 蓝色西装、靶心徽章、公文包
// Style: Corporate tech — sharp suit + target badge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MetaAdsCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Neat swept hair */}
      <rect x="11" y="2" width="26" height="9" rx="4" fill="#1E3A5F" />
      <rect x="28" y="3" width="6" height="4" rx="2" fill="#1A2F4A" />
      {/* Face */}
      <rect x="12" y="7" width="24" height="16" rx="5" fill={SKIN} />
      {/* Business glasses — thin rectangular */}
      <rect x="14" y="12" width="7" height="4" rx="1" fill="none" stroke="#1877F2" strokeWidth="1" />
      <rect x="27" y="12" width="7" height="4" rx="1" fill="none" stroke="#1877F2" strokeWidth="1" />
      <line x1="21" y1="14" x2="27" y2="14" stroke="#1877F2" strokeWidth="0.6" />
      {/* Eyes */}
      <circle cx="17.5" cy="14" r="1" fill="#1A1A2E" />
      <circle cx="30.5" cy="14" r="1" fill="#1A1A2E" />
      {/* Professional smile */}
      <path d="M20 19 Q24 21 28 19" stroke="#1A1A2E" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Blue suit jacket */}
      <rect x="7" y="23" width="34" height="22" rx="4" fill="#1877F2" />
      {/* Darker sides */}
      <rect x="7" y="23" width="9" height="22" rx="4" fill="#1565C0" />
      <rect x="32" y="23" width="9" height="22" rx="4" fill="#1565C0" />
      {/* White shirt */}
      <rect x="18" y="24" width="12" height="12" rx="2" fill="#ECF0F1" />
      {/* Tie */}
      <rect x="22" y="24" width="4" height="11" rx="1.5" fill="#0D47A1" />
      {/* Target badge on lapel */}
      <circle cx="14" cy="28" r="3" fill="#fff" />
      <circle cx="14" cy="28" r="2" fill="none" stroke="#1877F2" strokeWidth="0.8" />
      <circle cx="14" cy="28" r="0.8" fill="#1877F2" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#1877F2" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#1877F2" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#1A2F4A" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#0A0A1A" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#1877F2" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#1A2F4A" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#0A0A1A" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#1877F2" />
      </g>
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 全球内容专家 — 青色渔夫帽、背包、旅行风
// Style: World traveler — bucket hat + backpack
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GlobalContentCharacter({ walking, walkFrame }: CharacterProps) {
  const lL = legY(walking, walkFrame, 'L');
  const lR = legY(walking, walkFrame, 'R');

  return (
    <g>
      {/* ── Head ── */}
      {/* Bucket hat */}
      <rect x="8" y="5" width="32" height="3" rx="1.5" fill="#0891B2" />
      <rect x="12" y="1" width="24" height="7" rx="4" fill="#06B6D4" />
      {/* Face */}
      <rect x="12" y="7" width="24" height="16" rx="5" fill={SKIN} />
      {/* Friendly round eyes */}
      <circle cx="18" cy="14" r="2" fill="#1A1A2E" />
      <circle cx="30" cy="14" r="2" fill="#1A1A2E" />
      {/* Eye shine */}
      <circle cx="17" cy="13" r="0.7" fill="#fff" />
      <circle cx="29" cy="13" r="0.7" fill="#fff" />
      {/* Big happy smile */}
      <path d="M18 19 Q24 23 30 19" stroke="#1A1A2E" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Body ── */}
      {/* Cyan windbreaker */}
      <rect x="7" y="23" width="34" height="22" rx="4" fill="#06B6D4" />
      {/* Zip line */}
      <rect x="23" y="24" width="2" height="18" rx="1" fill="#0891B2" />
      {/* Backpack strap (visible from front) */}
      <rect x="9" y="23" width="3" height="16" rx="1" fill="#0E7490" />
      <rect x="36" y="23" width="3" height="16" rx="1" fill="#0E7490" />
      {/* World patch on chest */}
      <circle cx="18" cy="31" r="4" fill="#0E7490" />
      <ellipse cx="18" cy="31" rx="4" ry="1.5" fill="none" stroke="#67E8F9" strokeWidth="0.5" />
      <line x1="18" y1="27" x2="18" y2="35" stroke="#67E8F9" strokeWidth="0.5" />
      {/* Color patches on sleeve */}
      <rect x="32" y="30" width="5" height="3" rx="1" fill="#10B981" />
      <rect x="32" y="34" width="5" height="3" rx="1" fill="#F59E0B" />

      {/* ── Arms ── */}
      <rect x="0" y="25" width="7" height="15" rx="3.5" fill="#06B6D4" />
      <ellipse cx="3.5" cy="41" rx="3" ry="2.5" fill={SKIN} />
      <rect x="41" y="25" width="7" height="15" rx="3.5" fill="#06B6D4" />
      <ellipse cx="44.5" cy="41" rx="3" ry="2.5" fill={SKIN} />

      {/* ── Legs ── */}
      <g transform={`translate(0, ${lL})`}>
        <rect x="13" y="44" width="7" height="11" rx="2" fill="#44403C" />
        <rect x="11" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="11" y="57" width="11" height="2" rx="1" fill="#06B6D4" />
      </g>
      <g transform={`translate(0, ${lR})`}>
        <rect x="28" y="44" width="7" height="11" rx="2" fill="#44403C" />
        <rect x="26" y="53" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="57" width="11" height="2" rx="1" fill="#06B6D4" />
      </g>
    </g>
  );
}
