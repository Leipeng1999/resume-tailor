import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '请上传简历文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (file.name.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = (await import('pdf-parse') as any).default ?? (await import('pdf-parse'));
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: '不支持的文件格式，请上传 PDF、Word 或 TXT 文件' }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error: unknown) {
    console.error('parse-resume error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `简历解析失败: ${message}` }, { status: 500 });
  }
}
