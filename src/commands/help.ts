import { Command } from '@oclif/core';

/**
 * Enhanced help command providing comprehensive usage information
 * Implements Requirement 4.2: Help documentation for all available commands and options
 */
export default class Help extends Command {
  static override description = `Display comprehensive help information for the Financial Reports CLI

This command provides detailed usage instructions, examples, and troubleshooting information
for generating financial reports from OData v4 datasources.`;
static override examples = [
    `<%= config.bin %> <%= command.id %>
Display this comprehensive help information`,

    `<%= config.bin %> help report
Get specific help for the report command`,
  ];

  async run(): Promise<void> {
    await this.parse(Help);

    this.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                          Financial Reports CLI                               ║
║                     Generate Reports from OData v4 Services                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

OVERVIEW
  The Financial Reports CLI is a command-line tool that connects to OData v4 
  services (such as SAP CAP services) to retrieve and format financial data 
  based on JSON specification files.

QUICK START
  1. Create a report specification file (JSON format)
  2. Run: financial-reports-cli report ./your-spec.json
  3. View your formatted financial report

MAIN COMMAND
  report <specFile>     Generate a financial report from a specification file

GLOBAL OPTIONS
  --help               Show help information
  --version            Show version information

REPORT COMMAND OPTIONS
  -o, --output FORMAT  Output format: json (default), csv, or table
  -v, --verbose        Enable detailed logging and debugging information  
  -d, --destination    File path to save output (console if not specified)

REPORT SPECIFICATION FORMAT
  Create a JSON file with the following structure:

  {
    "entity": "CompanyEntity",           // Required: Entity name in OData service
    "reportType": "BalanceSheet",        // Required: BalanceSheet|IncomeStatement|Cashflow
    "period": "2025-01",                 // Required: Period in YYYY-MM format
    "destination": {                     // Optional: OData service configuration
      "url": "http://localhost:4004/odata/v4/financial",
      "authentication": {                // Optional: Authentication details
        "type": "basic",                 // basic|bearer|oauth
        "username": "user",
        "password": "password"
      }
    },
    "filters": [                         // Optional: Additional filters
      {
        "field": "department",
        "operator": "eq",                // eq|ne|gt|lt|ge|le
        "value": "Finance"
      }
    ]
  }

SUPPORTED REPORT TYPES
  BalanceSheet      Assets, liabilities, and equity information
  IncomeStatement   Revenue, expenses, and net income data
  Cashflow          Operating, investing, and financing cash flows

OUTPUT FORMATS
  json (default)    Structured JSON with complete metadata
  csv               Comma-separated values for spreadsheet import
  table             Human-readable console table format

EXAMPLES
  # Basic report generation
  financial-reports-cli report ./balance-sheet.json

  # Generate CSV report with verbose logging
  financial-reports-cli report ./income-stmt.json --output csv --verbose

  # Save report to file
  financial-reports-cli report ./cashflow.json --output json --destination ./reports/q1-cashflow.json

  # Table format for console viewing
  financial-reports-cli report ./balance-sheet.json --output table

EXIT CODES
  0    Success - Report generated successfully
  1    General application error
  2    File or resource not found (specification file, entity, etc.)
  3    Validation or input error (invalid format, missing fields, etc.)
  4    Network or connection error (OData service unreachable, etc.)
  5    Permission or access error (file write permissions, etc.)

TROUBLESHOOTING
  • File not found errors (exit code 2):
    - Check that the specification file path is correct
    - Ensure the file exists and is readable

  • Validation errors (exit code 3):
    - Verify JSON syntax in specification file
    - Check that all required fields are present
    - Ensure period format is YYYY-MM
    - Verify reportType is one of: BalanceSheet, IncomeStatement, Cashflow

  • Connection errors (exit code 4):
    - Check OData service URL is correct and accessible
    - Verify network connectivity
    - Check authentication credentials if required
    - Ensure OData service is running

  • Permission errors (exit code 5):
    - Check file write permissions for destination directory
    - Ensure destination directory exists

  • Use --verbose flag for detailed error information and debugging

GETTING HELP
  financial-reports-cli help           Show this help information
  financial-reports-cli help report    Show detailed help for report command
  financial-reports-cli --version      Show version information

For more information, visit: https://github.com/jan-ru/financial-reports-cli
`);
  }
}
