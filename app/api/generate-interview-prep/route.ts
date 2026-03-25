import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';
import { ParsedJD, InterviewRound } from '@/lib/types';

const JSON_SYSTEM = '你必须且只能返回合法的 JSON，不要包含任何 markdown 标记、代码块标记或其他非 JSON 内容。';

export type SectionKey =
  | 'companyBackground' | 'jobMatch' | 'selfIntroduction' | 'coreQA'
  | 'starStories' | 'aiCapabilities' | 'questionsToAsk' | 'strategy'
  | 'salaryNegotiation' | 'warningsAndTraps';

// ── Retry wrapper (max 2 attempts) ────────────────────────
async function callWithRetry<T>(prompt: string, apiKey: string, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callClaude(prompt, JSON_SYSTEM, apiKey, 4096);
      return await parseJsonWithFallback<T>(raw, apiKey, label);
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastErr;
}

// ── Shared context builder ────────────────────────────────
function buildContext(
  parsedJD: ParsedJD,
  company: string,
  roundLabel: string,
  interviewerTitle: string,
  prepFiles?: string,
  completedSectionTitles?: string[],
) {
  return `## 岗位信息
- 公司：${company}
- 岗位：${parsedJD.jobTitle}
- 面试轮次：${roundLabel}
- 面试官职位：${interviewerTitle || '未指定'}
- 核心技能要求：${(parsedJD.coreSkills || []).join('、') || '未指定'}
- 行业关键词：${(parsedJD.industryKeywords || []).join('、') || '未指定'}
- JD原文：${parsedJD.rawText ? parsedJD.rawText.slice(0, 1500) : '未提供'}
${prepFiles ? `\n## 用户面试素材（真实经历，优先使用）\n【重要】以下是用户提供的真实工作经历，必须优先基于这些素材生成内容，不要编造不存在的经历。\n${prepFiles.slice(0, 3000)}` : ''}
${completedSectionTitles?.length ? `\n## 已生成板块（了解整体结构，避免重复）\n${completedSectionTitles.join('、')}` : ''}

## 语言风格
- 口语化叙事，第一人称"我"，像面对面说话
- 完整段落，可直接练习说出来，不用 bullet point 罗列`;
}

// ── Route Handler ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const {
      parsedJD,
      prepFiles,
      companyName,
      interviewRound,
      interviewerTitle,
      apiKey,
      section,
      completedSectionTitles,
    }: {
      parsedJD: ParsedJD;
      prepFiles?: string;
      companyName?: string;
      interviewRound?: InterviewRound;
      interviewerTitle?: string;
      apiKey?: string;
      section: SectionKey;
      completedSectionTitles?: string[];
    } = await req.json();

    if (!parsedJD) return NextResponse.json({ error: '请提供 JD 信息' }, { status: 400 });
    if (!apiKey)   return NextResponse.json({ error: '请提供 API Key' }, { status: 400 });

    const roundMap: Record<string, string> = { hr: 'HR 面试', technical: '技术面试', final: '终面' };
    const company    = companyName || parsedJD.companyName || '目标公司';
    const roundLabel = interviewRound ? roundMap[interviewRound] : '未指定';
    const ctx        = buildContext(parsedJD, company, roundLabel, interviewerTitle || '', prepFiles, completedSectionTitles);
    const hasMaterial = !!(prepFiles?.trim());

    switch (section) {

      // ── 1. Company Background ──────────────────────────
      case 'companyBackground': {
        const prompt = `你是资深职业面试教练。根据以下信息生成公司背景分析。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "companyBackground": {
    "overview": "公司简介：历史、规模、核心业务，150字以内",
    "industryPosition": "行业定位与近期动态，100字以内",
    "chinaMarket": "中国市场布局，80字以内",
    "whyHiring": "推测为何招聘此岗位，60字以内"
  }
}`;
        const data = await callWithRetry<{ companyBackground: unknown }>(prompt, apiKey, 'companyBackground');
        return NextResponse.json({ companyBackground: data.companyBackground });
      }

      // ── 2. Job Match ───────────────────────────────────
      case 'jobMatch': {
        const prompt = `你是资深职业面试教练。根据以下信息生成岗位匹配分析。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "jobMatch": {
    "strengthsMatch": [
      { "strength": "我的优势（30字以内）", "jobRequirement": "对应JD要求（20字以内）" }
    ],
    "weaknesses": [
      { "weakness": "潜在劣势（20字以内）", "strategy": "应对策略（30字以内）", "talkingPoint": "面试话术（80字以内）" }
    ]
  }
}

要求：strengthsMatch 生成 3-4 条，weaknesses 生成 2 条。`;
        const data = await callWithRetry<{ jobMatch: unknown }>(prompt, apiKey, 'jobMatch');
        return NextResponse.json({ jobMatch: data.jobMatch });
      }

      // ── 3. Self Introduction ──────────────────────────
      case 'selfIntroduction': {
        const prompt = `你是资深职业面试教练。根据以下信息生成自我介绍。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "selfIntroduction": {
    "chinese": "2分钟中文自我介绍，口语化，融入与JD匹配的亮点，250字以内",
    "english": "2-minute English self-introduction, conversational, highlight JD-matching strengths, under 200 words"
  }
}`;
        const data = await callWithRetry<{ selfIntroduction: unknown }>(prompt, apiKey, 'selfIntroduction');
        return NextResponse.json({ selfIntroduction: data.selfIntroduction });
      }

      // ── 4. Core Q&A ────────────────────────────────────
      case 'coreQA': {
        const prompt = `你是资深职业面试教练。根据以下信息生成核心面试问答。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "coreQA": [
    { "id": "q1", "category": "general", "question": "面试问题", "answer": "口语化参考话术，120字以内" }
  ]
}

