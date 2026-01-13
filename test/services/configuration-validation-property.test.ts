import fc from 'fast-check';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ConfigurationService } from '../../src/services/configuration.js';
import { ReportType } from '../../src/types/index.js';

describe('ConfigurationService - Property 1: Specification Parsing and Validation', () => {
  let configService: ConfigurationService;
  let tempDir: string;

  beforeAll(async () => {
    configService = new ConfigurationService();
    tempDir = await fs.mkdtemp(join(tmpdir(), 'config-test-'));
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Feature: financial-reports-cli, Property 1: Specification Parsing and Validation
  describe('Valid specification parsing', () => {
    test('should successfully parse and validate any valid specification', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid specifications
          fc.record({
            // Optional fields
            destination: fc.option(
              fc.record({
                authentication: fc.option(
                  fc.record({
                    clientId: fc.option(fc.string()),
                    clientSecret: fc.option(fc.string()),
                    password: fc.option(fc.string()),
                    token: fc.option(fc.string()),
                    type: fc.constantFrom('basic', 'bearer', 'oauth'),
                    username: fc.option(fc.string()),
                  })
                ),
                url: fc.webUrl(),
              })
            ),
            entity: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]*$/), // Valid entity names
            filters: fc.option(
              fc.array(
                fc.record({
                  field: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]*$/),
                  operator: fc.constantFrom('eq', 'ne', 'gt', 'lt', 'ge', 'le'),
                  value: fc.oneof(fc.string(), fc.integer()),
                }),
                { maxLength: 3 }
              )
            ),
            period: fc
              .tuple(
                fc.integer({ max: 2030, min: 2020 }), // Year
                fc.integer({ max: 12, min: 1 }) // Month
              )
              .map(
                ([year, month]) =>
                  `${year}-${month.toString().padStart(2, '0')}`
              ),
            reportType: fc.constantFrom(...Object.values(ReportType)),
          }),
          async validSpec => {
            // Write specification to temporary file
            const specFile = join(
              tempDir,
              `spec-${Date.now()}-${Math.random()}.json`
            );
            await fs.writeFile(specFile, JSON.stringify(validSpec, null, 2));

            try {
              // Parse the specification
              const result = await configService.parseSpecification(specFile);

              // Should successfully parse and return the specification
              expect(result).toBeDefined();
              expect(result.entity).toBe(validSpec.entity);
              expect(result.reportType).toBe(validSpec.reportType);
              expect(result.period).toBe(validSpec.period);

              if (validSpec.destination) {
                expect(result.destination).toBeDefined();
                expect(result.destination?.url).toBe(validSpec.destination.url);
              }

              if (validSpec.filters) {
                expect(result.filters).toBeDefined();
                expect(result.filters).toHaveLength(validSpec.filters.length);
              }
            } finally {
              // Clean up the temporary file
              try {
                await fs.unlink(specFile);
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: financial-reports-cli, Property 1: Specification Parsing and Validation
  describe('Invalid specification handling', () => {
    test('should return descriptive error messages for invalid specifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate invalid specifications
          fc.oneof(
            // Missing required fields
            fc.record({
              period: fc
                .tuple(
                  fc.integer({ max: 2030, min: 2020 }),
                  fc.integer({ max: 12, min: 1 })
                )
                .map(
                  ([year, month]) =>
                    `${year}-${month.toString().padStart(2, '0')}`
                ),
              // Missing entity
              reportType: fc.constantFrom(...Object.values(ReportType)),
            }),
            fc.record({
              entity: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]*$/),
              // Missing reportType
              period: fc
                .tuple(
                  fc.integer({ max: 2030, min: 2020 }),
                  fc.integer({ max: 12, min: 1 })
                )
                .map(
                  ([year, month]) =>
                    `${year}-${month.toString().padStart(2, '0')}`
                ),
            }),
            fc.record({
              entity: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]*$/),
              reportType: fc.constantFrom(...Object.values(ReportType)),
              // Missing period
            }),
            // Invalid field values
            fc.record({
              entity: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]*$/),
              period: fc
                .tuple(
                  fc.integer({ max: 2030, min: 2020 }),
                  fc.integer({ max: 12, min: 1 })
                )
                .map(
                  ([year, month]) =>
                    `${year}-${month.toString().padStart(2, '0')}`
                ),
              reportType: fc.constantFrom(
                'InvalidType',
                'WrongReport',
                'BadType'
              ),
            }),
            fc.record({
              entity: fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]*$/),
              period: fc.constantFrom(
                'invalid-period',
                '2025',
                '25-01',
                '2025-13',
                '2025-00'
              ),
              reportType: fc.constantFrom(...Object.values(ReportType)),
            })
          ),
          async invalidSpec => {
            // Write specification to temporary file
            const specFile = join(
              tempDir,
              `invalid-spec-${Date.now()}-${Math.random()}.json`
            );
            await fs.writeFile(specFile, JSON.stringify(invalidSpec, null, 2));

            try {
              // Attempt to parse the specification
              await expect(
                configService.parseSpecification(specFile)
              ).rejects.toThrow();

              // Test direct validation
              const validation =
                configService.validateSpecification(invalidSpec);
              expect(validation.isValid).toBe(false);
              expect(validation.errors.length).toBeGreaterThan(0);

              // Check that error messages are descriptive
              for (const error of validation.errors) {
                expect(error.code).toBeDefined();
                expect(error.field).toBeDefined();
                expect(error.message).toBeDefined();
                expect(error.message.length).toBeGreaterThan(0);
              }
            } finally {
              // Clean up the temporary file
              try {
                await fs.unlink(specFile);
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: financial-reports-cli, Property 1: Specification Parsing and Validation
  describe('File system error handling', () => {
    test('should handle file system errors with appropriate error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[A-Za-z0-9_-]+$/), // Generate random file names
          async fileName => {
            const nonExistentFile = join(
              tempDir,
              `nonexistent-${fileName}.json`
            );

            // Attempt to parse non-existent file
            await expect(
              configService.parseSpecification(nonExistentFile)
            ).rejects.toMatchObject({
              error: {
                code: 'FILE_NOT_FOUND',
                message: expect.stringContaining('not found'),
              },
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle invalid JSON with descriptive error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '{ invalid json',
            '{ "entity": "test", }', // trailing comma
            '{ "entity": test }', // unquoted value
            '{ entity: "test" }', // unquoted key
            '{ "entity": "test"' // missing closing brace
          ),
          async invalidJson => {
            const specFile = join(
              tempDir,
              `invalid-json-${Date.now()}-${Math.random()}.json`
            );
            await fs.writeFile(specFile, invalidJson);

            try {
              await expect(
                configService.parseSpecification(specFile)
              ).rejects.toMatchObject({
                error: {
                  code: 'INVALID_JSON',
                  message: expect.stringContaining('JSON'),
                  suggestions: expect.arrayContaining([
                    expect.stringContaining('JSON syntax'),
                  ]),
                },
              });
            } finally {
              try {
                await fs.unlink(specFile);
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle valid JSON but invalid specification structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '[ "not", "an", "object" ]', // array instead of object
            '"just a string"', // string instead of object
            '123', // number instead of object
            'true' // boolean instead of object
          ),
          async validJsonInvalidSpec => {
            const specFile = join(
              tempDir,
              `valid-json-invalid-spec-${Date.now()}-${Math.random()}.json`
            );
            await fs.writeFile(specFile, validJsonInvalidSpec);

            try {
              await expect(
                configService.parseSpecification(specFile)
              ).rejects.toMatchObject({
                error: {
                  code: 'INVALID_SPECIFICATION',
                  message: expect.stringContaining('validation failed'),
                },
              });
            } finally {
              try {
                await fs.unlink(specFile);
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: financial-reports-cli, Property 1: Specification Parsing and Validation
  describe('Validation consistency', () => {
    test('should provide consistent validation results for the same input', () => {
      fc.assert(
        fc.property(
          fc.record({
            entity: fc.option(fc.string()),
            period: fc.option(fc.string()),
            reportType: fc.option(
              fc.oneof(
                fc.constantFrom(...Object.values(ReportType)),
                fc.string()
              )
            ),
          }),
          spec => {
            // Validate the same specification multiple times
            const result1 = configService.validateSpecification(spec);
            const result2 = configService.validateSpecification(spec);
            const result3 = configService.validateSpecification(spec);

            // Results should be consistent
            expect(result1.isValid).toBe(result2.isValid);
            expect(result2.isValid).toBe(result3.isValid);
            expect(result1.errors.length).toBe(result2.errors.length);
            expect(result2.errors.length).toBe(result3.errors.length);

            // Error codes should be the same
            const codes1 = result1.errors.map(e => e.code).sort();
            const codes2 = result2.errors.map(e => e.code).sort();
            const codes3 = result3.errors.map(e => e.code).sort();
            expect(codes1).toEqual(codes2);
            expect(codes2).toEqual(codes3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
