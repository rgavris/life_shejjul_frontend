import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Contact {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  email!: string;

  // TODO: add validation when we write CRUD
  @Column()
  phoneNumber!: string;
}
