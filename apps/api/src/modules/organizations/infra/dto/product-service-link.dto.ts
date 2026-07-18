import { IsString } from 'class-validator';

export class ProductServiceLinkDto {
  @IsString()
  productServiceId: string;
}
