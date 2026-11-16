'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Subscription Cancellation Requests', description: 'User requests; must be confirmed by payment platform', endpoint: '/admin/billing/cancellations', canCreate: false, canEdit: false, fields: [], actions: [] }} />; }
