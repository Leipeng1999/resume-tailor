import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';
import { ParsedJD, TailoredResume, ResumeDiff } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, parsedJD, apiKey }: { resumeText: string; parsedJD: ParsedJD; apiKey?: string } =
      await req.json();

    if (!resumeText?.trim() || !parsedJD) {
      return NextResponse.json({ error: '请提供简历内容和 JD 解析结果' }, { status: 400 });
    }

    const prompt = `你是一位专业的医学行业求职顾问，请根据以下 JD 要求对简历进行定制优化。

## 目标岗位信息
- 岗位名称：${parsedJD.jobTitle}
- 公司：${parsedJD.companyName}
- 核心技能要求：${parsedJD.coreSkills.join('、')}
- 行业关键词：${parsedJD.industryKeywords.join('、')}
- 加分项：${parsedJD.niceToHave.join('、')}

## 原始简历内容
${resumeText}

## 定制要求
1. 重新排列经历优先级，把与 JD 最匹配的经历排在最前面
2. 优化每段经历的描述措辞，自然融入 JD 中的关键词
3. 针对不同岗位类型进行针对性优化（Medical Writing/MSL/医学AI等）
4. 保留所有真实经历，不虚构内容，只优化描述方式
5. diffs 数组最多 20 条，每条的 originalText 和 newText 控制在 150 字以内

⚠️ 严格 JSON 格式要求：
1. 只返回 JSON 对象，不要有任何其他文字或代码围栏
2. 所有字符串中的换行用 \\n 表示，绝对不要使用真实换行符
3. 字符串中的双引号必须转义为 \\"
4. 数组/对象最后一个元素后面不能有逗号
5. tailoredContent 字段用 \\n 分隔段落

请返回以下结构的 JSON：
{
  "tailoredContent": "完整的定制后简历文本，段落之间用\\n\\n分隔",
  "diffs": [
    {
      "id": "diff-1",
      "originalText": "原文片段（150字以内）",
      "newText": "修改后文本（150字以内）",
      "type": "modified",
      "reason": "修改理由（50字以内）"
    }
  ],
  "suggestions": ["还可以补充的内容建议1", "建议2", "建议3"]
}`;

    const response = await callClaude(prompt, undefined, apiKey);

    const result = await parseJsonWithFallback<{
      tailoredContent: string;
      diffs: ResumeDiff[];
      suggestions: string[];
    }>(response, apiKey, 'tailor-resume');

    const tailoredResume: TailoredResume = {
      originalContent: resumeText,
      tailoredContent: result.tailoredContent,
      diffs: (result.diffs || []).map((d: ResumeDiff, i: number) => ({
        ...d,
        id: d.id || `diff-${i}`,
        accepted: true,
      })),
      suggestions: result.suggestions || [],
    };

    return NextResponse.json(tailoredResume);
  } catch (error: unknown) {
    console.error('tailor-resume error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `简历定制失败: ${message}` }, { status: 500 });
  }
}
