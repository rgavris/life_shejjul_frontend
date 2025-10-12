import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Event } from "./Event";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  age!: number;

  @Column({ nullable: true })
  eventId!: number | null;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: "eventId" })
  event!: Event | null;
}
