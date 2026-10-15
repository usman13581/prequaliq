import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Paperclip, Send } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';

export type ContractThreadMessage = {
  id: string;
  senderRole: string;
  body: string;
  createdAt?: string;
  attachments?: Array<{ id: string; fileName: string; size?: number | null }>;
  sender?: { firstName?: string; lastName?: string } | null;
};

type Props = {
  contractId: string;
  messages: ContractThreadMessage[];
  deliveryStatus: string;
  mode: 'buyer' | 'supplier';
  readOnly?: boolean;
  onUpdated: () => void;
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
  const res = await api.get(`/contracts/attachments/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
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
  onUpdated
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [changeMessage, setChangeMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const postMessage = async () => {
    if (!text.trim() && files.length === 0) return;
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append('body', text.trim() || '');
      files.forEach((f) => fd.append('files', f));
      await api.post(`/contracts/${contractId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setText('');
      setFiles([]);
      onUpdated();
      showToast(t('contracts.thread.messageSent'), 'success');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('msg.failedSave');
      showToast(message, 'error');
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
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('msg.failedSave');
      showToast(message, 'error');
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

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">{t('contracts.thread.title')}</p>
        <StatusBadge tone={deliveryTone}>
          {t(DELIVERY_LABEL[deliveryStatus] || 'contracts.delivery.none')}
        </StatusBadge>
      </div>

      {readOnly ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t('contracts.thread.readOnly')}
        </p>
      ) : null}

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">{t('contracts.thread.empty')}</p>
        ) : (
          messages.map((m, idx) => {
            const isBuyer = m.senderRole === 'procuring_entity';
            return (
              <div key={m.id} className="relative pl-4 border-l-2 border-slate-200">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400" />
                <div className="rounded-lg border border-border bg-slate-50/80 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold uppercase text-muted">
                      {isBuyer ? t('contracts.thread.buyer') : t('contracts.thread.supplier')}
                      <span className="normal-case font-normal text-muted">
                        {' '}
                        · {t('contracts.thread.entry', { n: idx + 1 })}
                      </span>
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
                            onClick={async () => {
                              try {
                                await downloadAttachment(att.id, att.fileName);
                              } catch (error: unknown) {
                                const message =
                                  (error as { response?: { data?: { message?: string } } })?.response
                                    ?.data?.message || t('msg.failedSave');
                                showToast(message, 'error');
                              }
                            }}
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
          })
        )}
      </div>

      {!readOnly ? (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">{t('contracts.thread.addMessage')}</p>
            <textarea
              className="input-brand"
              rows={2}
              disabled={busy}
              placeholder={t('contracts.thread.messagePlaceholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" />
              {t('contracts.thread.attach')}
              <input
                type="file"
                multiple
                className="hidden"
                disabled={busy}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const list = Array.from(e.target.files || []);
                  setFiles([...files, ...list]);
                  e.target.value = '';
                }}
              />
            </label>
            {files.length > 0 ? (
              <ul className="text-xs text-foreground space-y-1">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 border border-border"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      className="btn-delete px-2 py-1 rounded-lg text-xs font-semibold shrink-0"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    >
                      {t('common.delete')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              disabled={busy || (!text.trim() && files.length === 0)}
              onClick={postMessage}
            >
              <Send className="w-3.5 h-3.5" />
              {t('contracts.thread.send')}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {mode === 'supplier' &&
            (deliveryStatus === 'none' || deliveryStatus === 'changes_requested') ? (
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
            {mode === 'buyer' && deliveryStatus === 'marked_done' ? (
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
            {mode === 'buyer' && deliveryStatus === 'accepted' ? (
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
        </>
      ) : null}
    </div>
  );
}
