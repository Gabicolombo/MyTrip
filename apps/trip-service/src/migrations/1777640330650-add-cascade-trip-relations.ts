import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeTripRelations1777640330650 implements MigrationInterface {
    name = 'AddCascadeTripRelations1777640330650'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_destinations" DROP CONSTRAINT "FK_67637cbbcc1f5be01a1ec0d7f31"`);
        await queryRunner.query(`ALTER TABLE "trip_participants" DROP CONSTRAINT "FK_68ee3f2d18e20249da9f9ae7956"`);
        await queryRunner.query(`ALTER TABLE "itineraries" DROP CONSTRAINT "FK_87a2c0959b9b90258310335e22a"`);
        await queryRunner.query(`ALTER TABLE "itineraries" ALTER COLUMN "tripDestinationId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "itineraries" ADD CONSTRAINT "FK_87a2c0959b9b90258310335e22a" FOREIGN KEY ("tripDestinationId") REFERENCES "trip_destinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_destinations" ADD CONSTRAINT "FK_67637cbbcc1f5be01a1ec0d7f31" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_participants" ADD CONSTRAINT "FK_68ee3f2d18e20249da9f9ae7956" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_participants" DROP CONSTRAINT "FK_68ee3f2d18e20249da9f9ae7956"`);
        await queryRunner.query(`ALTER TABLE "trip_destinations" DROP CONSTRAINT "FK_67637cbbcc1f5be01a1ec0d7f31"`);
        await queryRunner.query(`ALTER TABLE "itineraries" DROP CONSTRAINT "FK_87a2c0959b9b90258310335e22a"`);
        await queryRunner.query(`ALTER TABLE "itineraries" ALTER COLUMN "tripDestinationId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "itineraries" ADD CONSTRAINT "FK_87a2c0959b9b90258310335e22a" FOREIGN KEY ("tripDestinationId") REFERENCES "trip_destinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_participants" ADD CONSTRAINT "FK_68ee3f2d18e20249da9f9ae7956" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_destinations" ADD CONSTRAINT "FK_67637cbbcc1f5be01a1ec0d7f31" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
