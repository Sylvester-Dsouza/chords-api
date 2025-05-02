import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from '../dto/customer.dto';
import { Customer } from '@prisma/client';
// Firebase handles authentication, no need for bcrypt

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  private convertToDto(customer: Customer): CustomerResponseDto {
    // Convert to CustomerResponseDto
    return {
      ...customer,
      // Ensure all required properties are present
      profilePicture: customer.profilePicture,
      phoneNumber: customer.phoneNumber,
      lastLoginAt: customer.lastLoginAt,
      termsAcceptedAt: customer.termsAcceptedAt,
    } as CustomerResponseDto;
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const { email } = createCustomerDto;

    // Check if customer with email already exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      throw new ConflictException('Email already in use');
    }

    // Firebase handles authentication, no need to hash passwords

    // Create the customer
    const customer = await this.prisma.customer.create({
      data: {
        name: createCustomerDto.name,
        email: createCustomerDto.email,
        // Firebase handles authentication
        subscriptionType: createCustomerDto.subscriptionType as any, // Cast to any to avoid type error
        profilePicture: createCustomerDto.profilePicture,
        phoneNumber: createCustomerDto.phoneNumber,
      },
    });

    return this.convertToDto(customer);
  }

  async findAll(): Promise<CustomerResponseDto[]> {
    const customers = await this.prisma.customer.findMany();
    return customers.map(customer => this.convertToDto(customer));
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.convertToDto(customer);
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    // Check if customer exists
    await this.findOne(id);

    // Firebase handles passwords, so we don't need to hash anything
    const data: Partial<Customer> = { ...updateCustomerDto };

    // Update customer
    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data,
    });

    return this.convertToDto(updatedCustomer);
  }

  async remove(id: string): Promise<CustomerResponseDto> {
    // Check if customer exists
    await this.findOne(id);

    // Delete customer
    const deletedCustomer = await this.prisma.customer.delete({
      where: { id },
    });

    return this.convertToDto(deletedCustomer);
  }
}
