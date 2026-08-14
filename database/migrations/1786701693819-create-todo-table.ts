import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTodoTable1786701693819 implements MigrationInterface {
  name = "CreateTodoTable1786701693819";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "todo" ("id" character varying NOT NULL, "title" character varying NOT NULL, "isCompleted" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_d429b7114371f6a35c5cb4776a7" PRIMARY KEY ("id"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "todo"`);
  }
}
