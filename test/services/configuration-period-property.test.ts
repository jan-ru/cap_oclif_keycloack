import fc from 'fast-check';

import { ConfigurationService } from '../../src/services/configuration.js';
import { isValidPeriodFormat } from '../../src/types/validation.js';

describe('ConfigurationService - Property 3: Period Format Validation', () => {
  let configService: ConfigurationService;

  beforeAll(() => {
    configService = new ConfigurationService();
  });

  // Feature: financial-reports-cli, Property 3: Period Format Validation
  describe('Valid period format acceptance', () => {
    test('should accept any valid YYYY-MM format period strings', () => {
      fc.assert(
        fc.property(
          // Generate valid YYYY-MM format periods
          fc
            .tuple(
              fc.integer({ max: 9999, min: 1900 }), // Valid year range
              fc.integer({ max: 12, min: 1 }) // Valid month range
            )
            .map(
              ([year, month]) => `${year}-${month.toString().padStart(2, '0')}`
            ),
          validPeriod => {
            // Direct validation function test
            expect(isValidPeriodFormat(validPeriod)).toBe(true);

            // Configuration service validation test
            const spec = {
              entity: 'TestEntity',
              period: validPeriod,
              reportType: 'BalanceSheet',
            };

            const result = configService.validateSpecification(spec);

            // Should not have period format errors
            const periodErrors = result.errors.filter(
              err =>
                err.code === 'INVALID_PERIOD_FORMAT' ||
                err.code === 'MISSING_PERIOD'
            );
            expect(periodErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: financial-reports-cli, Property 3: Period Format Validation
  describe('Invalid period format rejection', () => {
    test('should reject any invalid period format with specific error messages', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Invalid formats - various patterns that should be rejected (excluding empty/falsy values)
            fc.constantFrom(
              // Wrong separators
              '2025/01',
              '2025.01',
              '2025_01',
              '202501',
              // Wrong format order
              '01-2025',
              '1-2025',
              '25-01',
              // Invalid lengths
              '25-01',
              '2025-1',
              '20250-01',
              '2025-001',
              // Invalid characters
              '2025-ab',
              'abcd-01',
              '2025-0a',
              'year-month',
              // Out of range values
              '2025-00',
              '2025-13',
              '2025-99',
              '0000-01',
              '10000-01',
              // Partial (non-empty)
              '2025',
              '2025-',
              '-01',
              '-',
              // Special characters
              '2025-01-01',
              '2025-01T00:00:00',
              '2025 01',
              ' 2025-01 ',
              // Negative values
              '-2025-01',
              '2025--01'
            ),
            // Generate random invalid strings (non-empty)
            fc
              .string({ minLength: 1 })
              .filter(s => !isValidPeriodFormat(s) && s.trim() !== '')
          ),
          invalidPeriod => {
            // Direct validation function test
            expect(isValidPeriodFormat(invalidPeriod)).toBe(false);

            // Configuration service validation test
            const spec = {
              entity: 'TestEntity',
              period: invalidPeriod,
              reportType: 'BalanceSheet',
            };

            const result = configService.validateSpecification(spec);

            // Should have period format error (not missing period error)
            expect(result.isValid).toBe(false);
            const periodError = result.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );
            expect(periodError).toBeDefined();
            expect(periodError?.field).toBe('period');
            expect(periodError?.message).toContain('YYYY-MM format');
            expect(periodError?.message).toContain('2025-01'); // Should include example
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty/falsy period values as missing period', () => {
      fc.assert(
        fc.property(fc.constantFrom('', null), emptyPeriod => {
          const spec = {
            entity: 'TestEntity',
            period: emptyPeriod,
            reportType: 'BalanceSheet',
          };

          const result = configService.validateSpecification(spec);

          // Should have missing period error for empty/falsy values
          expect(result.isValid).toBe(false);
          const periodError = result.errors.find(
            err => err.code === 'MISSING_PERIOD'
          );
          expect(periodError).toBeDefined();
          expect(periodError?.field).toBe('period');
          expect(periodError?.message).toContain('Period is required');
        }),
        { numRuns: 20 }
      );
    });

    test('should handle whitespace-only period values as invalid format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('   ', '\t', '\n', ' \t\n '),
          whitespacePeriod => {
            const spec = {
              entity: 'TestEntity',
              period: whitespacePeriod,
              reportType: 'BalanceSheet',
            };

            const result = configService.validateSpecification(spec);

            // Whitespace-only strings are truthy, so they get invalid format error
            expect(result.isValid).toBe(false);
            const periodError = result.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );
            expect(periodError).toBeDefined();
            expect(periodError?.field).toBe('period');
            expect(periodError?.message).toContain('YYYY-MM format');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Feature: financial-reports-cli, Property 3: Period Format Validation
  describe('Period format error message consistency', () => {
    test('should provide consistent error messages for period format violations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'invalid-period',
            '2025',
            '25-01',
            '2025-13',
            '2025-00',
            '2025/01',
            'abcd-01',
            '2025-1'
          ),
          invalidPeriod => {
            const spec = {
              entity: 'TestEntity',
              period: invalidPeriod,
              reportType: 'BalanceSheet',
            };

            // Validate multiple times to ensure consistency
            const result1 = configService.validateSpecification(spec);
            const result2 = configService.validateSpecification(spec);
            const result3 = configService.validateSpecification(spec);

            // All results should be invalid
            expect(result1.isValid).toBe(false);
            expect(result2.isValid).toBe(false);
            expect(result3.isValid).toBe(false);

            // Error messages should be consistent
            const error1 = result1.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );
            const error2 = result2.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );
            const error3 = result3.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );

            expect(error1).toBeDefined();
            expect(error2).toBeDefined();
            expect(error3).toBeDefined();

            expect(error1?.message).toBe(error2?.message);
            expect(error2?.message).toBe(error3?.message);
            expect(error1?.code).toBe(error2?.code);
            expect(error2?.code).toBe(error3?.code);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should provide consistent error messages for missing period', () => {
      fc.assert(
        fc.property(fc.constantFrom(''), emptyPeriod => {
          const spec = {
            entity: 'TestEntity',
            period: emptyPeriod,
            reportType: 'BalanceSheet',
          };

          // Validate multiple times to ensure consistency
          const result1 = configService.validateSpecification(spec);
          const result2 = configService.validateSpecification(spec);
          const result3 = configService.validateSpecification(spec);

          // All results should be invalid
          expect(result1.isValid).toBe(false);
          expect(result2.isValid).toBe(false);
          expect(result3.isValid).toBe(false);

          // Error messages should be consistent
          const error1 = result1.errors.find(
            err => err.code === 'MISSING_PERIOD'
          );
          const error2 = result2.errors.find(
            err => err.code === 'MISSING_PERIOD'
          );
          const error3 = result3.errors.find(
            err => err.code === 'MISSING_PERIOD'
          );

          expect(error1).toBeDefined();
          expect(error2).toBeDefined();
          expect(error3).toBeDefined();

          expect(error1?.message).toBe(error2?.message);
          expect(error2?.message).toBe(error3?.message);
          expect(error1?.code).toBe(error2?.code);
          expect(error2?.code).toBe(error3?.code);
        }),
        { numRuns: 20 }
      );
    });

    test('should provide consistent error messages for whitespace period', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('   ', '\t\t', '\n\n'),
          whitespacePeriod => {
            const spec = {
              entity: 'TestEntity',
              period: whitespacePeriod,
              reportType: 'BalanceSheet',
            };

            // Validate multiple times to ensure consistency
            const result1 = configService.validateSpecification(spec);
            const result2 = configService.validateSpecification(spec);
            const result3 = configService.validateSpecification(spec);

            // All results should be invalid
            expect(result1.isValid).toBe(false);
            expect(result2.isValid).toBe(false);
            expect(result3.isValid).toBe(false);

            // Error messages should be consistent (whitespace gets invalid format error)
            const error1 = result1.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );
            const error2 = result2.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );
            const error3 = result3.errors.find(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );

            expect(error1).toBeDefined();
            expect(error2).toBeDefined();
            expect(error3).toBeDefined();

            expect(error1?.message).toBe(error2?.message);
            expect(error2?.message).toBe(error3?.message);
            expect(error1?.code).toBe(error2?.code);
            expect(error2?.code).toBe(error3?.code);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Feature: financial-reports-cli, Property 3: Period Format Validation
  describe('Edge cases and boundary conditions', () => {
    test('should handle edge cases correctly for period validation', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Boundary years
            fc.constantFrom('1900-01', '1900-12', '9999-01', '9999-12'),
            // Boundary months
            fc.constantFrom('2025-01', '2025-12'),
            // Just outside boundaries
            fc.constantFrom('1899-01', '10000-01', '2025-00', '2025-13')
          ),
          boundaryPeriod => {
            const isExpectedValid = isValidPeriodFormat(boundaryPeriod);

            const spec = {
              entity: 'TestEntity',
              period: boundaryPeriod,
              reportType: 'BalanceSheet',
            };

            const result = configService.validateSpecification(spec);
            const hasPeriodError = result.errors.some(
              err => err.code === 'INVALID_PERIOD_FORMAT'
            );

            // Validation result should match expected validity
            if (isExpectedValid) {
              expect(hasPeriodError).toBe(false);
            } else {
              expect(hasPeriodError).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: financial-reports-cli, Property 3: Period Format Validation
  describe('Missing period handling', () => {
    test('should handle missing period field with appropriate error', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('TestEntity', 'CompanyA', 'CompanyB'),
          fc.constantFrom('BalanceSheet', 'IncomeStatement', 'Cashflow'),
          (entity, reportType) => {
            const spec = {
              entity,
              reportType,
              // Missing period field
            };

            const result = configService.validateSpecification(spec);

            expect(result.isValid).toBe(false);
            const periodError = result.errors.find(
              err => err.code === 'MISSING_PERIOD'
            );
            expect(periodError).toBeDefined();
            expect(periodError?.field).toBe('period');
            expect(periodError?.message).toContain('Period is required');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
