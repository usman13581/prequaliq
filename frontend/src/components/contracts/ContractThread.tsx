import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Download, Eye, FileText, Image as ImageIcon, Lock, Paperclip, Send, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';

type ThreadAttachment = { id: string; fileName: string; size?: number | null; mimeType?: string | null };

export type ContractThreadMessage = {
  id: string;
  senderRole: string;
  /** 'termination' marks the entry written when the buyer ends the contract */
  kind?: string | null;
  body: string;
  createdAt?: string;
  attachments?: ThreadAttachment[];
  sender?: { firstName?: string; lastName?: string } | null;
};

type Props = {
  contractId: string;
  messages: ContractThreadMessage[];
  deliveryStatus: string;
  mode: 'buyer' | 'supplier';
  readOnly?: boolean;
  contractStatus?: string;
  onUpdated: () => void;
  /** Quiet reload of the thread; called on a timer while the contract is open and active. */
  onRefresh?: () => void;
};

const VIEWABLE = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const REFRESH_MS = 20_000;

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayKey(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDay(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function openAttachment(att: ThreadAttachment, mode: 'view' | 'download') {
  const canView = mode === 'view' && VIEWABLE.includes(att.mimeType || '');
  // Opened before the request so the browser does not block it as a pop-up
  const tab = canView ? window.open('', '_blank') : null;
  if (tab) tab.opener = null;
  try {
    const res = await api.get(`/contracts/attachments/${att.id}/download`, {
      responseType: 'blob',
      silentBusy: true
    });
    const blob = new Blob([res.data], { type: att.mimeType || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = att.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

const DELIVERY_LABEL: Record<string, string> = {
  none: 'contracts.delivery.none',
  marked_done: 'contracts.delivery.markedDone',
  changes_requested: 'contracts.delivery.changesRequested',
  accepted: 'contracts.delivery.accepted'
};

export function ContractThread({
  contractId,
  messages,
  deliveryStatus,
  mode,
  readOnly = false,
  contractStatus,
  onUpdated,
  onRefresh
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [changeMessage, setChangeMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const ownRole = mode === 'buyer' ? 'procuring_entity' : 'supplier';
  const lastId = messages.length ? messages[messages.length - 1].id : '';

  // Keep the newest message in view, as in a chat
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, messages.length]);

  // Pick up the other party's messages while the contract stays open
  useEffect(() => {
    if (readOnly) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshRef.current?.();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [readOnly, contractId]);

  const errorMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('msg.failedSave');

  const addFiles = (list: File[]) => {
    const tooBig = list.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length) {
      showToast(t('contracts.thread.fileTooLarge', { name: tooBig[0].name }), 'error');
    }
    const next = [...files, ...list.filter((f) => f.size <= MAX_FILE_BYTES)];
    if (next.length > MAX_FILES) showToast(t('contracts.thread.tooManyFiles', { count: MAX_FILES }), 'error');
    setFiles(next.slice(0, MAX_FILES));
  };

  const postMessage = async () => {
    if (busy || (!text.trim() && files.length === 0)) return;
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append('body', text.trim() || '');
      files.forEach((f) => fd.append('files', f));
      await api.post(`/contracts/${contractId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        silentBusy: true
      });
      setText('');
      setFiles([]);
      // Refresh after success — refresh failures must not look like send failures
      try {
        await Promise.resolve(onUpdated());
      } catch {
        /* ignore refresh errors */
      }
    } catch (error: unknown) {
      showToast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runDelivery = async (path: string, body?: Record<string, string>) => {
    try {
      setBusy(true);
      await api.post(`/contracts/${contractId}/delivery/${path}`, body || {});
      if (path === 'request-changes') setChangeMessage('');
      onUpdated();
      showToast(t('msg.saved'), 'success');
    } catch (error: unknown) {
      showToast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deliveryTone =
    deliveryStatus === 'accepted'
      ? 'green'
      : deliveryStatus === 'changes_requested'
        ? 'yellow'
        : deliveryStatus === 'marked_done'
          ? 'blue'
          : 'gray';

  const supplierCanMarkDone =
    mode === 'supplier' && (deliveryStatus === 'none' || deliveryStatus === 'changes_requested');
  const buyerReviews = mode === 'buyer' && deliveryStatus === 'marked_done';
  const buyerCanReopen = mode === 'buyer' && deliveryStatus === 'accepted';
  const hasDeliveryAction = !readOnly && (supplierCanMarkDone || buyerReviews || buyerCanReopen);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {/* Delivery: its own strip, so status and actions are not lost under the conversation */}
      <section className="rounded-2xl border border-border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground">{t('contracts.delivery.title')}</p>
          <StatusBadge tone={deliveryTone}>
            {t(DELIVERY_LABEL[deliveryStatus] || 'contracts.delivery.none')}
          </StatusBadge>
        </div>
        {hasDeliveryAction ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {supplierCanMarkDone ? (
              <button
                type="button"
                className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                disabled={busy}
                onClick={() => runDelivery('mark-done')}
              >
                {deliveryStatus === 'changes_requested'
                  ? t('contracts.delivery.resubmit')
                  : t('contracts.delivery.markDone')}
              </button>
            ) : null}
            {buyerReviews ? (
              <>
                <button
                  type="button"
                  className="btn-approve px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  disabled={busy}
                  onClick={() => runDelivery('accept')}
                >
                  {t('contracts.delivery.accept')}
                </button>
                <div className="w-full space-y-2">
                  <textarea
                    className="input-brand"
                    rows={2}
                    disabled={busy}
                    placeholder={t('contracts.delivery.changesPlaceholder')}
                    value={changeMessage}
                    onChange={(e) => setChangeMessage(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-reject px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    disabled={busy || !changeMessage.trim()}
                    onClick={() => runDelivery('request-changes', { message: changeMessage.trim() })}
                  >
                    {t('contracts.delivery.requestChanges')}
                  </button>
                </div>
              </>
            ) : null}
            {buyerCanReopen ? (
              <button
                type="button"
                className="btn-cancel px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                disabled={busy}
                onClick={() => runDelivery('reopen')}
              >
                {t('contracts.delivery.reopen')}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Conversation */}
      <section className="rounded-2xl border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border">
          <p className="text-sm font-bold text-foreground">{t('contracts.thread.title')}</p>
          <span className="text-xs text-muted">{t('contracts.thread.count', { count: messages.length })}</span>
        </div>

        <div
          ref={scrollRef}
          className="h-[26rem] max-h-[52vh] overflow-y-auto bg-surface px-3 sm:px-4 py-3"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1">
              <p className="text-sm font-semibold text-foreground">{t('contracts.thread.empty')}</p>
              {!readOnly ? <p className="text-xs text-muted">{t('contracts.thread.emptyHint')}</p> : null}
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((m, idx) => {
                const mine = m.senderRole === ownRole;
                const isBuyer = m.senderRole === 'procuring_entity';
                const newDay = idx === 0 || dayKey(messages[idx - 1].createdAt) !== dayKey(m.createdAt);
                const name = [m.sender?.firstName, m.sender?.lastName].filter(Boolean).join(' ');
                const roleLabel = isBuyer ? t('contracts.thread.buyer') : t('contracts.thread.supplier');
                const hasBody = m.body && m.body !== '(attachment)';

                return (
                  <Fragment key={m.id}>
                    {newDay && m.createdAt ? (
                      <div className="flex items-center gap-3 py-1">
                        <span className="h-px flex-1 bg-border" />
                        <span className="text-xs font-medium text-muted">{formatDay(m.createdAt)}</span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    ) : null}

                    {m.kind === 'termination' ? (
                      <div className="mx-auto max-w-[92%] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center">
                        <p className="text-xs font-bold text-red-800 inline-flex items-center gap-1.5">
                          <Ban size={13} /> {t('contracts.thread.endedByBuyer')}
                          <span className="font-normal text-red-700">· {formatTime(m.createdAt)}</span>
                        </p>
                        <p className="mt-1 text-sm text-red-900 whitespace-pre-wrap break-words">
                          <span className="font-semibold">{t('contracts.end.reasonLabel')}:</span> {m.body}
                        </p>
                      </div>
                    ) : (
                      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-[75%] min-w-[9rem] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                          <p className="px-1 mb-0.5 text-xs text-muted">
                            <span className="font-semibold text-foreground">
                              {mine ? t('contracts.thread.you') : name || roleLabel}
                            </span>
                            {mine || name ? ` · ${roleLabel}` : ''} · {formatTime(m.createdAt)}
                          </p>
                          <div
                            className={`w-full rounded-2xl border px-3 py-2 ${
                              mine
                                ? 'bg-blue-50 border-blue-100 rounded-tr-md'
                                : 'bg-white border-border rounded-tl-md'
                            }`}
                          >
                            {hasBody ? (
                              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.body}</p>
                            ) : null}
                            {(m.attachments || []).length > 0 ? (
                              <ul className={`space-y-1.5 ${hasBody ? 'mt-2' : ''}`}>
                                {(m.attachments || []).map((att) => {
                                  const viewable = VIEWABLE.includes(att.mimeType || '');
                                  const isImage = (att.mimeType || '').startsWith('image/');
                                  const run = async (how: 'view' | 'download') => {
                                    try {
                                      await openAttachment(att, how);
                                    } catch (error: unknown) {
                                      showToast(errorMessage(error), 'error');
                                    }
                                  };
                                  return (
                                    <li
                                      key={att.id}
                                      className="flex items-center gap-2 rounded-xl border border-border bg-white px-2.5 py-1.5"
                                    >
                                      {isImage ? (
                                        <ImageIcon size={16} className="shrink-0 text-accent" />
                                      ) : (
                                        <FileText size={16} className="shrink-0 text-accent" />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-foreground truncate">{att.fileName}</p>
                                        {att.size ? <p className="text-xs text-muted">{formatSize(att.size)}</p> : null}
                                      </div>
                                      {viewable ? (
                                        <button
                                          type="button"
                                          onClick={() => run('view')}
                                          title={t('buttons.view')}
                                          aria-label={`${t('buttons.view')}: ${att.fileName}`}
                                          className="w-8 h-8 rounded-lg hover:bg-surface text-muted hover:text-foreground flex items-center justify-center shrink-0"
                                        >
                                          <Eye size={15} />
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => run('download')}
                                        title={t('contracts.thread.download')}
                                        aria-label={`${t('contracts.thread.download')}: ${att.fileName}`}
                                        className="w-8 h-8 rounded-lg hover:bg-surface text-muted hover:text-foreground flex items-center justify-center shrink-0"
                                      >
                                        <Download size={15} />
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>

        {readOnly ? (
          <p className="flex items-start gap-2 border-t border-border bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            <Lock size={14} className="shrink-0 mt-0.5" />
            {contractStatus === 'terminated'
              ? t('contracts.thread.readOnlyEnded')
              : contractStatus === 'draft'
                ? t('contracts.thread.readOnlyDraft')
                : t('contracts.thread.readOnly')}
          </p>
        ) : (
          <div className="border-t border-border bg-white p-3 space-y-2">
            {files.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 max-w-full rounded-lg border border-border bg-surface pl-2 pr-1 py-1 text-xs text-foreground"
                  >
                    <Paperclip size={12} className="shrink-0 text-muted" />
                    <span className="truncate max-w-[14rem]">{f.name}</span>
                    <span className="text-muted shrink-0">{formatSize(f.size)}</span>
                    <button
                      type="button"
                      aria-label={`${t('common.delete')}: ${f.name}`}
                      className="w-6 h-6 rounded-md hover:bg-white text-muted hover:text-red-600 flex items-center justify-center shrink-0"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-end gap-2">
              <label
                className="w-10 h-10 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface flex items-center justify-center cursor-pointer shrink-0"
                title={t('contracts.thread.attach')}
              >
                <Paperclip size={16} />
                <span className="sr-only">{t('contracts.thread.attach')}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={busy}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files || []));
                    e.target.value = '';
                  }}
                />
              </label>
              <textarea
                className="input-brand flex-1 min-h-[2.5rem] max-h-40 resize-y"
                rows={1}
                maxLength={5000}
                disabled={busy}
                aria-label={t('contracts.thread.addMessage')}
                placeholder={t('contracts.thread.messagePlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    postMessage();
                  }
                }}
              />
              <button
                type="button"
                className="btn-save h-10 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                disabled={busy || (!text.trim() && files.length === 0)}
                onClick={postMessage}
              >
                <Send size={15} />
                <span className="hidden sm:inline">{t('contracts.thread.send')}</span>
              </button>
            </div>
            <p className="text-xs text-muted">{t('contracts.thread.composerHint')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
