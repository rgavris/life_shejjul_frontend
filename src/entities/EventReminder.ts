import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Event } from "./Event";
import { User } from "./User";

export enum ReminderType {
  EMAIL = "email",
  SMS = "sms",
  NOTIFICATION = "notification",
}

export enum ReminderStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum ReminderRecipient {
  ALL_INVITEES = "all_invitees",
  ATTENDING_ONLY = "attending_only",
  CREATOR_ONLY = "creator_only",
}

@Entity()
export class EventReminder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  eventId!: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @Column()
  userId!: number; // Creator of the reminder

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "timestamp" })
  reminderTime!: Date; // When to send the reminder

  @Column({
    type: "enum",
    enum: ReminderType,
    default: ReminderType.EMAIL,
  })
  reminderType!: ReminderType;

  @Column({
    type: "enum",
    enum: ReminderStatus,
    default: ReminderStatus.PENDING,
  })
  status!: ReminderStatus;

  @Column({
    type: "enum",
    enum: ReminderRecipient,
    default: ReminderRecipient.ALL_INVITEES,
  })
  recipientType!: ReminderRecipient;

  @Column({ type: "text", nullable: true })
  customMessage!: string | null; // Optional custom reminder message

  @Column({ type: "timestamp", nullable: true })
  sentAt!: Date | null; // When the reminder was actually sent

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null; // Error message if failed

  @CreateDateColumn()
  createdAt!: Date;
}

