import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ChordDiagramService, ChordType, ChordPosition } from '../../services/chord-diagram.service';

@ApiTags('chord-diagrams')
@Controller('chord-diagrams')
export class ChordDiagramController {
  private readonly logger = new Logger(ChordDiagramController.name);

  constructor(private readonly chordDiagramService: ChordDiagramService) {}

  @Get(':chord')
  @ApiOperation({ summary: 'Get chord diagrams for a specific chord' })
  @ApiParam({ name: 'chord', description: 'The chord name (e.g., C, Dm, G7)' })
  @ApiQuery({
    name: 'type',
    description: 'The chord type (guitar, piano, ukulele)',
    enum: ChordType,
    required: false,
    example: ChordType.GUITAR,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns chord diagrams for the specified chord',
  })
  async getChordDiagrams(
    @Param('chord') chord: string,
    @Query('type') type: ChordType = ChordType.GUITAR,
  ): Promise<ChordPosition[]> {
    this.logger.debug(`Getting chord diagrams for ${chord} (${type})`);
    return this.chordDiagramService.getChordDiagrams(chord, type);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all available chord types' })
  @ApiResponse({
    status: 200,
    description: 'Returns all available chord types',
  })
  getChordTypes(): { types: string[] } {
    return {
      types: Object.values(ChordType),
    };
  }
}
