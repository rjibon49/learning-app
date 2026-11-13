'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Announcements', description: 'Create, translate, target and publish announcements', endpoint: '/admin/announcements', canCreate: true, canEdit: true, fields: [{ key: 'slug', label: 'Slug', kind: 'text', required: true },
{ key: 'kind', label: 'Kind (GENERAL / PROMOTION / ...)', kind: 'text', required: true },
{ key: 'purpose', label: 'Purpose (SYSTEM / MARKETING)', kind: 'text', required: true },
{ key: 'priority', label: 'Priority', kind: 'number', required: false },
{ key: 'isDismissible', label: 'Dismissible', kind: 'checkbox', required: false },
{ key: 'startsAt', label: 'Start ISO date', kind: 'text', required: false },
{ key: 'endsAt', label: 'End ISO date', kind: 'text', required: false },
{ key: 'actionType', label: 'Action Type', kind: 'text', required: false },
{ key: 'actionValue', label: 'Action URL / Path', kind: 'text', required: false },
{ key: 'translations', label: 'Translations JSON', kind: 'json', required: true },
{ key: 'placements', label: 'Placements JSON', kind: 'json', required: true },
{ key: 'promoCodeIds', label: 'Promo IDs JSON', kind: 'json', required: false }], actions: [{ label: 'Publish', suffix: 'publish' }, { label: 'Pause', suffix: 'pause' }, { label: 'Archive', suffix: 'archive' }] }} />; }
