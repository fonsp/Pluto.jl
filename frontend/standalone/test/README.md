# FileSystemResolver Test Suite

This directory contains comprehensive tests for the FileSystemResolver functionality.

## Structure

```
test/
├── README.md              # This file
├── test_fs.js            # Main test suite
└── fixtures/             # Test data files
    ├── test_file.jl      # Basic test file with commented and uncommented includes
    ├── test_shared.jl    # Shared file for inclusion testing
    ├── nested_include.jl # File that includes another file
    └── main_with_nested.jl # Tests nested include resolution
```

## Running Tests

### Local Development
```bash
npm test
```

### CI/CD Integration
The tests are designed to work in CI environments. They:
- Exit with code 0 on success, 1 on failure
- Provide clear console output with ✅/❌ indicators
- Clean up temporary files automatically
- Handle missing dependencies gracefully

### Example GitHub Actions Workflow
```yaml
name: Test FileSystemResolver
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run tests
        run: |
          cd frontend/standalone
          npm test
```

## Test Coverage

The test suite covers:

### ✅ Basic Include Resolution
- Resolves `include("./file.jl")` statements
- Adds clear markers showing include sources
- Handles relative path resolution

### ✅ Comment Handling  
- Ignores includes in commented lines (`# include(...)`)
- Handles various comment formats:
  - `# include("file.jl")`
  - `    # include("file.jl")` (with leading spaces)
  - `#include("file.jl")` (no space after #)

### ✅ Nested Includes
- Recursively resolves includes within included files
- Maintains proper include hierarchy
- Preserves original file structure

### ✅ Error Handling
- Gracefully handles missing files
- Continues processing after encountering errors
- Provides clear error messages

### ✅ Circular Include Protection
- Detects circular include dependencies
- Prevents infinite loops
- Provides clear warning messages

### ✅ File Structure Preservation
- Maintains original formatting
- Preserves comments and whitespace
- Keeps module declarations intact

## Test Output Format

```
🧪 Running FileSystemResolver tests...

✅ should resolve basic includes
✅ should ignore commented includes
✅ should handle nested includes
✅ should handle missing files gracefully
✅ should prevent circular includes
✅ should preserve file structure and formatting

📊 Test Results: 6 passed, 0 failed
🎉 All tests passed!
```

## Adding New Tests

To add a new test:

1. Add test data to `fixtures/` if needed
2. Use the `runner.test()` method:
   ```javascript
   runner.test('test description', () => {
       // Your test logic here
       runner.assert(condition, 'Error message');
   });
   ```

## Available Assertions

- `runner.assert(condition, message)` - Basic assertion
- `runner.assertIncludes(content, substring, message)` - Check if content includes substring
- `runner.assertNotIncludes(content, substring, message)` - Check if content does NOT include substring