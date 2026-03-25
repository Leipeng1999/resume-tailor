'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import CopyButton from '@/components/CopyButton';
import RefineInput from '@/components/RefineInput';
import { LoadingSpinner } from '@/components/Loadingskeleton';
import { showToast } from '@/components/Toast';
import { MessageChannel, MessageLanguage, MessageTone, GeneratedMessage, ParsedJD } from '@/lib/types';
import { getApiKey, getCurrentResume, getParsedJDs, deleteParsedJD } from '@/lib/storage';
import { MessageSquare, Send, AlertCircle, CheckCircle2, Link2, X } from 'lucide-react';

const channels: { value: MessageChannel; label: string; desc: string; emoji: string }[] = [
  { value: 'linkedin', label: 'LinkedIn',  desc: 'Connection + InMail', emoji: '💼' },
  { value: 'boss',     label: 'Boss直聘',  desc: '打招呼消息',          emoji: '🔥' },
  { value: 'liepin',   label: '猎聘',      desc: '打招呼消息',          emoji: '🎯' },
  { value: 'official', label: '公司官网',  desc: '求职邮件',            emoji: '🌐' },
  { value: 'email',    label: '求职邮件',  desc: 'Email',              emoji: '📧' },
];

const languages: { value: MessageLanguage; label: string }[] = [
  { value: 'chinese',   label: '中文' },
  { value: 'english',   label: 'English' },
  { value: 'bilingual', label: '双语' },
];

const tones: { value: MessageTone; label: string; desc: string }[] = [
  { value: 'formal',       label: '正式商务', desc: '专业严谨' },
  { value: 'friendly',     label: '友好专业', desc: '亲切有力' },
  { value: 'enthusiastic', label: '热情积极', desc: '充满热忱' },
];

