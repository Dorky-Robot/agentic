import PatchExplorer from '../src/utils/patch-explorer.js';
import fs from 'fs/promises';

async function exploreSolutions() {
  const explorer = new PatchExplorer();
  
  try {
    await explorer.init();
    
    // Create a sample file to modify
    await fs.writeFile('example.js', `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
`);

    // Create first solution using reduce
    await explorer.createSolution('reduce-solution', async () => {
      await fs.writeFile('example.js', `
function calculateTotal(items) {
  return items.reduce((total, item) => total + item.price, 0);
}
`);
    });

    // Create second solution using forEach
    await explorer.createSolution('foreach-solution', async () => {
      await fs.writeFile('example.js', `
function calculateTotal(items) {
  let total = 0;
  items.forEach(item => {
    total += item.price;
  });
  return total;
}
`);
    });

    // List available solutions
    console.log('Available solutions:');
    const solutions = await explorer.listSolutions();
    console.log(solutions);

    // Compare the solutions
    console.log('\nComparing solutions:');
    const comparison = await explorer.compareSolutions('reduce-solution', 'foreach-solution');
    console.log(comparison);

    // Try applying first solution
    console.log('\nApplying reduce solution:');
    await explorer.applySolution('reduce-solution');
    console.log('Current file content:');
    console.log(await fs.readFile('example.js', 'utf8'));

    // Revert it
    console.log('\nReverting reduce solution:');
    await explorer.revertSolution('reduce-solution');
    console.log('Current file content:');
    console.log(await fs.readFile('example.js', 'utf8'));

    // Create a hybrid solution combining both approaches
    await explorer.createSolution('hybrid-solution', async () => {
      await fs.writeFile('example.js', `
function calculateTotal(items) {
  // Use reduce for arrays, forEach for other iterables
  if (Array.isArray(items)) {
    return items.reduce((total, item) => total + item.price, 0);
  }
  
  let total = 0;
  items.forEach(item => {
    total += item.price;
  });
  return total;
}
`);
    });

    // Combine all solutions into a final version
    console.log('\nCreating final combined solution:');
    const finalPatch = await explorer.combineSolutions(
      ['reduce-solution', 'foreach-solution', 'hybrid-solution'],
      'final-solution'
    );
    console.log(`Final solution saved to: ${finalPatch}`);

    // Clean up example file
    await fs.unlink('example.js');

  } catch (error) {
    console.error('Error:', error.message);
    // Clean up on error
    try {
      await fs.unlink('example.js');
    } catch {}
  }
}

// Run the example
exploreSolutions();
