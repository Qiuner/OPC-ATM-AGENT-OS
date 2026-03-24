type MarketingAgentId = 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer';

type AgentStatus = 'busy' | 'online' | 'offline';

interface PixelAgentSVGProps {
  agentId: MarketingAgentId;
  status?: AgentStatus;
  className?: string;
}

export function PixelAgentSVG({ agentId, status = 'online', className }: PixelAgentSVGProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 26"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}
    >
      {agentId === 'ceo' && <CEOCharacter status={status} />}
      {agentId === 'xhs-agent' && <XHSCharacter status={status} />}
      {agentId === 'growth-agent' && <GrowthCharacter status={status} />}
      {agentId === 'brand-reviewer' && <ReviewerCharacter status={status} />}
    </svg>
  );
}

/** CEO 营销总监 — 红色西装，金色领带，手持平板 */
function CEOCharacter({ status }: { status: AgentStatus }) {
  const isIdle = status === 'offline';
  const suitColor = isIdle ? '#5a3030' : '#c0392b';
  const suitDark = isIdle ? '#4a2525' : '#962d22';
  const tieColor = isIdle ? '#8a7530' : '#f1c40f';
  const tieDark = isIdle ? '#6a5a20' : '#d4ac0d';
  const tabletColor = isIdle ? '#444' : '#2c3e50';
  const tabletScreen = isIdle ? '#333' : '#3498db';

  return (
    <>
      {/* hair — slicked back */}
      <rect x="6" y="0" width="8" height="2" fill="#1a1a1a" />
      <rect x="5" y="1" width="10" height="3" fill="#222" />
      {/* head */}
      <rect x="5" y="2" width="10" height="7" fill="#f4c49e" />
      {/* eyes */}
      <rect x="7" y="5" width="2" height="2" fill="#1a1a1a" />
      <rect x="11" y="5" width="2" height="2" fill="#1a1a1a" />
      <rect x="8" y="5" width="1" height="1" fill="#fff" />
      <rect x="12" y="5" width="1" height="1" fill="#fff" />
      {/* confident smile */}
      <rect x="8" y="8" width="4" height="1" fill="#c97b5e" />
      <rect x="7" y="7" width="1" height="1" fill="#c97b5e" />
      <rect x="12" y="7" width="1" height="1" fill="#c97b5e" />
      {/* ears */}
      <rect x="4" y="5" width="1" height="3" fill="#f4c49e" />
      <rect x="15" y="5" width="1" height="3" fill="#f4c49e" />
      {/* neck */}
      <rect x="8" y="9" width="4" height="2" fill="#f4c49e" />
      {/* red suit jacket */}
      <rect x="5" y="11" width="10" height="9" fill={suitColor} />
      <rect x="5" y="11" width="3" height="9" fill={suitDark} />
      <rect x="12" y="11" width="3" height="9" fill={suitDark} />
      {/* white shirt peek */}
      <rect x="8" y="11" width="4" height="3" fill="#ecf0f1" />
      {/* gold tie */}
      <rect x="9" y="11" width="2" height="7" fill={tieColor} />
      <rect x="9" y="18" width="2" height="1" fill={tieDark} />
      {/* left arm */}
      <rect x="2" y="11" width="3" height="8" fill={suitColor} />
      <rect x="1" y="17" width="3" height="3" fill="#f4c49e" />
      {/* right arm + tablet */}
      <rect x="15" y="11" width="3" height="8" fill={suitColor} />
      <rect x="16" y="16" width="3" height="4" fill="#f4c49e" />
      <rect x="17" y="13" width="4" height="6" fill={tabletColor} />
      <rect x="18" y="14" width="2" height="4" fill={tabletScreen} />
      {/* busy indicator — spinning animation dot */}
      {status === 'busy' && (
        <rect x="19" y="14" width="1" height="1" fill="#2ecc71">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </rect>
      )}
      {/* legs */}
      <rect x="6" y="20" width="4" height="6" fill="#2c3e50" />
      <rect x="10" y="20" width="4" height="6" fill="#2c3e50" />
      {/* red shoes */}
      <rect x="5" y="25" width="5" height="1" fill={suitDark} />
      <rect x="10" y="25" width="5" height="1" fill={suitDark} />
      {/* crown icon for CEO */}
      <rect x="7" y="-1" width="1" height="1" fill={tieColor} />
      <rect x="9" y="-1" width="2" height="1" fill={tieColor} />
      <rect x="12" y="-1" width="1" height="1" fill={tieColor} />
    </>
  );
}

