import { Repository, DataSource, LessThan, MoreThan } from "typeorm";
import {
  EventReminder,
  ReminderStatus,
  ReminderType,
  ReminderRecipient,
} from "../entities/EventReminder";

export class EventReminderService {
  private reminderRepository: Repository<EventReminder>;

  constructor(dataSource: DataSource) {
    this.reminderRepository = dataSource.getRepository(EventReminder);
  }

  async create(
    reminderData: Partial<EventReminder>
  ): Promise<EventReminder> {
    const reminder = this.reminderRepository.create(reminderData);
    return await this.reminderRepository.save(reminder);
  }

  async findById(id: number): Promise<EventReminder | null> {
    return await this.reminderRepository.findOne({
      where: { id },
      relations: ["event", "user"],
    });
  }

  async findByEventId(eventId: number): Promise<EventReminder[]> {
    return await this.reminderRepository.find({
      where: { eventId },
      relations: ["event"],
      order: { reminderTime: "ASC" },
    });
  }

  async findByUserId(userId: number): Promise<EventReminder[]> {
    return await this.reminderRepository.find({
      where: { userId },
      relations: ["event"],
      order: { reminderTime: "ASC" },
    });
  }

  async findPendingReminders(
    beforeTime?: Date
  ): Promise<EventReminder[]> {
    const query: any = {
      status: ReminderStatus.PENDING,
    };

    if (beforeTime) {
      query.reminderTime = LessThan(beforeTime);
    }

    return await this.reminderRepository.find({
      where: query,
      relations: ["event", "user"],
      order: { reminderTime: "ASC" },
    });
  }

  async findUpcomingReminders(
    userId: number,
    daysAhead: number = 30
  ): Promise<EventReminder[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    return await this.reminderRepository.find({
      where: {
        userId,
        status: ReminderStatus.PENDING,
        reminderTime: MoreThan(now),
      },
      relations: ["event"],
      order: { reminderTime: "ASC" },
    });
  }

  async update(
    id: number,
    reminderData: Partial<EventReminder>
  ): Promise<EventReminder | null> {
    await this.reminderRepository.update(id, reminderData);
    return await this.findById(id);
  }

  async markAsSent(id: number): Promise<EventReminder | null> {
    return await this.update(id, {
      status: ReminderStatus.SENT,
      sentAt: new Date(),
    });
  }

  async markAsFailed(
    id: number,
    errorMessage: string
  ): Promise<EventReminder | null> {
    return await this.update(id, {
      status: ReminderStatus.FAILED,
      errorMessage,
    });
  }

  async cancel(id: number): Promise<EventReminder | null> {
    return await this.update(id, {
      status: ReminderStatus.CANCELLED,
    });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.reminderRepository.delete(id);
    return result.affected !== 0;
  }

  async createMultipleReminders(
    eventId: number,
    userId: number,
    eventTime: Date,
    reminderTypes: ReminderType[] = [ReminderType.EMAIL],
    recipientType: ReminderRecipient = ReminderRecipient.ALL_INVITEES
  ): Promise<EventReminder[]> {
    const reminders: EventReminder[] = [];

    // Common reminder times before the event
    const reminderOffsets = [
      { days: 7, label: "1 week before" },
      { days: 1, label: "1 day before" },
      { hours: 2, label: "2 hours before" },
    ];

    for (const offset of reminderOffsets) {
      for (const type of reminderTypes) {
        const reminderTime = new Date(eventTime);

        if (offset.days) {
          reminderTime.setDate(reminderTime.getDate() - offset.days);
        } else if (offset.hours) {
          reminderTime.setHours(reminderTime.getHours() - offset.hours);
        }

        // Only create reminders for future times
        if (reminderTime > new Date()) {
          const reminder = await this.create({
            eventId,
            userId,
            reminderTime,
            reminderType: type,
            status: ReminderStatus.PENDING,
            recipientType,
            customMessage: null,
            sentAt: null,
            errorMessage: null,
          });
          reminders.push(reminder);
        }
      }
    }

    return reminders;
  }

  async getReminderStats(
    userId: number
  ): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
  }> {
    const reminders = await this.findByUserId(userId);

    return {
      total: reminders.length,
      pending: reminders.filter((r) => r.status === ReminderStatus.PENDING)
        .length,
      sent: reminders.filter((r) => r.status === ReminderStatus.SENT).length,
      failed: reminders.filter((r) => r.status === ReminderStatus.FAILED)
        .length,
      cancelled: reminders.filter(
        (r) => r.status === ReminderStatus.CANCELLED
      ).length,
    };
  }
}

