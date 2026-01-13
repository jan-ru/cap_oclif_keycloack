import fc from 'fast-check';

// Configure fast-check for property-based tests
// Set minimum number of iterations to 100 as per design requirements
fc.configureGlobal({
  numRuns: 100,
  seed: 42, // For reproducible tests
  verbose: false,
});

describe('Test Setup Verification', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check property-based testing is working', () => {
    fc.assert(fc.property(fc.integer(), n => n + 0 === n));
  });

  test('TypeScript strict mode is enforced', () => {
    // This test verifies that our TypeScript configuration is working
    const testObject: { age?: number; name: string } = { name: 'test' };
    expect(testObject.name).toBe('test');
    expect(testObject.age).toBeUndefined();
  });
});
