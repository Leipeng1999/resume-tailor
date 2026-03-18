import { NextRequest, NextResponse } from 'next/server';
import { callClaudeWithImage } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType, apiKey } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '请提供图片数据' }, { status: 400 });
    }

    const validMediaType = (mediaType || 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp';

    const text = `请识别并提取这张图片中的所有文字内容，特别是职位描述（JD）相关信息。请直接返回识别出的文字内容，保持原有格式结构，不要添加任何解释。`;

    const extractedText = await callClaudeWithImage(text, imageBase64, validMediaType, apiKey);

    return NextResponse.json({ text: extractedText });
  } catch (error: unknown) {
    console.error('parse-jd-image error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `图片识别失败: ${message}` }, { status: 500 });
  }
}
