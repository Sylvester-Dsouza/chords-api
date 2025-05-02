import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChordDiagramController } from '../controllers/song/chord-diagram.controller';
import { ChordDiagramService } from '../services/chord-diagram.service';
import { CacheService } from '../services/cache.service';
import { RedisService } from '../services/redis.service';

@Module({
  imports: [ConfigModule],
  controllers: [ChordDiagramController],
  providers: [ChordDiagramService, CacheService, RedisService],
  exports: [ChordDiagramService],
})
export class ChordDiagramModule {}
