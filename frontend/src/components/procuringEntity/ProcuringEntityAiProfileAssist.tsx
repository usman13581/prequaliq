import type { ReactNode } from 'react';
import { SupplierAiProfileAssist } from '../supplier/SupplierAiProfileAssist';

const ENTITY_FIELD_LABEL_KEYS: Record<string, string> = {
  entityName: 'forms.entityName',
  companyName: 'forms.entityName',
  address: 'forms.address',
  city: 'forms.city',
  country: 'forms.country',
  phone: 'forms.phone',
  firstName: 'forms.firstName',
  lastName: 'forms.lastName',
};

type RootProps = {
  enabled?: boolean;
  onApply: (fields: Record<string, string>) => void;
  onStartEdit?: () => void;
  children: ReactNode;
};

function Root({ enabled = true, onApply, onStartEdit, children }: RootProps) {
  return (
    <SupplierAiProfileAssist.Root
      enabled={enabled}
      suggestEndpoint="/procuring-entity/profile/ai-suggest"
      fieldLabelKeys={ENTITY_FIELD_LABEL_KEYS}
      onApply={onApply}
      onStartEdit={onStartEdit}
    >
      {children}
    </SupplierAiProfileAssist.Root>
  );
}

export const ProcuringEntityAiProfileAssist = {
  Root,
  UploadBar: SupplierAiProfileAssist.UploadBar,
  Drawer: SupplierAiProfileAssist.Drawer,
};
