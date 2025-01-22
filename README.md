# Solution Explorer

A Git patch-based system for exploring and managing multiple solution attempts.

## Overview

This system uses Git patches to:
- Create and store multiple solution attempts
- Compare different approaches
- Apply/revert solutions to see their effects
- Combine multiple solutions into a final version

## Components

### PatchExplorer (src/utils/patch-explorer.js)
Core class that provides:
- Solution creation and storage as patches
- Patch application and reversion
- Solution comparison
- Patch combination

## Usage

```javascript
import PatchExplorer from './src/utils/patch-explorer.js';

// Initialize explorer
const explorer = new PatchExplorer();
await explorer.init();

// Create a solution
await explorer.createSolution('solution-name', async () => {
  // Make your changes here
  await fs.writeFile('file.js', 'new content');
});

// Apply a solution to see its changes
await explorer.applySolution('solution-name');

// Revert changes
await explorer.revertSolution('solution-name');

// Compare solutions
const diff = await explorer.compareSolutions('solution1', 'solution2');

// Combine multiple solutions
const finalPatch = await explorer.combineSolutions(
  ['solution1', 'solution2'],
  'final-solution'
);
```

## Key Features

1. **Git Patch Based**
   - Uses standard Git patch format
   - Easy to view, apply, and share solutions
   - Compatible with existing Git workflows

2. **Simple Yet Powerful**
   - Create solutions with any file modifications
   - Compare different approaches
   - Mix and match solutions
   - No complex branching required

3. **Clean Management**
   - Solutions stored as patch files
   - Easy to apply/revert changes
   - No leftover branches
   - Minimal Git history pollution

## Example

See `examples/patch_explorer_demo.js` for a complete example that demonstrates:
- Creating multiple solutions for a function implementation
- Comparing different approaches
- Applying and reverting changes
- Combining solutions into a final version

## Getting Started

1. Initialize a Git repository:
```bash
git init
```

2. Import and configure PatchExplorer:
```javascript
import PatchExplorer from './src/utils/patch-explorer.js';

const explorer = new PatchExplorer();
await explorer.init();
```

3. Run the example:
```bash
node examples/patch_explorer_demo.js
```

## Advantages Over Traditional Branching

1. **Cleaner History**
   - Solutions stored as separate patch files
   - Main Git history remains clean
   - No need to merge branches

2. **Easy to Share**
   - Patches are portable
   - Can be applied to any repository
   - Standard Git patch format

3. **Flexible Application**
   - Apply/revert individual solutions
   - Mix and match different approaches
   - Create hybrid solutions

4. **Simple Implementation**
   - Uses built-in Git functionality
   - No complex branching strategies
   - Minimal setup required
