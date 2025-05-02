import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';

export enum ChordType {
  GUITAR = 'guitar',
  PIANO = 'piano',
  UKULELE = 'ukulele',
}

export interface ChordDiagram {
  name: string;
  type: ChordType;
  positions: ChordPosition[];
}

export interface ChordPosition {
  id: string;
  suffix: string;
  position: number;
  data: any; // Specific data for each chord type
}

@Injectable()
export class ChordDiagramService {
  private readonly logger = new Logger(ChordDiagramService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Get chord diagrams for a specific chord and instrument type
   * @param chordName The chord name (e.g., "C", "Dm", "G7")
   * @param type The chord type (guitar, piano, ukulele)
   * @returns An array of chord positions
   */
  async getChordDiagrams(chordName: string, type: ChordType): Promise<ChordPosition[]> {
    const cacheKey = this.cacheService.createKey(
      CachePrefix.CHORD,
      `${chordName.toLowerCase()}_${type}`
    );

    try {
      // Chord diagrams rarely change, so we can use a long TTL
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for chord diagram ${chordName} (${type}), generating...`);

          // In a real implementation, this would fetch from a database or API
          // For now, we'll return mock data
          return this.generateMockChordPositions(chordName, type);
        },
        CacheTTL.EXTRA_LONG // Chord diagrams don't change
      );
    } catch (error: any) {
      this.logger.error(`Error fetching chord diagram for ${chordName} (${type}): ${error.message}`);

      // Fallback to direct generation if cache fails
      return this.generateMockChordPositions(chordName, type);
    }
  }

  /**
   * Generate mock chord positions for demonstration
   * @param chordName The chord name
   * @param type The chord type
   * @returns An array of mock chord positions
   */
  private generateMockChordPositions(chordName: string, type: ChordType): ChordPosition[] {
    // This is just a mock implementation
    // In a real app, you would have actual chord diagrams

    const positions: ChordPosition[] = [];

    // Generate 1-3 positions based on chord name length
    const numPositions = (chordName.length % 3) + 1;

    for (let i = 0; i < numPositions; i++) {
      let data: any;

      if (type === ChordType.GUITAR) {
        data = {
          frets: [i, i+1, i+2, i+2, i+1, i],
          fingers: [1, 2, 3, 4, 2, 1],
          barres: i > 0 ? [{ fromString: 1, toString: 6, fret: i }] : [],
          baseFret: i + 1,
        };
      } else if (type === ChordType.PIANO) {
        data = {
          keys: [i, i+2, i+4, i+7].map(n => n % 12),
          root: i % 12,
        };
      } else if (type === ChordType.UKULELE) {
        data = {
          frets: [i, i+1, i, i+2],
          fingers: [1, 2, 1, 3],
          barres: i > 0 ? [{ fromString: 1, toString: 3, fret: i }] : [],
          baseFret: i + 1,
        };
      }

      positions.push({
        id: `${chordName.toLowerCase()}_${type}_${i}`,
        suffix: i === 0 ? '' : `pos${i+1}`,
        position: i + 1,
        data,
      });
    }

    return positions;
  }

  /**
   * Warm up the chord diagram cache with common chords
   */
  async warmupCache(): Promise<void> {
    this.logger.log('Warming up chord diagram cache...');

    const commonChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B',
                          'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
                          'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7'];

    const types = [ChordType.GUITAR, ChordType.PIANO, ChordType.UKULELE];

    for (const chord of commonChords) {
      for (const type of types) {
        await this.getChordDiagrams(chord, type);
      }
    }

    this.logger.log('Chord diagram cache warmup complete');
  }
}
