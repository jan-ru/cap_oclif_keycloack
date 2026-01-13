# Implementation Plan: Financial Reports CLI

## Overview

This implementation plan breaks down the Financial Reports CLI into discrete coding tasks that build incrementally toward a complete dual-mode solution (CLI + HTTP API). The approach focuses on establishing core infrastructure first, implementing YAML configuration support, then building out HTTP API capabilities, authentication, and multi-client integration features.

## Recent Architectural Changes

### ✅ YAML Configuration Support (Epic 01)
- **Status**: Completed
- **Reference**: `.github/issues/epic-01-yaml-support.md`
- **Impact**: Enhanced ConfigurationService to support both JSON and YAML formats with comments and multi-line strings
- **Requirements Added**: 1.1-1.7 (YAML parsing, validation, and error handling)

### 🔄 Planned Epics and Features
- **Epic 02**: HTTP API Mode (`.github/issues/epic-02-http-api.md`)
- **Feature 08**: Health Check Endpoints (`.github/issues/feature-08-health-check.md`)
- **Feature 09**: JWT Validation (`.github/issues/feature-09-jwt-validation.md`)
- Additional features for OpenUI5 integration, Excel PowerQuery support, and container deployment

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize oclif TypeScript project with proper configuration
  - Install and configure @sap-cloud-sdk/odata-v4 and related dependencies
  - Set up TypeScript configuration for strict type checking
  - Configure testing framework (Jest) with fast-check for property-based testing
  - _Requirements: 2.1, 4.2_

- [x] 2. Implement core data models and interfaces
  - [x] 2.1 Create TypeScript interfaces for report specifications and financial data
    - Define ReportSpecification, FinancialData, and related interfaces
    - Implement ReportType enum and validation types
    - Create error response interfaces
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Write property test for data model validation
    - **Property 1: Specification Parsing and Validation**
    - **Validates: Requirements 1.1, 1.4, 1.5, 5.5**

  - [x] 2.3 Write property test for report type support
    - **Property 2: Report Type Support**
    - **Validates: Requirements 1.2, 5.2**

- [x] 3. Implement YAML configuration parsing and validation
  - [x] 3.1 Create ConfigurationService for parsing YAML report specifications
    - Implement YAML parsing with comprehensive validation using js-yaml library
    - Add support for .yaml and .yml file extensions with automatic detection
    - Add period format validation (YYYY-MM)
    - Support inline comments and multi-line strings
    - Create descriptive error messages with line numbers for validation failures
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.5_
    - _Epic Reference: `.github/issues/epic-01-yaml-support.md`_

  - [x] 3.2 Write property test for period format validation
    - **Property 3: Period Format Validation**
    - **Validates: Requirements 1.3, 5.1**

  - [x] 3.3 Write comprehensive unit tests for YAML configuration parsing
    - Test valid YAML parsing (.yaml and .yml extensions)
    - Test comment and multi-line string handling
    - Test error handling for invalid syntax with line numbers
    - Test file extension detection and backward compatibility with JSON
    - Test malformed YAML, missing fields, invalid values
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 5.5_

- [x] 4. Implement OData client integration
  - [x] 4.1 Create FinancialDataClient wrapper around @sap-cloud-sdk
    - Implement typed OData v4 client initialization
    - Add authentication and connection configuration handling
    - Create methods for querying different financial entity types
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 4.2 Write property test for OData service configuration
    - **Property 4: OData Service Configuration**
    - **Validates: Requirements 2.3, 2.5, 5.3**

  - [x] 4.3 Implement query generation for financial reports
    - Create query builders for BalanceSheet, IncomeStatement, and Cashflow
    - Add period-based filtering logic
    - Handle entity-specific query parameters
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.4 Write property test for report query generation
    - **Property 5: Report Query Generation**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 5. Checkpoint - Ensure core services work together
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement output formatting system
  - [x] 6.1 Create OutputFormatter with multiple format support
    - Implement JSON, CSV, and table formatting methods
    - Add metadata inclusion in all output formats
    - Create human-readable table formatting for console output
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Write property test for structured output generation
    - **Property 6: Structured Output Generation**
    - **Validates: Requirements 3.5, 6.4**

  - [ ]\* 6.3 Write property test for output format support
    - **Property 11: Output Format Support**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 6.4 Implement file output redirection functionality
    - Add support for writing output to specified files
    - Handle file system errors gracefully
    - _Requirements: 6.5_

  - [ ]\* 6.5 Write property test for file output redirection
    - **Property 12: File Output Redirection**
    - **Validates: Requirements 6.5**

