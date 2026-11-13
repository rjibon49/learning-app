'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Consent Policies', description: 'Publish versioned policies; do not overwrite previously accepted content', endpoint: '/admin/consent/policies', canCreate: true, canEdit: true, fields: [{ key: 'version', label: 'Version', kind: 'text', required: true },
{ key: 'title', label: 'Title', kind: 'text', required: true },
{ key: 'documentUrl', label: 'Published HTTPS URL', kind: 'text', required: true },
{ key: 'contentHash', label: 'SHA256 Hash', kind: 'text', required: true },
{ key: 'effectiveAt', label: 'Effective ISO date', kind: 'text', required: false }], actions: [{ label: 'Activate', suffix: 'activate' }, { label: 'Deactivate', suffix: 'deactivate' }] }} />; }
