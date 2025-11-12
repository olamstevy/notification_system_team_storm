import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferenceDto {
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @IsBoolean()
  @IsOptional()
  push?: boolean;
}
