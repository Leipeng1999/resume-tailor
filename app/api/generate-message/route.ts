import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { parseJsonWithFallback } from '@/lib/jsonParser';
import { MessageChannel, MessageLanguage, MessageTone, GeneratedMessage } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const {
      channel,
      language,
      tone,
      jdText,
      resumeHighlights,
      apiKey,
    }: {
      channel: MessageChannel;
      language: MessageLanguage;
      tone: MessageTone;
      jdText?: string;
      resumeHighlights?: string;
      apiKey?: string;
    } = await req.json();

    const channelMap: Record<MessageChannel, string> = {
      linkedin: 'LinkedIn',
      boss: 'Boss直聘',
      liepin: '猎聘',
      official: '公司官网',
      email: '求职邮件',
    };

    const toneMap: Record<MessageTone, string> = {
      formal: '正式商务',
      friendly: '友好专业',
      enthusiastic: '热情积极',
    };

    const languageMap: Record<MessageLanguage, string> = {
      chinese: '中文',
      english: '英文',
      bilingual: '中英双语',
    };

    const prompt = `你是一位求职专家，请为以下场景生成求职消息。

## 投递渠道：${channelMap[channel]}
## 消息语言：${languageMap[language]}
## 语气风格：${toneMap[tone]}

${jdText ? `## 目标职位描述\n${jdText}\n` : ''}
${resumeHighlights ? `## 我的简历亮点\n${resumeHighlights}\n` : ''}

## 生成要求
${channel === 'linkedin' ? `
- 版本1：LinkedIn Connection Request（不超过300字符，简短有力）
- 版本2：LinkedIn InMail（正式详细，包含自我介绍、为什么感兴趣、个人优势）
- 版本3：LinkedIn InMail 备选版本（不同角度切入）
` : ''}
${channel === 'boss' || channel === 'liepin' ? `
- 版本1：标准打招呼消息（简短有力，不超过200字）
- 版本2：展开版打招呼（稍详细，包含关键优势，不超过400字）
- 版本3：强调特定技能的版本
` : ''}
${channel === 'official' || channel === 'email' ? `
- 版本1：标准求职邮件（包含 Subject Line + 正文）
- 版本2：更突出个人成就的版本（包含 Subject Line + 正文）
- 版本3：简洁有力版（包含 Subject Line + 正文）
` : ''}

针对医学行业，请使用恰当的专业术语，体现对行业的深入理解。

请返回 JSON 格式（只返回 JSON）：
{
  "messages": [
    {
      "channel": "${channel}",
      "version": 1,
      "subject": "邮件主题（仅邮件/官网渠道需要）",
      "content": "消息内容"
    }
  ]
}`;

    const response = await callClaude(prompt, undefined, apiKey);

    const result = await parseJsonWithFallback<{ messages: GeneratedMessage[] }>(response, apiKey, 'generate-message');
    return NextResponse.json({ messages: result.messages });
  } catch (error: unknown) {
    console.error('generate-message error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `消息生成失败: ${message}` }, { status: 500 });
  }
}
