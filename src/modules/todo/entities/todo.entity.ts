import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Todo {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column({ type: "boolean" })
  isCompleted: boolean;

  @Column({ type: "timestamp with time zone" })
  createdAt: Date;
}
