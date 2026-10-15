import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Paperclip, Send } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';
import { DateOnlyPicker } from '../DateOnlyPicker';

export type ComplementAttachment = {
  id: string;
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
};

export type ComplementHistoryMessage = {
  id: string;
  authorRole: string;
  body: string;
  createdAt?: string;
  attachments?: ComplementAttachment[];
  author?: { firstName?: string; lastName?: string } | null;
};

export type ComplementThread = {
  id: string;
  status: string;
  message?: string;
  responseText?: string | null;
  deadline?: string | null;
  supplier?: { id: string; companyName?: string } | null;
  procedure?: { id: string; title?: string } | null;
  messages?: ComplementHistoryMessage[];
  history?: ComplementHistoryMessage[];
  createdAt?: string;
};

type Props = {
  mode: 'buyer' | 'supplier';
  complements: ComplementThread[];
  /** Buyer: create new request */
  onCreateRequest?: (payload: {
    supplierId: string;
    message: string;
    deadline: string;
    files: File[];
  }) => Promise<void>;
  suppliers?: Array<{ id: string; companyName: string }>;
  /** Reply / follow-up on a thread */
  onReply: (complementId: string, message: string, files: File[]) => Promise<void>;
  disabled?: boolean;
};

function formatWhen(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
}

async function downloadAttachment(id: string, fileName: string) {
  const res = await api.get(`/procedures/complements/attachments/${id}/download`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function FilePicker({
  files,
  onChange,
  disabled
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted cursor-pointer">
        <Paperclip className="w-3.5 h-3.5" />
        {t('procedures.complementAttach')}
        <input
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            const list = Array.from(e.target.files || []);
            onChange([...files, ...list]);
            e.target.value = '';
          }}
        />
      </label>
      {files.length > 0 ? (
        <ul className="text-xs text-foreground space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 border border-border">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="btn-delete px-2 py-1 rounded-lg text-xs font-semibold shrink-0"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              >
                {t('common.delete')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ComplementHistoryThread({
  mode,
  complements,
  onCreateRequest,
  suppliers = [],
  onReply,
  disabled = false
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [composerById, setComposerById] = useState<Record<string, { text: string; files: File[] }>>({});
  const [newReq, setNewReq] = useState({ supplierId: '', message: '', deadline: '', files: [] as File[] });
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...complements].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [complements]
  );

  const getHistory = (c: ComplementThread) => {
    const msgs = c.history || c.messages || [];
    if (msgs.length) return msgs;
    const legacy: ComplementHistoryMessage[] = [];
    if (c.message) {
      legacy.push({
        id: `${c.id}-req`,
        authorRole: 'procuring_entity',
        body: c.message,
        createdAt: c.createdAt,
        attachments: []
      });
    }
    if (c.responseText) {
      legacy.push({
        id: `${c.id}-res`,
        authorRole: 'supplier',
        body: c.responseText,
        attachments: []
      });
    }
    return legacy;
  };

  const setComposer = (id: string, patch: Partial<{ text: string; files: File[] }>) => {
    setComposerById((prev) => ({
      ...prev,
      [id]: { text: prev[id]?.text || '', files: prev[id]?.files || [], ...patch }
    }));
  };

  const handleDownload = async (att: ComplementAttachment) => {
    try {
      await downloadAttachment(att.id, att.fileName);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {mode === 'buyer' && onCreateRequest ? (
        <div className="rounded-xl border border-border bg-slate-50/70 p-3 space-y-2">
          <p className="text-sm font-bold text-foreground">{t('procedures.requestComplement')}</p>
          <select
            className="input-brand"
            value={newReq.supplierId}
            disabled={disabled || busy}
            onChange={(e) => setNewReq({ ...newReq, supplierId: e.target.value })}
          >
            <option value="">{t('procedures.selectSupplier')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>
          <textarea
            className="input-brand"
            rows={3}
            placeholder={t('procedures.complementMessage')}
            value={newReq.message}
            disabled={disabled || busy}
            onChange={(e) => setNewReq({ ...newReq, message: e.target.value })}
          />
          <DateOnlyPicker
            className="input-brand w-full"
            value={newReq.deadline}
            disabled={disabled || busy}
            onChange={(deadline) => setNewReq({ ...newReq, deadline })}
          />
          <FilePicker
            files={newReq.files}
            disabled={disabled || busy}
            onChange={(files) => setNewReq({ ...newReq, files })}
          />
          <button
            type="button"
            className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
            disabled={disabled || busy || !newReq.supplierId || !newReq.message.trim()}
            onClick={async () => {
              try {
                setBusy(true);
                await onCreateRequest({
                  supplierId: newReq.supplierId,
                  message: newReq.message.trim(),
                  deadline: newReq.deadline,
                  files: newReq.files
                });
                setNewReq({ supplierId: '', message: '', deadline: '', files: [] });
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send className="w-4 h-4" />
            {t('procedures.requestComplement')}
          </button>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">{t('procedures.complementsEmpty')}</p>
      ) : (
        sorted.map((c) => {
          const history = getHistory(c);
          const composer = composerById[c.id] || { text: '', files: [] };
          return (
            <div key={c.id} className="rounded-xl border border-border overflow-hidden bg-white">
              <div className="px-3 py-2 border-b border-border bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {mode === 'buyer'
                      ? c.supplier?.companyName || t('procedures.qaSupplier')
                      : c.procedure?.title || t('procedures.tabs.complements')}
                  </p>
                  {c.deadline ? (
                    <p className="text-xs text-muted">
                      {t('procedures.complementDeadline')}: {c.deadline}
                    </p>
                  ) : null}
                </div>
                <StatusBadge tone={c.status === 'responded' ? 'green' : c.status === 'closed' ? 'gray' : 'yellow'}>
                  {c.status === 'responded'
                    ? t('procedures.complementStatusResponded')
                    : c.status === 'closed'
                      ? t('procedures.complementStatusClosed')
                      : t('procedures.complementStatusOpen')}
                </StatusBadge>
              </div>

              <div className="px-3 py-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  {t('procedures.complementHistory')}
                </p>
                {history.map((m, idx) => {
                  const isBuyer = m.authorRole === 'procuring_entity';
                  return (
                    <div key={m.id} className="relative pl-4 border-l-2 border-slate-200">
                      <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400" />
                      <div className="rounded-lg border border-border bg-slate-50/80 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold uppercase text-muted">
                            {isBuyer ? t('procedures.qaBuyer') : t('procedures.qaSupplier')}
                            <span className="normal-case font-normal text-muted"> · {t('procedures.complementEntry', { n: idx + 1 })}</span>
                          </p>
                          <span className="text-xs text-muted">{formatWhen(m.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{m.body}</p>
                        {(m.attachments || []).length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {(m.attachments || []).map((att) => (
                              <li key={att.id}>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(att)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {att.fileName}
                                  <Download className="w-3 h-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-3 py-3 border-t border-border bg-white space-y-2">
                <p className="text-xs font-semibold text-foreground">{t('procedures.complementAddEntry')}</p>
                <textarea
                  className="input-brand"
                  rows={2}
                  disabled={disabled || busy}
                  placeholder={t('procedures.complementReply')}
                  value={composer.text}
                  onChange={(e) => setComposer(c.id, { text: e.target.value })}
                />
                <FilePicker
                  files={composer.files}
                  disabled={disabled || busy}
                  onChange={(files) => setComposer(c.id, { files })}
                />
                <button
                  type="button"
                  className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
                  disabled={disabled || busy || (!composer.text.trim() && composer.files.length === 0)}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      await onReply(c.id, composer.text.trim(), composer.files);
                      setComposer(c.id, { text: '', files: [] });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {t('procedures.complementSendEntry')}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