category 只能是 "general"、"technical" 或 "behavioral"。
生成 8 个问题：general 3个（为什么选这家公司、职业规划、离职原因）、technical 2-3个（根据JD核心技能）、behavioral 3个（STAR行为面试题）。
每个 answer 是可直接说出的口语化段落，不用要点罗列。
${hasMaterial ? '【重要】behavioral 问题的 answer 中，优先融入用户提供的真实经历，不要编造。' : ''}`;
        const data = await callWithRetry<{ coreQA: unknown }>(prompt, apiKey, 'coreQA');
        return NextResponse.json({ coreQA: data.coreQA });
      }

      // ── 5. STAR Stories ────────────────────────────────
      case 'starStories': {
        const prompt = `你是资深职业面试教练。根据以下信息生成 STAR 故事库。

${ctx}

${hasMaterial ? `【核心要求】用户提供了真实工作经历素材，必须直接从素材中提取故事改写为 STAR 格式（背景→任务→行动→结果），保持故事真实性，fromUserMaterial 设为 true。不要编造用户没有的经历。` : ''}

只返回如下 JSON，不要任何其他文字：
{
  "starStories": [
    {
      "id": "s1",
      "title": "故事标题（15字以内）",
      "story": "完整STAR故事，口语化叙事，第一人称，200字以内",
      "applicableScenarios": ["适用场景1", "适用场景2"],
      "fromUserMaterial": ${hasMaterial ? 'true' : 'false'}
    }
  ]
}

要求：生成 3 个故事，每个故事要有具体细节和数字结果，不要泛泛而谈。`;
        const data = await callWithRetry<{ starStories: unknown }>(prompt, apiKey, 'starStories');
        return NextResponse.json({ starStories: data.starStories });
      }

      // ── 6. AI Capabilities ─────────────────────────────
      case 'aiCapabilities': {
        const prompt = `你是资深职业面试教练。根据以下信息判断是否有 AI/LLM 工具使用经验，并生成相应内容。

${ctx}

判断标准：JD 中提到 AI/LLM/大模型/数据分析工具，或用户素材中有相关工具使用经历，则填写内容；否则返回 null。

只返回如下 JSON，不要任何其他文字：
{
  "aiCapabilities": {
    "description": "AI工具使用背景描述，80字以内",
    "talkingPoint": "面试参考话术，口语化，80字以内"
  }
}

如无相关内容，返回：{ "aiCapabilities": null }`;
        const data = await callWithRetry<{ aiCapabilities: unknown }>(prompt, apiKey, 'aiCapabilities');
        return NextResponse.json({ aiCapabilities: data.aiCapabilities ?? null });
      }

      // ── 7. Questions to Ask ────────────────────────────
      case 'questionsToAsk': {
        const prompt = `你是资深职业面试教练。根据以下信息生成主动提问清单。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "questionsToAsk": [
    "针对公司和岗位的高质量反问（一句话，不要通用问题，要有针对性）"
  ]
}

要求：生成 8 个问题，涵盖团队氛围、成长路径、岗位期望、公司战略等维度，每个问题针对该公司/岗位个性化，不要使用"贵公司"等通用说法。`;
        const data = await callWithRetry<{ questionsToAsk: unknown }>(prompt, apiKey, 'questionsToAsk');
        return NextResponse.json({ questionsToAsk: data.questionsToAsk });
      }

      // ── 8. Strategy ────────────────────────────────────
      case 'strategy': {
        const prompt = `你是资深职业面试教练。根据以下信息生成面试核心策略。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "strategy": {
    "positioning": "差异化定位：你的核心竞争优势，80字以内",
    "principles": ["核心原则1（一句话）", "核心原则2", "核心原则3"],
    "closingScript": "面试结尾推进话术，口语化，60字以内"
  }
}

要求：principles 3-4 条，实用且具体。`;
        const data = await callWithRetry<{ strategy: unknown }>(prompt, apiKey, 'strategy');
        return NextResponse.json({ strategy: data.strategy });
      }

      // ── 9. Salary Negotiation ──────────────────────────
      case 'salaryNegotiation': {
        const prompt = `你是资深职业面试教练。根据以下信息生成薪资谈判建议。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "salaryNegotiation": {
    "marketRange": "该岗位市场薪资范围（如：月薪20-35K，年包25-45万）",
    "strategies": ["谈判策略1（一句话，实用具体）", "策略2", "策略3"]
  }
}

要求：marketRange 给出合理区间，strategies 3-4 条，针对该岗位特点。`;
        const data = await callWithRetry<{ salaryNegotiation: unknown }>(prompt, apiKey, 'salaryNegotiation');
        return NextResponse.json({ salaryNegotiation: data.salaryNegotiation });
      }

      // ── 10. Warnings & Traps ───────────────────────────
      case 'warningsAndTraps': {
        const prompt = `你是资深职业面试教练。根据以下信息生成注意事项与常见陷阱。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "warningsAndTraps": {
    "traps": ["陷阱问题1（一句话描述该问题的风险）", "陷阱2", "陷阱3"],
    "avoidPhrases": ["避免说的话1（具体说明为什么避免）", "避免表达2", "避免表达3"]
  }
}

要求：traps 3-4 条，avoidPhrases 3-4 条，针对此类岗位的典型陷阱，不要泛泛而谈。`;
        const data = await callWithRetry<{ warningsAndTraps: unknown }>(prompt, apiKey, 'warningsAndTraps');
        return NextResponse.json({ warningsAndTraps: data.warningsAndTraps });
      }

      default:
        return NextResponse.json({ error: '无效的 section 参数' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('generate-interview-prep error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `生成失败: ${message}，请重试` }, { status: 500 });
  }
}
