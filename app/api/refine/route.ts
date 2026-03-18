import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';

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

    const prompt = `你是一位专业的求职顾问，请根据用户的修改建议对${typeMap[contentType]}进行优化。

${context ? `## 背景信息\n${context}\n` : ''}

## 当前内容
${currentContent}

## 用户的修改建议
${userFeedback}

## 要求
1. 在当前内容基础上进行修改，不要从头重写
2. 严格按照用户的建议进行调整
3. 标记出所有修改的部分

请返回 JSON 格式（只返回 JSON）：
{
  "refinedContent": "修改后的完整内容",
  "changes": [
    {
      "type": "added/removed/modified",
      "original": "修改前的文本",
      "refined": "修改后的文本",
      "reason": "修改理由"
    }
  ]
}`;

    const response = await callClaude(prompt, undefined, apiKey);

    const result = await parseJsonWithFallback<{ refinedContent: string; changes: unknown[] }>(response, apiKey, 'refine');
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('refine error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `优化失败: ${message}` }, { status: 500 });
  }
}
