#!/usr/bin/env node
/**
 * 扣子空间 TTS 自动化脚本
 * 用 chrome-cdp 操作用户 Chrome 中的扣子空间，输入播客脚本并生成双人对话音频
 *
 * 用法:
 *   node scripts/coze-tts-auto.mjs --run-id <run_id>
 *   node scripts/coze-tts-auto.mjs --script "脚本内容" --episode-id <episode_id>
 *   node scripts/coze-tts-auto.mjs --script-file /path/to/script.txt --episode-id <episode_id>
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CDP_SCRIPT = join(
  process.env.HOME,
  '.openclaw/skills/chrome-cdp/scripts/cdp.mjs'
);
const COZE_URL =
  'https://www.coze.cn/?skills=7587379252077805604&category=7524915324945252398';
const AGENT_OS_URL = 'http://localhost:3000';
const CREATORFLOW_URL = 'http://localhost:3002';
const FEISHU_CHAT_ID = 'oc_34b771771cb6dac5b305cf8ee4fe11ca';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cdp(cmd, timeout = 15000) {
  try {
    const result = execSync(`node "${CDP_SCRIPT}" ${cmd}`, {
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (err) {
    console.error(`[CDP] Command failed: ${cmd}`);
    console.error(err.stderr || err.message);
    return null;
  }
}

function sleep(ms) {
  execSync(`sleep ${ms / 1000}`);
}

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  return res.json();
}

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let runId = null;
let scriptContent = null;
let episodeId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--run-id') runId = args[++i];
  if (args[i] === '--script') scriptContent = args[++i];
  if (args[i] === '--script-file') scriptContent = readFileSync(args[++i], 'utf-8');
  if (args[i] === '--episode-id') episodeId = args[++i];
}

// ---------------------------------------------------------------------------
// Step 1: Get script content from workflow if needed
// ---------------------------------------------------------------------------

if (runId && !scriptContent) {
  log(`从工作流 ${runId} 获取脚本...`);
  const data = await fetchJson(
    `${AGENT_OS_URL}/api/openclaw/workflow-status?run_id=${runId}`
  );
  const rd = data.run?.result_data || {};
  scriptContent = rd.coze_action?.script_content || rd.generated_content || '';
  episodeId = episodeId || rd.creatorflow_episode_id;

  if (!scriptContent) {
    console.error('无法从工作流获取脚本内容');
    process.exit(1);
  }
}

if (!scriptContent) {
  console.error('用法: node coze-tts-auto.mjs --run-id <id> 或 --script "内容"');
  process.exit(1);
}

// Truncate to 2000 chars for Coze input
const inputScript = scriptContent.slice(0, 2000);
log(`脚本长度: ${scriptContent.length} 字 (输入: ${inputScript.length} 字)`);

// ---------------------------------------------------------------------------
// Step 2: Open Coze Space
// ---------------------------------------------------------------------------

log('打开扣子空间...');
const openResult = cdp(`open "${COZE_URL}"`);
if (!openResult) {
  console.error('无法打开扣子空间标签页');
  process.exit(1);
}

// Extract target ID from output like "Opened new tab: 1ADB1383  https://..."
const targetMatch = openResult.match(/([A-F0-9]{8})\s/);
const targetId = targetMatch?.[1];
if (!targetId) {
  console.error('无法获取标签页 targetId:', openResult);
  process.exit(1);
}
log(`标签页 targetId: ${targetId}`);

// Wait for page load + Allow debugging prompt
log('等待页面加载 (10秒)...');
log('⚠️  如果 Chrome 弹出调试授权，请点击 Allow');
sleep(10000);

// Verify page loaded
const shotResult = cdp(`shot ${targetId} /tmp/coze-auto-check.png`);
if (!shotResult) {
  console.error('无法截图，请确认已点击 Allow 授权调试');
  process.exit(1);
}
log('页面已加载');

// ---------------------------------------------------------------------------
// Step 3: Click input area and type script
// ---------------------------------------------------------------------------

log('点击输入框...');
const clickResult = cdp(`click ${targetId} "[contenteditable]"`);
if (!clickResult) {
  console.error('无法点击输入框');
  process.exit(1);
}
log('输入框已聚焦');

sleep(500);

log('输入播客脚本...');
// Prepare text for type command - escape for shell
const typeText = `请将以下播客脚本转成双人对话音频：\n\n${inputScript}`;
// Write to temp file to avoid shell escaping issues
const tmpScriptPath = '/tmp/coze-auto-script.txt';
writeFileSync(tmpScriptPath, typeText);

// Use type command - reads stdin or direct arg
// For long text, use eval to set content
const escapedText = typeText
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\n/g, '\\n');

const typeResult = cdp(
  `eval ${targetId} "var e=document.querySelector('[contenteditable=\\\"true\\\"]');if(e){var t=document.createTextNode('${escapedText.slice(0, 100)}');e.appendChild(t);e.dispatchEvent(new Event('input',{bubbles:true}));'ok'}else{'no editor'}"`,
  10000
);

// Use Input.insertText for the full content (works with contenteditable)
cdp(`type ${targetId} "${typeText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, 15000);

log('脚本已输入');
sleep(1000);

// ---------------------------------------------------------------------------
// Step 4: Find and click send button
// ---------------------------------------------------------------------------

log('查找发送按钮...');

// Get the send button position (it's next to 一键优化 button)
const btnInfo = cdp(
  `eval ${targetId} "var btns=document.querySelectorAll('button');var r='';for(var i=0;i<btns.length;i++){if(btns[i].textContent.includes('一键优化')){var sib=btns[i].parentElement.nextElementSibling;while(sib){var b=sib.querySelector('button');if(b){var rect=b.getBoundingClientRect();r=Math.round(rect.x+rect.width/2)+','+Math.round(rect.y+rect.height/2);break}sib=sib.nextElementSibling}break}}r"`,
  10000
);

if (btnInfo && btnInfo.includes(',')) {
  const [x, y] = btnInfo.split(',');
  log(`发送按钮坐标: (${x}, ${y})`);
  cdp(`clickxy ${targetId} ${x} ${y}`);
} else {
  // Fallback: try to find button after 一键优化
  log('使用备用方案查找发送按钮...');
  cdp(
    `eval ${targetId} "var btns=document.querySelectorAll('button');for(var i=0;i<btns.length;i++){if(btns[i].textContent.includes('一键优化')&&btns[i].nextElementSibling){var n=btns[i].parentElement;var all=n.parentElement.querySelectorAll('button');all[all.length-1].click();break}}"`,
    10000
  );
}

log('已点击发送');

// ---------------------------------------------------------------------------
// Step 5: Wait for audio generation
// ---------------------------------------------------------------------------

log('等待音频生成 (通常需要 1-3 分钟)...');

let audioReady = false;
const maxWait = 300; // 5 minutes max
const checkInterval = 15; // check every 15 seconds

for (let elapsed = 0; elapsed < maxWait; elapsed += checkInterval) {
  sleep(checkInterval * 1000);

  // Check if audio player appeared
  const check = cdp(
    `eval ${targetId} "var a=document.querySelector('audio');var dl=document.querySelector('[class*=podcast-card],[class*=audio-player],[class*=播客]');(a?'audio:'+a.src:'no-audio')+'|'+(dl?'card-found':'no-card')"`,
    10000
  );

  log(`[${elapsed + checkInterval}s] 状态: ${check}`);

  // Also take screenshot to monitor
  cdp(`shot ${targetId} /tmp/coze-auto-progress.png`);

  // Check if the page shows completion signs
  const pageCheck = cdp(
    `eval ${targetId} "var texts=document.body.innerText;(texts.includes('完成播客制作')||texts.includes('00:0')||document.querySelector('audio'))?'DONE':'WAITING'"`,
    10000
  );

  if (pageCheck === 'DONE') {
    log('音频生成完成！');
    audioReady = true;
    break;
  }
}

if (!audioReady) {
  log('⚠️ 等待超时，尝试继续提取音频...');
}

// Take final screenshot
cdp(`shot ${targetId} /tmp/coze-auto-final.png`);

// ---------------------------------------------------------------------------
// Step 6: Extract audio URL and download
// ---------------------------------------------------------------------------

log('提取音频 URL...');

// Try multiple methods to find audio
const audioUrl = cdp(
  `eval ${targetId} "var a=document.querySelector('audio');if(a&&a.src)a.src;else{var sources=document.querySelectorAll('source');for(var i=0;i<sources.length;i++){if(sources[i].src)sources[i].src}}"`,
  10000
);

// Try to find download link
const downloadUrl = cdp(
  `eval ${targetId} "var links=[...document.querySelectorAll('a[href],button')];var dl=links.find(function(l){return l.textContent.includes('下载')||l.href&&/\\\\.(mp3|wav|ogg|m4a)/i.test(l.href)});dl?(dl.href||'button:'+dl.textContent):'none'"`,
  10000
);

log(`Audio URL: ${audioUrl}`);
log(`Download URL: ${downloadUrl}`);

// Determine the best URL to download
let finalAudioUrl = null;
if (audioUrl && audioUrl.startsWith('http')) {
  finalAudioUrl = audioUrl;
} else if (downloadUrl && downloadUrl.startsWith('http')) {
  finalAudioUrl = downloadUrl;
}

// ---------------------------------------------------------------------------
// Step 7: Save audio to CreatorFlow
// ---------------------------------------------------------------------------

if (finalAudioUrl) {
  log(`下载音频: ${finalAudioUrl}`);

  // Download to CreatorFlow's podcast-episodes directory
  const creatorflowDataDir = join(
    process.env.HOME,
    'Desktop/Agent-team-project/AI自媒体工具/自媒体工具/creatorflow/data/podcast-episodes'
  );
  const audioFilename = `${episodeId || 'coze'}_${Date.now()}.mp3`;
  const audioPath = join(creatorflowDataDir, audioFilename);

  try {
    execSync(`curl -sL -o "${audioPath}" "${finalAudioUrl}"`, {
      timeout: 60000,
    });
    log(`音频已保存: ${audioPath}`);

    // Update CreatorFlow episode
    if (episodeId) {
      log(`更新 CreatorFlow episode ${episodeId}...`);
      await fetchJson(`${CREATORFLOW_URL}/api/podcast/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_path: audioFilename, status: 'recorded' }),
      });
      log('CreatorFlow 已更新');
    }

    // Call Agent OS save-audio API to also send to Feishu
    if (runId) {
      log('通知 Agent OS 并发送到飞书...');
      await fetchJson(`${AGENT_OS_URL}/api/openclaw/save-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: runId,
          audio_file_path: audioPath,
          file_name: audioFilename,
          feishu_chat_id: FEISHU_CHAT_ID,
        }),
      });
      log('已发送到飞书');
    }
  } catch (err) {
    console.error('音频下载/保存失败:', err.message);
  }
} else {
  log('⚠️ 未找到可下载的音频 URL');
  log('请手动从扣子空间下载音频，然后调用:');
  log(
    `  curl -X POST ${AGENT_OS_URL}/api/openclaw/save-audio -H "Content-Type: application/json" -d '{"run_id":"${runId}","audio_file_path":"/path/to/audio.mp3","feishu_chat_id":"${FEISHU_CHAT_ID}"}'`
  );

  // Still resume the workflow if we have run_id
  if (runId) {
    log('恢复工作流...');
    await fetchJson(
      `${AGENT_OS_URL}/api/openclaw/intervention-callback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { value: { run_id: runId, decision: 'approve' } },
        }),
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Step 8: Cleanup
// ---------------------------------------------------------------------------

log('清理 daemon...');
cdp(`stop ${targetId}`);

log('✅ 完成！');