/** 小红书创作专家 — 红色系，手持手机+笔记本 */
function XHSCharacter({ status }: { status: AgentStatus }) {
  const isIdle = status === 'offline';
  const topColor = isIdle ? '#6a2020' : '#ff2442';
  const topDark = isIdle ? '#501818' : '#cc1a35';
  const phoneColor = isIdle ? '#444' : '#333';
  const phoneScreen = isIdle ? '#333' : '#ff6b81';
  const bookColor = isIdle ? '#554' : '#fff5f5';

  return (
    <>
      {/* trendy bob hair */}
      <rect x="4" y="0" width="12" height="2" fill="#3d2314" />
      <rect x="3" y="1" width="14" height="4" fill="#5c3a1e" />
      <rect x="3" y="3" width="2" height="4" fill="#5c3a1e" />
      <rect x="15" y="3" width="2" height="4" fill="#5c3a1e" />
      {/* head */}
      <rect x="5" y="2" width="10" height="7" fill="#f4c49e" />
      {/* eyes — sparkly */}
      <rect x="7" y="5" width="2" height="2" fill="#1a1a1a" />
      <rect x="11" y="5" width="2" height="2" fill="#1a1a1a" />
      <rect x="8" y="5" width="1" height="1" fill="#fff" />
      <rect x="12" y="5" width="1" height="1" fill="#fff" />
      <rect x="7" y="6" width="1" height="1" fill="#fff" opacity="0.5" />
      <rect x="11" y="6" width="1" height="1" fill="#fff" opacity="0.5" />
      {/* blush */}
      <rect x="6" y="7" width="2" height="1" fill="#ffb3b3" opacity="0.6" />
      <rect x="12" y="7" width="2" height="1" fill="#ffb3b3" opacity="0.6" />
      {/* smile */}
      <rect x="9" y="8" width="2" height="1" fill="#e88" />
      {/* ears */}
      <rect x="4" y="5" width="1" height="2" fill="#f4c49e" />
      <rect x="15" y="5" width="1" height="2" fill="#f4c49e" />
      {/* earrings */}
      <rect x="4" y="7" width="1" height="1" fill="#ff2442" />
      <rect x="15" y="7" width="1" height="1" fill="#ff2442" />
      {/* neck */}
      <rect x="8" y="9" width="4" height="2" fill="#f4c49e" />
      {/* red XHS branded top */}
      <rect x="5" y="11" width="10" height="9" fill={topColor} />
      {/* 书 character accent */}
      <rect x="8" y="13" width="4" height="3" fill="#fff" opacity="0.3" />
      {/* left arm + notebook */}
      <rect x="2" y="11" width="3" height="8" fill={topColor} />
      <rect x="1" y="17" width="3" height="3" fill="#f4c49e" />
      <rect x="-1" y="14" width="4" height="5" fill={bookColor} />
      <rect x="0" y="15" width="2" height="1" fill={topDark} />
      <rect x="0" y="17" width="2" height="1" fill={topDark} />
      {/* right arm + phone */}
      <rect x="15" y="11" width="3" height="8" fill={topColor} />
      <rect x="16" y="16" width="3" height="4" fill="#f4c49e" />
      <rect x="17" y="13" width="3" height="5" fill={phoneColor} />
      <rect x="17" y="14" width="3" height="3" fill={phoneScreen} />
      {/* busy — typing indicator */}
      {status === 'busy' && (
        <>
          <rect x="17" y="15" width="1" height="1" fill="#fff">
            <animate attributeName="opacity" values="1;0;1" dur="0.6s" repeatCount="indefinite" />
          </rect>
          <rect x="18" y="15" width="1" height="1" fill="#fff">
            <animate attributeName="opacity" values="0;1;0" dur="0.6s" repeatCount="indefinite" />
          </rect>
          <rect x="19" y="15" width="1" height="1" fill="#fff">
            <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
          </rect>
        </>
      )}
      {/* skirt */}
      <rect x="5" y="20" width="10" height="3" fill={topDark} />
      {/* legs */}
      <rect x="6" y="23" width="3" height="3" fill="#f4c49e" />
      <rect x="11" y="23" width="3" height="3" fill="#f4c49e" />
      {/* red sneakers */}
      <rect x="5" y="25" width="4" height="1" fill={topColor} />
      <rect x="11" y="25" width="4" height="1" fill={topColor} />
    </>
  );
}

