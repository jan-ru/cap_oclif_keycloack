import { ConfigurationService } from '../../src/services/configuration.js';
import { FinancialDataClient } from '../../src/services/financial-data-client.js';
import { QueryBuilder } from '../../src/services/query-builder.js';

describe('Core Services Integration', () => {
  let configService: ConfigurationService;
  let queryBuilder: QueryBuilder;
  let dataClient: FinancialDataClient;

  beforeAll(() => {
    configService = new ConfigurationService();
    queryBuilder = new QueryBuilder();

    // Initialize FinancialDataClient with mock configuration
    const mockConfig = {
      authentication: {
        password: 'test',
        type: 'basic' as const,
        username: 'test',
      },
      url: 'https://mock-odata-service.com/api',
    };
    dataClient = new FinancialDataClient(mockConfig);
  });

  test('should instantiate all core services without errors', () => {
    expect(configService).toBeInstanceOf(ConfigurationService);
    expect(queryBuilder).toBeInstanceOf(QueryBuilder);
    expect(dataClient).toBeInstanceOf(FinancialDataClient);
  });

  test('should validate report specification correctly', () => {
    const validSpec = {
      entity: 'CompanyA',
      period: '2025-01',
      reportType: 'BalanceSheet',
    };

    const result = configService.validateSpecification(validSpec);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should build queries for different report types', () => {
    const entity = 'CompanyA';
    const period = '2025-01';

    const balanceSheetQuery = queryBuilder.buildBalanceSheetQuery(
      entity,
      period
    );
    expect(balanceSheetQuery).toBeDefined();
    expect(balanceSheetQuery.filter).toContain("Entity eq 'CompanyA'");
    expect(balanceSheetQuery.filter).toContain(
      "Period ge datetime'2025-01-01T00:00:00'"
    );
    expect(balanceSheetQuery.filter).toContain(
      "Period lt datetime'2025-02-01T00:00:00'"
    );
    expect(balanceSheetQuery.entitySets).toContain('BalanceSheetAssets');

    const incomeStatementQuery = queryBuilder.buildIncomeStatementQuery(
      entity,
      period
    );
    expect(incomeStatementQuery).toBeDefined();
    expect(incomeStatementQuery.filter).toContain("Entity eq 'CompanyA'");
    expect(incomeStatementQuery.entitySets).toContain('IncomeStatementRevenue');

    const cashFlowQuery = queryBuilder.buildCashFlowQuery(entity, period);
    expect(cashFlowQuery).toBeDefined();
    expect(cashFlowQuery.filter).toContain("Entity eq 'CompanyA'");
    expect(cashFlowQuery.entitySets).toContain('CashFlowOperating');
  });

  test('should handle validation errors appropriately', () => {
    const invalidSpec = {
      entity: '',
      period: 'invalid-period',
      reportType: 'InvalidType',
    };

    const result = configService.validateSpecification(invalidSpec);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Check that we get specific error codes
    const errorCodes = result.errors.map(err => err.code);
    expect(errorCodes).toContain('MISSING_ENTITY');
    expect(errorCodes).toContain('INVALID_PERIOD_FORMAT');
    expect(errorCodes).toContain('INVALID_REPORT_TYPE');
  });

  test('should generate queries with correct entity sets for different report types', () => {
    const entity = 'TestEntity';
    const period = '2025-01';

    const balanceSheetQuery = queryBuilder.buildBalanceSheetQuery(
      entity,
      period
    );
    expect(balanceSheetQuery.entitySets).toEqual([
      'BalanceSheetAssets',
      'BalanceSheetLiabilities',
      'BalanceSheetEquity',
    ]);

    const incomeStatementQuery = queryBuilder.buildIncomeStatementQuery(
      entity,
      period
    );
    expect(incomeStatementQuery.entitySets).toEqual([
      'IncomeStatementRevenue',
      'IncomeStatementExpenses',
    ]);

    const cashFlowQuery = queryBuilder.buildCashFlowQuery(entity, period);
    expect(cashFlowQuery.entitySets).toEqual([
      'CashFlowOperating',
      'CashFlowInvesting',
      'CashFlowFinancing',
    ]);
  });
});
