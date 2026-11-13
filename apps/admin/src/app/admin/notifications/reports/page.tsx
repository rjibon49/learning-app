'use client';
import { ApiCollectionManager } from '@/components/operations/ApiCollectionManager';
export default function Page(){ return <ApiCollectionManager config={{ title: 'Notification Delivery Reports', description: 'Queue status details; aggregates require dedicated reporting endpoint', endpoint: '/admin/notification-queue', canCreate: false, canEdit: false, fields: [], actions: [] }} />; }
