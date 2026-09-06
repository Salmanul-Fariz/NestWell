import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { PasswordVaultService } from './password-vault.service';
import { CreatePasswordEntryDto } from './dto/create-password-entry.dto';
import { UpdatePasswordEntryDto } from './dto/update-password-entry.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RevealPasswordDto } from './dto/reveal-password.dto';

@Controller('vault')
export class PasswordVaultController {
  constructor(private readonly vaultService: PasswordVaultService) {}

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.vaultService.findAll(userId);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePasswordEntryDto,
  ) {
    return this.vaultService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePasswordEntryDto,
  ) {
    return this.vaultService.update(userId, id, dto);
  }

  @Post(':id/reveal')
  reveal(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RevealPasswordDto,
  ) {
    return this.vaultService.reveal(userId, id, dto.expiresInSeconds);
  }

  @Delete(':id')
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.vaultService.remove(userId, id);
  }
}
