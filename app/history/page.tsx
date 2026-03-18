'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HistoryRecord } from '@/lib/types';
import { getHistory, deleteHistoryRecord } from '@/lib/storage';
import { Search, Trash2, Clock, TrendingUp, FileText, MessageSquare, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(getHistory());
  }, []);

  const filtered = records.filter(
    (r) =>
      search === '' ||
      r.companyName.toLowerCase().includes(search.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteHistoryRecord(id);
    setRecords(getHistory());
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">历史记录</h1>
        <p className="text-slate-500 mt-1">查看所有投递记录，包含简历定制、消息生成、面试准备</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索公司名称或职位..."
            className="pl-9"
          />
        </div>
        <p className="text-sm text-slate-500">{filtered.length} 条记录</p>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <p className="text-slate-600 font-medium">暂无历史记录</p>
            <p className="text-sm text-slate-400 mt-1">使用简历定制或消息生成功能后，记录会自动保存到这里</p>
          </div>
          <Link
            href="/tailor"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            开始定制简历
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">没有找到匹配的记录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((record) => (
            <Card key={record.id} className="hover:border-teal-200 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {record.jobTitle}
                      {record.companyName && (
                        <span className="text-slate-500 font-normal"> @ {record.companyName}</span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deleteId === record.id ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          className="text-xs h-7"
                        >
                          确认删除
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(null)}
                          className="text-xs h-7"
                        >
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(record.id)}
                        className="text-slate-400 hover:text-red-500 h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* JD Summary */}
                {record.jdSummary && (
                  <p className="text-sm text-slate-600 line-clamp-2">{record.jdSummary}</p>
                )}

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2">
                  {record.tailoredResume && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <FileText className="w-3 h-3" />已定制简历
                    </Badge>
                  )}
                  {record.generatedMessages && record.generatedMessages.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <MessageSquare className="w-3 h-3" />已生成消息
                    </Badge>
                  )}
                  {record.interviewPrep && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <BookOpen className="w-3 h-3" />已准备面试
                    </Badge>
                  )}
                </div>

                {/* Match Score */}
                {record.matchScore && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 shrink-0 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      匹配度
                    </span>
                    <Progress value={record.matchScore.overall} className="h-2 flex-1" />
                    <span className={`text-sm font-bold shrink-0 ${
                      record.matchScore.overall >= 80 ? 'text-green-600' :
                      record.matchScore.overall >= 60 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {record.matchScore.overall}%
                    </span>
                  </div>
                )}

                {/* Keywords */}
                {record.parsedJD?.industryKeywords && record.parsedJD.industryKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {record.parsedJD.industryKeywords.slice(0, 5).map((k) => (
                      <Badge key={k} className="text-xs bg-teal-50 text-teal-700 border-teal-100">{k}</Badge>
                    ))}
                    {record.parsedJD.industryKeywords.length > 5 && (
                      <Badge variant="outline" className="text-xs">+{record.parsedJD.industryKeywords.length - 5}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
