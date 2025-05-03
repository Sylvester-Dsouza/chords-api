import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, createWriteStream } from 'fs';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { Readable } from 'stream';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);

  /**
   * Parse a CSV file into an array of objects
   * @param filePath Path to the CSV file
   * @param options CSV parse options
   * @returns Promise resolving to an array of objects
   */
  async parseCsvFile<T>(filePath: string, options: any = {}): Promise<T[]> {
    this.logger.log(`Parsing CSV file: ${filePath}`);
    
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      
      createReadStream(filePath)
        .pipe(csvParse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          ...options
        }))
        .on('data', (data) => results.push(data as T))
        .on('error', (error) => {
          this.logger.error(`Error parsing CSV file: ${error.message}`);
          reject(error);
        })
        .on('end', () => {
          this.logger.log(`Successfully parsed ${results.length} records from CSV`);
          resolve(results);
        });
    });
  }

  /**
   * Parse a CSV buffer into an array of objects
   * @param buffer CSV content as a buffer
   * @param options CSV parse options
   * @returns Promise resolving to an array of objects
   */
  async parseCsvBuffer<T>(buffer: Buffer, options: any = {}): Promise<T[]> {
    this.logger.log('Parsing CSV from buffer');
    
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      
      Readable.from(buffer)
        .pipe(csvParse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          ...options
        }))
        .on('data', (data) => results.push(data as T))
        .on('error', (error) => {
          this.logger.error(`Error parsing CSV buffer: ${error.message}`);
          reject(error);
        })
        .on('end', () => {
          this.logger.log(`Successfully parsed ${results.length} records from CSV buffer`);
          resolve(results);
        });
    });
  }

  /**
   * Generate a CSV file from an array of objects
   * @param data Array of objects to convert to CSV
   * @param filePath Path where to save the CSV file
   * @param options CSV stringify options
   * @returns Promise resolving to the file path
   */
  async generateCsvFile<T>(data: T[], filePath: string, options: any = {}): Promise<string> {
    this.logger.log(`Generating CSV file with ${data.length} records`);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      const writableStream = createWriteStream(filePath);
      
      csvStringify(data, {
        header: true,
        ...options
      })
        .pipe(writableStream)
        .on('error', (error) => {
          this.logger.error(`Error generating CSV file: ${error.message}`);
          reject(error);
        })
        .on('finish', () => {
          this.logger.log(`CSV file generated successfully: ${filePath}`);
          resolve(filePath);
        });
    });
  }

  /**
   * Generate a CSV string from an array of objects
   * @param data Array of objects to convert to CSV
   * @param options CSV stringify options
   * @returns Promise resolving to the CSV string
   */
  async generateCsvString<T>(data: T[], options: any = {}): Promise<string> {
    this.logger.log(`Generating CSV string with ${data.length} records`);
    
    return new Promise((resolve, reject) => {
      csvStringify(data, {
        header: true,
        ...options
      }, (error, output) => {
        if (error) {
          this.logger.error(`Error generating CSV string: ${error.message}`);
          reject(error);
        } else {
          this.logger.log('CSV string generated successfully');
          resolve(output);
        }
      });
    });
  }

  /**
   * Create a temporary file
   * @param prefix File name prefix
   * @param suffix File extension
   * @returns Path to the temporary file
   */
  createTempFile(prefix: string, suffix: string): string {
    const tempDir = os.tmpdir();
    const fileName = `${prefix}-${Date.now()}${suffix}`;
    return path.join(tempDir, fileName);
  }
}
