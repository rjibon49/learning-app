'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Notification Queue', description: 'Delivery status, cancellation, retries and reconciliation', endpoint: '/admin/notification-queue', canCreate: false, canEdit: false, fields: [], actions: [{ label: 'Cancel', suffix: 'cancel' }, { label: 'Retry', suffix: 'retry' }] }} />; }
