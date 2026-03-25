import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';

const JSON_SYSTEM = '你必须且只能返回合法的 JSON，不要包含任何 markdown 标记、代码块标记或其他非 JSON 内容。';

type ContentType = 'resume' | 'message' | 'interview';

export async function POST(req: NextRequest) {
  try {
    const {
      currentContent,
      userFeedback,
      contentType,
      context,
      apiKey,
    }: {
      currentContent: string;
      userFeedback: string;
      contentType: ContentType;
      context?: string;
      apiKey?: string;
    } = await req.json();

    if (!currentContent?.trim() || !userFeedback?.trim()) {
      return NextResponse.json({ error: '请提供当前内容和修改建议' }, { status: 400 });
    }

    const typeMap: Record<ContentType, string> = {
      resume: '简历',
      message: 'HR消息',
      interview: '面试准备文件',
    };

    // ── Interview type: return ONLY the modified sections (not the full prep) ──
    if (contentType === 'interview') {
      const SECTION_MAP = `板块 key 对应含义（JSON 顶层字段名）：
- companyBackground: 公司背景（含 overview/industryPosition/chinaMarket/whyHiring）
- jobMatch: 岗位匹配分析（含 strengthsMatch 数组和 weaknesses 数组）
- selfIntroduction: 自我介绍（含 chinese 和 english）
- coreQA: 核心面试问答（数组，每项含 id/category/question/answer）
- starStories: STAR 故事库（数组，每项含 id/title/story/applicableScenarios）
- aiCapabilities: AI 能力与工具使用（含 description 和 talkingPoint，或 null）
- questionsToAsk: 主动提问清单（字符串数组）
- strategy: 面试核心策略（含 positioning/principles/closingScript）
- salaryNegotiation: 薪资谈判建议（含 marketRange 和 strategies 数组）
- warningsAndTraps: 注意事项与常见陷阱（含 traps 和 avoidPhrases 数组）`;

      const interviewPrompt = `你是资深职业面试教练。以下是用户当前完整的面试准备手册（JSON）以及他们的修改建议。

${SECTION_MAP}

${context ? `## 背景信息\n${context}\n` : ''}
## 当前面试准备手册（JSON）
${currentContent}

## 用户的修改建议
${userFeedback}

## 任务
1. 判断用户建议涉及哪个板块（通常只有 1-2 个）
2. 对该板块精确修改（追加/修改相关内容），保留该板块内所有现有字段和数据，只做用户要求的改动
3. 【重要】只在 updatedSections 中返回被修改的板块，其他板块绝对不要出现在输出中

新增 coreQA 问题格式：{ "id": "q序号", "category": "general/technical/behavioral", "question": "...", "answer": "..." }
新增 starStories 格式：{ "id": "s序号", "title": "...", "story": "...", "applicableScenarios": ["..."] }

只返回如下 JSON，不要任何其他文字：
{
  "updatedSections": {
    "被修改的板块key": 该板块修改后的完整内容（格式与原始完全一致）
  },
  "changes": [
    { "section": "被修改的板块中文名", "description": "具体修改说明（一句话）" }
  ]
}`;

      const interviewResponse = await callClaude(interviewPrompt, JSON_SYSTEM, apiKey, 4096);
      const interviewResult = await parseJsonWithFallback<{
        updatedSections: Record<string, unknown>;
        changes: { section: string; description: string }[];
      }>(interviewResponse, apiKey, 'refine-interview');

      return NextResponse.json({
        refinedContent: JSON.stringify(interviewResult.updatedSections ?? {}),
        changes: interviewResult.changes || [],
      });
    }

    // ── Default: resume / message ──────────────────────────────────────────
    const prompt = `你是一位专业的求职顾问，请根据用户的修改建议对${typeMap[contentType]}进行优化。

【核心要求】在保留原有内容长度和完整性的基础上进行修改。绝对不能让修改后的内容比原内容更短或信息更少。只修改用户指出的部分，其余内容保持原样。

${context ? `## 背景信息\n${context}\n` : ''}

## 当前内容
${currentContent}

## 用户的修改建议
${userFeedback}

## 要求
1. 在当前内容基础上进行修改，不要从头重写，不能删减现有内容
2. 严格按照用户的建议进行调整，未提及的部分保持不变
3. 修改后的 refinedContent 长度不得少于原内容长度
4. 标记出所有修改的部分

请返回 JSON 格式（只返回 JSON）：
{
  "refinedContent": "修改后的完整内容（不得比原内容短）",
  "changes": [
    {
      "type": "added/removed/modified",
      "original": "修改前的文本",
      "refined": "修改后的文本",
      "reason": "修改理由"
    }
  ]
}`;

    const response = await callClaude(prompt, JSON_SYSTEM, apiKey);

    const result = await parseJsonWithFallback<{ refinedContent: string; changes: unknown[] }>(response, apiKey, 'refine');
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('refine error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `优化失败: ${message}，请重试` }, { status: 500 });
  }
}
