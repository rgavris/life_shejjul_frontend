/* import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Unique,
} from "typeorm";
import { Event } from "./Event";
import { Contact } from "./Contact";

export enum RSVPStatus {
  PENDING = "pending",
  ATTENDING = "attending",
  MAYBE = "maybe",
  DECLINED = "declined",
}

@Entity()
@Unique(["eventId", "contactId"])
export class EventInvitation {
  @PrimaryColumn()
  eventId!: number;

  @ManyToOne(() => Event, { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @PrimaryColumn()
  contactId!: number;

  @ManyToOne(() => Contact, { onDelete: "CASCADE" })
  @JoinColumn({ name: "contactId" })
  contact!: Contact;

  @Column({
    type: "enum",
    enum: RSVPStatus,
    default: RSVPStatus.PENDING,
  })
  rsvpStatus!: RSVPStatus;

  @Column({ type: "timestamp", nullable: true })
  respondedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  responseNote!: string | null;

  @Column({ type: "boolean", default: false })
  isManualResponse!: boolean;
} */


import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Unique } from "typeorm";

import { Contact } from "./Contact";
import { Event } from "./Event";
export enum RSVPStatus {
  PENDING = "pending",
  ATTENDING = "attending",
  MAYBE = "maybe",
  DECLINED = "declined",
}

@Entity()
@Unique(["eventId", "contactId"])
export class EventInvitation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  eventId!: number;

  @ManyToOne(() => Event, { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @Column()
  @Index()
  contactId!: number;

  @ManyToOne(() => Contact, { onDelete: "CASCADE" })
  @JoinColumn({ name: "contactId" })
  contact!: Contact;

  @Column({ type: "enum", enum: RSVPStatus, default: RSVPStatus.PENDING })
  rsvpStatus!: RSVPStatus;

  @Column({ type: "timestamp", nullable: true })
  respondedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  responseNote!: string | null;

  @Column({ type: "boolean", default: false })
  isManualResponse!: boolean;
}