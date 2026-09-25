import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '@db/relations';
import { notifications } from '@db/schema';
import type { CreateNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectDrizzle()
    private readonly db: Database,
  ) {}

  async findAll(userId: string) {
    const [rows, [unread]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(50),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
    ]);
    return { data: rows, unread: unread?.count ?? 0, total: rows.length };
  }

  async create(userId: string, dto: CreateNotificationDto) {
    const [created] = await this.db
      .insert(notifications)
      .values({ userId, title: dto.title, body: dto.body, type: dto.type ?? 'info' })
      .returning();
    return created;
  }

  async markRead(id: string, userId: string) {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.readAt) return notification;
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return { success: true };
  }
}
