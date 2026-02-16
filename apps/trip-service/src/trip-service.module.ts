import { Module } from '@nestjs/common';
import { TripServiceController } from './trip-service.controller';
import { TripServiceService } from './trip-service.service';
import { DatabaseModule } from 'y/database/database.module';
import { TripsModule } from './trips/trips.module';
import { UploadModule } from './upload/upload.module';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/trip-service/.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/trip-service/src/schema.gql'),
      playground: true,
      sortSchema: true,
      context: ({ req }) => ({ req }),
    }),
    DatabaseModule,
    TripsModule,
    UploadModule,
  ],
  controllers: [TripServiceController],
  providers: [TripServiceService],
})
export class TripServiceModule {}
