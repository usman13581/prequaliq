import { FileText, Trash2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DateOnlyPicker } from '../DateOnlyPicker';

export type SupplierDoc = {
  id: string;
  fileName: string;
  filePath: string;
  validTo?: string | null;
  validFrom?: string | null;
  isActive?: boolean;
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

export function SupplierDocumentList({
  documents,
  getDocumentUrl,
  onDelete,
  onUpdateValidTo,
  showDelete = true
}: {
  documents: SupplierDoc[];
  getDocumentUrl: (d: SupplierDoc) => string;
  onDelete: (id: string) => void;
  onUpdateValidTo?: (id: string, validTo: string) => void;
  showDelete?: boolean;
}) {
  const { t } = useTranslation();
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

  return (
    <ul className="mt-2 space-y-2">
      {documents.map((doc) => {
        const status = getDocumentExpiryStatus(doc);
        return (
          <li key={doc.id} className="flex items-center justify-between gap-2 py-2 px-3 bg-gray-50 rounded-lg flex-wrap">
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
            {onUpdateValidTo && (
              <div className="shrink-0 w-[10.5rem]">
                <DateOnlyPicker
                  value={doc.validTo ? String(doc.validTo).split('T')[0] : ''}
                  onChange={(validTo) => {
                    if (validTo) onUpdateValidTo(doc.id, validTo);
                  }}
                  placeholder={t('supplierPortal.validTo')}
                  className="text-xs px-2 py-1.5"
                />
              </div>
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
          </li>
        );
      })}
    </ul>
  );
}
