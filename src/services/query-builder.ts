import { ErrorResponse, FilterConfig, ReportType } from '../types/index.js';

/**
 * Configuration for OData query generation
 */
export interface QueryConfig {
  entity: string;
  filters?: FilterConfig[];
  orderBy?: string[];
  period: string;
  reportType: ReportType;
  select?: string[];
  skip?: number;
  top?: number;
}

/**
 * Generated OData query information
 */
export interface ODataQuery {
  entitySets: string[];
  filter: string;
  orderBy?: string;
  select?: string;
  skip?: number;
  top?: number;
}

/**
 * Service for building OData queries for financial reports
 */
export class QueryBuilder {
  /**
   * Builds queries specifically for Balance Sheet reports
   * @param entity The entity identifier
   * @param period The period in YYYY-MM format
   * @param filters Optional additional filters
   * @returns OData query for balance sheet data
   */
  buildBalanceSheetQuery(
    entity: string,
    period: string,
    filters?: FilterConfig[]
  ): ODataQuery {
    return this.buildQuery({
      entity,
      period,
      reportType: ReportType.BalanceSheet,
      ...(filters && { filters }),
      orderBy: ['AccountType', 'Account'],
      select: [
        'Account',
        'Description',
        'Amount',
        'Currency',
        'Category',
        'AccountType',
      ],
    });
  }

  /**
   * Builds queries specifically for Cash Flow reports
   * @param entity The entity identifier
   * @param period The period in YYYY-MM format
   * @param filters Optional additional filters
   * @returns OData query for cash flow data
   */
  buildCashFlowQuery(
    entity: string,
    period: string,
    filters?: FilterConfig[]
  ): ODataQuery {
    return this.buildQuery({
      entity,
      period,
      reportType: ReportType.Cashflow,
      ...(filters && { filters }),
      orderBy: ['ActivityType', 'Account'],
      select: [
        'Account',
        'Description',
        'Amount',
        'Currency',
        'Category',
        'ActivityType',
      ],
    });
  }

  /**
   * Builds queries specifically for Income Statement reports
   * @param entity The entity identifier
   * @param period The period in YYYY-MM format
   * @param filters Optional additional filters
   * @returns OData query for income statement data
   */
  buildIncomeStatementQuery(
    entity: string,
    period: string,
    filters?: FilterConfig[]
  ): ODataQuery {
    return this.buildQuery({
      entity,
      period,
      reportType: ReportType.IncomeStatement,
      ...(filters && { filters }),
      orderBy: ['StatementType', 'Account'],
      select: [
        'Account',
        'Description',
        'Amount',
        'Currency',
        'Category',
        'StatementType',
      ],
    });
  }

  /**
   * Builds a complete OData URL with query parameters
   * @param baseUrl The base OData service URL
   * @param entitySet The entity set name
   * @param query The query configuration
   * @returns Complete OData URL with query parameters
   */
  buildODataUrl(baseUrl: string, entitySet: string, query: ODataQuery): string {
    const url = new URL(`${baseUrl}/${entitySet}`);

    if (query.filter) {
      url.searchParams.set('$filter', query.filter);
    }

    if (query.select) {
      url.searchParams.set('$select', query.select);
    }

    if (query.orderBy) {
      url.searchParams.set('$orderby', query.orderBy);
    }

    if (query.top !== undefined) {
      url.searchParams.set('$top', query.top.toString());
    }

    if (query.skip !== undefined) {
      url.searchParams.set('$skip', query.skip.toString());
    }

    return url.toString();
  }

  /**
   * Builds OData queries for the specified report type and parameters
   * @param config Query configuration parameters
   * @returns OData query configuration
   */
  buildQuery(config: QueryConfig): ODataQuery {
    try {
      this.validateQueryConfig(config);

      const entitySets = this.getEntitySetsForReportType(config.reportType);
      const filter = this.buildFilterExpression(config);
      const select = this.buildSelectClause(config.select);
      const orderBy = this.buildOrderByClause(config.orderBy);

      return {
        entitySets,
        filter,
        ...(select && { select }),
        ...(orderBy && { orderBy }),
        ...(config.top !== undefined && { top: config.top }),
        ...(config.skip !== undefined && { skip: config.skip }),
      };
    } catch (error) {
      throw this.handleQueryBuilderError(
        error,
        'buildQuery',
        config as unknown as Record<string, unknown>
      );
    }
  }

