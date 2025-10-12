import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Contact } from "./Contact";

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

  @Column({ nullable: true })
  contactId!: number | null;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: "contactId" })
  contact!: Contact | null;
}
