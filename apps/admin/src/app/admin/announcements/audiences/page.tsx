'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Audience Segments', description: 'Versioned AND/OR targeting; unsupported rules stay disabled', endpoint: '/admin/audiences', canCreate: true, canEdit: true, fields: [{ key: 'segmentKey', label: 'Segment Key', kind: 'text', required: true },
{ key: 'name', label: 'Name', kind: 'text', required: true },
{ key: 'description', label: 'Description', kind: 'textarea', required: false },
{ key: 'rules', label: 'Rules JSON', kind: 'json', required: true }], actions: [{ label: 'Activate', suffix: 'activate' }, { label: 'Deactivate', suffix: 'deactivate' }] }} />; }