/** 增长营销专家 — 青色系，数据分析师风，手持图表 */
function GrowthCharacter({ status }: { status: AgentStatus }) {
  const isIdle = status === 'offline';
  const mainColor = isIdle ? '#1a4040' : '#00cec9';
  const mainDark = isIdle ? '#103030' : '#00a8a3';
  const chartBg = isIdle ? '#333' : '#1a1a2e';
  const chartBar1 = isIdle ? '#555' : '#00cec9';
  const chartBar2 = isIdle ? '#444' : '#55efc4';
  const chartBar3 = isIdle ? '#666' : '#81ecec';

  return (
    <>
      {/* short spiky hair */}
      <rect x="5" y="0" width="10" height="2" fill="#2d3436" />
      <rect x="4" y="1" width="12" height="3" fill="#2d3436" />
      <rect x="6" y="0" width="2" height="1" fill="#636e72" />
      <rect x="11" y="0" width="2" height="1" fill="#636e72" />
      {/* head */}
      <rect x="5" y="2" width="10" height="7" fill="#f0b98e" />
      {/* glasses */}
      <rect x="6" y="4" width="3" height="3" fill="none" stroke={mainColor} strokeWidth=".7" />
      <rect x="11" y="4" width="3" height="3" fill="none" stroke={mainColor} strokeWidth=".7" />
      <rect x="9" y="5" width="2" height="1" fill={mainColor} />
      {/* eyes behind glasses */}
      <rect x="7" y="5" width="2" height="1" fill="#1a1a1a" />
      <rect x="12" y="5" width="2" height="1" fill="#1a1a1a" />
      {/* mouth */}
      <rect x="8" y="8" width="4" height="1" fill="#c97b5e" />
      {/* ears */}
      <rect x="4" y="5" width="1" height="2" fill="#f0b98e" />
      <rect x="15" y="5" width="1" height="2" fill="#f0b98e" />
      {/* neck */}
      <rect x="8" y="9" width="4" height="2" fill="#f0b98e" />
      {/* teal polo shirt */}
      <rect x="5" y="11" width="10" height="9" fill={mainColor} />
      {/* collar */}
      <rect x="8" y="11" width="4" height="2" fill={mainDark} />
      <rect x="9" y="11" width="2" height="1" fill="#f0b98e" />
      {/* rocket logo on chest */}
      <rect x="8" y="14" width="1" height="2" fill="#fff" opacity="0.5" />
      <rect x="7" y="16" width="3" height="1" fill="#fff" opacity="0.3" />
      {/* left arm + chart tablet */}
      <rect x="2" y="11" width="3" height="8" fill={mainColor} />
      <rect x="1" y="17" width="3" height="3" fill="#f0b98e" />
      <rect x="-1" y="13" width="4" height="6" fill={chartBg} />
      {/* chart bars */}
      <rect x="0" y="17" width="1" height="1" fill={chartBar1} />
      <rect x="1" y="16" width="1" height="2" fill={chartBar2} />
      <rect x="2" y="14" width="1" height="4" fill={chartBar3} />
      {/* busy — bars animate */}
      {status === 'busy' && (
        <>
          <rect x="0" y="15" width="1" height="3" fill={chartBar1}>
            <animate attributeName="height" values="1;3;1" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="y" values="17;15;17" dur="1.2s" repeatCount="indefinite" />
          </rect>
          <rect x="1" y="14" width="1" height="4" fill={chartBar2}>
            <animate attributeName="height" values="2;4;2" dur="1s" repeatCount="indefinite" />
            <animate attributeName="y" values="16;14;16" dur="1s" repeatCount="indefinite" />
          </rect>
        </>
      )}
      {/* right arm */}
      <rect x="15" y="11" width="3" height="8" fill={mainColor} />
      <rect x="16" y="17" width="3" height="3" fill="#f0b98e" />
      {/* pointing up gesture */}
      <rect x="17" y="15" width="1" height="3" fill="#f0b98e" />
      {/* legs — dark jeans */}
      <rect x="6" y="20" width="3" height="6" fill="#2d3436" />
      <rect x="11" y="20" width="3" height="6" fill="#2d3436" />
      {/* teal sneakers */}
      <rect x="5" y="25" width="4" height="1" fill={mainDark} />
      <rect x="11" y="25" width="4" height="1" fill={mainDark} />
    </>
  );
}

