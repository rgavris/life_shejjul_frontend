import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Contact } from "./Contact";
import { User } from "./User";

@Entity()
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  address!: string;

  @Column()
  time!: Date;

  @Column()
  userId!: number;

  @ManyToOne(() => User, (user) => user.events)
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ nullable: true })
  contactId!: number | null;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: "contactId" })
  contact!: Contact | null;
}
