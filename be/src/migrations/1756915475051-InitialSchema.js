/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class InitialSchema1756915475051 {
    name = 'InitialSchema1756915475051'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "templates" ("key" character varying NOT NULL, "branchId" character varying NOT NULL, "departmentId" character varying NOT NULL, "positionId" character varying NOT NULL, "headers" jsonb NOT NULL, "rows" jsonb NOT NULL, "sourceFile" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_526cbcc4e041988e65aec63bfb2" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE INDEX "idx_templates_bdp" ON "templates" ("branchId", "departmentId", "positionId") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."idx_templates_bdp"`);
        await queryRunner.query(`DROP TABLE "templates"`);
    }
}