/** 品牌风控审查 — 紫色系，严谨风，手持盾牌+清单 */
function ReviewerCharacter({ status }: { status: AgentStatus }) {
  const isIdle = status === 'offline';
  const mainColor = isIdle ? '#3a2060' : '#a855f7';
  const mainDark = isIdle ? '#2a1545' : '#7c3aed';
  const shieldColor = isIdle ? '#555' : '#a855f7';
  const shieldCheck = isIdle ? '#666' : '#22c55e';
  const listBg = isIdle ? '#444' : '#f5f0ff';

  return (
    <>
      {/* neat hair */}
      <rect x="5" y="0" width="10" height="2" fill="#1a1a2e" />
      <rect x="4" y="1" width="12" height="3" fill="#16213e" />
      {/* head */}
      <rect x="5" y="2" width="10" height="7" fill="#f4c49e" />
      {/* stern eyes */}
      <rect x="7" y="5" width="2" height="2" fill="#1a1a1a" />
      <rect x="11" y="5" width="2" height="2" fill="#1a1a1a" />
      <rect x="7" y="5" width="1" height="1" fill="#fff" />
      <rect x="11" y="5" width="1" height="1" fill="#fff" />
      {/* serious eyebrows */}
      <rect x="6" y="4" width="4" height="1" fill="#1a1a2e" />
      <rect x="10" y="4" width="4" height="1" fill="#1a1a2e" />
      {/* neutral mouth */}
      <rect x="8" y="8" width="4" height="1" fill="#c97b5e" />
      {/* ears */}
      <rect x="4" y="5" width="1" height="2" fill="#f4c49e" />
      <rect x="15" y="5" width="1" height="2" fill="#f4c49e" />
      {/* neck */}
      <rect x="8" y="9" width="4" height="2" fill="#f4c49e" />
      {/* purple blazer */}
      <rect x="5" y="11" width="10" height="9" fill={mainColor} />
      <rect x="5" y="11" width="3" height="9" fill={mainDark} />
      <rect x="12" y="11" width="3" height="9" fill={mainDark} />
      {/* white shirt */}
      <rect x="8" y="11" width="4" height="5" fill="#ecf0f1" />
      {/* badge */}
      <rect x="12" y="12" width="2" height="2" fill={shieldCheck} />
      <rect x="13" y="12" width="1" height="1" fill="#fff" />
      {/* left arm + shield */}
      <rect x="2" y="11" width="3" height="8" fill={mainColor} />
      <rect x="1" y="17" width="3" height="3" fill="#f4c49e" />
      {/* shield */}
      <rect x="-1" y="13" width="4" height="5" fill={shieldColor} />
      <rect x="0" y="14" width="2" height="3" fill={shieldCheck} />
      <rect x="0" y="15" width="2" height="1" fill="#fff" />
      {/* right arm + checklist */}
      <rect x="15" y="11" width="3" height="8" fill={mainColor} />
      <rect x="16" y="17" width="3" height="3" fill="#f4c49e" />
      <rect x="17" y="13" width="4" height="6" fill={listBg} />
      {/* checklist items */}
      <rect x="18" y="14" width="1" height="1" fill={shieldCheck} />
      <rect x="19" y="14" width="2" height="1" fill="#94a3b8" />
      <rect x="18" y="16" width="1" height="1" fill={shieldCheck} />
      <rect x="19" y="16" width="2" height="1" fill="#94a3b8" />
      <rect x="18" y="18" width="1" height="1" fill="#ef4444" />
      <rect x="19" y="18" width="2" height="1" fill="#94a3b8" />
      {/* busy — scanning animation */}
      {status === 'busy' && (
        <rect x="17" y="14" width="4" height="1" fill={mainColor} opacity="0.6">
          <animate attributeName="y" values="14;18;14" dur="1.5s" repeatCount="indefinite" />
        </rect>
      )}
      {/* legs */}
      <rect x="6" y="20" width="4" height="6" fill="#1a1a2e" />
      <rect x="10" y="20" width="4" height="6" fill="#1a1a2e" />
      {/* formal shoes */}
      <rect x="5" y="25" width="5" height="1" fill="#111" />
      <rect x="10" y="25" width="5" height="1" fill="#111" />
    </>
  );
}
