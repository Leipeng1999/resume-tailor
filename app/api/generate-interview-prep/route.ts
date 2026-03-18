import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';
import { ParsedJD, InterviewRound } from '@/lib/types';

// ── Types for each segment ────────────────────────────────
type Seg1 = {
  companyBackground: { overview: string; industryPosition: string; chinaMarket: string; whyHiring: string };
  jobMatch: {
    strengthsMatch: { strength: string; jobRequirement: string }[];
    weaknesses: { weakness: string; strategy: string; talkingPoint: string }[];
  };
  selfIntroduction: { chinese: string; english: string };
};

type Seg2 = {
  coreQA: { id: string; category: string; question: string; answer: string }[];
};

type Seg3 = {
  starStories: { id: string; title: string; story: string; applicableScenarios: string[] }[];
  aiCapabilities: { description: string; talkingPoint: string } | null;
};

type Seg4 = {
  questionsToAsk: string[];
  strategy: { positioning: string; principles: string[]; closingScript: string };
  salaryNegotiation: { marketRange: string; strategies: string[] };
  warningsAndTraps: { traps: string[]; avoidPhrases: string[] };
};

// ── Retry wrapper (max 2 attempts) ────────────────────────
async function callWithRetry<T>(
  prompt: string,
  apiKey: string,
  label: string,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callClaude(prompt, undefined, apiKey, 4096);
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
) {
  return `## 岗位信息
- 公司：${company}
- 岗位：${parsedJD.jobTitle}
- 面试轮次：${roundLabel}
- 面试官职位：${interviewerTitle || '未指定'}
- 核心技能要求：${(parsedJD.coreSkills || []).join('、') || '未指定'}
- 行业关键词：${(parsedJD.industryKeywords || []).join('、') || '未指定'}
- JD原文：${parsedJD.rawText ? parsedJD.rawText.slice(0, 800) : '未提供'}
${prepFiles ? `\n## 我的面试准备素材\n${prepFiles.slice(0, 600)}` : ''}

## 语言风格（全程遵守）
- 口语化叙事，用第一人称"我"，像面对面说话
- 有起承转合，不用 bullet point 罗列
- 可以有过渡词（"这件事要从...说起"、"当时的情况是"、"结果怎么样呢"）
- 每个回答都是完整段落，可直接练习说出来`;
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
      segment,
    }: {
      parsedJD: ParsedJD;
      prepFiles?: string;
      companyName?: string;
      interviewRound?: InterviewRound;
      interviewerTitle?: string;
      apiKey?: string;
      segment: 1 | 2 | 3 | 4;
    } = await req.json();

    if (!parsedJD) return NextResponse.json({ error: '请提供 JD 信息' }, { status: 400 });
    if (!apiKey)   return NextResponse.json({ error: '请提供 API Key' }, { status: 400 });

    const roundMap: Record<string, string> = { hr: 'HR 面试', technical: '技术面试', final: '终面' };
    const company    = companyName || parsedJD.companyName || '目标公司';
    const roundLabel = interviewRound ? roundMap[interviewRound] : '未指定';
    const ctx        = buildContext(parsedJD, company, roundLabel, interviewerTitle || '', prepFiles);

    // ── Segment 1: Company + JobMatch + SelfIntro ─────────
    if (segment === 1) {
      const prompt = `你是资深职业面试教练。根据以下信息生成面试准备手册第一部分。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "companyBackground": {
    "overview": "公司简介：历史、规模、核心业务，200字以内",
    "industryPosition": "行业定位与近期动态，150字以内",
    "chinaMarket": "中国市场布局，100字以内",
    "whyHiring": "推测为何招聘此岗位，80字以内"
  },
  "jobMatch": {
    "strengthsMatch": [
      { "strength": "我的一个优势（30字以内）", "jobRequirement": "对应的JD要求（20字以内）" }
    ],
    "weaknesses": [
      {
        "weakness": "一个潜在劣势（20字以内）",
        "strategy": "应对策略（30字以内）",
        "talkingPoint": "面试中可以这样说（口语化段落，100字以内）"
      }
    ]
  },
  "selfIntroduction": {
    "chinese": "2分钟中文自我介绍，口语化，融入与JD匹配的亮点，300字以内",
    "english": "2-minute English self-introduction, conversational, under 250 words"
  }
}

