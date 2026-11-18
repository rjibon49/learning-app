'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';

// Page already has Activate/Deactivate actions; add Super Admin permanent delete.
const DELETE_CONFIG = { entity: "provider", permanentOnly: true, permanentHelp: "The provider configuration is removed. Templates using it lose the link." };
export default function Page(){ return <ApiCollectionManager config={{ title: 'Notification Providers', description: 'Credentials by environment reference only. Paid providers disabled.', endpoint: '/admin/notification-providers', canCreate: true, canEdit: true, editOmit: ['channel','providerKey'], fields: [{ key: 'channel', label: 'Channel', kind: 'select', options: ['EMAIL','MOBILE_PUSH','WEB_PUSH','WHATSAPP','SMS'], required: true },
{ key: 'providerKey', label: 'Provider Key', kind: 'select', options: ['smtp','firebase_fcm','web_push','meta_whatsapp','generic_sms'], required: true },
{ key: 'displayName', label: 'Display Name', kind: 'text', required: true },
{ key: 'isTestMode', label: 'Test Mode', kind: 'checkbox', required: false, initial: 'true' },
{ key: 'credentialRef', label: 'NOTIFY_ Secret Reference', kind: 'text', required: false },
{ key: 'settings', label: 'Settings JSON (allowed metadata only; never secrets)', kind: 'json', required: false, initial: '{}' }], actions: [{ label: 'Disable', suffix: 'disable' }], delete: DELETE_CONFIG }} />; }
