# Feature: Implement HTTP REST API endpoints

## Feature Description

Add HTTP REST API endpoints to enable the CLI tool to operate as a web service, supporting integration with CAP services and web applications.

## User Story

**As a** CAP service developer  
**I want** to call the financial reports tool via HTTP API  
**So that** I can integrate report generation into my service handlers and provide data to OpenUI5 applications

## Status
✅ **COMPLETE** - HTTP API fully implemented in v0.1.4-0.1.6 with authentication integration.

## Acceptance Criteria

- [x] HTTP server starts when CLI is run in API mode
- [x] POST /api/generate-report endpoint accepts JSON specification
- [x] API returns JSON responses with proper HTTP status codes
- [x] Same business logic used for both CLI and API modes
- [x] Error responses include structured error information
- [x] API supports all output formats (json, csv, table)
- [x] Request/response logging implemented
- [x] API documentation generated

## Requirements Reference

**Validates Requirements:** 7.1, 7.2, 7.3, 7.4

## Technical Notes

- Use Express.js for HTTP server
- Create dual-mode startup (CLI vs API)
- Share ReportService between CLI and API
- Add proper error handling middleware
- Structure: `src/api-server.ts`, `src/routes/reports.ts`

## Definition of Done

- [x] Code implemented and tested
- [x] Unit tests for API endpoints
- [x] Integration tests for HTTP requests
- [x] API documentation updated
- [x] Pre-commit hooks pass
- [x] Code reviewed and approved

## Implementation Notes
- HTTP API server implemented with Express.js in v0.1.4
- Authentication middleware integrated in v0.1.5
- Property-based testing added in v0.1.6
- Health check endpoints fully functional
- CORS support implemented
- All acceptance criteria met

## API Specification

```
POST /api/generate-report
Content-Type: application/json

{
  "entity": "ACME_Corp",
  "reportType": "BalanceSheet",
  "period": "2025-01",
  "destination": {
    "url": "http://localhost:4004/odata/v4/financial"
  }
}

Response: 200 OK
{
  "data": [...],
  "metadata": {...}
}
```
