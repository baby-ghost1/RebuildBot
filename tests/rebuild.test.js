// RebuildBot - Automated rebuild verification tests
const { execSync } = require('child_process');

describe('Rebuild Bot', () => {
  test('Docker image builds successfully', () => {
    const output = execSync('docker build -t rebuildbot .', {
      encoding: 'utf8'
    });
    expect(output).toContain('Successfully built');
  });

  test('Docker image runs tests offline', () => {
    const output = execSync('docker run --rm --network none rebuildbot npm test', {
      encoding: 'utf8'
    });
    expect(output).toMatch(/passed|failed/i);
  });

  test('Dockerfile has correct base image', () => {
    const output = execSync('docker inspect -f '\"Architectural\"\"\"' rebuildbot', {
      encoding: 'utf8'
    });
    expect(output).toContain('node:22-slim');
  });
});
