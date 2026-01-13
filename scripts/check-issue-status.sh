#!/bin/bash

# Local Issue Status Checker
# This script helps you check which GitHub issues are completed locally

echo "🔍 Local Issue Status Check"
echo "=========================="
echo ""

# Function to check if an issue is mentioned in commits
check_commit_status() {
    local issue_name="$1"
    local commit_count=$(git log --oneline --grep="$issue_name" --grep="Closes: $issue_name" | wc -l)
    if [ $commit_count -gt 0 ]; then
        echo "✅ Found in commits"
        git log --oneline --grep="$issue_name" --grep="Closes: $issue_name" | head -1
    else
        echo "❌ Not found in commits"
    fi
}

# Function to check if related code exists
check_code_exists() {
    local pattern="$1"
    local description="$2"
    if find src/ -name "*.ts" -exec grep -l "$pattern" {} \; 2>/dev/null | head -1 >/dev/null; then
        echo "✅ $description implemented"
    else
        echo "❌ $description not found"
    fi
}

echo "📋 EPICS STATUS:"
echo "=================="

echo ""
echo "Epic 01: YAML Support"
echo "---------------------"
check_commit_status "epic-01-yaml-support"
check_code_exists "js-yaml" "YAML parsing"
echo ""

echo "Epic 02: HTTP API Mode"
echo "----------------------"
check_commit_status "epic-02-http-api"
check_code_exists "express" "Express.js server"
check_code_exists "ApiServer" "API server class"
echo ""

echo "Epic 03: Keycloak Authentication"
echo "--------------------------------"
check_commit_status "epic-03-keycloak-auth"
check_code_exists "jwt" "JWT authentication"
echo ""

echo "Epic 04: Multi-Client Integration"
echo "---------------------------------"
check_commit_status "epic-04-multi-client-integration"
check_code_exists "powerquery" "PowerQuery support"
echo ""

echo ""
echo "🎯 FEATURES STATUS:"
echo "==================="

echo ""
echo "Feature 05: YAML Parsing"
echo "------------------------"
check_commit_status "feature-05-yaml-parsing"
check_code_exists "\.yaml.*\.yml" "YAML file support"
echo ""

echo "Feature 06: YAML Validation"
echo "---------------------------"
check_commit_status "feature-06-yaml-validation"
check_code_exists "validateReportSpecification" "YAML validation"
echo ""

echo "Feature 07: HTTP API"
echo "--------------------"
check_commit_status "feature-07-http-api"
check_code_exists "/api/" "API endpoints"
echo ""

echo "Feature 08: Health Check"
echo "------------------------"
check_commit_status "feature-08-health-check"
check_code_exists "/health" "Health check endpoint"
echo ""

echo "Feature 09: JWT Validation"
echo "--------------------------"
check_commit_status "feature-09-jwt-validation"
check_code_exists "jwt.*validation" "JWT validation"
echo ""

echo "Feature 10: PowerQuery Compatibility"
echo "------------------------------------"
check_commit_status "feature-10-powerquery-compatibility"
check_code_exists "powerquery" "PowerQuery compatibility"
echo ""

echo "Feature 11: Docker Container"
echo "----------------------------"
check_commit_status "feature-11-docker-container"
if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile exists"
else
    echo "❌ Dockerfile not found"
fi
echo ""

echo "Feature 12: CORS Support"
echo "------------------------"
check_commit_status "feature-12-cors-support"
check_code_exists "cors" "CORS middleware"
echo ""

echo ""
echo "📊 SUMMARY:"
echo "==========="
echo "Run this script anytime to check local issue status"
echo "For detailed analysis, check: issue-status-check.md"
echo ""
echo "💡 TIP: Use 'git log --oneline --grep=\"Closes:\"' to see completed issues"