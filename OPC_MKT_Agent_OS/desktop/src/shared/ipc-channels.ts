/**
 * IPC Channel 命名规范
 *
 * 格式: domain:entity:action
 *
 * domain:
 *   store   — JSON 文件数据 CRUD
 *   agent   — Agent 执行相关
 *   config  — 系统配置
 *   fs      — 文件系统操作（skills 等）
 *
 * action:
 *   list / get / create / update / delete  — CRUD
 *   execute / stream                       — Agent 执行
 */

export const IPC = {
  // ── Store: Tasks ──
  TASKS_LIST: 'store:tasks:list',
  TASKS_GET: 'store:tasks:get',
  TASKS_CREATE: 'store:tasks:create',
  TASKS_UPDATE: 'store:tasks:update',
  TASKS_DELETE: 'store:tasks:delete',

  // ── Store: Contents ──
  CONTENTS_LIST: 'store:contents:list',
  CONTENTS_GET: 'store:contents:get',
  CONTENTS_CREATE: 'store:contents:create',
  CONTENTS_UPDATE: 'store:contents:update',
  CONTENTS_DELETE: 'store:contents:delete',

  // ── Store: Approvals ──
  APPROVALS_LIST: 'store:approvals:list',
  APPROVALS_CREATE: 'store:approvals:create',

  // ── Store: Context Assets ──
  CONTEXT_LIST: 'store:context:list',
  CONTEXT_GET: 'store:context:get',
  CONTEXT_CREATE: 'store:context:create',
  CONTEXT_UPDATE: 'store:context:update',
  CONTEXT_DELETE: 'store:context:delete',
  CONTEXT_CLASSIFY: 'store:context:classify',

  // ── Store: Metrics ──
  METRICS_LIST: 'store:metrics:list',
  METRICS_CREATE: 'store:metrics:create',

  // ── Store: Agent Runs ──
  AGENT_RUNS_LIST: 'store:agent-runs:list',

  // ── Store: Campaigns ──
  CAMPAIGNS_LIST: 'store:campaigns:list',

  // ── Store: Settings ──
  SETTINGS_GET: 'store:settings:get',
  SETTINGS_UPDATE: 'store:settings:update',

  // ── Config ──
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',

  // ── Agent Execution ──
  AGENT_EXECUTE: 'agent:execute',
  AGENT_ABORT: 'agent:abort',
  AGENT_STATUS: 'agent:status',
  AGENT_SAVE_RESULT: 'agent:save-result',

  // ── Agent Session (conversation continuity) ──
  AGENT_SESSION_GET: 'agent:session:get',
  AGENT_SESSION_CLEAR: 'agent:session:clear',

  // ── Agent Content Pipeline ──
  AGENT_SUBMIT_TO_REVIEW: 'agent:submit-to-review',
  AGENT_PUBLISH: 'agent:publish',
  AGENT_PUBLISH_PROGRESS: 'agent:publish:progress',

  // ── Agent Events (main → renderer push) ──
  AGENT_EVENT: 'agent:event',
  AGENT_STREAM_CHUNK: 'agent:stream:chunk',
  AGENT_STREAM_END: 'agent:stream:end',
  AGENT_STREAM_ERROR: 'agent:stream:error',

  // ── Secure Storage (API Keys via Keychain) ──
  KEYS_GET_STATUS: 'secure:keys:status',
  KEYS_SET: 'secure:keys:set',
  KEYS_DELETE: 'secure:keys:delete',
  KEYS_CLEAR: 'secure:keys:clear',

  // ── Platform Auth (cookie-based logins) ──
  PLATFORM_AUTH_STATUS: 'platform:auth:status',
  PLATFORM_AUTH_LOGIN: 'platform:auth:login',
  PLATFORM_AUTH_LOGOUT: 'platform:auth:logout',

  // ── Theme ──
  THEME_GET: 'config:theme:get',
  THEME_SET: 'config:theme:set',
  THEME_CHANGED: 'config:theme:changed',

  // ── Onboarding ──
  ONBOARDING_STATUS: 'config:onboarding:status',
  ONBOARDING_COMPLETE: 'config:onboarding:complete',
  ONBOARDING_ENV_CHECK: 'config:onboarding:env-check',
  ONBOARDING_VALIDATE_INVITE: 'config:onboarding:validate-invite',

  // ── Skills ──
  SKILLS_LIST: 'fs:skills:list',
  SKILLS_CREATE: 'fs:skills:create',
  SKILLS_DELETE: 'fs:skills:delete',
  SKILLS_OPEN_FOLDER: 'fs:skills:open-folder',

  // ── Team ──
  TEAM_GET_AGENTS: 'team:agents:get',
  TEAM_SET_AGENTS: 'team:agents:set',
  TEAM_AGENTS_CHANGED: 'team:agents:changed',

  // ── Chat Sync (cross-window message relay) ──
  CHAT_SYNC_SEND: 'chat:sync:send',
  CHAT_SYNC_BROADCAST: 'chat:sync:broadcast',

  // ── Dock Pet ──
  DOCK_PET_TOGGLE: 'dock-pet:toggle',
  DOCK_PET_OPEN_MAIN: 'dock-pet:open-main',
  DOCK_PET_GEOMETRY: 'dock-pet:geometry',
  DOCK_PET_SHOW_POPOVER: 'dock-pet:show-popover',
  DOCK_PET_HIDE_POPOVER: 'dock-pet:hide-popover',
  DOCK_PET_MOUSE_FORWARD: 'dock-pet:mouse-forward',
  DOCK_PET_POPOVER_AGENT: 'dock-pet:popover-agent',

  // ── File (local file access) ──
  FILE_READ_IMAGE: 'fs:file:read-image',

  // ── Orchestrator (CEO Multi-Agent) ──
  ORCHESTRATOR_EXECUTE: 'orchestrator:execute',
  ORCHESTRATOR_ABORT: 'orchestrator:abort',
  ORCHESTRATOR_STATUS: 'orchestrator:status',

  // ── Sound Notify ──
  SOUND_GET_SETTINGS: 'sound:settings:get',
  SOUND_UPDATE_SETTINGS: 'sound:settings:update',
  SOUND_TOGGLE: 'sound:toggle',
  SOUND_PLAY: 'sound:play',
  SOUND_SPEAK: 'sound:speak',

  // ── Orchestrator Events (main → renderer push) ──
  ORCHESTRATOR_PLAN: 'orchestrator:plan',
  ORCHESTRATOR_SUB_START: 'orchestrator:sub-start',
  ORCHESTRATOR_SUB_STREAM: 'orchestrator:sub-stream',
  ORCHESTRATOR_SUB_DONE: 'orchestrator:sub-done',
  ORCHESTRATOR_SUB_ERROR: 'orchestrator:sub-error',
  ORCHESTRATOR_PROGRESS: 'orchestrator:progress',
  ORCHESTRATOR_RESULT: 'orchestrator:result',
  ORCHESTRATOR_ERROR: 'orchestrator:error',
  ORCHESTRATOR_STATUS_CHANGE: 'orchestrator:status-change',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
