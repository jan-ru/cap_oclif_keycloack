# Feature: Replace JSON with YAML specification parsing

## Feature Description

Replace the current JSON specification file parser with YAML parser to improve human readability and reduce syntax errors.

## User Story

**As a** financial analyst  
**I want** to write report specifications in YAML format  
**So that** I can easily read, edit, and maintain my report configurations with comments and cleaner syntax

## Acceptance Criteria

- [x] CLI accepts both .yaml and .yml file extensions
- [x] YAML parser correctly parses all existing specification fields
- [x] Inline comments are preserved and don't cause parsing errors
- [x] Multi-line strings work correctly for descriptions
- [x] Error messages are clear and include line numbers when possible
- [x] All existing tests pass with YAML specifications
- [x] Documentation updated with YAML examples

## Requirements Reference

**Validates Requirements:** 1.1, 1.5, 1.6, 1.7

## Technical Notes

- Use `js-yaml` library for parsing
- Update `ConfigurationService.parseSpecification()` method
- Add file extension detection (.yaml, .yml)
- Maintain backward compatibility during transition
- Update error handling for YAML-specific errors

## Definition of Done

- [x] Code implemented and tested
- [x] Unit tests written and passing
- [x] Integration tests updated with YAML files
- [x] Documentation updated with YAML examples
- [x] Pre-commit hooks pass
- [x] Code reviewed and approved

## Example YAML Specification

```yaml
# Financial Report Specification
entity: ACME_Corp
reportType: BalanceSheet
period: 2025-01

destination:
  url: http://localhost:4004/odata/v4/financial
  authentication:
    type: basic
    username: user
    password: pass

# Filter to show only Assets
filters:
  - field: Category
    operator: eq
    value: Assets
```
