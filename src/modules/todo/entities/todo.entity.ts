import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Todo {
  @PrimaryColumn({ type: "varchar" })
  id: string;

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "boolean" })
  isCompleted: boolean;

  @Column({ type: "timestamp with time zone" })
  createdAt: Date;
}
