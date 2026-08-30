import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { PartyService } from './party.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('party')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.partyService.findAll(userId);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePartyDto,
  ) {
    return this.partyService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.partyService.update(userId, id, dto);
  }
}
