import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import { ConfigurationService } from '../../src/services/configuration.js';
import { ReportType } from '../../src/types/index.js';

describe('ConfigurationService', () => {
  let configService: ConfigurationService;
  let tempDir: string;

  beforeAll(async () => {
    configService = new ConfigurationService();
    // Create a temporary directory for test files
    tempDir = join(process.cwd(), 'test-temp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  });

  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parseSpecification', () => {
    test('should parse valid specification file', async () => {
      const validSpec = {
        entity: 'CompanyA',
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'valid-spec.json');
      await fs.writeFile(testFile, JSON.stringify(validSpec, null, 2));

      const result = await configService.parseSpecification(testFile);

      expect(result).toEqual({
        entity: 'CompanyA',
        period: '2025-01',
        reportType: ReportType.BalanceSheet,
      });
    });

    test('should throw error for non-existent file', async () => {
      const nonExistentFile = join(tempDir, 'does-not-exist.json');

      await expect(
        configService.parseSpecification(nonExistentFile)
      ).rejects.toMatchObject({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Specification file not found',
        },
      });
    });

    test('should throw error for invalid JSON', async () => {
      const invalidJsonFile = join(tempDir, 'invalid.json');
      await fs.writeFile(invalidJsonFile, '{ invalid json }');

      await expect(
        configService.parseSpecification(invalidJsonFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_JSON',
          message: 'Failed to parse specification file as JSON',
        },
      });
    });

    test('should throw error for empty file', async () => {
      const emptyFile = join(tempDir, 'empty.json');
      await fs.writeFile(emptyFile, '');

      await expect(
        configService.parseSpecification(emptyFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_JSON',
          message: 'Failed to parse specification file as JSON',
        },
      });
    });

    test('should throw error for truncated JSON', async () => {
      const truncatedFile = join(tempDir, 'truncated.json');
      await fs.writeFile(
        truncatedFile,
        '{ "entity": "CompanyA", "reportType":'
      );

      await expect(
        configService.parseSpecification(truncatedFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_JSON',
          message: 'Failed to parse specification file as JSON',
        },
      });
    });

    test('should throw error for JSON with invalid characters', async () => {
      const invalidCharsFile = join(tempDir, 'invalid-chars.json');
      await fs.writeFile(invalidCharsFile, '{ "entity": "CompanyA"\u0000 }');

      await expect(
        configService.parseSpecification(invalidCharsFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_JSON',
          message: 'Failed to parse specification file as JSON',
        },
      });
    });

    test('should throw error when path is a directory', async () => {
      const dirPath = join(tempDir, 'test-directory');
      await fs.mkdir(dirPath, { recursive: true });

      await expect(
        configService.parseSpecification(dirPath)
      ).rejects.toMatchObject({
        error: {
          code: 'PATH_IS_DIRECTORY',
          message: 'Specification path is a directory',
        },
      });
    });

    test('should throw error for missing required fields', async () => {
      const incompleteSpec = {
        entity: 'CompanyA',
        // Missing reportType and period
      };

      const testFile = join(tempDir, 'incomplete-spec.json');
      await fs.writeFile(testFile, JSON.stringify(incompleteSpec, null, 2));

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for invalid period format', async () => {
      const invalidPeriodSpec = {
        entity: 'CompanyA',
        period: '2025-1', // Invalid format
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'invalid-period.json');
      await fs.writeFile(testFile, JSON.stringify(invalidPeriodSpec, null, 2));

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for invalid report type', async () => {
      const invalidTypeSpec = {
        entity: 'CompanyA',
        period: '2025-01',
        reportType: 'InvalidType',
      };

      const testFile = join(tempDir, 'invalid-type.json');
      await fs.writeFile(testFile, JSON.stringify(invalidTypeSpec, null, 2));

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for wrong data types in required fields', async () => {
      const wrongTypesSpec = {
        entity: 123, // Should be string
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'wrong-types.json');
      await fs.writeFile(testFile, JSON.stringify(wrongTypesSpec, null, 2));

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for null values in required fields', async () => {
      const nullValuesSpec = {
        entity: null,
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'null-values.json');
      await fs.writeFile(testFile, JSON.stringify(nullValuesSpec, null, 2));

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for empty string values', async () => {
      const emptyStringSpec = {
        entity: '',
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'empty-string.json');
      await fs.writeFile(testFile, JSON.stringify(emptyStringSpec, null, 2));

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for invalid period formats', async () => {
      const testCases = [
        { description: 'single digit month', period: '2025-1' },
        { description: 'two digit year', period: '25-01' },
        { description: 'invalid month', period: '2025-13' },
        { description: 'zero month', period: '2025-00' },
        { description: 'wrong separator', period: '2025/01' },
        { description: 'too many parts', period: '2025-1-01' },
        { description: 'non-numeric', period: 'invalid' },
      ];

      for (const testCase of testCases) {
        const invalidPeriodSpec = {
          entity: 'CompanyA',
          period: testCase.period,
          reportType: 'BalanceSheet',
        };

        const testFile = join(
          tempDir,
          `invalid-period-${testCase.description.replaceAll(/\s+/g, '-')}.json`
        );
        await fs.writeFile(
          testFile,
          JSON.stringify(invalidPeriodSpec, null, 2)
        );

        await expect(
          configService.parseSpecification(testFile)
        ).rejects.toMatchObject({
          error: {
            code: 'INVALID_SPECIFICATION',
            message: 'Report specification validation failed',
          },
        });
      }
    });

    test('should throw error for invalid destination configuration', async () => {
      const invalidDestinationSpec = {
        destination: {
          // Missing url field
        },
        entity: 'CompanyA',
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'invalid-destination.json');
      await fs.writeFile(
        testFile,
        JSON.stringify(invalidDestinationSpec, null, 2)
      );

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for invalid filter configuration', async () => {
      const invalidFilterSpec = {
        entity: 'CompanyA',
        filters: [
          {
            // Missing field, operator, and value
          },
        ],
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'invalid-filter.json');
      await fs.writeFile(testFile, JSON.stringify(invalidFilterSpec, null, 2));

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for filter with invalid operator', async () => {
      const invalidOperatorSpec = {
        entity: 'CompanyA',
        filters: [
          {
            field: 'amount',
            operator: 'invalid_op',
            value: 100,
          },
        ],
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const testFile = join(tempDir, 'invalid-operator.json');
      await fs.writeFile(
        testFile,
        JSON.stringify(invalidOperatorSpec, null, 2)
      );

      await expect(
        configService.parseSpecification(testFile)
      ).rejects.toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });
    });

    test('should throw error for multiple missing fields', async () => {
      const multipleErrorsSpec = {
        // Missing entity, period, and reportType
      };

      const testFile = join(tempDir, 'multiple-errors.json');
      await fs.writeFile(testFile, JSON.stringify(multipleErrorsSpec, null, 2));

      const error = await configService
        .parseSpecification(testFile)
        .catch(error_ => error_);

      expect(error).toMatchObject({
        error: {
          code: 'INVALID_SPECIFICATION',
          message: 'Report specification validation failed',
        },
      });

      // Should contain multiple validation errors
      expect(error.error.details).toContain('entity:');
      expect(error.error.details).toContain('reportType:');
      expect(error.error.details).toContain('period:');
    });
  });

  describe('validateSpecification', () => {
    test('should validate correct specification', () => {
      const validSpec = {
        entity: 'CompanyA',
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const result = configService.validateSpecification(validSpec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return validation errors for invalid specification', () => {
      const invalidSpec = {
        // Missing all required fields
      };

      const result = configService.validateSpecification(invalidSpec);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.code === 'MISSING_ENTITY')).toBe(
        true
      );
      expect(
        result.errors.some(err => err.code === 'MISSING_REPORT_TYPE')
      ).toBe(true);
      expect(result.errors.some(err => err.code === 'MISSING_PERIOD')).toBe(
        true
      );
    });

    test('should validate specification with valid optional fields', () => {
      const specWithOptionals = {
        destination: {
          url: 'https://example.com/odata',
        },
        entity: 'CompanyA',
        filters: [
          {
            field: 'amount',
            operator: 'gt',
            value: 1000,
          },
        ],
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const result = configService.validateSpecification(specWithOptionals);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors for invalid optional fields', () => {
      const specWithInvalidOptionals = {
        destination: {
          // Missing url
        },
        entity: 'CompanyA',
        filters: [
          {
            field: 'amount',
            operator: 'invalid_operator',
            // Missing value
          },
        ],
        period: '2025-01',
        reportType: 'BalanceSheet',
      };

      const result = configService.validateSpecification(
        specWithInvalidOptionals
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(err => err.code === 'INVALID_DESTINATION_URL')
      ).toBe(true);
      expect(
        result.errors.some(err => err.code === 'INVALID_FILTER_OPERATOR')
      ).toBe(true);
      expect(
        result.errors.some(err => err.code === 'MISSING_FILTER_VALUE')
      ).toBe(true);
    });

    test('should handle non-object input', () => {
      const nonObjectInputs = [null, undefined, 'string', 123, [], true];

      for (const input of nonObjectInputs) {
        const result = configService.validateSpecification(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('should validate all report types', () => {
      const reportTypes = ['BalanceSheet', 'IncomeStatement', 'Cashflow'];

      for (const reportType of reportTypes) {
        const spec = {
          entity: 'CompanyA',
          period: '2025-01',
          reportType,
        };

        const result = configService.validateSpecification(spec);
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid report types', () => {
      const invalidReportTypes = [
        'balance_sheet',
        'BALANCESHEET',
        'Income',
        'Cash',
        '',
        null,
        123,
      ];

      for (const reportType of invalidReportTypes) {
        const spec = {
          entity: 'CompanyA',
          period: '2025-01',
          reportType,
        };

        const result = configService.validateSpecification(spec);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            err =>
              err.code === 'INVALID_REPORT_TYPE' ||
              err.code === 'MISSING_REPORT_TYPE'
          )
        ).toBe(true);
      }
    });

    test('should validate edge case periods', () => {
      const validPeriods = ['1900-01', '9999-12', '2025-06'];
      const invalidPeriods = ['1899-01', '10000-01', '2025-13', '2025-00'];

      for (const period of validPeriods) {
        const spec = {
          entity: 'CompanyA',
          period,
          reportType: 'BalanceSheet',
        };

        const result = configService.validateSpecification(spec);
        expect(result.isValid).toBe(true);
      }

      for (const period of invalidPeriods) {
        const spec = {
          entity: 'CompanyA',
          period,
          reportType: 'BalanceSheet',
        };

        const result = configService.validateSpecification(spec);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(err => err.code === 'INVALID_PERIOD_FORMAT')
        ).toBe(true);
      }
    });
  });
});
