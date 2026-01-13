import {
  ErrorResponse,
  FinancialData,
  ReportMetadata,
  ReportOptions,
  ReportResult,
  ReportSpecification,
  ReportType,
} from '../types/index.js';
import { ConfigurationService } from './configuration.js';
import {
  createFinancialDataClient,
  FinancialDataClient,
} from './financial-data-client.js';
import { OutputFormatter } from './output-formatter.js';

/**
 * Core service that orchestrates the end-to-end report generation workflow
 * Integrates configuration parsing, data retrieval, and output formatting
 */
export class ReportService {
  private configurationService: ConfigurationService;
  private outputFormatter: OutputFormatter;

  constructor(
    configurationService?: ConfigurationService,
    outputFormatter?: OutputFormatter
  ) {
    this.configurationService =
      configurationService || new ConfigurationService();
    this.outputFormatter = outputFormatter || new OutputFormatter();
  }

  /**
   * Formats report data for output without writing to file
   * @param data Financial data to format
   * @param metadata Report metadata
   * @param options Report options containing output format
   * @returns Formatted string output
   */
  formatOutput(
    data: FinancialData[],
    metadata: ReportMetadata,
    options: ReportOptions
  ): string {
    return this.outputFormatter.format(data, metadata, options.outputFormat);
  }

  /**
   * Generates a financial report based on a specification file
   * @param specFile Path to the report specification file
   * @param options Report generation options
   * @returns Promise resolving to the complete report result
   * @throws ErrorResponse if any step in the process fails
   */
  async generateReport(
    specFile: string,
    options: ReportOptions
  ): Promise<ReportResult> {
    const startTime = Date.now();

    try {
      if (options.verbose) {
        console.log(
          `Starting report generation from specification: ${specFile}`
        );
      }

      // Step 1: Parse and validate the specification
      if (options.verbose) {
        console.log('Parsing report specification...');
      }

      const specification =
        await this.configurationService.parseSpecification(specFile);

      if (options.verbose) {
        console.log(`Specification parsed successfully:`, {
          entity: specification.entity,
          filterCount: specification.filters?.length || 0,
          hasDestination: Boolean(specification.destination),
          period: specification.period,
          reportType: specification.reportType,
        });
      }

      // Step 2: Create and configure the financial data client
      if (options.verbose) {
        console.log('Initializing financial data client...');
      }

      const dataClient = this.createDataClient(specification);

      // Step 3: Test connection if verbose mode is enabled
      if (options.verbose && specification.destination) {
        console.log('Testing OData service connection...');
        try {
          await dataClient.testConnection();
          console.log('Connection test successful');
        } catch {
          console.log(
            'Connection test failed, but continuing with data retrieval...'
          );
        }
      }

      // Step 4: Retrieve financial data based on report type
      if (options.verbose) {
        console.log(
          `Retrieving ${specification.reportType} data for entity ${specification.entity}, period ${specification.period}...`
        );
      }

      const financialData = await this.retrieveFinancialData(
        dataClient,
        specification
      );

      if (options.verbose) {
        console.log(
          `Data retrieval completed. Found ${financialData.length} report(s) with ${financialData.reduce((sum, report) => sum + report.lineItems.length, 0)} total line items`
        );
      }

      // Step 5: Handle empty results (Requirement 5.4)
      if (
        financialData.every(report => report.lineItems.length === 0)
      ) {
        if (options.verbose) {
          console.log('No matching records found for the specified criteria');
        }

        // Create empty result with appropriate metadata
        const executionTime = Date.now() - startTime;
        const metadata: ReportMetadata = {
          entity: specification.entity,
          executionTime,
          generatedAt: new Date(),
          period: specification.period,
          recordCount: 0,
          reportType: specification.reportType,
        };

        return {
          data: [],
          metadata,
        };
      }

      // Step 6: Create metadata
      const executionTime = Date.now() - startTime;
      const recordCount = financialData.reduce(
        (sum, report) => sum + report.lineItems.length,
        0
      );

      const metadata: ReportMetadata = {
        entity: specification.entity,
        executionTime,
        generatedAt: new Date(),
        period: specification.period,
        recordCount,
        reportType: specification.reportType,
      };

      if (options.verbose) {
        console.log(`Report generation completed in ${executionTime}ms`);
      }

      // Step 7: Format and output the results (Requirement 3.5)
      const result: ReportResult = {
        data: financialData,
        metadata,
      };

      // Handle file output if destination is specified
      if (options.destination) {
        if (options.verbose) {
          console.log(`Writing output to file: ${options.destination}`);
        }

        await this.outputFormatter.writeToFile(
          financialData,
          metadata,
          options.outputFormat,
          options.destination
        );

        if (options.verbose) {
          console.log('File output completed successfully');
        }
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (options.verbose) {
        console.error(
          `Report generation failed after ${executionTime}ms:`,
          error
        );
      }

      // If it's already an ErrorResponse, re-throw it
      if (this.isErrorResponse(error)) {
        throw error;
      }

      // Handle unexpected errors
      throw this.createErrorResponse(
        'REPORT_GENERATION_ERROR',
        'Failed to generate financial report',
        {
          context: {
            executionTime,
            options,
            originalError:
              error instanceof Error ? error.message : String(error),
            specFile,
          },
          details: error instanceof Error ? error.message : String(error),
          suggestions: [
            'Check the specification file format and content',
            'Verify OData service connectivity',
            'Ensure all required fields are present in the specification',
          ],
        }
      );
    }
  }

  /**
   * Validates a report specification file without executing the report
   * @param specFile Path to the specification file
   * @returns Promise resolving to the parsed and validated specification
   */
  async validateSpecification(specFile: string): Promise<ReportSpecification> {
    return this.configurationService.parseSpecification(specFile);
  }

  /**
   * Creates a financial data client based on the specification
   */
  private createDataClient(
    specification: ReportSpecification
  ): FinancialDataClient {
    // Use destination from specification if provided, otherwise use a default
    const destination = specification.destination || {
      url: 'http://localhost:4004/odata/v4/financial',
    };

    return createFinancialDataClient(destination);
  }

  /**
   * Creates a standardized error response
   */
  private createErrorResponse(
    code: string,
    message: string,
    options?: {
      context?: Record<string, unknown>;
      details?: string;
      suggestions?: string[];
    }
  ): ErrorResponse {
    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        ...(options?.details && { details: options.details }),
        ...(options?.suggestions && { suggestions: options.suggestions }),
      },
      timestamp: new Date(),
    };

