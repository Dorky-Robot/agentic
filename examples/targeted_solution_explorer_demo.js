import SolutionExplorer from '../src/utils/solution-explorer.js';
import fs from 'fs/promises';
import yaml from 'js-yaml';

// Example evaluator for targeted code changes
const codeChangeEvaluator = async (solution) => {
  try {
    const {
      originalLines,
      modifiedLines,
      context
    } = solution;

    // Example metrics for evaluating code changes
    const metrics = {
      // Prefer changes that maintain similar line length
      lengthDiff: 1 - Math.abs(
        modifiedLines.join('\n').length - originalLines.join('\n').length
      ) / originalLines.join('\n').length,
      
      // Check if indentation is preserved
      indentationPreserved: modifiedLines.every((line, i) => {
        const originalIndent = originalLines[i]?.match(/^\s*/)[0].length || 0;
        const newIndent = line.match(/^\s*/)[0].length || 0;
        return originalIndent === newIndent;
      }),

      // Check if the change follows the context requirements
      contextMatch: context.requirements.every(req => {
        return modifiedLines.some(line => line.includes(req));
      })
    };

    return (
      metrics.lengthDiff * 0.3 +
      metrics.indentationPreserved * 0.3 +
      metrics.contextMatch * 0.4
    );
  } catch (error) {
    return 0;
  }
};

// Example evaluator for YAML changes
const yamlChangeEvaluator = async (solution) => {
  try {
    const {
      originalYaml,
      modifiedYaml,
      path,
      context
    } = solution;

    // Parse both YAML versions
    const original = yaml.load(originalYaml);
    const modified = yaml.load(modifiedYaml);

    // Helper to get nested value using path array
    const getNestedValue = (obj, path) => {
      return path.reduce((curr, key) => curr?.[key], obj);
    };

    // Get the specific values we're interested in
    const originalValue = getNestedValue(original, path);
    const modifiedValue = getNestedValue(modified, path);

    const metrics = {
      // Check if YAML is still valid
      isValid: true,

      // Verify only targeted path was changed
      targetedChange: JSON.stringify(original) === JSON.stringify(modified) ||
        path.every(key => 
          JSON.stringify(getNestedValue(original, [key])) === 
          JSON.stringify(getNestedValue(modified, [key]))
        ),

      // Check if new value meets requirements
      meetsRequirements: context.requirements.every(req => {
        if (req.type === 'type') {
          return typeof modifiedValue === req.value;
        }
        if (req.type === 'range') {
          return modifiedValue >= req.min && modifiedValue <= req.max;
        }
        return true;
      })
    };

    return (
      metrics.isValid * 0.3 +
      metrics.targetedChange * 0.3 +
      metrics.meetsRequirements * 0.4
    );
  } catch (error) {
    return 0;
  }
};

async function exploreTargetedChanges() {
  // Example: Modifying specific lines in a code file
  const codeExplorer = new SolutionExplorer({
    numExplorations: 2,
    evaluator: codeChangeEvaluator,
    convergenceThreshold: 0.9
  });

  // Create a temporary test file
  const testCode = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

  await fs.writeFile('temp-code.js', testCode);

  try {
    console.log('Exploring targeted code changes...');
    
    const spaces = await codeExplorer.initializeExplorationSpaces(
      'Optimize calculateTotal function'
    );

    // Target the loop implementation (lines 3-5)
    const targetLines = [
      'for (let i = 0; i < items.length; i++) {',
      '    total += items[i].price;',
      '  }'
    ];

    // Exploration Path 1: Using reduce
    await codeExplorer.gitDb.switchSolutionSpace(spaces[0]);
    await codeExplorer.saveAttempt('Reduce implementation', {
      originalLines: targetLines,
      modifiedLines: [
        '  total = items.reduce((sum, item) => {',
        '    return sum + item.price;',
        '  }, 0);'
      ],
      context: {
        requirements: ['reduce', 'sum', 'price']
      }
    });

    // Exploration Path 2: Using forEach
    await codeExplorer.gitDb.switchSolutionSpace(spaces[1]);
    await codeExplorer.saveAttempt('ForEach implementation', {
      originalLines: targetLines,
      modifiedLines: [
        '  items.forEach(item => {',
        '    total += item.price;',
        '  });'
      ],
      context: {
        requirements: ['forEach', 'price']
      }
    });

    // Example: Modifying specific paths in a YAML file
    const yamlExplorer = new SolutionExplorer({
      numExplorations: 2,
      evaluator: yamlChangeEvaluator,
      convergenceThreshold: 0.9
    });

    const testYaml = `
server:
  port: 3000
  host: localhost
database:
  connections:
    max: 10
    timeout: 5000
  logging: true
`;

    await fs.writeFile('temp-config.yml', testYaml);

    console.log('\nExploring targeted YAML changes...');

    const yamlSpaces = await yamlExplorer.initializeExplorationSpaces(
      'Optimize database connections'
    );

    // Target the database.connections.max value
    const targetPath = ['database', 'connections', 'max'];

    // Exploration Path 1: Conservative scaling
    await yamlExplorer.gitDb.switchSolutionSpace(yamlSpaces[0]);
    await yamlExplorer.saveAttempt('Conservative connection scaling', {
      originalYaml: testYaml,
      modifiedYaml: `
server:
  port: 3000
  host: localhost
database:
  connections:
    max: 20
    timeout: 5000
  logging: true
`,
      path: targetPath,
      context: {
        requirements: [
          { type: 'type', value: 'number' },
          { type: 'range', min: 15, max: 25 }
        ]
      }
    });

    // Exploration Path 2: Aggressive scaling
    await yamlExplorer.gitDb.switchSolutionSpace(yamlSpaces[1]);
    await yamlExplorer.saveAttempt('Aggressive connection scaling', {
      originalYaml: testYaml,
      modifiedYaml: `
server:
  port: 3000
  host: localhost
database:
  connections:
    max: 50
    timeout: 5000
  logging: true
`,
      path: targetPath,
      context: {
        requirements: [
          { type: 'type', value: 'number' },
          { type: 'range', min: 40, max: 60 }
        ]
      }
    });

    // Get best solutions
    console.log('\nBest code changes:');
    const bestCodeSolutions = await codeExplorer.getBestSolutions();
    console.log(JSON.stringify(bestCodeSolutions, null, 2));

    console.log('\nBest YAML changes:');
    const bestYamlSolutions = await yamlExplorer.getBestSolutions();
    console.log(JSON.stringify(bestYamlSolutions, null, 2));

    // Clean up temp files
    await fs.unlink('temp-code.js');
    await fs.unlink('temp-config.yml');

  } catch (error) {
    console.error('Error:', error.message);
    // Clean up temp files in case of error
    try {
      await fs.unlink('temp-code.js');
      await fs.unlink('temp-config.yml');
    } catch {}
  }
}

// Run the example
exploreTargetedChanges();
