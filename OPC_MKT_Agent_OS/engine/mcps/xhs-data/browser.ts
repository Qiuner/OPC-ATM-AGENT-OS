/**
 * 小红书 Playwright 浏览器管理
 *
 * 职责：
 * - 管理浏览器生命周期（单例，复用跨调用）
 * - Cookie 持久化到 ~/.xhs-mcp/storage-state.json
 * - 登录检测、QR 扫码登录、笔记发布
 */

import { chromium, type BrowserContext } from "playwright";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, existsSync, readFileSync } from "node:fs";

const DATA_DIR = join(homedir(), ".xhs-mcp");
const USER_DATA_DIR = join(DATA_DIR, "user-data");
const STORAGE_PATH = join(DATA_DIR, "storage-state.json");
const XHS_URL = "https://www.xiaohongshu.com";
const CREATOR_URL = "https://creator.xiaohongshu.com/publish/publish";

let browserContext: BrowserContext | null = null;

// ============================================================
// 浏览器上下文管理
// ============================================================

/** 获取或启动浏览器上下文（带 cookie 恢复） */
async function getBrowserContext(headless = true): Promise<BrowserContext> {
  if (browserContext) return browserContext;
  mkdirSync(DATA_DIR, { recursive: true });

  browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless,
    args: ["--disable-blink-features=AutomationControlled"],
    viewport: { width: 1280, height: 900 },
    locale: "zh-CN",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });

  // 从持久化文件恢复 cookie（persistent context 自带磁盘缓存，这里额外恢复 storageState）
  if (existsSync(STORAGE_PATH)) {
    try {
      const state = JSON.parse(readFileSync(STORAGE_PATH, "utf-8"));
      if (state.cookies?.length) {
        await browserContext.addCookies(state.cookies);
      }
    } catch {
      // 文件损坏则忽略
    }
  }

  return browserContext;
}

/** 保存当前 cookie 到磁盘 */
async function saveCookies(): Promise<void> {
  if (!browserContext) return;
  await browserContext.storageState({ path: STORAGE_PATH });
}

/** 关闭浏览器（进程退出时调用） */
export async function closeBrowser(): Promise<void> {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
  }
}

// ============================================================
// 登录管理
// ============================================================

/** 检查是否已登录小红书 */
export async function checkLogin(): Promise<{
  loggedIn: boolean;
  username?: string;
}> {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();
  try {
    await page.goto(XHS_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
    // 等待页面稳定
    await page.waitForTimeout(2000);

    // 多种选择器检测登录态
    const loggedIn =
      (await page.locator(".user-avatar").count()) > 0 ||
      (await page.locator('[class*="user-info"]').count()) > 0 ||
      (await page.locator('[class*="sidebar"] [class*="user"]').count()) > 0;

    let username: string | undefined;
    if (loggedIn) {
      username =
        (await page
          .locator('[class*="user-name"], [class*="nickname"]')
          .first()
          .textContent()
          .catch(() => null)) ?? undefined;
    }
    return { loggedIn, username };
  } finally {
    await page.close();
  }
}

/** 启动 QR 码登录（弹出浏览器窗口，用户需手机扫码） */
export async function startQRLogin(): Promise<{
  status: string;
  message: string;
}> {
  // 关闭旧的 context，用 headful 重新打开
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
  }

  const ctx = await getBrowserContext(false); // headful — 用户需看到 QR 码
  const page = await ctx.newPage();
  try {
    await page.goto(XHS_URL, { waitUntil: "domcontentloaded" });

    // 等待用户扫码完成（最多 120 秒）
    await page.waitForSelector(
      '.user-avatar, [class*="user-info"], [class*="sidebar"] [class*="user"]',
      { timeout: 120000 },
    );
    await saveCookies();
    return { status: "success", message: "登录成功，cookie 已保存到 ~/.xhs-mcp/" };
  } catch {
    return { status: "timeout", message: "登录超时（120s），请重试" };
  } finally {
    await page.close();
    // 关闭 headful context，后续操作用 headless
    await ctx.close();
    browserContext = null;
  }
}

