'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';

// Page already has Activate/Deactivate actions; add Super Admin permanent delete.
const DELETE_CONFIG = { entity: "audience", permanentOnly: true, permanentHelp: "Refused while an announcement still targets this audience — deactivate it instead." };
export default function Page(){ return <ApiCollectionManager config={{ title: 'Audience Segments', description: 'Versioned AND/OR targeting; unsupported rules stay disabled', endpoint: '/admin/audiences', canCreate: true, canEdit: true, editOmit: ['segmentKey'], fields: [{ key: 'segmentKey', label: 'Segment Key', kind: 'text', required: true },
{ key: 'name', label: 'Name', kind: 'text', required: true },
{ key: 'description', label: 'Description', kind: 'textarea', required: false },
{ key: 'rules', label: 'Rules JSON (version 1, ALL/ANY, conditions)', kind: 'json', required: true, initial: '{"version":1,"operator":"ALL","conditions":[{"field":"platform","operator":"EQ","value":"WEB"}]}' }], actions: [{ label: 'Activate', suffix: 'activate' }, { label: 'Deactivate', suffix: 'deactivate' }], delete: DELETE_CONFIG }} />; }
