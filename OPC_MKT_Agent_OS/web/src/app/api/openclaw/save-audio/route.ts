import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowRun, updateWorkflowRun } from '@/lib/store/workflow-runs';
import { ensureCreatorFlowRunning } from '@/lib/openclaw/handlers';
import { feishuClient } from '@/lib/feishu/client';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CREATORFLOW_URL = 'http://localhost:3002';

// ---------------------------------------------------------------------------
// POST /api/openclaw/save-audio
// OpenClaw 从扣子空间获取音频后调用此端点保存并分发
// ---------------------------------------------------------------------------

interface SaveAudioPayload {
  run_id: string;
  // 音频来源（三选一）
  audio_url?: string;       // 远程音频 URL
  audio_file_path?: string; // 本地文件路径（如 Chrome 下载目录）
  audio_base64?: string;    // Base64 编码的音频数据
  // 可选
  file_name?: string;
  feishu_chat_id?: string;
}

// Known audio file magic bytes
const AUDIO_MAGIC: Array<{ bytes: number[]; label: string }> = [
  { bytes: [0x49, 0x44, 0x33], label: 'ID3/MP3' },           // ID3 tag (MP3)
  { bytes: [0xFF, 0xFB], label: 'MP3' },                      // MP3 frame sync
  { bytes: [0xFF, 0xF3], label: 'MP3' },                      // MP3 frame sync
  { bytes: [0xFF, 0xF2], label: 'MP3' },                      // MP3 frame sync
  { bytes: [0x4F, 0x67, 0x67, 0x53], label: 'OGG/Opus' },    // OGG container
  { bytes: [0x52, 0x49, 0x46, 0x46], label: 'WAV' },          // RIFF/WAV
  { bytes: [0x66, 0x4C, 0x61, 0x43], label: 'FLAC' },         // FLAC
];

function isAudioBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return AUDIO_MAGIC.some(({ bytes }) =>
    bytes.every((b, i) => buffer[i] === b)
  );
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  // Validate that the downloaded content is actual audio, not HTML
  if (!isAudioBuffer(buffer)) {
    const preview = buffer.slice(0, 100).toString('utf-8');
    if (preview.includes('<!doctype') || preview.includes('<html')) {
      throw new Error('下载的内容是网页 HTML 而不是音频文件，请检查音频 URL 是否为直接下载链接');
    }
    console.warn('[SaveAudio] Warning: downloaded file does not match known audio signatures');
  }

  fs.writeFileSync(destPath, buffer);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload: SaveAudioPayload = await request.json();
    const { run_id, audio_url, audio_file_path, audio_base64, file_name, feishu_chat_id } = payload;

    if (!run_id) {
      return NextResponse.json(
        { success: false, error: '缺少 run_id' },
        { status: 400 }
      );
    }

    if (!audio_url && !audio_file_path && !audio_base64) {
      return NextResponse.json(
        { success: false, error: '缺少音频来源: 需要 audio_url、audio_file_path 或 audio_base64' },
        { status: 400 }
      );
    }

    // 1. Load workflow run
    const run = await getWorkflowRun(run_id);
    if (!run) {
      return NextResponse.json(
        { success: false, error: `未找到工作流: ${run_id}` },
        { status: 404 }
      );
    }

    const resultData = (run.result_data ?? {}) as Record<string, unknown>;
    const episodeId = resultData.creatorflow_episode_id as string | undefined;
    const podcastTitle = resultData.podcast_title as string || '播客';

    // 2. Resolve audio to a local file
    const audioDir = path.join(os.tmpdir(), 'openclaw-audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const audioFileName = file_name || `podcast-${run_id}.mp3`;
    const localPath = path.join(audioDir, audioFileName);

    if (audio_file_path) {
      // Copy from local path
      if (!fs.existsSync(audio_file_path)) {
        return NextResponse.json(
          { success: false, error: `音频文件不存在: ${audio_file_path}` },
          { status: 400 }
        );
      }
      fs.copyFileSync(audio_file_path, localPath);
    } else if (audio_url) {
      // Download from URL
      await downloadToFile(audio_url, localPath);
    } else if (audio_base64) {
      // Decode base64
      const buffer = Buffer.from(audio_base64, 'base64');
      fs.writeFileSync(localPath, buffer);
    }

    const fileSize = fs.statSync(localPath).size;
    console.log(`[SaveAudio] Audio saved: ${localPath} (${(fileSize / 1024).toFixed(1)}KB)`);

    // 3. Upload audio to CreatorFlow episode via multipart upload API
    let finalEpisodeId = episodeId;
    try {
      await ensureCreatorFlowRunning();

      // If no episode exists yet, create one with title + script
      if (!finalEpisodeId) {
        const script = resultData.script as string || resultData.generated_content as string || '';
        const createRes = await fetch(`${CREATORFLOW_URL}/api/podcast/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: podcastTitle || '播客',
            series: '技术系列',
            script,
          }),
        });
        if (createRes.ok) {
          const created = await createRes.json() as { id?: string };
          if (created.id) {
            finalEpisodeId = created.id;
            console.log(`[SaveAudio] Created CreatorFlow episode: ${finalEpisodeId}`);
          }
        }
      }

      // Upload audio file
      if (finalEpisodeId) {
        const audioBuffer = fs.readFileSync(localPath);
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const formData = new FormData();
        formData.append('audio', blob, audioFileName);

        const uploadRes = await fetch(
          `${CREATORFLOW_URL}/api/podcast/episodes/${finalEpisodeId}/audio`,
          { method: 'POST', body: formData }
        );
        if (uploadRes.ok) {
          console.log(`[SaveAudio] Audio uploaded to CreatorFlow episode ${finalEpisodeId}`);
        } else {
          const errData = await uploadRes.json().catch(() => ({}));
          console.error(`[SaveAudio] CreatorFlow upload failed:`, errData);
        }

        // Sync title to episode (in case it was missing or changed)
        if (podcastTitle) {
          await fetch(`${CREATORFLOW_URL}/api/podcast/episodes/${finalEpisodeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: podcastTitle }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[SaveAudio] Failed to upload to CreatorFlow:', err);
    }

    // 4. Send audio to Feishu
    const chatId = feishu_chat_id || run.feishu_chat_id || 'oc_34b771771cb6dac5b305cf8ee4fe11ca';
    let feishuSent = false;

    try {
      // Determine file type based on extension
      const ext = path.extname(audioFileName).toLowerCase();
      const isOpus = ext === '.opus' || ext === '.ogg';

      if (isOpus) {
        // Send as audio message (Feishu requires opus format for audio)
        const fileKey = await feishuClient.uploadFile(localPath, audioFileName, 'opus');
        await feishuClient.sendAudio(chatId, fileKey);
        feishuSent = true;
      } else {
        // Send as file message for other formats (mp3, wav, etc.)
        const fileKey = await feishuClient.uploadFile(localPath, audioFileName, 'stream');
        await feishuClient.sendFile(chatId, fileKey);
        feishuSent = true;
      }

      // Also send a text notification
      await feishuClient.sendText(
        chatId,
        `🦞 播客音频已生成完成！\n\n📻 ${podcastTitle}\n📁 文件: ${audioFileName}\n💾 大小: ${(fileSize / 1024).toFixed(1)}KB`
      );

      console.log(`[SaveAudio] Audio sent to Feishu chat: ${chatId}`);
    } catch (err) {
      console.error('[SaveAudio] Failed to send to Feishu:', err);
      // Non-critical — continue even if Feishu fails
    }

    // 5. Update workflow result_data
    await updateWorkflowRun(run_id, {
      result_data: {
        ...resultData,
        creatorflow_episode_id: finalEpisodeId ?? episodeId ?? null,
        audio_url: audio_url ?? null,
        audio_local_path: localPath,
        audio_file_name: audioFileName,
        coze_tts_completed: true,
        feishu_audio_sent: feishuSent,
        creatorflow_synced: !!finalEpisodeId,
      },
    });

    // 6. Auto-approve the coze_tts step to resume workflow
    const waitingIndex = run.steps.findIndex(
      (s) => s.status === 'waiting_intervention' && s.id === 'coze_tts'
    );

    if (waitingIndex !== -1) {
      const updatedSteps = [...run.steps];
      updatedSteps[waitingIndex] = {
        ...updatedSteps[waitingIndex],
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_summary: `音频已保存${feishuSent ? '并发送到飞书' : ''}`,
      };

      await updateWorkflowRun(run_id, {
        steps: updatedSteps,
        current_step_index: waitingIndex + 1,
        status: 'running',
      });

      // Trigger remaining steps execution
      const baseUrl = new URL(request.url);
      const executeUrl = `${baseUrl.protocol}//${baseUrl.host}/api/openclaw/execute`;
      fetch(executeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id }),
      }).catch((err) => {
        console.error('[SaveAudio] Failed to trigger execute:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        audio_local_path: localPath,
        audio_file_name: audioFileName,
        file_size_kb: Math.round(fileSize / 1024),
        creatorflow_updated: !!finalEpisodeId,
        feishu_sent: feishuSent,
        workflow_resumed: waitingIndex !== -1,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SaveAudio] Error:', err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
