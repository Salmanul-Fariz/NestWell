import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLendBorrowDto {
  @IsString()
  @IsNotEmpty()
  partyId: string;
}
