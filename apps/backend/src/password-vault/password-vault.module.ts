import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordEntry, PasswordEntrySchema } from './schemas/password-entry.schema';
import { PasswordVaultService } from './password-vault.service';
import { PasswordVaultController } from './password-vault.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PasswordEntry.name, schema: PasswordEntrySchema },
    ]),
  ],
  controllers: [PasswordVaultController],
  providers: [PasswordVaultService],
  exports: [PasswordVaultService],
})
export class PasswordVaultModule {}