- [x] 7. Implement core business logic service
  - [x] 7.1 Create ReportService orchestrating the workflow
    - Integrate ConfigurationService, FinancialDataClient, and OutputFormatter
    - Implement end-to-end report generation logic
    - Add comprehensive error handling and logging
    - _Requirements: 3.5, 5.4_

  - [x] 7.2 Write property test for empty result handling
    - **Property 10: Empty Result Handling**
    - **Validates: Requirements 5.4**

  - [x] 7.3 Write integration tests for ReportService
    - Test complete workflow with mock OData services
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Implement CLI command interface
  - [x] 8.1 Create main ReportCommand using oclif framework
    - Implement command-line argument parsing and validation
    - Add support for specification file input
    - Configure output format and verbose options
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 8.2 Write property test for CLI argument processing
    - **Property 7: CLI Argument Processing**
    - **Validates: Requirements 4.1**

  - [x] 8.3 Implement proper exit code handling
    - Ensure success operations return exit code 0
    - Return appropriate non-zero codes for different error types
    - _Requirements: 4.3, 4.4_

  - [x] 8.4 Write property test for exit code consistency
    - **Property 8: Exit Code Consistency**
    - **Validates: Requirements 4.3, 4.4**

  - [x] 8.5 Add verbose output and help documentation
    - Implement verbose logging throughout the application
    - Create comprehensive help text and usage examples
    - _Requirements: 4.2, 4.5_

  - [x] 8.6 Write property test for verbose output behavior
    - **Property 9: Verbose Output Behavior**
    - **Validates: Requirements 4.5**

  - [x] 8.7 Write unit test for help documentation
    - Verify help text is available and comprehensive
    - _Requirements: 4.2_

- [-] 9. Final integration and error handling
  - [x] 9.1 Wire all components together in main CLI entry point
    - Connect ReportCommand to ReportService
    - Ensure proper dependency injection and configuration
    - Add global error handling and logging
    - _Requirements: All requirements integration_

  - [x] 9.2 Write end-to-end integration tests
    - Test complete workflows from CLI input to output generation
    - Test error scenarios and edge cases
    - _Requirements: All requirements_

- [x] 10. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all property-based tests run with minimum 100 iterations
  - Confirm all requirements are covered by implementation and tests

## Phase 2: HTTP API Mode and Multi-Client Integration

### Epic 02: HTTP API Mode Implementation

- [ ] 11. Implement HTTP API server infrastructure
  - [ ] 11.1 Set up Express.js server with TypeScript configuration
    - Create ApiServer class with start/stop methods
    - Configure middleware for JSON parsing, CORS, and error handling
    - Set up environment-based configuration loading
    - _Requirements: 7.1, 7.7, 8.3_
    - _Epic Reference: `.github/issues/epic-02-http-api.md`_

  - [ ] 11.2 Implement core API endpoints for report generation
    - Create POST /api/reports endpoint accepting JSON report specifications
    - Create GET /api/reports/:id endpoint for async report status
    - Implement request validation and error response formatting
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ] 11.3 Add health check endpoints for container orchestration
    - Implement GET /api/health endpoint with service status
    - Implement GET /api/health/ready and GET /api/health/live endpoints
    - Add dependency checks for OData and Keycloak services
    - _Requirements: 7.5_
    - _Feature Reference: `.github/issues/feature-08-health-check.md`_

- [ ] 12. Implement JWT authentication and authorization
  - [ ] 12.1 Create Keycloak JWT validation middleware
    - Implement JWT token validation using Keycloak public keys
    - Extract user information and roles from validated tokens
    - Handle token expiration and refresh scenarios
    - _Requirements: 9.1, 9.2, 9.3_
    - _Feature Reference: `.github/issues/feature-09-jwt-validation.md`_

  - [ ] 12.2 Implement role-based access control
    - Create authorization middleware for protected endpoints
    - Implement user context extraction for audit logging
    - Add support for service account authentication
    - _Requirements: 9.4, 9.5, 9.6, 9.7_

  - [ ] 12.3 Write property tests for authentication flows
    - **Property 14: JWT Authentication Validation**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 13. Implement asynchronous report processing
  - [ ] 13.1 Create async report queue and status tracking
    - Implement report job queue with Redis or in-memory storage
    - Create AsyncReportResult and AsyncReportStatus interfaces
    - Add progress tracking and completion notifications
    - _Requirements: 7.4, 7.5_

  - [ ] 13.2 Add WebSocket support for real-time status updates
    - Implement WebSocket endpoint for report status streaming
    - Create client-side JavaScript library for status monitoring
    - Add connection management and reconnection logic
    - _Requirements: 8.1, 8.2_