    if (options?.context) {
      errorResponse.context = options.context;
    }

    return errorResponse;
  }

  /**
   * Type guard to check if an object is an ErrorResponse
   */
  private isErrorResponse(obj: unknown): obj is ErrorResponse {
    return Boolean(
      obj &&
      typeof obj === 'object' &&
      'error' in obj &&
      typeof (obj as ErrorResponse).error.code === 'string' &&
      typeof (obj as ErrorResponse).error.message === 'string' &&
      'timestamp' in obj &&
      (obj as ErrorResponse).timestamp instanceof Date
    );
  }

  /**
   * Retrieves financial data based on the report type and specification
   */
  private async retrieveFinancialData(
    dataClient: FinancialDataClient,
    specification: ReportSpecification
  ): Promise<FinancialData[]> {
    const { entity, filters, period, reportType } = specification;

    try {
      switch (reportType) {
        case ReportType.BalanceSheet: {
          const balanceSheetData = await dataClient.queryBalanceSheet(
            entity,
            period,
            filters
          );
          return balanceSheetData as FinancialData[];
        }

        case ReportType.Cashflow: {
          const cashFlowData = await dataClient.queryCashFlow(
            entity,
            period,
            filters
          );
          return cashFlowData as FinancialData[];
        }

        case ReportType.IncomeStatement: {
          const incomeStatementData = await dataClient.queryIncomeStatement(
            entity,
            period,
            filters
          );
          return incomeStatementData as FinancialData[];
        }

        default: {
          throw this.createErrorResponse(
            'UNSUPPORTED_REPORT_TYPE',
            'Unsupported report type specified',
            {
              context: {
                reportType,
                supportedTypes: Object.values(ReportType),
              },
              details: `Report type '${reportType}' is not supported`,
              suggestions: [
                `Use one of the supported report types: ${Object.values(ReportType).join(', ')}`,
                'Check the specification file for typos in the reportType field',
              ],
            }
          );
        }
      }
    } catch (error) {
      // If it's already an ErrorResponse, re-throw it
      if (this.isErrorResponse(error)) {
        throw error;
      }

      // Handle data retrieval errors
      throw this.createErrorResponse(
        'DATA_RETRIEVAL_ERROR',
        'Failed to retrieve financial data',
        {
          context: {
            entity,
            originalError:
              error instanceof Error ? error.message : String(error),
            period,
            reportType,
          },
          details: error instanceof Error ? error.message : String(error),
          suggestions: [
            'Check OData service connectivity',
            'Verify the entity name exists in the service',
            'Ensure the period format is correct (YYYY-MM)',
            'Check authentication credentials if required',
          ],
        }
      );
    }
  }
}

/**
 * Default instance of ReportService for convenience
 */
export const reportService = new ReportService();