要求：strengthsMatch 3-4条，weaknesses 2条，selfIntroduction 中英文各一版。`;

      const data = await callWithRetry<Seg1>(prompt, apiKey, 'seg1');
      return NextResponse.json({
        companyBackground: {
          overview:         data.companyBackground?.overview || '',
          industryPosition: data.companyBackground?.industryPosition || '',
          chinaMarket:      data.companyBackground?.chinaMarket || '',
          whyHiring:        data.companyBackground?.whyHiring || '',
        },
        jobMatch: {
          strengthsMatch: data.jobMatch?.strengthsMatch || [],
          weaknesses:     data.jobMatch?.weaknesses || [],
        },
        selfIntroduction: {
          chinese: data.selfIntroduction?.chinese || '',
          english: data.selfIntroduction?.english || '',
        },
      });
    }

    // ── Segment 2: Core Q&A ───────────────────────────────
    if (segment === 2) {
      const prompt = `你是资深职业面试教练。根据以下信息生成面试问答。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "coreQA": [
    {
      "id": "q1",
      "category": "general",
      "question": "面试问题",
      "answer": "口语化参考话术，完整段落，150字以内"
    }
  ]
}

category 只能是 "general"、"technical" 或 "behavioral"。
要求生成 8-9 个问题：
- general 3个：为什么选这家公司、职业规划、为什么离职/转行（根据情况选择）
- technical 2-3个：根据JD核心技能针对性出题
- behavioral 3个：STAR格式行为面试题（如：处理冲突、跨部门合作、高压下完成任务）
每个 answer 都是可以直接说出来的口语化段落，不要用要点罗列。`;

      const data = await callWithRetry<Seg2>(prompt, apiKey, 'seg2');
      return NextResponse.json({ coreQA: data.coreQA || [] });
    }

    // ── Segment 3: STAR Stories + AI Capabilities ─────────
    if (segment === 3) {
      const prompt = `你是资深职业面试教练。根据以下信息生成STAR故事库。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "starStories": [
    {
      "id": "s1",
      "title": "故事标题（15字以内）",
      "story": "完整STAR故事：背景→任务→行动→结果，口语化叙事，第一人称，250字以内",
      "applicableScenarios": ["适用场景1", "适用场景2"]
    }
  ],
  "aiCapabilities": null
}

要求：
- starStories 生成 3-4 个故事，如有用户素材优先使用真实经历，否则根据岗位推测典型场景
- 每个故事要有具体细节和数字结果，不要泛泛而谈
- aiCapabilities：如果素材或JD中提到AI/LLM工具使用经验则填写，否则返回 null
  格式：{ "description": "背景描述（100字以内）", "talkingPoint": "面试话术（100字以内）" }`;

      const data = await callWithRetry<Seg3>(prompt, apiKey, 'seg3');
      return NextResponse.json({
        starStories:    data.starStories || [],
        aiCapabilities: data.aiCapabilities || null,
      });
    }

    // ── Segment 4: Questions + Strategy + Salary + Warnings
    if (segment === 4) {
      const prompt = `你是资深职业面试教练。根据以下信息生成面试策略与建议。

${ctx}

只返回如下 JSON，不要任何其他文字：
{
  "questionsToAsk": [
    "针对公司和岗位的高质量反问问题（一句话，不要通用问题）"
  ],
  "strategy": {
    "positioning": "差异化定位：你的核心竞争优势是什么，100字以内",
    "principles": ["核心原则1（一句话）", "核心原则2", "核心原则3"],
    "closingScript": "面试结尾推进话术，口语化，80字以内"
  },
  "salaryNegotiation": {
    "marketRange": "该岗位市场薪资范围（如：月薪20-35K，年包25-45万）",
    "strategies": ["谈判策略1（一句话）", "策略2", "策略3"]
  },
  "warningsAndTraps": {
    "traps": ["陷阱问题1（一句话描述）", "陷阱2", "陷阱3"],
    "avoidPhrases": ["避免说的话1", "避免表达2", "避免表达3"]
  }
}

要求：questionsToAsk 8-10个，涵盖团队氛围、成长路径、岗位期望、公司战略等维度。`;

      const data = await callWithRetry<Seg4>(prompt, apiKey, 'seg4');
      return NextResponse.json({
        questionsToAsk: data.questionsToAsk || [],
        strategy: {
          positioning:  data.strategy?.positioning || '',
          principles:   data.strategy?.principles || [],
          closingScript: data.strategy?.closingScript || '',
        },
        salaryNegotiation: {
          marketRange: data.salaryNegotiation?.marketRange || '',
          strategies:  data.salaryNegotiation?.strategies || [],
        },
        warningsAndTraps: {
          traps:        data.warningsAndTraps?.traps || [],
          avoidPhrases: data.warningsAndTraps?.avoidPhrases || [],
        },
      });
    }

    return NextResponse.json({ error: '无效的 segment 参数' }, { status: 400 });
  } catch (error: unknown) {
    console.error('generate-interview-prep error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `生成失败: ${message}` }, { status: 500 });
  }
}
