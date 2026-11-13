'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Notification Providers', description: 'Credentials by environment reference only. Paid providers disabled.', endpoint: '/admin/notification-providers', canCreate: true, canEdit: true, fields: [{ key: 'channel', label: 'Channel', kind: 'text', required: true },
{ key: 'providerKey', label: 'Provider Key', kind: 'text', required: true },
{ key: 'displayName', label: 'Display Name', kind: 'text', required: true },
{ key: 'isTestMode', label: 'Test Mode', kind: 'checkbox', required: false },
{ key: 'credentialRef', label: 'NOTIFY_ Secret Reference', kind: 'text', required: false },
{ key: 'settings', label: 'Settings JSON', kind: 'json', required: false }], actions: [{ label: 'Disable', suffix: 'disable' }] }} />; }
