import { Injectable, ConflictException, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { User } from '@prisma/client';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { Readable } from 'stream';
// Firebase handles authentication, no need for bcrypt

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  private convertToDto(user: User): UserResponseDto {
    // Convert to UserResponseDto
    return {
      ...user,
      isActive: user.isActive ?? true, // Use existing isActive or default to true
    } as UserResponseDto;
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email } = createUserDto;

    // Check if user with email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Firebase handles password authentication, no need to hash passwords

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        role: createUserDto.role,
        isActive: true,
      },
    });

    return this.convertToDto(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map(user => this.convertToDto(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.convertToDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return this.convertToDto(user);
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return null;
    }

    return this.convertToDto(user);
  }

  async updateFirebaseUid(id: string, firebaseUid: string): Promise<UserResponseDto> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firebaseUid,
        lastLoginAt: new Date()
      },
    });

    return this.convertToDto(updatedUser);
  }

  async updateLastLogin(id: string): Promise<UserResponseDto> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });

    return this.convertToDto(updatedUser);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Check if user exists
    await this.findOne(id);

    // Firebase handles password authentication, no need to hash passwords
    const data: Partial<User> = {
      name: updateUserDto.name,
      role: updateUserDto.role,
      isActive: updateUserDto.isActive
    };

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.convertToDto(updatedUser);
  }

  async remove(id: string): Promise<UserResponseDto> {
    // Check if user exists
    await this.findOne(id);

    // Delete user
    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });

    return this.convertToDto(deletedUser);
  }

  /**
   * Export all users to CSV format
   * @returns CSV string containing all users
   */
  async exportToCsv(): Promise<string> {
    this.logger.log('Exporting all users to CSV');

    try {
      // Get all users
      const users = await this.prisma.user.findMany();

      this.logger.log(`Found ${users.length} users to export`);

      // Transform data for CSV export
      const csvData = users.map(user => this.transformUserForCsv(user));

      // Generate CSV
      return new Promise((resolve, reject) => {
        csvStringify(csvData, {
          header: true,
        }, (error, output) => {
          if (error) {
            this.logger.error(`Error generating CSV: ${error.message}`);
            reject(new InternalServerErrorException('Failed to generate CSV'));
          } else {
            resolve(output);
          }
        });
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error exporting users to CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to export users to CSV');
    }
  }

  /**
   * Import users from CSV buffer
   * @param buffer CSV file buffer
   * @returns Number of users imported
   */
  async importFromCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    this.logger.log('Importing users from CSV');

    try {
      // Parse CSV buffer
      const users = await this.parseCsvBuffer(buffer);
      this.logger.log(`Parsed ${users.length} users from CSV`);

      const results = {
        imported: 0,
        errors: [] as string[],
      };

      // Process each user
      for (const userData of users) {
        try {
          // Check if user already exists by ID
          if (userData.id) {
            const existingUser = await this.prisma.user.findUnique({
              where: { id: userData.id },
            });

            if (existingUser) {
              // Update existing user
              await this.update(userData.id, this.prepareUserDataForUpdate(userData));
              results.imported++;
              continue;
            }
          }

          // Check if user already exists by email
          if (userData.email) {
            const existingUser = await this.prisma.user.findUnique({
              where: { email: userData.email },
            });

            if (existingUser) {
              // Update existing user
              await this.update(existingUser.id, this.prepareUserDataForUpdate(userData));
              results.imported++;
              continue;
            }
          }

          // Create new user
          await this.create(this.prepareUserDataForCreate(userData));
          results.imported++;
        } catch (error: unknown) {
          const errorMessage = `Error importing user ${userData.name || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error importing users from CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to import users from CSV');
    }
  }

  /**
   * Parse a CSV buffer into an array of user objects
   */
  private async parseCsvBuffer(buffer: Buffer): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      const results: any[] = [];

      Readable.from(buffer)
        .pipe(csvParse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (data) => results.push(data))
        .on('error', (error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Error parsing CSV buffer: ${errorMessage}`);
          reject(error);
        })
        .on('end', () => {
          resolve(results);
        });
    });
  }

  /**
   * Transform a user entity to a flat object for CSV export
   */
  private transformUserForCsv(user: User): Record<string, any> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive ? 'true' : 'false',
      firebaseUid: user.firebaseUid || '',
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Prepare user data from CSV for create operation
   */
  private prepareUserDataForCreate(userData: any): CreateUserDto {
    return {
      name: userData.name,
      email: userData.email,
      role: userData.role,
    };
  }

  /**
   * Prepare user data from CSV for update operation
   */
  private prepareUserDataForUpdate(userData: any): UpdateUserDto {
    const updateData: UpdateUserDto = {};

    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.isActive !== undefined) {
      updateData.isActive = userData.isActive === 'true' || userData.isActive === true;
    }

    return updateData;
  }
}