  /**
   * Builds OData filter from custom filter configuration
   */
  private buildCustomFilter(filter: FilterConfig): string {
    this.validateFilterConfig(filter);

    const { field, operator, value } = filter;

    // Escape field name if it contains spaces or special characters
    const fieldName = field.includes(' ') ? `'${field}'` : field;

    // Format value based on type
    let formattedValue: string;
    if (typeof value === 'string') {
      // Escape single quotes in string values
      const escapedValue = value.replaceAll("'", "''");
      formattedValue = `'${escapedValue}'`;
    } else {
      formattedValue = value.toString();
    }

    return `${fieldName} ${operator} ${formattedValue}`;
  }

  /**
   * Builds OData filter for entity matching
   */
  private buildEntityFilter(entity: string): string {
    if (!entity || typeof entity !== 'string' || entity.trim().length === 0) {
      throw new Error('Entity must be a non-empty string');
    }

    // Escape single quotes in entity name
    const escapedEntity = entity.replaceAll("'", "''");
    return `Entity eq '${escapedEntity}'`;
  }

  /**
   * Builds the complete filter expression combining period, entity, and custom filters
   */
  private buildFilterExpression(config: QueryConfig): string {
    const filters: string[] = [];

    // Add period filter
    const periodFilter = this.buildPeriodFilter(config.period);
    filters.push(periodFilter);

    // Add entity filter
    const entityFilter = this.buildEntityFilter(config.entity);
    filters.push(entityFilter);

    // Add custom filters
    if (config.filters && config.filters.length > 0) {
      const customFilters = config.filters.map(filter =>
        this.buildCustomFilter(filter)
      );
      filters.push(...customFilters);
    }

    return filters.join(' and ');
  }

  /**
   * Builds the $orderby clause from field list
   */
  private buildOrderByClause(fields?: string[]): string | undefined {
    if (!fields || fields.length === 0) {
      return undefined;
    }

    // Validate field names and handle direction (asc/desc)
    const orderByFields = fields.map(field => {
      if (!field || typeof field !== 'string' || field.trim().length === 0) {
        throw new Error(`Invalid order by field: ${field}`);
      }

      // Check if field includes direction
      const parts = field.trim().split(/\s+/);
      if (parts.length === 1) {
        return field; // Default ascending
      }

      if (
        parts.length === 2 &&
        parts[1] &&
        ['asc', 'desc'].includes(parts[1].toLowerCase())
      ) {
        return field; // Valid field with direction
      }

      throw new Error(
        `Invalid order by field format: ${field}. Use 'field' or 'field asc/desc'`
      );
    });

    return orderByFields.join(',');
  }

