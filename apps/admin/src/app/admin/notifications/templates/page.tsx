'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Notification Templates', description: 'Localized, parameterized templates and previews', endpoint: '/admin/notification-templates', canCreate: true, canEdit: true, fields: [{ key: 'templateKey', label: 'Template Key', kind: 'text', required: true },
{ key: 'channel', label: 'Channel', kind: 'text', required: true },
{ key: 'purpose', label: 'Purpose', kind: 'text', required: true },
{ key: 'providerConfigId', label: 'Provider Config ID', kind: 'text', required: false },
{ key: 'providerTemplateId', label: 'Provider Template ID', kind: 'text', required: false },
{ key: 'parameters', label: 'Parameters JSON', kind: 'json', required: true },
{ key: 'translations', label: 'Translations JSON', kind: 'json', required: true }], actions: [{ label: 'Activate', suffix: 'activate' }, { label: 'Deactivate', suffix: 'deactivate' }] }} />; }
