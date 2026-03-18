'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiKey, saveApiKey } from '@/lib/storage';
import { KeyRound, FileText, MessageSquare, BookOpen, History, Menu, X, Stethoscope } from 'lucide-react';

const navItems = [
  { href: '/tailor',    label: '简历定制',   icon: FileText      },
  { href: '/message',   label: 'HR 消息',    icon: MessageSquare },
  { href: '/interview', label: '面试准备',   icon: BookOpen      },
  { href: '/history',   label: '历史记录',   icon: History       },
];

export default function Navbar() {
  const pathname = usePathname();
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleOpenApiKey = () => {
    setApiKeyInput(getApiKey());
    setApiKeyOpen(true);
    setSaved(false);
  };

  const handleSaveApiKey = () => {
    saveApiKey(apiKeyInput.trim());
    setSaved(true);
    setTimeout(() => setApiKeyOpen(false), 800);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 font-bold text-teal-700 transition hover:text-teal-600">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 shadow-sm">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <span className="hidden text-base sm:block">医学求职助手</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-1 md:flex">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {active && (
                      <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenApiKey}
                className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 sm:flex"
              >
                <KeyRound className="h-3.5 w-3.5" />
                API Key
              </button>

              <button
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          {mobileOpen && (
            <div className="border-t border-slate-100 pb-3 pt-2 md:hidden">
              <div className="flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { handleOpenApiKey(); setMobileOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <KeyRound className="h-4 w-4" />
                  设置 API Key
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* API Key Dialog */}
      <Dialog open={apiKeyOpen} onOpenChange={setApiKeyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-teal-600" />
              配置 Anthropic API Key
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Key 仅保存在浏览器本地，不会上传到任何服务器。
              获取地址：<span className="font-medium text-slate-700">console.anthropic.com</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="apikey">API Key</Label>
              <Input
                id="apikey"
                type="password"
                placeholder="sk-ant-api03-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setApiKeyOpen(false)}>取消</Button>
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saved ? '✓ 已保存' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
