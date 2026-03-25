'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, RotateCcw } from 'lucide-react';
import { LoadingSpinner } from './Loadingskeleton';
import { getApiKey } from '@/lib/storage';
import { showToast } from '@/components/Toast';

interface RefineInputProps {
  currentContent: string;
  contentType: 'resume' | 'message' | 'interview';
  context?: string;
  placeholder?: string;
  onRefined: (refinedContent: string, changes: unknown[]) => void;
}

export default function RefineInput({
  currentContent,
  contentType,
  context,
  placeholder,
  onRefined,
}: RefineInputProps) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultPlaceholder =
    contentType === 'resume'
      ? '例如：把第二段经历改得更强调 leadership 能力 / 加入我在XX项目的经验 / 技能部分补充 Python 和 R 语言'
      : contentType === 'message'
      ? '例如：语气再热情一点 / 提一下我读过他们最近发表的论文 / 加入我对这个治疗领域的热情'
      : '帮我加一个关于跨部门合作的问题 / 自我介绍中突出我的 AI 项目经验 / 增加 real world evidence 的技术问题';

  const handleRefine = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    setError('');

    try {
      const apiKey = getApiKey();
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent,
          userFeedback: feedback,
          contentType,
          context,
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '优化失败');

      onRefined(data.refinedContent, data.changes || []);
      setFeedback('');
      // For interview type, changes[0].description contains which section was updated
      const firstChange = (data.changes || [])[0] as Record<string, string> | undefined;
      const summary = firstChange?.description
        ? `已更新 · ${firstChange.section ? firstChange.section + '：' : ''}${firstChange.description}`
        : '已更新！';
      showToast(summary, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '优化失败，请重试';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-medium text-orange-700">个性化追问优化</span>
      </div>

      {loading ? (
        <LoadingSpinner text="AI 正在优化中..." />
      ) : (
        <>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={placeholder || defaultPlaceholder}
            className="min-h-[80px] text-sm bg-white border-orange-200 focus-visible:ring-orange-300"
          />
          {error && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRefine}
                className="shrink-0 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                重试
              </Button>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleRefine}
              disabled={!feedback.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              size="sm"
            >
              <Sparkles className="w-4 h-4" />
              继续优化
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
