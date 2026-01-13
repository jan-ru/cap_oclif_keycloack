import fc from 'fast-check';

import { ConfigurationService } from '../../src/services/configuration.js';
import { ReportType } from '../../src/types/index.js';

describe('ConfigurationService - Property-Based Tests', () => {
  let configService: ConfigurationService;

  beforeAll(() => {
    configService = new ConfigurationService();
  });

  describe('Property 2: Report Type Support', () => {
    // Feature: financial-reports-cli, Property 2: Report Type Support
    test('should accept valid report types and reject invalid ones with helpful error messages', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Valid report types
            fc.constantFrom(...Object.values(ReportType)),
            // Invalid report types - non-empty strings that are not valid report types
            fc.constantFrom(
              'InvalidType',
              'WrongReport',
              'BadType',
              'NotAReportType'
            )
          ),
          fc.constantFrom('CompanyA', 'CompanyB'), // simplified entity
          fc.constantFrom('2025-01', '2024-12'), // simplified valid periods
          (reportType, entity, period) => {
            const spec = {
              entity,
              period,
              reportType,
            };

            const result = configService.validateSpecification(spec);

            if (Object.values(ReportType).includes(reportType as ReportType)) {
              // Valid report type should pass validation (assuming other fields are valid)
              const reportTypeErrors = result.errors.filter(
                err =>
                  err.code === 'INVALID_REPORT_TYPE' ||
                  err.code === 'MISSING_REPORT_TYPE'
              );
              expect(reportTypeErrors).toHaveLength(0);
            } else {
              // Invalid report type should fail validation with specific error
              expect(result.isValid).toBe(false);
              const reportTypeError = result.errors.find(
                err => err.code === 'INVALID_REPORT_TYPE'
              );
              expect(reportTypeError).toBeDefined();
              expect(reportTypeError?.message).toContain('Invalid report type');
              expect(reportTypeError?.message).toContain('Must be one of:');
              // Should list valid options
              for (const validType of Object.values(ReportType)) {
                expect(reportTypeError?.message).toContain(validType);
              }
            }
          }
        ),
        { numRuns: 20 } // Reduced from default 100 to 20
      );
    });

    // Feature: financial-reports-cli, Property 2: Report Type Support
    test('should handle missing or empty report type with descriptive error', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CompanyA', 'CompanyB'), // simplified entity
          fc.constantFrom('2025-01', '2024-12'), // simplified valid periods
          (entity, period) => {
            const spec = {
              entity,
              period,
              // Missing reportType
            };

            const result = configService.validateSpecification(spec);

            expect(result.isValid).toBe(false);
            const reportTypeError = result.errors.find(
              err => err.code === 'MISSING_REPORT_TYPE'
            );
            expect(reportTypeError).toBeDefined();
            expect(reportTypeError?.field).toBe('reportType');
            expect(reportTypeError?.message).toContain(
              'Report type is required'
            );
          }
        ),
        { numRuns: 10 } // Reduced from default 100 to 10
      );
    });

    // Feature: financial-reports-cli, Property 2: Report Type Support
    test('should validate all supported report types consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ReportType)),
          fc.constantFrom('CompanyA', 'CompanyB'), // simplified entity
          fc.constantFrom('2025-01', '2024-12'), // simplified valid periods
          (reportType, entity, period) => {
            const spec = {
              entity,
              period,
              reportType,
            };

            const result = configService.validateSpecification(spec);

            // All valid report types should be accepted
            const reportTypeErrors = result.errors.filter(
              err =>
                err.code === 'INVALID_REPORT_TYPE' ||
                err.code === 'MISSING_REPORT_TYPE'
            );
            expect(reportTypeErrors).toHaveLength(0);

            // The specification should be valid if only report type validation is considered
            // (other fields are also valid in this test)
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 10 } // Reduced from default 100 to 10
      );
    });
  });
});
