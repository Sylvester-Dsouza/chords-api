import { Injectable, ConflictException, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from '../dto/customer.dto';
import { Customer } from '@prisma/client';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { Readable } from 'stream';
// Firebase handles authentication, no need for bcrypt

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

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

  /**
   * Export all customers to CSV format
   * @returns CSV string containing all customers
   */
  async exportToCsv(): Promise<string> {
    this.logger.log('Exporting all customers to CSV');

    try {
      // Get all customers
      const customers = await this.prisma.customer.findMany();

      this.logger.log(`Found ${customers.length} customers to export`);

      // Transform data for CSV export
      const csvData = customers.map(customer => this.transformCustomerForCsv(customer));

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
      this.logger.error(`Error exporting customers to CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to export customers to CSV');
    }
  }

  /**
   * Import customers from CSV buffer
   * @param buffer CSV file buffer
   * @returns Number of customers imported
   */
  async importFromCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    this.logger.log('Importing customers from CSV');

    try {
      // Parse CSV buffer
      const customers = await this.parseCsvBuffer(buffer);
      this.logger.log(`Parsed ${customers.length} customers from CSV`);

      const results = {
        imported: 0,
        errors: [] as string[],
      };

      // Process each customer
      for (const customerData of customers) {
        try {
          // Check if customer already exists by ID
          if (customerData.id) {
            const existingCustomer = await this.prisma.customer.findUnique({
              where: { id: customerData.id },
            });

            if (existingCustomer) {
              // Update existing customer
              await this.update(customerData.id, this.prepareCustomerDataForUpdate(customerData));
              results.imported++;
              continue;
            }
          }

          // Check if customer already exists by email
          if (customerData.email) {
            const existingCustomer = await this.prisma.customer.findUnique({
              where: { email: customerData.email },
            });

            if (existingCustomer) {
              // Update existing customer
              await this.update(existingCustomer.id, this.prepareCustomerDataForUpdate(customerData));
              results.imported++;
              continue;
            }
          }

          // Create new customer
          await this.create(this.prepareCustomerDataForCreate(customerData));
          results.imported++;
        } catch (error: unknown) {
          const errorMessage = `Error importing customer ${customerData.name || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error importing customers from CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to import customers from CSV');
    }
  }

  /**
   * Parse a CSV buffer into an array of customer objects
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
   * Transform a customer entity to a flat object for CSV export
   */
  private transformCustomerForCsv(customer: Customer): Record<string, any> {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      subscriptionType: customer.subscriptionType,
      profilePicture: customer.profilePicture || '',
      phoneNumber: customer.phoneNumber || '',
      firebaseUid: customer.firebaseUid || '',
      lastLoginAt: customer.lastLoginAt ? customer.lastLoginAt.toISOString() : '',
      termsAcceptedAt: customer.termsAcceptedAt ? customer.termsAcceptedAt.toISOString() : '',
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  /**
   * Prepare customer data from CSV for create operation
   */
  private prepareCustomerDataForCreate(customerData: any): CreateCustomerDto {
    return {
      name: customerData.name,
      email: customerData.email,
      subscriptionType: customerData.subscriptionType || 'FREE',
      profilePicture: customerData.profilePicture || null,
      phoneNumber: customerData.phoneNumber || null,
    };
  }

  /**
   * Prepare customer data from CSV for update operation
   */
  private prepareCustomerDataForUpdate(customerData: any): UpdateCustomerDto {
    const updateData: UpdateCustomerDto = {};

    if (customerData.name !== undefined) updateData.name = customerData.name;
    if (customerData.subscriptionType !== undefined) updateData.subscriptionType = customerData.subscriptionType;
    if (customerData.profilePicture !== undefined) updateData.profilePicture = customerData.profilePicture || null;
    if (customerData.phoneNumber !== undefined) updateData.phoneNumber = customerData.phoneNumber || null;

    return updateData;
  }
}
