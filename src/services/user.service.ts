import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { User } from '@prisma/client';
// Firebase handles authentication, no need for bcrypt

@Injectable()
export class UserService {
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
}
