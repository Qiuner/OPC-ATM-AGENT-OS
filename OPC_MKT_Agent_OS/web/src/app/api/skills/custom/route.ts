import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CUSTOM_SKILLS_DIR = path.join(process.cwd(), '..', 'engine', 'skills', 'custom');

/** Ensure custom skills directory exists */
function ensureDir() {
  if (!fs.existsSync(CUSTOM_SKILLS_DIR)) {
    fs.mkdirSync(CUSTOM_SKILLS_DIR, { recursive: true });
  }
}

/** Skill file metadata */
interface SkillInfo {
  id: string;
  name: string;
  filename: string;
  description: string;
  content: string;
  updatedAt: string;
}

/** Parse skill name and description from frontmatter or first heading */
function parseSkillMeta(content: string, filename: string): { name: string; description: string } {
  // Try frontmatter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/name:\s*(.+)/);
    const descMatch = fm.match(/description:\s*(.+)/);
    return {
      name: nameMatch?.[1]?.trim() || filename.replace('.SKILL.md', ''),
      description: descMatch?.[1]?.trim() || '',
    };
  }
  // Try first heading
  const h1Match = content.match(/^#\s+(.+)/m);
  return {
    name: h1Match?.[1]?.trim() || filename.replace('.SKILL.md', ''),
    description: '',
  };
}

/**
 * GET /api/skills/custom — List all custom skill files
 */
export async function GET() {
  try {
    ensureDir();
    const files = fs.readdirSync(CUSTOM_SKILLS_DIR)
      .filter((f) => f.endsWith('.SKILL.md'));

    const skills: SkillInfo[] = files.map((filename) => {
      const filePath = path.join(CUSTOM_SKILLS_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      const stat = fs.statSync(filePath);
      const meta = parseSkillMeta(content, filename);

      return {
        id: filename.replace('.SKILL.md', ''),
        name: meta.name,
        filename,
        description: meta.description,
        content,
        updatedAt: stat.mtime.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: skills });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/skills/custom — Create or update a custom skill file
 * Body: { name: string, content: string, description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    ensureDir();
    const body = await request.json();
    const { name, content, description } = body as {
      name?: string;
      content?: string;
      description?: string;
    };

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, content' },
        { status: 400 }
      );
    }

    // Sanitize filename: lowercase, replace spaces/special chars with hyphens
    const safeName = name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${safeName}.SKILL.md`;
    const filePath = path.join(CUSTOM_SKILLS_DIR, filename);

    // Build content with frontmatter
    const fullContent = `---
name: ${name}
description: ${description || `Custom skill: ${name}`}
version: 1.0.0
last_updated: ${new Date().toISOString().split('T')[0]}
updated_by: user
---

${content}`;

    fs.writeFileSync(filePath, fullContent, 'utf-8');
    const stat = fs.statSync(filePath);

    const skill: SkillInfo = {
      id: safeName,
      name,
      filename,
      description: description || `Custom skill: ${name}`,
      content: fullContent,
      updatedAt: stat.mtime.toISOString(),
    };

    return NextResponse.json({ success: true, data: skill }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/skills/custom — Delete a custom skill file
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    ensureDir();
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const filename = `${id}.SKILL.md`;
    const filePath = path.join(CUSTOM_SKILLS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