export default function MessagePage() {
  const [channel,        setChannel]        = useState<MessageChannel>('linkedin');
  const [language,       setLanguage]       = useState<MessageLanguage>('chinese');
  const [tone,           setTone]           = useState<MessageTone>('friendly');
  const [jdText,         setJdText]         = useState('');
  const [messages,       setMessages]       = useState<GeneratedMessage[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [activeVersion,  setActiveVersion]  = useState(0);
  const [apiKey,         setApiKey]         = useState('');
  const [resumeHints,    setResumeHints]    = useState('');
  const [savedJDs,       setSavedJDs]       = useState<ParsedJD[]>([]);
  const [linkedJDIndex,  setLinkedJDIndex]  = useState<number>(-1); // -1 = manual

  useEffect(() => {
    setApiKey(getApiKey());
    setResumeHints(getCurrentResume().substring(0, 500));
    setSavedJDs(getParsedJDs());
  }, []);

  const linkedJD: ParsedJD | null = linkedJDIndex >= 0 ? (savedJDs[linkedJDIndex] ?? null) : null;

  const handleLinkJD = (index: number) => {
    setLinkedJDIndex(index);
    if (index >= 0 && savedJDs[index]) {
      setJdText(savedJDs[index].rawText || '');
    } else {
      setJdText('');
    }
  };

  const handleDeleteJD = (index: number) => {
    const jd = savedJDs[index];
    if (!confirm(`确认删除 ${jd.companyName ? jd.companyName + ' - ' : ''}${jd.jobTitle} 的记录？`)) return;
    deleteParsedJD(index);
    const newJDs = getParsedJDs();
    setSavedJDs(newJDs);
    if (linkedJDIndex === index) { setLinkedJDIndex(-1); setJdText(''); }
    else if (linkedJDIndex > index) { setLinkedJDIndex(linkedJDIndex - 1); }
    showToast('JD 记录已删除', 'success');
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      showToast('请先点击右上角「API Key」按钮配置 Anthropic API Key', 'error');
      setError('未配置 API Key');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          language,
          tone,
          jdText,
          resumeHighlights: resumeHints,
          linkedJD,
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(data.messages || []);
      setActiveVersion(0);
      showToast(`已生成 ${(data.messages || []).length} 个版本的消息`, 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '生成失败';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefined = (refined: string) => {
    setMessages((prev) => prev.map((m, i) => i === activeVersion ? { ...m, content: refined } : m));
  };

  const currentMessage = messages[activeVersion];

  /* ── Shared button style helper ─────────────────────── */
  const selectedCls = 'border-teal-600 bg-teal-600 text-white shadow-sm';
  const unselectedCls = 'border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">HR 消息生成器</h1>
        <p className="mt-1 text-slate-500">生成专业的求职打招呼消息，适配多个投递平台</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
          <button
            type="button"
            onClick={() => { setError(''); handleGenerate(); }}
            className="cursor-pointer shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {/* JD Linker */}
      {savedJDs.length > 0 && (
        <Card className="border-teal-100 bg-teal-50/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-700">关联已解析的职位</span>
              <span className="text-xs text-slate-400">（选择后自动填充JD，生成更精准的消息）</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleLinkJD(-1)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  linkedJDIndex === -1 ? selectedCls : unselectedCls
                }`}
              >
                不关联，手动输入
              </button>
              {(savedJDs || []).map((jd, i) => (
                <div key={i} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleLinkJD(i)}
                    className={`px-3 py-1.5 rounded-l-lg border text-xs font-medium transition-all cursor-pointer ${
                      linkedJDIndex === i ? selectedCls : unselectedCls
                    }`}
                  >
                    {jd.companyName ? `${jd.companyName} - ` : ''}{jd.jobTitle}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteJD(i)}
                    className={`px-1.5 py-1.5 rounded-r-lg border border-l-0 text-xs font-medium transition-all cursor-pointer ${
                      linkedJDIndex === i
                        ? 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700'
                        : 'border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                    }`}
                    title="删除此记录"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {linkedJD && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(linkedJD.coreSkills || []).slice(0, 5).map((s) => (
                  <span key={s} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Settings Panel ──────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-teal-600" />
                生成设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Channel */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">投递渠道</Label>
                <div className="flex flex-col gap-1.5">
                  {channels.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setChannel(c.value)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${channel === c.value ? selectedCls : unselectedCls}`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{c.emoji}</span>
                        {c.label}
                      </span>
                      <span className={`text-xs ${channel === c.value ? 'text-teal-100' : 'text-slate-400'}`}>
                        {c.desc}
                      </span>
                      {channel === c.value && <CheckCircle2 className="ml-1 h-3.5 w-3.5 shrink-0 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">消息语言</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {languages.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLanguage(l.value)}
                      className={`cursor-pointer rounded-lg border px-2 py-2 text-sm font-medium transition-all ${language === l.value ? selectedCls : unselectedCls}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">消息语气</Label>
                <div className="flex flex-col gap-1.5">
                  {tones.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTone(t.value)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${tone === t.value ? selectedCls : unselectedCls}`}
                    >
                      <span>{t.label}</span>
                      <span className={`flex items-center gap-1.5 text-xs ${tone === t.value ? 'text-teal-100' : 'text-slate-400'}`}>
                        {t.desc}
                        {tone === t.value && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── JD Input + Results ──────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {linkedJD
                  ? `已关联：${linkedJD.companyName ? linkedJD.companyName + ' - ' : ''}${linkedJD.jobTitle}`
                  : '职位描述（可选，填写后生成更个性化）'
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={jdText}
                onChange={(e) => { setJdText(e.target.value); if (linkedJDIndex >= 0) setLinkedJDIndex(-1); }}
                placeholder={linkedJD ? '已自动填充 JD 描述，可手动修改...' : '粘贴目标职位描述或岗位要求...'}
                className="min-h-[100px] text-sm"
              />
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {loading
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />生成中...</>
                  : <><Send className="h-4 w-4" />生成消息</>
                }
              </Button>
              {resumeHints && (
                <p className="flex items-center gap-1 text-xs text-teal-600">
                  <CheckCircle2 className="h-3 w-3" />已自动读取你的简历亮点用于个性化
                </p>
              )}
            </CardContent>
          </Card>

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <LoadingSpinner text="AI 正在生成消息..." />
            </div>
          )}

          {messages.length > 0 && !loading && (
            <div className="space-y-4">
              {/* Version selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">选择版本：</span>
                {messages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveVersion(i)}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                      activeVersion === i
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50'
                    }`}
                  >
                    版本 {i + 1}
                  </button>
                ))}
              </div>

              {currentMessage && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-slate-700">
                        {channels.find((c) => c.value === currentMessage.channel)?.emoji}&nbsp;
                        {channels.find((c) => c.value === currentMessage.channel)?.label} — 版本 {currentMessage.version}
                      </CardTitle>
                      <CopyButton
                        text={currentMessage.subject
                          ? `主题：${currentMessage.subject}\n\n${currentMessage.content}`
                          : currentMessage.content
                        }
                        variant="outline"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentMessage.subject && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="mb-1 text-xs text-slate-500">邮件主题</p>
                        <p className="font-medium text-slate-800 text-sm">{currentMessage.subject}</p>
                      </div>
                    )}
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {currentMessage.content}
                      </p>
                    </div>
                    <p className="text-right text-xs text-slate-400">{currentMessage.content.length} 字符</p>
                  </CardContent>
                </Card>
              )}

              <RefineInput
                currentContent={currentMessage?.content || ''}
                contentType="message"
                onRefined={handleRefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
