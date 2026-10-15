import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send } from 'lucide-react';

export type QaChatMessage = {
  id: string;
  body: string;
  authorRole: string;
  createdAt?: string;
  threadSupplierId?: string | null;
  author?: { firstName?: string; lastName?: string } | null;
  threadSupplier?: { id: string; companyName?: string } | null;
};

export type QaThread = {
  supplierId: string;
  companyName: string;
  lastMessageAt?: string;
  lastPreview?: string;
  messageCount?: number;
};

type Props = {
  mode: 'buyer' | 'supplier';
  messages: QaChatMessage[];
  threads?: QaThread[];
  selectedSupplierId?: string | null;
  onSelectThread?: (supplierId: string) => void;
  /** Buyer: suppliers available to start a new private thread */
  startableSuppliers?: Array<{ id: string; companyName: string }>;
  body: string;
  onBodyChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  onAiDraft?: () => void;
};

function formatTime(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export function ProcedureQaChat({
  mode,
  messages,
  threads = [],
  selectedSupplierId = null,
  onSelectThread,
  startableSuppliers = [],
  body,
  onBodyChange,
  onSend,
  disabled = false,
  onAiDraft
}: Props) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadMessages = useMemo(() => {
    if (mode === 'supplier') return messages;
    if (!selectedSupplierId) return [];
    return messages.filter((m) => m.threadSupplierId === selectedSupplierId);
  }, [mode, messages, selectedSupplierId]);

  const unusedStartable = useMemo(() => {
    const openIds = new Set(threads.map((th) => th.supplierId));
    return startableSuppliers.filter((s) => !openIds.has(s.id));
  }, [threads, startableSuppliers]);

  useEffect(() => {
    // Keep scroll inside the chat pane only (avoid shifting the slide-over / blurring controls)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [threadMessages.length, selectedSupplierId]);

  const canSend =
    !disabled &&
    body.trim().length > 0 &&
    (mode === 'supplier' || Boolean(selectedSupplierId));

  return (
    <div className="flex flex-col md:flex-row gap-3 min-h-[320px] max-h-[480px]">
      {mode === 'buyer' && (
        <div className="md:w-56 shrink-0 rounded-xl border border-border bg-slate-50/80 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-white">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{t('procedures.qaThreads')}</p>
            <p className="text-xs text-muted mt-0.5">{t('procedures.qaPrivateHint')}</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {threads.length === 0 && unusedStartable.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted">{t('procedures.qaNoThreads')}</p>
            ) : (
              threads.map((th) => (
                <button
                  key={th.supplierId}
                  type="button"
                  onClick={() => onSelectThread?.(th.supplierId)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/60 transition-colors ${
                    selectedSupplierId === th.supplierId
                      ? 'bg-primary-50 border-l-2 border-l-primary-500'
                      : 'hover:bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground truncate">{th.companyName}</p>
                  <p className="text-xs text-muted truncate mt-0.5">{th.lastPreview || '—'}</p>
                </button>
              ))
            )}
            {unusedStartable.length > 0 && (
              <div className="p-2 border-t border-border bg-white">
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('procedures.qaStartThread')}
                </label>
                <select
                  className="input-brand text-sm w-full"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) onSelectThread?.(e.target.value);
                  }}
                >
                  <option value="">{t('procedures.selectSupplier')}</option>
                  {unusedStartable.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 rounded-xl border border-border bg-white flex flex-col min-h-[280px] overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-gradient-to-r from-slate-50 to-primary-50/40 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary-600" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {mode === 'supplier'
                ? t('procedures.qaChatWithBuyer')
                : selectedSupplierId
                  ? threads.find((th) => th.supplierId === selectedSupplierId)?.companyName ||
                    startableSuppliers.find((s) => s.id === selectedSupplierId)?.companyName ||
                    t('procedures.qaChat')
                  : t('procedures.qaSelectThread')}
            </p>
            <p className="text-xs text-muted">{t('procedures.qaPrivateHint')}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50/40">
          {mode === 'buyer' && !selectedSupplierId ? (
            <p className="text-sm text-muted text-center py-10">{t('procedures.qaSelectThread')}</p>
          ) : threadMessages.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">{t('procedures.qaEmptyChat')}</p>
          ) : (
            threadMessages.map((m) => {
              const mine =
                (mode === 'supplier' && m.authorRole === 'supplier') ||
                (mode === 'buyer' && m.authorRole === 'procuring_entity');
              const label = mine
                ? t('procedures.qaYou')
                : mode === 'supplier'
                  ? t('procedures.qaBuyer')
                  : `${m.author?.firstName || ''} ${m.author?.lastName || ''}`.trim() ||
                    t('procedures.qaSupplier');
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${
                      mine
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-white border border-border text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${mine ? 'text-white/80' : 'text-muted'}`}>
                      {label}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    {m.createdAt ? (
                      <p className={`text-xs mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                        {formatTime(m.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="relative z-20 border-t border-border p-2.5 bg-white space-y-2 shrink-0">
          <textarea
            className="input-brand w-full text-sm resize-none"
            rows={2}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={t('procedures.qaPlaceholder')}
            disabled={disabled || (mode === 'buyer' && !selectedSupplierId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
          />
          <div className="flex flex-wrap gap-2 justify-end">
            {onAiDraft ? (
              <button
                type="button"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled || (mode === 'buyer' && !selectedSupplierId)}
                onClick={onAiDraft}
              >
                {t('procedures.aiQaDraft')}
              </button>
            ) : null}
            <button
              type="button"
              className="btn-save px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              disabled={!canSend}
              onClick={(e) => {
                e.stopPropagation();
                if (canSend) onSend();
              }}
            >
              <Send className="w-4 h-4" />
              {t('procedures.postQa')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
