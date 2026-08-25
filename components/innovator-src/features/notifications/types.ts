export type NotificationRelatedEntityType = 'idea' | 'project';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: NotificationRelatedEntityType;
  relatedEntityId?: string;
}