### Epic 03: Multi-Client Integration Support

- [ ] 14. Implement OpenUI5 and CAP service integration
  - [ ] 14.1 Create CAP service integration endpoints
    - Implement POST /api/cap/reports endpoint for CAP service calls
    - Add request/response transformation for CAP compatibility
    - Create integration documentation and examples
    - _Requirements: 8.1, 8.4_

  - [ ] 14.2 Add Excel PowerQuery integration support
    - Implement GET /api/powerquery/reports endpoint with OData-like responses
    - Create PowerQuery M language integration examples
    - Add query parameter parsing for Excel compatibility
    - _Requirements: 8.2, 8.6_

  - [ ] 14.3 Write integration tests for multi-client scenarios
    - **Property 15: Multi-Client Integration Support**
    - **Validates: Requirements 8.1, 8.2, 8.3**

### Epic 04: Container Deployment and DevOps

- [ ] 15. Implement Docker containerization
  - [ ] 15.1 Create multi-stage Dockerfile for production deployment
    - Implement optimized Docker build with minimal base image
    - Configure non-root user and security best practices
    - Add health check configuration for container orchestration
    - _Requirements: 8.3, 8.7_

  - [ ] 15.2 Create Docker Compose setup for development
    - Configure multi-container setup with Keycloak and mock OData service
    - Add environment variable configuration and secrets management
    - Create development and testing compose configurations
    - _Requirements: 8.7_

  - [ ] 15.3 Add Coolify deployment configuration
    - Create Coolify deployment templates and documentation
    - Configure environment variable management for production
    - Set up SSL/TLS and domain configuration
    - Add monitoring and logging configuration
    - _Requirements: 8.7_

- [ ] 16. Final integration testing and documentation
  - [ ] 16.1 Write comprehensive end-to-end tests
    - Test complete workflows from CLI and API modes
    - Test multi-client integration scenarios
    - Test authentication and authorization flows
    - Test container deployment and health checks
    - _Requirements: All requirements integration_

  - [ ] 16.2 Create deployment and integration documentation
    - Write OpenUI5 integration guide with code examples
    - Write Excel PowerQuery integration guide with M language examples
    - Write Docker deployment guide for production
    - Write Keycloak configuration guide for authentication setup
    - _Requirements: 8.1, 8.2, 8.7, 9.1_

## Notes

- **Phase 1 (Completed)**: Core CLI functionality with YAML configuration support
- **Phase 2 (Planned)**: HTTP API mode, JWT authentication, and multi-client integration
- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Integration tests ensure components work together correctly
- Checkpoints provide opportunities for validation and user feedback
- Epic and feature references provide traceability to original requirements
- Container deployment tasks support production-ready deployment on Coolify/Hetzner

## Implementation Status

### ✅ Completed Features
- Core CLI functionality with oclif framework
- YAML configuration parsing with comments and multi-line strings
- OData v4 client integration with @sap-cloud-sdk
- Multiple output formats (JSON, CSV, table)
- Comprehensive error handling and validation
- Property-based testing with fast-check
- Exit code consistency and verbose output

### 🔄 In Progress
- HTTP API mode implementation
- JWT authentication with Keycloak integration
- Multi-client integration support

### 📋 Planned Features
- Asynchronous report processing
- WebSocket real-time status updates
- OpenUI5 and CAP service integration
- Excel PowerQuery integration
- Docker containerization and Coolify deployment
- Health check endpoints for container orchestration

## Architecture Evolution

The implementation has evolved from a simple CLI tool to a comprehensive dual-mode application supporting:

1. **CLI Mode**: Traditional command-line interface with YAML specifications
2. **HTTP API Mode**: RESTful API for web application integration
3. **Multi-Client Support**: OpenUI5, Excel PowerQuery, and CAP service integration
4. **Enterprise Authentication**: Keycloak JWT-based security
5. **Container Deployment**: Docker and Coolify production deployment

This evolution maintains backward compatibility while significantly expanding the tool's capabilities and integration potential.
