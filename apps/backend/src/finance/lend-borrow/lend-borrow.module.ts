import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LendBorrow, LendBorrowSchema } from './schemas/lend-borrow.schema';
import { Party, PartySchema } from '../party/schemas/party.schema';
import { LendBorrowService } from './lend-borrow.service';
import { LendBorrowController } from './lend-borrow.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LendBorrow.name, schema: LendBorrowSchema },
      { name: Party.name, schema: PartySchema },
    ]),
  ],
  controllers: [LendBorrowController],
  providers: [LendBorrowService],
  exports: [LendBorrowService],
})
export class LendBorrowModule {}
