import {
  ReportSpecification,
  ReportType,
  ValidationError,
  ValidationResult,
} from './index.js';

/**
 * Validates if a string is a valid ReportType
 */
export function isValidReportType(value: string): value is ReportType {
  return Object.values(ReportType).includes(value as ReportType);
}

/**
 * Validates if a string matches the YYYY-MM period format
 */
export function isValidPeriodFormat(period: string): boolean {
  const periodRegex = /^\d{4}-\d{2}$/;
  if (!periodRegex.test(period)) {
    return false;
  }

  const parts = period.split('-');
  if (parts.length !== 2) {
    return false;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);

  return (
    !Number.isNaN(year) &&
    !Number.isNaN(month) &&
    year >= 1900 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12
  );
}

/**
 * Validates a report specification object
 */
export function validateReportSpecification(spec: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Handle null, undefined, or non-object inputs
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    errors.push({
      code: 'MISSING_ENTITY',
      field: 'entity',
      message: 'Entity is required and must be a string',
    }, {
      code: 'MISSING_REPORT_TYPE',
      field: 'reportType',
      message: 'Report type is required',
    }, {
      code: 'MISSING_PERIOD',
      field: 'period',
      message: 'Period is required',
    });
    return {
      errors,
      isValid: false,
    };
  }

  const reportSpec = spec as ReportSpecification;

  // Check required fields
  if (!reportSpec.entity || typeof reportSpec.entity !== 'string') {
    errors.push({
      code: 'MISSING_ENTITY',
      field: 'entity',
      message: 'Entity is required and must be a string',
    });
  }

  if (!reportSpec.reportType) {
    errors.push({
      code: 'MISSING_REPORT_TYPE',
      field: 'reportType',
      message: 'Report type is required',
    });
  } else if (!isValidReportType(reportSpec.reportType)) {
    errors.push({
      code: 'INVALID_REPORT_TYPE',
      field: 'reportType',
      message: `Invalid report type. Must be one of: ${Object.values(ReportType).join(', ')}`,
    });
  }

  if (!reportSpec.period) {
    errors.push({
      code: 'MISSING_PERIOD',
      field: 'period',
      message: 'Period is required',
    });
  } else if (!isValidPeriodFormat(reportSpec.period)) {
    errors.push({
      code: 'INVALID_PERIOD_FORMAT',
      field: 'period',
      message: 'Period must be in YYYY-MM format (e.g., 2025-01)',
    });
  }

  // Validate optional destination config
  if (
    reportSpec.destination &&
    (!reportSpec.destination?.url ||
      typeof reportSpec.destination?.url !== 'string')
  ) {
    errors.push({
      code: 'INVALID_DESTINATION_URL',
      field: 'destination.url',
      message: 'Destination URL is required and must be a string',
    });
  }

  // Validate optional filters
  if (reportSpec.filters && Array.isArray(reportSpec.filters)) {
    for (const [index, filter] of (reportSpec.filters || []).entries()) {
      const filterObj = filter as unknown as Record<string, unknown>;
      if (!filterObj.field || typeof filterObj.field !== 'string') {
        errors.push({
          code: 'INVALID_FILTER_FIELD',
          field: `filters[${index}].field`,
          message: 'Filter field is required and must be a string',
        });
      }

      const validOperators = ['eq', 'ne', 'gt', 'lt', 'ge', 'le'];
      if (
        !filterObj.operator ||
        !validOperators.includes(filterObj.operator as string)
      ) {
        errors.push({
          code: 'INVALID_FILTER_OPERATOR',
          field: `filters[${index}].operator`,
          message: `Filter operator must be one of: ${validOperators.join(', ')}`,
        });
      }

      if (filterObj.value === undefined || filterObj.value === null) {
        errors.push({
          code: 'MISSING_FILTER_VALUE',
          field: `filters[${index}].value`,
          message: 'Filter value is required',
        });
      }
    }
  }

  return {
    errors,
    isValid: errors.length === 0,
  };
}

/**
 * Type guard to check if an object is a valid ReportSpecification
 */
export function isReportSpecification(
  obj: unknown
): obj is ReportSpecification {
  const validation = validateReportSpecification(obj);
  return validation.isValid;
}
