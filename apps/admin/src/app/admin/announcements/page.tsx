'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Announcements', description: 'Create, translate, target and publish announcements', endpoint: '/admin/announcements', canCreate: true, canEdit: true, fields: [{ key: 'slug', label: 'Slug', kind: 'text', required: true },
{ key: 'kind', label: 'Kind', kind: 'select', options: ['GENERAL','PROMOTION','COURSE_UPDATE','SUBSCRIPTION','MAINTENANCE','SECURITY'], required: true, initial: 'GENERAL' },
{ key: 'purpose', label: 'Purpose', kind: 'select', options: ['MARKETING','TRANSACTIONAL','SYSTEM'], required: true, initial: 'MARKETING' },
{ key: 'priority', label: 'Priority', kind: 'number', required: false, initial: '0' },
{ key: 'isDismissible', label: 'Dismissible', kind: 'checkbox', required: false, initial: 'true' },
{ key: 'startsAt', label: 'Start ISO date', kind: 'text', required: false },
{ key: 'endsAt', label: 'End ISO date', kind: 'text', required: false },
{ key: 'actionType', label: 'Action Type', kind: 'select', options: ['INTERNAL_PATH','EXTERNAL_URL'], required: false },
{ key: 'actionValue', label: 'Action URL / Path', kind: 'text', required: false },
{ key: 'translations', label: 'Translations JSON', kind: 'json', required: true, initial: '[{"locale":"en","title":"Announcement","message":"Message text"}]' },
{ key: 'placements', label: 'Placements JSON', kind: 'json', required: true, initial: '[{"channel":"NOTIFICATION_BELL","placementKey":"home_top","isEnabled":true}]' },
{ key: 'promoCodeIds', label: 'Promo IDs JSON', kind: 'json', required: false, initial: '[]' }], actions: [{ label: 'Publish', suffix: 'publish' }, { label: 'Pause', suffix: 'pause' }, { label: 'Archive', suffix: 'archive' }] }} />; }
