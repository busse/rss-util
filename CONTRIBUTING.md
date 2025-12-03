# Contributing to rss-util

Thank you for your interest in contributing to rss-util! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on GitHub with:
- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Your environment (OS version, app version)

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:
- A clear description of the feature
- Use cases and examples
- Any potential implementation considerations

### Submitting Pull Requests

1. **Fork the repository** and create a branch from `main`
2. **Make your changes** following the project's coding style
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description of your changes

#### Pull Request Guidelines

- Use clear, descriptive commit messages
- Keep pull requests focused on a single feature or fix
- Include tests if applicable
- Update the README or relevant documentation
- Reference any related issues

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/rss-util.git
   cd rss-util
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

4. Make your changes and test them

## Feature Flag Requirement

**All new features must include feature flags in the Settings.**

This allows users to opt-in or opt-out of new features. Here's how to implement feature flags:

### 1. Add Feature Flag to Backend (`main.js`)

The feature flag system is already set up. When adding a new feature flag:

1. The flag will be automatically available through the existing `get-feature-flags` and `set-feature-flag` IPC handlers
2. Feature flags are stored in `settings.json` under the `featureFlags` object
3. Default values should be `false` (opt-in) unless there's a strong reason otherwise

### 2. Add Feature Flag to Settings UI (`index.html`)

In the `renderFeatureFlags` function (around line 1973), add your new feature flag to the `flags` array:

```javascript
const flags = [
  {
    name: 'aiArticleSummary',
    label: 'AI Article Summary',
    description: 'Display AI-generated article summaries above the article preview (requires OpenAI API key)'
  },
  {
    name: 'yourNewFeature',  // Add your flag here
    label: 'Your New Feature',
    description: 'Description of what this feature does'
  }
];
```

### 3. Use Feature Flag in Your Code

Check the feature flag before enabling feature functionality:

```javascript
// Load feature flags
const featureFlags = await window.electronAPI.getFeatureFlags();
if (featureFlags.data && featureFlags.data.yourNewFeature) {
  // Enable your feature
}
```

Or use the global `featureFlags` object that's loaded on app startup:

```javascript
if (featureFlags.yourNewFeature) {
  // Enable your feature
}
```

### 4. Update Documentation

- Add your feature to the README.md Features section
- Document the feature flag in the Settings section
- Update this CONTRIBUTING.md if the feature flag process changes

## AI-Assisted Development

**This project enthusiastically welcomes AI-assisted contributions!**

We recognize that AI tools like GitHub Copilot, ChatGPT, Cursor, Claude, and others are valuable development tools. If you used AI assistance in your contribution:

- **That's great!** We encourage it
- **Please mention it** in your pull request description (e.g., "Used Cursor AI for code suggestions" or "Generated initial implementation with ChatGPT")
- **Review and understand** the code before submitting - you're responsible for the contribution
- **Test thoroughly** - AI-generated code should be tested just like any other code

AI assistance can help with:
- Code generation and boilerplate
- Refactoring suggestions
- Bug fixes
- Documentation
- Test writing
- Code review

## Coding Standards

### JavaScript/Electron

- Follow existing code style (similar to what's already in the codebase)
- Use async/await for asynchronous operations
- Handle errors appropriately
- Add comments for complex logic
- Keep functions focused and single-purpose

### File Structure

- `main.js` - Electron main process (IPC handlers, file operations, auto-updater)
- `index.html` - Main reader interface
- `manage.html` - Feed management interface
- `preload.js` - Secure IPC bridge
- `migrations/` - Data migration scripts

### Data Storage

- User data is stored in the Electron `userData` directory
- Data files are JSON format
- Use the existing IPC handlers for file operations
- Ensure data migrations are idempotent

## Testing

While there's no formal test suite yet, please:

- Manually test your changes thoroughly
- Test on macOS (primary platform)
- Test edge cases and error conditions
- Verify that existing functionality still works

## Data Migrations

If your changes modify data structures, you must create a migration:

1. Create a file in `migrations/` named `migration-X.Y.Z-to-A.B.C.js`
2. Export an object with:
   - `fromVersion`: The version this migration starts from
   - `toVersion`: The version this migration upgrades to
   - `migrate(dataDir)`: An async function that performs the migration
3. Migrations must be **idempotent** (safe to run multiple times)
4. Preserve user data - never delete data without user consent

See the existing migration in `migrations/migration-1.0.0-to-1.1.0.js` for an example.

## Version Bumping

When creating a release:

- Use semantic versioning (SEMVER)
- Patch (1.0.0 → 1.0.1): Bug fixes, minor changes
- Minor (1.0.0 → 1.1.0): New features, backwards-compatible
- Major (1.0.0 → 2.0.0): Breaking changes

Use the npm scripts:
```bash
npm run version:patch
npm run version:minor
npm run version:major
```

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Check existing issues and pull requests for examples
- Review the codebase to see how similar features are implemented

Thank you for contributing to rss-util! 🎉

