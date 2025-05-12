import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CollectionLikeResponseDto {
  @ApiProperty({ description: 'Collection ID' })
  collectionId: string = '';

  @ApiProperty({ description: 'Customer ID' })
  customerId: string = '';

  @ApiProperty({ example: true, description: 'Whether the collection is liked by the customer' })
  isLiked: boolean = false;

  @ApiProperty({ example: 42, description: 'Total number of likes for the collection' })
  likeCount: number = 0;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'When the collection was liked' })
  createdAt?: Date;
}

export class ToggleCollectionLikeDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Collection ID' })
  @IsUUID()
  collectionId: string = '';
}

export class CollectionLikeStatusDto {
  @ApiProperty({ example: true, description: 'Whether the collection is liked by the customer' })
  isLiked: boolean = false;

  @ApiProperty({ example: 42, description: 'Total number of likes for the collection' })
  likeCount: number = 0;
}
