import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor, IsBoolean } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'Worship', description: 'Tag name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'Songs suitable for worship services', description: 'Tag description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '#FF5733', description: 'Hex color code for UI display', required: false })
  @IsString()
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to songs', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  forSongs?: boolean = true;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to artists', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  forArtists?: boolean = true;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to collections', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  forCollections?: boolean = true;
}

export class UpdateTagDto {
  @ApiProperty({ example: 'Worship', description: 'Tag name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Songs suitable for worship services', description: 'Tag description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '#FF5733', description: 'Hex color code for UI display', required: false })
  @IsString()
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to songs', required: false })
  @IsBoolean()
  @IsOptional()
  forSongs?: boolean;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to artists', required: false })
  @IsBoolean()
  @IsOptional()
  forArtists?: boolean;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to collections', required: false })
  @IsBoolean()
  @IsOptional()
  forCollections?: boolean;
}

export class TagResponseDto {
  @ApiProperty({ description: 'Tag ID' })
  id: string = '';

  @ApiProperty({ example: 'Worship', description: 'Tag name' })
  name: string = '';

  @ApiProperty({ example: 'Songs suitable for worship services', description: 'Tag description' })
  description?: string;

  @ApiProperty({ example: '#FF5733', description: 'Hex color code for UI display' })
  color?: string;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to songs' })
  forSongs?: boolean = true;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to artists' })
  forArtists?: boolean = true;

  @ApiProperty({ example: true, description: 'Whether this tag can be applied to collections' })
  forCollections?: boolean = true;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();
}

export class SongTagDto {
  @ApiProperty({ description: 'Song ID' })
  songId: string = '';

  @ApiProperty({ description: 'Tag ID' })
  tagId: string = '';
}

export class ArtistTagDto {
  @ApiProperty({ description: 'Artist ID' })
  artistId: string = '';

  @ApiProperty({ description: 'Tag ID' })
  tagId: string = '';
}

export class CollectionTagDto {
  @ApiProperty({ description: 'Collection ID' })
  collectionId: string = '';

  @ApiProperty({ description: 'Tag ID' })
  tagId: string = '';
}

export class EntityTagsResponseDto {
  @ApiProperty({ description: 'Entity ID (Song, Artist, or Collection)' })
  entityId: string = '';

  @ApiProperty({ description: 'Entity type', enum: ['song', 'artist', 'collection'] })
  entityType: 'song' | 'artist' | 'collection' = 'song';

  @ApiProperty({ description: 'Tags associated with the entity', type: [TagResponseDto] })
  tags: TagResponseDto[] = [];
}
