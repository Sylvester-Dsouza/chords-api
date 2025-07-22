import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AccountDeletionStatus } from '@prisma/client';
import {
  CreateAccountDeletionRequestDto,
  UpdateAccountDeletionRequestDto,
  AccountDeletionRequestResponseDto
} from '../dto/account-deletion-request.dto';

@Injectable()
export class AccountDeletionRequestService {
  private readonly logger = new Logger(AccountDeletionRequestService.name);

  constructor(private prisma: PrismaService) { }

  async create(customerId: string, createDto: CreateAccountDeletionRequestDto): Promise<AccountDeletionRequestResponseDto> {
    this.logger.log(`Creating account deletion request for customer ${customerId}`);

    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Check if there's already a pending request
    const existingRequest = await this.prisma.accountDeletionRequest.findFirst({
      where: {
        customerId,
        status: AccountDeletionStatus.PENDING,
      },
    });

    if (existingRequest) {
      // Return the existing request instead of creating a new one
      return this.convertToDto(existingRequest);
    }

    // Create the request
    const request = await this.prisma.accountDeletionRequest.create({
      data: {
        customerId,
        reason: createDto.reason,
        status: AccountDeletionStatus.PENDING,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return this.convertToDto(request);
  }

  async findAll(includeCustomer: boolean = false): Promise<AccountDeletionRequestResponseDto[]> {
    const requests = await this.prisma.accountDeletionRequest.findMany({
      include: {
        customer: includeCustomer ? {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        } : false,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return requests.map(request => this.convertToDto(request));
  }

  async findAllByCustomer(customerId: string): Promise<AccountDeletionRequestResponseDto[]> {
    const requests = await this.prisma.accountDeletionRequest.findMany({
      where: { customerId },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return requests.map(request => this.convertToDto(request));
  }

  async findOne(id: string, includeCustomer: boolean = false): Promise<AccountDeletionRequestResponseDto> {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { id },
      include: {
        customer: includeCustomer ? {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        } : false,
      },
    });

    if (!request) {
      throw new NotFoundException(`Account deletion request with ID ${id} not found`);
    }

    return this.convertToDto(request);
  }

  async update(id: string, updateDto: UpdateAccountDeletionRequestDto): Promise<AccountDeletionRequestResponseDto> {
    // Check if request exists
    await this.findOne(id);

    // Prepare update data
    const data: any = { ...updateDto };

    // If status is being updated, set processedAt
    if (updateDto.status) {
      data.processedAt = new Date();
    }

    // Update the request
    const updatedRequest = await this.prisma.accountDeletionRequest.update({
      where: { id },
      data,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return this.convertToDto(updatedRequest);
  }

  async remove(id: string): Promise<AccountDeletionRequestResponseDto> {
    // Check if request exists
    await this.findOne(id);

    // Delete the request
    const deletedRequest = await this.prisma.accountDeletionRequest.delete({
      where: { id },
    });

    return this.convertToDto(deletedRequest);
  }

  // Helper method to convert Prisma model to DTO
  private convertToDto(request: any): AccountDeletionRequestResponseDto {
    return {
      id: request.id,
      customerId: request.customerId,
      reason: request.reason,
      status: request.status,
      requestedAt: request.requestedAt,
      processedAt: request.processedAt,
      processedBy: request.processedBy,
      notes: request.notes,
      createdAt: request.createdAt || request.requestedAt,
      updatedAt: request.updatedAt || request.requestedAt,
      customer: request.customer,
    };
  }

  // Method to execute account deletion when approved
  async executeAccountDeletion(id: string, processedBy: string): Promise<void> {
    const request = await this.findOne(id);

    if (request.status !== AccountDeletionStatus.APPROVED) {
      throw new Error(`Cannot execute deletion for request with status ${request.status}`);
    }

    // Start a transaction to ensure all operations succeed or fail together
    await this.prisma.$transaction(async (prisma) => {
      // Update request status to COMPLETED
      await prisma.accountDeletionRequest.update({
        where: { id },
        data: {
          status: AccountDeletionStatus.COMPLETED,
          processedAt: new Date(),
          processedBy,
        },
      });

      // Delete the customer account
      // This will cascade delete all related data due to the onDelete: Cascade relations
      await prisma.customer.delete({
        where: { id: request.customerId },
      });
    });

    this.logger.log(`Account deletion executed for customer ${request.customerId}`);
  }
}