import { beforeEach, describe, expect, it } from 'vitest';

import { ReportService } from '../../src/services/report-service.js';
import { ReportType } from '../../src/types/index.js';

describe('ReportService', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService();
  });

  it('should instantiate correctly', () => {
    expect(reportService).toBeInstanceOf(ReportService);
  });

  it('should validate specification files', async () => {
    const specFile = 'test/fixtures/test-spec.json';

    const specification = await reportService.validateSpecification(specFile);

    expect(specification).toBeDefined();
    expect(specification.entity).toBe('TestCompany');
    expect(specification.reportType).toBe(ReportType.BalanceSheet);
    expect(specification.period).toBe('2025-01');
    expect(specification.destination).toBeDefined();
    expect(specification.destination?.url).toBe(
      'http://localhost:4004/odata/v4/financial'
    );
  });

  it('should format output correctly', () => {
    const mockData = [
      {
        entity: 'TestCompany',
        lineItems: [
          {
            account: 'Cash',
            amount: 10_000,
            currency: 'USD',
            description: 'Cash and cash equivalents',
          },
        ],
        period: '2025-01',
        reportType: ReportType.BalanceSheet,
      },
    ];

    const mockMetadata = {
      entity: 'TestCompany',
      executionTime: 100,
      generatedAt: new Date('2025-01-13T09:00:00Z'),
      period: '2025-01',
      recordCount: 1,
      reportType: ReportType.BalanceSheet,
    };

    const options = {
      outputFormat: 'json' as const,
      verbose: false,
    };

    const result = reportService.formatOutput(mockData, mockMetadata, options);

    expect(result).toContain('TestCompany');
    expect(result).toContain('Cash');
    expect(result).toContain('10000');
    expect(result).toContain('BalanceSheet');
  });

  it('should handle empty results correctly', async () => {
    // This test would require mocking the data client to return empty results
    // For now, we'll just test that the service can handle the scenario
    const mockData: any[] = [];
    const mockMetadata = {
      entity: 'TestCompany',
      executionTime: 50,
      generatedAt: new Date(),
      period: '2025-01',
      recordCount: 0,
      reportType: ReportType.BalanceSheet,
    };

    const options = {
      outputFormat: 'json' as const,
      verbose: false,
    };

    const result = reportService.formatOutput(mockData, mockMetadata, options);

    expect(result).toContain('recordCount');
    expect(result).toContain('0');
  });
});
