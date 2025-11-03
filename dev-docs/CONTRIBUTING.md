# 🤝 Contributing Guide

Thank you for your interest in contributing to the PDF Object Overlay System! This guide will help you get started with contributing to the project.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Commit Guidelines](#commit-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Documentation](#documentation)

---

## 📜 Code of Conduct

### Our Pledge
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept differing viewpoints gracefully

### Our Standards
✅ **Encouraged**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

❌ **Not Acceptable**:
- Harassment or discriminatory language
- Personal attacks
- Publishing others' private information
- Other unethical or unprofessional conduct

---

## 🚀 Getting Started

### Prerequisites
1. Read the [Getting Started Guide](./GETTING-STARTED.md)
2. Set up your development environment
3. Familiarize yourself with the [Architecture](./ARCHITECTURE.md)
4. Review existing [issues and pull requests](https://github.com/your-org/your-repo/issues)

### Finding Something to Work On

#### Good First Issues
Look for issues labeled `good-first-issue`:
- Documentation improvements
- Small bug fixes
- Adding test cases
- Code cleanup

#### Areas Needing Help
- 🐛 **Bug Fixes**: Check open bugs
- 📚 **Documentation**: Improve existing docs
- ✨ **Features**: Implement new functionality
- 🧪 **Testing**: Add test coverage
- ⚡ **Performance**: Optimize slow operations

### Claiming an Issue
1. Comment on the issue saying you'd like to work on it
2. Wait for maintainer approval
3. Start working once assigned

---

## 🔄 Development Workflow

### 1. **Fork and Clone**
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR-USERNAME/prototype-pdf-object-overlay.git
cd prototype-pdf-object-overlay

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL-OWNER/prototype-pdf-object-overlay.git
```

### 2. **Create a Feature Branch**
```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. **Make Your Changes**
```bash
# Make changes to code
# ... edit files ...

# Test your changes
npm test
npm run server  # Manual testing
```

### 4. **Commit Your Changes**
```bash
# Stage changes
git add .

# Commit with meaningful message (see Commit Guidelines below)
git commit -m "feat: add awesome feature"
```

### 5. **Push and Create Pull Request**
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

---

## 📝 Coding Standards

### JavaScript Style Guide

#### General Principles
- Write clear, self-documenting code
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic

#### Naming Conventions
```javascript
// Classes: PascalCase
class DocumentConverter { }

// Functions/Methods: camelCase
function transformXMLToTeX() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Private methods: prefix with underscore
_privateMethod() { }
```

#### Code Formatting
```javascript
// Use 4 spaces for indentation
function example() {
    if (condition) {
        doSomething();
    }
}

// Use single quotes for strings
const message = 'Hello, world!';

// Use template literals for string interpolation
const greeting = `Hello, ${name}!`;

// Always use semicolons
const value = 42;

// Use async/await instead of callbacks
async function fetchData() {
    const result = await someAsyncOperation();
    return result;
}
```

#### Best Practices
```javascript
// Use const by default, let when needed, avoid var
const immutable = 42;
let mutable = 'can change';

// Use destructuring
const { name, age } = person;
const [first, second] = array;

// Use arrow functions for callbacks
array.map(item => item * 2);

// Use optional chaining
const value = object?.property?.subProperty;

// Use nullish coalescing
const result = value ?? defaultValue;
```

### Module Structure
```javascript
// 1. Dependencies
const fs = require('fs');
const path = require('path');

// 2. Internal dependencies
const ConfigManager = require('./ConfigManager');

// 3. Class definition
class MyModule {
    // 4. Constructor
    constructor() {
        // Initialize
    }

    // 5. Public methods
    publicMethod() {
        // Implementation
    }

    // 6. Private methods
    _privateMethod() {
        // Implementation
    }
}

// 7. Export
module.exports = MyModule;
```

### Error Handling
```javascript
// Always handle errors
try {
    const result = await riskyOperation();
    return result;
} catch (error) {
    console.error('❌ Operation failed:', error.message);
    throw new Error(`Failed to perform operation: ${error.message}`);
}

// Use meaningful error messages
if (!filePath) {
    throw new Error('File path is required');
}

// Log errors appropriately
console.error('❌ Error:', error);  // Errors
console.warn('⚠️  Warning:', warning);  // Warnings
console.log('✅ Success:', result);  // Success
console.log('🔍 Debug:', data);  // Debug info
```

---

## 🧪 Testing Guidelines

### Writing Tests
```javascript
// Test file naming: *.test.js
// Location: next to source file or in __tests__/

describe('DocumentConverter', () => {
    describe('generateDocument', () => {
        it('should generate PDF from valid XML', async () => {
            // Arrange
            const converter = new DocumentConverter();
            const xmlFile = 'test.xml';
            const templateFile = 'template.tex.xml';

            // Act
            const result = await converter.generateDocument(xmlFile, templateFile);

            // Assert
            expect(result).toBeDefined();
            expect(result.pdfFile).toContain('.pdf');
        });

        it('should throw error for invalid XML', async () => {
            // Arrange
            const converter = new DocumentConverter();

            // Act & Assert
            await expect(
                converter.generateDocument('invalid.xml', 'template.tex.xml')
            ).rejects.toThrow('Invalid XML');
        });
    });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- pdf-geometry.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Test Coverage
- Aim for >80% code coverage
- Test edge cases and error conditions
- Test both success and failure paths
- Mock external dependencies

---

## 📦 Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples
```bash
# Feature
git commit -m "feat(engine): add support for nested templates"

# Bug fix
git commit -m "fix(coordinates): correct multi-page offset calculation"

# Documentation
git commit -m "docs(api): update WebSocket protocol documentation"

# With body
git commit -m "feat(server): add authentication middleware

- Implement JWT token validation
- Add middleware to protect routes
- Update API documentation

Closes #123"
```

### Best Practices
- Use present tense ("add feature" not "added feature")
- Keep subject line under 50 characters
- Separate subject from body with blank line
- Use body to explain what and why, not how
- Reference issues and PRs in footer

---

## 🔀 Pull Request Process

### Before Submitting

✅ **Checklist**:
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow guidelines
- [ ] No merge conflicts with main branch

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process
1. **Automated Checks**: CI/CD runs tests
2. **Code Review**: Maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves PR
5. **Merge**: PR is merged to main

### Handling Feedback
- Be open to suggestions
- Ask questions if unclear
- Make requested changes
- Update PR with fixes
- Re-request review when ready

---

## 📚 Documentation

### Code Documentation
```javascript
/**
 * Transforms XML document to TeX format using specified template.
 * 
 * @param {string} xmlPath - Path to XML input file
 * @param {string} templatePath - Path to template file
 * @param {Object} options - Transformation options
 * @param {boolean} options.verbose - Enable verbose logging
 * @returns {Promise<string>} Path to generated TeX file
 * @throws {Error} If XML or template is invalid
 * 
 * @example
 * const texFile = await transformXMLToTeX(
 *   'input.xml',
 *   'template.tex.xml',
 *   { verbose: true }
 * );
 */
async function transformXMLToTeX(xmlPath, templatePath, options = {}) {
    // Implementation
}
```

### README Updates
- Update README if adding new features
- Add examples for new functionality
- Update installation instructions if needed
- Keep documentation in sync with code

### Creating New Documentation
- Place in appropriate `dev-docs/` subdirectory
- Follow existing documentation style
- Include code examples
- Add diagrams where helpful
- Link to related documentation

---

## 🎯 Contribution Areas

### High Priority
- 🐛 Bug fixes for reported issues
- 📚 Documentation improvements
- 🧪 Test coverage improvements
- ⚡ Performance optimizations

### Medium Priority
- ✨ New features (discuss first)
- 🎨 UI/UX improvements
- 🔧 Code refactoring
- 🌐 Internationalization

### Future Enhancements
- 🔒 Authentication system
- 📊 Analytics and monitoring
- 🚀 Deployment automation
- 📦 Package distribution

---

## 📞 Getting Help

### Resources
- [Developer Documentation](./README.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Module Documentation](./modules/)

### Communication
- Open an issue for bugs or feature requests
- Ask questions in discussions
- Tag maintainers for urgent issues

---

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Thanked in project updates

---

## ❓ Questions?

If you have questions about contributing:
1. Check existing documentation
2. Search closed issues
3. Open a discussion
4. Contact maintainers

---

**Thank you for contributing! 🎉**

*Last Updated: November 3, 2025*