  /**
   * Builds OData filter for period matching
   * Converts YYYY-MM format to date range filter
   */
  private buildPeriodFilter(period: string): string {
    this.validatePeriodFormat(period);

    const parts = period.split('-');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid period format: ${period}`);
    }

    const year = parts[0];
    const month = parts[1];
    const startDate = `${year}-${month}-01`;

    // Calculate end date (first day of next month)
    const monthNum = Number.parseInt(month, 10);
    const yearNum = Number.parseInt(year, 10);
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? yearNum + 1 : yearNum;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return `(Period ge datetime'${startDate}T00:00:00' and Period lt datetime'${endDate}T00:00:00')`;
  }

  /**
   * Builds the $select clause from field list
   */
  private buildSelectClause(fields?: string[]): string | undefined {
    if (!fields || fields.length === 0) {
      return undefined;
    }

    // Validate field names
    for (const field of fields) {
      if (!field || typeof field !== 'string' || field.trim().length === 0) {
        throw new Error(`Invalid field name: ${field}`);
      }
    }

    return fields.join(',');
  }

  /**
   * Gets the appropriate entity sets for a given report type
   */
  private getEntitySetsForReportType(reportType: ReportType): string[] {
    switch (reportType) {
      case ReportType.BalanceSheet: {
        return [
          'BalanceSheetAssets',
          'BalanceSheetLiabilities',
          'BalanceSheetEquity',
        ];
      }

      case ReportType.Cashflow: {
        return ['CashFlowOperating', 'CashFlowInvesting', 'CashFlowFinancing'];
      }

      case ReportType.IncomeStatement: {
        return ['IncomeStatementRevenue', 'IncomeStatementExpenses'];
      }

      default: {
        throw new Error(`Unsupported report type: ${reportType}`);
      }
    }
  }

  /**
   * Handles and transforms query builder errors into standardized ErrorResponse format
   */
  private handleQueryBuilderError(
    error: unknown,
    operation: string,
    context: Record<string, unknown>
  ): ErrorResponse {
    let code = 'QUERY_BUILDER_ERROR';
    let message = 'Query builder error occurred';
    let details = '';
    const suggestions: string[] = [];

    if (error instanceof Error) {
      message = error.message;
      details = error.message;

      // Provide specific suggestions based on error content
      if (error.message.includes('period format')) {
        code = 'INVALID_PERIOD_FORMAT';
        suggestions.push(
          'Use YYYY-MM format for period (e.g., "2025-01")',
          'Ensure month is between 01 and 12',
          'Ensure year is a 4-digit number between 1900 and 2100'
        );
      } else if (error.message.includes('report type')) {
        code = 'INVALID_REPORT_TYPE';
        suggestions.push(
          'Use a valid report type: BalanceSheet, IncomeStatement, or Cashflow',
          'Check the reportType field in your specification'
        );
      } else if (error.message.includes('entity')) {
        code = 'INVALID_ENTITY';
        suggestions.push(
          'Provide a non-empty entity name',
          'Check the entity field in your specification'
        );
      } else if (error.message.includes('filter')) {
        code = 'INVALID_FILTER';
        suggestions.push(
          'Check filter configuration - each filter needs field, operator, and value',
          'Use valid operators: eq, ne, gt, lt, ge, le',
          'Ensure filter values are strings or numbers'
        );
      } else {
        suggestions.push(
          'Check your query configuration',
          'Verify all required fields are provided',
          'Ensure data types are correct'
        );
      }
    } else {
      details = String(error);
      suggestions.push(
        'Check your query configuration',
        'Try again with valid parameters'
      );
    }

    return {
      context: {
        operation,
        originalError: error instanceof Error ? error.message : String(error),
        queryConfig: context,
      },
      error: {
        code,
        details,
        message,
        suggestions,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Validates filter configuration
   */
  private validateFilterConfig(filter: FilterConfig): void {
    if (!filter) {
      throw new Error('Filter configuration is required');
    }

    if (
      !filter.field ||
      typeof filter.field !== 'string' ||
      filter.field.trim().length === 0
    ) {
      throw new Error('Filter field must be a non-empty string');
    }

    const validOperators = ['eq', 'ne', 'gt', 'lt', 'ge', 'le'];
    if (!validOperators.includes(filter.operator)) {
      throw new Error(
        `Invalid filter operator: ${filter.operator}. Must be one of: ${validOperators.join(', ')}`
      );
    }

    if (filter.value === undefined || filter.value === null) {
      throw new Error('Filter value is required');
    }

    if (typeof filter.value !== 'string' && typeof filter.value !== 'number') {
      throw new TypeError('Filter value must be a string or number');
    }
  }

  /**
   * Validates period format (YYYY-MM)
   */
  private validatePeriodFormat(period: string): void {
    const periodRegex = /^\d{4}-\d{2}$/;
    if (!periodRegex.test(period)) {
      throw new Error(
        `Invalid period format: ${period}. Expected YYYY-MM format (e.g., 2025-01)`
      );
    }

    const parts = period.split('-');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid period format: ${period}`);
    }

    const year = parts[0];
    const month = parts[1];
    const yearNum = Number.parseInt(year, 10);
    const monthNum = Number.parseInt(month, 10);

    if (yearNum < 1900 || yearNum > 2100) {
      throw new Error(
        `Invalid year: ${year}. Year must be between 1900 and 2100`
      );
    }

    if (monthNum < 1 || monthNum > 12) {
      throw new Error(
        `Invalid month: ${month}. Month must be between 01 and 12`
      );
    }
  }

  /**
   * Validates the query configuration
   */
  private validateQueryConfig(config: QueryConfig): void {
    if (!config) {
      throw new Error('Query configuration is required');
    }

    if (
      !config.entity ||
      typeof config.entity !== 'string' ||
      config.entity.trim().length === 0
    ) {
      throw new Error('Entity must be a non-empty string');
    }

    if (!config.period || typeof config.period !== 'string') {
      throw new Error('Period must be a string');
    }

    this.validatePeriodFormat(config.period);

    if (!Object.values(ReportType).includes(config.reportType)) {
      throw new Error(
        `Invalid report type: ${config.reportType}. Must be one of: ${Object.values(ReportType).join(', ')}`
      );
    }

    if (config.filters) {
      for (const [index, filter] of config.filters.entries()) {
        try {
          this.validateFilterConfig(filter);
        } catch (error) {
          throw new Error(
            `Invalid filter at index ${index}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    if (
      config.top !== undefined &&
      (typeof config.top !== 'number' || config.top < 0)
    ) {
      throw new Error('Top must be a non-negative number');
    }

    if (
      config.skip !== undefined &&
      (typeof config.skip !== 'number' || config.skip < 0)
    ) {
      throw new Error('Skip must be a non-negative number');
    }
  }
}

/**
 * Default instance of QueryBuilder for convenience
 */
export const queryBuilder = new QueryBuilder();
