import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BannerItem } from './banner-item.model';

export enum SectionType {
  COLLECTIONS = 'collections',
  SONGS = 'songs',
  ARTISTS = 'artists',
  BANNER = 'banner'
}

@Entity('home_sections')
export class HomeSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  title: string;

  @Column({
    type: 'enum',
    enum: SectionType,
    default: SectionType.COLLECTIONS
  })
  type: SectionType;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 10 })
  itemCount: number;

  @Column({ nullable: true })
  filterType: string;

  @OneToMany(() => BannerItem, bannerItem => bannerItem.homeSection, {
    cascade: true
  })
  bannerItems: BannerItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
