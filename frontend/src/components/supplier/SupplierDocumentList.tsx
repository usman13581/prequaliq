import { useState } from 'react';
import { FileText, Trash2, Calendar, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DateOnlyPicker } from '../DateOnlyPicker';

export type SupplierDoc = {
  id: string;
  fileName: string;
  filePath: string;
  validTo?: string | null;
  validFrom?: string | null;
  issuer?: string | null;
  documentNumber?: string | null;
  isActive?: boolean;
};

export type DocumentMetadata = {
  validFrom?: string;
  validTo?: string;
  issuer?: string;
  documentNumber?: string;
};

export function getDocumentExpiryStatus(doc: SupplierDoc): 'valid' | 'expiring_soon' | 'expired' | 'unknown' {
  if (!doc.validTo) return 'unknown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(doc.validTo);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'expiring_soon';
  return 'valid';
}

function splitDate(value?: string | null) {
  return value ? String(value).split('T')[0] : '';
}

export function SupplierDocumentList({
  documents,
  getDocumentUrl,
  onDelete,
  onUpdateMetadata,
  showDelete = true
}: {
  documents: SupplierDoc[];
  getDocumentUrl: (d: SupplierDoc) => string;
  onDelete: (id: string) => void;
  onUpdateMetadata?: (id: string, metadata: DocumentMetadata) => void;
  showDelete?: boolean;
}) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DocumentMetadata>>({});

  if (!documents.length) return null;

  const badgeClass: Record<string, string> = {
    valid: 'bg-green-100 text-green-700',
    expiring_soon: 'bg-amber-100 text-amber-800',
    expired: 'bg-red-100 text-red-700',
    unknown: 'bg-gray-100 text-gray-600'
  };
  const badgeLabel: Record<string, string> = {
    valid: t('supplierPortal.docValid'),
    expiring_soon: t('supplierPortal.docExpiring'),
    expired: t('supplierPortal.docExpired'),
    unknown: ''
  };

  const getDraft = (doc: SupplierDoc): DocumentMetadata => drafts[doc.id] ?? {
    validFrom: splitDate(doc.validFrom),
    validTo: splitDate(doc.validTo),
    issuer: doc.issuer || '',
    documentNumber: doc.documentNumber || ''
  };

  const setDraftField = (id: string, doc: SupplierDoc, patch: Partial<DocumentMetadata>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        validFrom: splitDate(doc.validFrom),
        validTo: splitDate(doc.validTo),
        issuer: doc.issuer || '',
        documentNumber: doc.documentNumber || '',
        ...prev[id],
        ...patch
      }
    }));
  };

  const saveMetadata = async (doc: SupplierDoc) => {
    if (!onUpdateMetadata) return;
    const draft = getDraft(doc);
    await onUpdateMetadata(doc.id, {
      validFrom: draft.validFrom || undefined,
      validTo: draft.validTo || undefined,
      issuer: draft.issuer?.trim() || undefined,
      documentNumber: draft.documentNumber?.trim() || undefined
    });
    setExpandedId(null);
  };

  return (
    <ul className="mt-2 space-y-2">
      {documents.map((doc) => {
        const status = getDocumentExpiryStatus(doc);
        const draft = getDraft(doc);
        const expanded = expandedId === doc.id;

        return (
          <li key={doc.id} className="py-2 px-3 bg-gray-50 rounded-lg border border-border">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <a
                href={getDocumentUrl(doc)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary-600 hover:underline truncate flex-1 min-w-0"
              >
                <FileText size={14} />
                {doc.fileName}
              </a>
              {status !== 'unknown' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeClass[status]}`}>
                  {badgeLabel[status]}
                </span>
              )}
              {doc.validTo && (
                <span className="text-xs text-muted flex items-center gap-1 shrink-0">
                  <Calendar size={12} />
                  {new Date(doc.validTo).toLocaleDateString()}
                </span>
              )}
              {onUpdateMetadata && (
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : doc.id)}
                  className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {t('supplierPortal.editMetadata')}
                </button>
              )}
              {showDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0"
                  title={t('common.delete')}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {expanded && onUpdateMetadata && (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">{t('supplierPortal.validFrom')}</label>
                  <DateOnlyPicker
                    value={draft.validFrom || ''}
                    onChange={(v) => setDraftField(doc.id, doc, { validFrom: v })}
                    placeholder={t('supplierPortal.validFrom')}
                    className="text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{t('supplierPortal.validTo')}</label>
                  <DateOnlyPicker
                    value={draft.validTo || ''}
                    onChange={(v) => setDraftField(doc.id, doc, { validTo: v })}
                    placeholder={t('supplierPortal.validTo')}
                    className="text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{t('supplierPortal.documentIssuer')}</label>
                  <input
                    className="input-brand text-sm py-2"
                    value={draft.issuer || ''}
                    onChange={(e) => setDraftField(doc.id, doc, { issuer: e.target.value })}
                    placeholder={t('supplierPortal.documentIssuer')}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{t('supplierPortal.documentNumber')}</label>
                  <input
                    className="input-brand text-sm py-2"
                    value={draft.documentNumber || ''}
                    onChange={(e) => setDraftField(doc.id, doc, { documentNumber: e.target.value })}
                    placeholder={t('supplierPortal.documentNumber')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => saveMetadata(doc)}
                    className="btn-save inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
                  >
                    <Save size={14} />
                    {t('supplierPortal.saveMetadata')}
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
