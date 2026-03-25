import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';
import { ParsedJD, MatchScore } from '@/lib/types';

const JSON_SYSTEM = '你必须且只能返回合法的 JSON，不要包含任何 markdown 标记、代码块标记或其他非 JSON 内容。';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, parsedJD, apiKey }: { resumeText: string; parsedJD: ParsedJD; apiKey?: string } =
      await req.json();

    if (!resumeText?.trim() || !parsedJD) {
      return NextResponse.json({ error: '请提供简历内容和 JD 信息' }, { status: 400 });
    }

    const prompt = `请分析以下简历与职位要求的匹配程度，返回评分结果。

## 职位要求
- 岗位：${parsedJD.jobTitle}
- 核心技能：${parsedJD.coreSkills.join('、')}
- 行业关键词：${parsedJD.industryKeywords.join('、')}
- 加分项：${parsedJD.niceToHave.join('、')}

## 简历内容
${resumeText}

请返回 JSON 格式（只返回 JSON）：
{
  "overall": 85,
  "keywordMatch": 78,
  "atsScore": 82,
  "matchedKeywords": ["已匹配的关键词1", "关键词2"],
  "missingKeywords": ["缺失的关键词1", "关键词2"],
  "atsIssues": ["ATS友好度问题1", "问题2"]
}

评分说明：
- overall: 综合匹配度（0-100）
- keywordMatch: 关键词匹配率（0-100）
- atsScore: ATS 友好度评分（0-100）
- matchedKeywords: 简历中已出现的JD关键词
- missingKeywords: JD中要求但简历中缺失的关键词
- atsIssues: 影响ATS通过率的格式或关键词问题`;

    const response = await callClaude(prompt, JSON_SYSTEM, apiKey);

    const score = await parseJsonWithFallback<MatchScore>(response, apiKey, 'match-score');
    return NextResponse.json(score);
  } catch (error: unknown) {
    console.error('match-score error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `评分失败: ${message}，请重试` }, { status: 500 });
  }
}
