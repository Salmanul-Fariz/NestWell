import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Emi, EmiSchema } from './schemas/emi.schema';
import { EmiService } from './emi.service';
import { EmiController } from './emi.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Emi.name, schema: EmiSchema }]),
  ],
  controllers: [EmiController],
  providers: [EmiService],
  exports: [EmiService],
})
export class EmiModule {}