// ============================================================
// 发布笔记
// ============================================================

export async function publishNote(opts: {
  title: string;
  content: string;
  tags?: string[];
  images?: string[];
}): Promise<{ success: boolean; noteUrl?: string; error?: string }> {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();

  try {
    // 1. 导航到创作者发布页
    await page.goto(CREATOR_URL, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(2000);

    // 2. 上传图片（如果有）
    if (opts.images && opts.images.length > 0) {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(opts.images);
      // 等待图片预览出现
      await page.waitForSelector(
        '.img-preview-area .pr, [class*="upload-preview"], [class*="image-item"]',
        { timeout: 30000 },
      );
      // 给图片上传一些缓冲时间
      await page.waitForTimeout(2000);
    }

    // 3. 填写标题（多种选择器 fallback）
    const titleInput = page.locator(
      '#title-input, div.d-input input, input[placeholder*="标题"], [class*="title"] input',
    ).first();
    await titleInput.click();
    await titleInput.fill(opts.title);

    // 4. 填写正文
    const contentEditor = page.locator(
      'div.ql-editor, #content-textarea, [contenteditable="true"]',
    ).first();
    await contentEditor.click();
    await contentEditor.fill(opts.content);

    // 5. 添加话题标签
    if (opts.tags && opts.tags.length > 0) {
      for (const tag of opts.tags) {
        await contentEditor.press("End");
        await page.keyboard.type(` #${tag}#`, { delay: 50 });
        await page.waitForTimeout(500);
      }
    }

    // 6. 点击发布按钮
    const publishBtn = page.locator(
      '.publish-page-publish-btn button, button:has-text("发布笔记"), button:has-text("发布"), [class*="publish"] button[class*="red"], [class*="submit-btn"]',
    ).first();
    await publishBtn.click();

    // 7. 等待发布结果
    await page.waitForTimeout(5000);
    const currentUrl = page.url();

    // 检查成功标志
    const hasSuccess =
      currentUrl.includes("publish/success") ||
      (await page.locator('text="发布成功"').count()) > 0 ||
      (await page.locator('text="已发布"').count()) > 0;

    await saveCookies();

    if (hasSuccess) {
      return { success: true, noteUrl: currentUrl };
    }

    // 检查错误提示
    const errorText = await page
      .locator('[class*="error"], [class*="toast"], div.length-error')
      .first()
      .textContent()
      .catch(() => null);

    return {
      success: false,
      error: errorText || "发布结果未知，请在小红书创作者中心手动检查",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知错误",
    };
  } finally {
    await page.close();
  }
}

// ============================================================
// 搜索笔记（Playwright 真实抓取）
// ============================================================

export interface SearchNoteResult {
  noteId: string;
  title: string;
  author: string;
  authorId: string;
  likes: number;
  coverUrl: string;
  noteUrl: string;
}

export async function searchNotes(
  keyword: string,
  options?: { sortBy?: "general" | "most_popular" | "latest"; limit?: number },
): Promise<{ notes: SearchNoteResult[]; total: number; source: "playwright" }> {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();
  const limit = Math.min(options?.limit ?? 10, 30);
  const sortBy = options?.sortBy ?? "general";

  try {
    // 1. 导航到搜索页
    const searchUrl = `${XHS_URL}/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_note`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);

    // 2. 点击排序筛选（如非默认）
    if (sortBy !== "general") {
      const sortTextMap: Record<string, string> = {
        most_popular: "最热",
        latest: "最新",
      };
      const sortText = sortTextMap[sortBy];
      if (sortText) {
        const sortTab = page.locator(`text="${sortText}"`).first();
        if ((await sortTab.count()) > 0) {
          await sortTab.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // 3. 滚动加载更多结果
    const scrollRounds = Math.ceil(limit / 10);
    for (let i = 0; i < scrollRounds; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }

    // 4. 提取笔记卡片数据（使用 page.evaluate 在 DOM 中批量提取）
    const rawNotes = await page.evaluate(() => {
      const results: Array<{
        noteId: string;
        title: string;
        author: string;
        authorId: string;
        likes: string;
        coverUrl: string;
      }> = [];

      // 查找包含笔记链接的所有卡片
      const links = document.querySelectorAll('a[href*="/explore/"], a[href*="/discovery/item/"]');
      const seen = new Set<string>();

      for (const link of links) {
        const href = link.getAttribute("href") || "";
        const noteId = href.match(/(?:explore|discovery\/item)\/([a-f0-9]+)/)?.[1];
        if (!noteId || seen.has(noteId)) continue;
        seen.add(noteId);

        // 向上查找卡片容器
        const card = link.closest('[class*="note-item"], [class*="feed-card"], section, [class*="card"]') || link;

        const title = card.querySelector('[class*="title"], [class*="desc"], footer span')?.textContent?.trim() || "";
        const author = card.querySelector('[class*="author"], [class*="name"], [class*="nickname"]')?.textContent?.trim() || "";

        const profileLink = card.querySelector('a[href*="/user/profile/"]');
        const authorId = profileLink?.getAttribute("href")?.match(/\/user\/profile\/([a-f0-9]+)/)?.[1] || "";

        const likesEl = card.querySelector('[class*="like"] span, [class*="count"]');
        const likes = likesEl?.textContent?.trim() || "0";

        const img = card.querySelector('img');
        const coverUrl = img?.getAttribute("src") || "";

        results.push({ noteId, title, author, authorId, likes, coverUrl });
      }
      return results;
    });

    // 5. 解析中文数字并构建结果
    const notes: SearchNoteResult[] = rawNotes.slice(0, limit).map((raw) => ({
      noteId: raw.noteId,
      title: raw.title,
      author: raw.author,
      authorId: raw.authorId,
      likes: parseChineseNumber(raw.likes),
      coverUrl: raw.coverUrl,
      noteUrl: `${XHS_URL}/explore/${raw.noteId}`,
    }));

    await saveCookies();
    return { notes, total: notes.length, source: "playwright" };
  } catch (err) {
    console.error("[browser] searchNotes failed:", err instanceof Error ? err.message : err);
    return { notes: [], total: 0, source: "playwright" };
  } finally {
    await page.close();
  }
}

// ============================================================
// 获取笔记详情 + 评论（Playwright 真实抓取）
// ============================================================

export interface NoteDetailResult {
  noteId: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  likes: number;
  collects: number;
  comments: number;
  shares: number;
  tags: string[];
  publishedAt: string;
  images: string[];
  topComments: Array<{ user: string; content: string; likes: number }>;
}

export async function getNoteDetail(noteId: string): Promise<NoteDetailResult | null> {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();

  try {
    const noteUrl = `${XHS_URL}/explore/${noteId}`;
    await page.goto(noteUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);

    // 批量提取主要内容（在 DOM 中执行，减少跨进程调用）
    const mainData = await page.evaluate(() => {
      const qs = (selectors: string) =>
        document.querySelector(selectors)?.textContent?.trim() || "";

      // 标题
      const title = qs('#detail-title, [class*="note-title"], .title, h1');

      // 正文
      const content = qs('#detail-desc, [class*="note-content"], [class*="note-text"], .content, article');

      // 作者
      const author = qs('[class*="author-name"], [class*="user-name"], .username, a[href*="/user/profile/"] span');

      // 作者 ID
      const authorHref = document.querySelector('a[href*="/user/profile/"]')?.getAttribute("href") || "";
      const authorId = authorHref.match(/\/user\/profile\/([a-f0-9]+)/)?.[1] || "";

      // 互动数据 — 小红书详情页底部有赞/藏/评论/分享图标+数字
      const interactEls = document.querySelectorAll('[class*="interact"] span, [class*="engage"] span, [class*="count"]');
      const interactTexts = Array.from(interactEls).map(el => el.textContent?.trim() || "");

      // 从底部操作栏提取（点赞、收藏、评论、分享按钮文字）
      const likesText = qs('[class*="like-wrapper"] span, [class*="like"] span[class*="count"]');
      const collectsText = qs('[class*="collect-wrapper"] span, [class*="collect"] span[class*="count"]');
      const commentsText = qs('[class*="chat-wrapper"] span, [class*="comment"] span[class*="count"]');
      const sharesText = qs('[class*="share-wrapper"] span, [class*="share"] span[class*="count"]');

      // 标签
      const tagEls = document.querySelectorAll('a[href*="/search_result?keyword="], [class*="tag"], .hash-tag');
      const tags = Array.from(tagEls)
        .map(el => el.textContent?.trim().replace(/^#|#$/g, "") || "")
        .filter(Boolean);

      // 发布时间
      const publishedAt = qs('[class*="date"], [class*="time"], time');

      // 图片
      const imgEls = document.querySelectorAll('[class*="note-image"] img, [class*="slider"] img, .carousel img, [class*="swiper"] img');
      const images = Array.from(imgEls)
        .map(img => img.getAttribute("src") || "")
        .filter(Boolean);

      return {
        title, content, author, authorId,
        likesText, collectsText, commentsText, sharesText,
        tags, publishedAt, images, interactTexts,
      };
    });

    // 滚动到评论区
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight * 0.7));
    await page.waitForTimeout(2000);

    // 提取评论
    const rawComments = await page.evaluate(() => {
      const commentItems = document.querySelectorAll(
        '[class*="comment-item"], [class*="comment-inner"], [class*="commentItem"], .comment-list > div'
      );
      const results: Array<{ user: string; content: string; likes: string }> = [];

      for (let i = 0; i < Math.min(commentItems.length, 20); i++) {
        const item = commentItems[i];
        const user = item.querySelector('[class*="name"], [class*="author"], .user-name')?.textContent?.trim() || "";
        const content = item.querySelector('[class*="content"], .comment-text, p')?.textContent?.trim() || "";
        const likes = item.querySelector('[class*="like"] span')?.textContent?.trim() || "0";
        if (content) {
          results.push({ user, content, likes });
        }
      }
      return results;
    });

    await saveCookies();

    return {
      noteId,
      title: mainData.title,
      content: mainData.content,
      author: mainData.author,
      authorId: mainData.authorId,
      likes: parseChineseNumber(mainData.likesText),
      collects: parseChineseNumber(mainData.collectsText),
      comments: parseChineseNumber(mainData.commentsText),
      shares: parseChineseNumber(mainData.sharesText),
      tags: mainData.tags,
      publishedAt: mainData.publishedAt,
      images: mainData.images,
      topComments: rawComments.map((c) => ({
        user: c.user,
        content: c.content,
        likes: parseChineseNumber(c.likes),
      })),
    };
  } catch (err) {
    console.error("[browser] getNoteDetail failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    await page.close();
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 解析中文数字格式: "1.2万" → 12000, "3.5亿" → 350000000, "890" → 890 */
function parseChineseNumber(text: string): number {
  if (!text) return 0;
  const cleaned = text.trim().replace(/,/g, "");
  const wanMatch = cleaned.match(/([\d.]+)\s*万/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
  const yiMatch = cleaned.match(/([\d.]+)\s*亿/);
  if (yiMatch) return Math.round(parseFloat(yiMatch[1]) * 100000000);
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

// 进程退出时清理浏览器
process.on("exit", () => {
  closeBrowser().catch(() => {});
});
process.on("SIGINT", () => {
  closeBrowser().catch(() => {});
  process.exit(0);
});
