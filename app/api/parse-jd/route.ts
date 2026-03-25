import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';
import { ParsedJD } from '@/lib/types';

const JSON_SYSTEM = '你必须且只能返回合法的 JSON，不要包含任何 markdown 标记、代码块标记或其他非 JSON 内容。';

export async function POST(req: NextRequest) {
  try {
    const { jdText, apiKey } = await req.json();

    if (!jdText?.trim()) {
      return NextResponse.json({ error: '请提供 JD 文本' }, { status: 400 });
    }

    const prompt = `请分析以下职位描述（JD），提取结构化信息并以 JSON 格式返回。

JD内容：
${jdText}

请返回以下 JSON 格式（不要添加任何其他文字，只返回 JSON）：
{
  "jobTitle": "岗位名称",
  "companyName": "公司名称（如果有）",
  "coreSkills": ["核心技能1", "核心技能2", ...],
  "educationExperience": "学历和经验要求",
  "industryKeywords": ["行业关键词1", "行业关键词2", ...],
  "niceToHave": ["加分项1", "加分项2", ...],
  "rawText": "${jdText.substring(0, 200)}..."
}

特别注意提取医学/生命科学相关关键词，如：Medical Writing、Regulatory Submission、ICH-GCP、Clinical Study Report (CSR)、KOL Management、Real World Evidence (RWE)、Medical Affairs、SCI Publications、Drug Safety、Pharmacovigilance、IND/NDA、Protocol、Investigator Brochure 等。`;

    const response = await callClaude(prompt, JSON_SYSTEM, apiKey);

    const parsed: ParsedJD = await parseJsonWithFallback<ParsedJD>(response, apiKey, 'parse-jd');
    parsed.rawText = jdText;

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('parse-jd error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `解析失败: ${message}，请重试` }, { status: 500 });
  }
}
