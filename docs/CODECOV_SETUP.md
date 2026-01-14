# Codecov Setup Guide

This guide explains how to set up code coverage reporting with Codecov for your GitHub repository.

## Current Status

✅ Your CI/CD pipeline already generates coverage reports  
✅ Coverage data is uploaded to Codecov in the workflow  
❓ Need to configure Codecov token for badge to work

## Quick Setup (5 minutes)

### 1. Sign Up for Codecov

1. Go to [codecov.io](https://codecov.io)
2. Click **Sign up with GitHub**
3. Authorize Codecov to access your repositories

### 2. Add Your Repository

1. Once logged in, you'll see your repositories
2. Find `jan-ru/cap_oclif_keycloack`
3. If not visible, click **Add new repository**
4. Select your repository from the list

### 3. Get Your Codecov Token

1. Click on your repository in Codecov
2. Go to **Settings** → **General**
3. Copy the **Repository Upload Token**
4. Save this token securely

### 4. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `CODECOV_TOKEN`
5. Value: (paste your token from step 3)
6. Click **Add secret**

### 5. Update GitHub Actions Workflow

Your workflow already has Codecov integration, but let's make sure it uses the token:

Edit `.github/workflows/ci.yml` and update the Codecov step:

```yaml
- name: 📈 Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  if: matrix.node-version == '20.x'
  with:
    token: ${{ secrets.CODECOV_TOKEN }}  # Add this line
    file: ./coverage/lcov.info
    fail_ci_if_error: false
    verbose: true
```

### 6. Update README Badge

The badge in your README is already updated to:

```markdown
[![codecov](https://codecov.io/gh/jan-ru/cap_oclif_keycloack/branch/main/graph/badge.svg?token=YOUR_CODECOV_TOKEN)](https://codecov.io/gh/jan-ru/cap_oclif_keycloack)
```

**Replace `YOUR_CODECOV_TOKEN`** with your actual badge token:

1. In Codecov, go to your repository
2. Click **Settings** → **Badge**
3. Copy the badge markdown
4. Replace the badge in README.md

**Example**:
```markdown
[![codecov](https://codecov.io/gh/jan-ru/cap_oclif_keycloack/branch/main/graph/badge.svg?token=ABC123XYZ)](https://codecov.io/gh/jan-ru/cap_oclif_keycloack)
```

### 7. Trigger a Build

1. Push a commit to trigger the CI/CD pipeline
2. Wait for the workflow to complete
3. Check Codecov dashboard for coverage report
4. Verify badge appears in README

## Alternative: Use Shields.io Badge (No Token Required)

If you want a simpler badge without needing a token:

```markdown
[![Coverage](https://img.shields.io/codecov/c/github/jan-ru/cap_oclif_keycloack?style=flat-square)](https://codecov.io/gh/jan-ru/cap_oclif_keycloack)
```

This badge will automatically update once Codecov receives coverage data.

## Verify Coverage is Working

### Check CI/CD Logs

1. Go to **Actions** tab in GitHub
2. Click on latest workflow run
3. Expand **Run tests with coverage** step
4. You should see coverage summary

### Check Codecov Dashboard

1. Go to [codecov.io](https://codecov.io)
2. Navigate to your repository
3. You should see:
   - Overall coverage percentage
   - Coverage by file
   - Coverage trends over time
   - Pull request coverage changes

## Current Coverage Report

Your project generates coverage in these formats:
- `coverage/lcov.info` - For Codecov
- `coverage/index.html` - For local viewing
- `coverage/lcov-report/` - Detailed HTML reports

### View Coverage Locally

```bash
# Run tests with coverage
npm run test:coverage

# Open coverage report in browser
open coverage/index.html
# Or on Linux:
xdg-open coverage/index.html
```

## Coverage Configuration

Your coverage is configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});
```

## Improving Coverage

### Current Coverage Areas

Your project has tests for:
- ✅ Authentication services
- ✅ API endpoints
- ✅ Configuration management
- ✅ Report generation
- ✅ Property-based tests

### To Improve Coverage

1. **Run coverage report**:
   ```bash
   npm run test:coverage
   ```

2. **Identify uncovered code**:
   - Open `coverage/index.html`
   - Look for red/yellow highlighted code
   - Focus on critical paths first

3. **Add tests for uncovered code**:
   - Error handling paths
   - Edge cases
   - Integration points

4. **Set coverage thresholds** in `vitest.config.ts`:
   ```typescript
   coverage: {
     lines: 80,
     functions: 80,
     branches: 80,
     statements: 80,
   }
   ```

## Codecov Features

### Pull Request Comments

Codecov automatically comments on PRs with:
- Coverage changes
- New uncovered lines
- Coverage comparison with base branch

### Coverage Trends

Track coverage over time:
- Overall project coverage
- Per-file coverage
- Coverage by commit

### Sunburst Chart

Visual representation of coverage by directory and file.

### Flags

Separate coverage for different test types:

```yaml
- name: 📈 Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    file: ./coverage/lcov.info
    flags: unittests
    name: unit-tests
```

## Troubleshooting

### Badge Not Showing

**Issue**: Badge shows "unknown" or doesn't load

**Solutions**:
1. Verify Codecov received coverage data
2. Check token is correct in badge URL
3. Ensure repository is public or token is valid
4. Wait a few minutes for Codecov to process data

### Coverage Not Uploading

**Issue**: Codecov action fails in CI/CD

**Solutions**:
1. Check `CODECOV_TOKEN` secret is set
2. Verify `coverage/lcov.info` file exists
3. Check Codecov action version is up to date
4. Review CI/CD logs for errors

### Low Coverage Percentage

**Issue**: Coverage is lower than expected

**Solutions**:
1. Check coverage excludes in `vitest.config.ts`
2. Ensure all test files are running
3. Add tests for uncovered code
4. Review coverage report for gaps

## Best Practices

### 1. Set Coverage Goals

```typescript
// vitest.config.ts
coverage: {
  lines: 80,        // 80% line coverage
  functions: 80,    // 80% function coverage
  branches: 75,     // 75% branch coverage
  statements: 80,   // 80% statement coverage
}
```

### 2. Exclude Non-Critical Files

```typescript
coverage: {
  exclude: [
    'node_modules/',
    'dist/',
    'test/',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/types.ts',      // Type definitions
    '**/index.ts',      // Re-exports
    '**/*.config.ts',   // Config files
  ],
}
```

### 3. Monitor Coverage in PRs

- Review Codecov PR comments
- Don't merge PRs that decrease coverage significantly
- Add tests for new features before merging

### 4. Track Coverage Trends

- Set up Codecov notifications
- Review coverage dashboard weekly
- Celebrate coverage improvements!

## Additional Resources

- [Codecov Documentation](https://docs.codecov.com/)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [Coverage Best Practices](https://docs.codecov.com/docs/common-recipe-list)

## Summary

After setup, you'll have:
- ✅ Automatic coverage reporting on every push
- ✅ Coverage badge in README
- ✅ Coverage trends over time
- ✅ PR coverage comments
- ✅ Detailed coverage reports

Your coverage badge will show the current coverage percentage and update automatically with each push to main.
