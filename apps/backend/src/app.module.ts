import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PasswordVaultModule } from './password-vault/password-vault.module';
import { EventsModule } from './events/events.module';
import { ExpenseModule } from './finance/expense/expense.module';
import { IncomeModule } from './finance/income/income.module';
import { EmiModule } from './finance/emi/emi.module';
import { PartyModule } from './finance/party/party.module';
import { LendBorrowModule } from './finance/lend-borrow/lend-borrow.module';
import { ReportsModule } from './finance/reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGO_URI') ||
          'mongodb://localhost:27017/nestwell?replicaSet=rs0&directConnection=true',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    PasswordVaultModule,
    EventsModule,
    ExpenseModule,
    IncomeModule,
    EmiModule,
    PartyModule,
    LendBorrowModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
