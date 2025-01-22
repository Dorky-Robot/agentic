import GitDB from '../src/utils/git-db.js';

async function exploreMultipleSolutions() {
  const gitDb = new GitDB(process.cwd());
  
  try {
    // Initialize two different solution spaces for exploring different approaches
    console.log('Creating solution spaces...');
    const { branch: space1 } = await gitDb.initSolutionSpace(
      'recursive-approach',
      'Exploring recursive solution to fibonacci sequence'
    );
    
    // Save first attempt in recursive approach
    await gitDb.saveAttempt('Initial recursive implementation', {
      code: `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
      performance: 'O(2^n)',
      spaceComplexity: 'O(n)'
    });

    // Save second attempt with memoization
    await gitDb.saveAttempt('Added memoization for optimization', {
      code: `
function fibonacci(n, memo = {}) {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  return memo[n];
}`,
      performance: 'O(n)',
      spaceComplexity: 'O(n)'
    });

    // Create and switch to iterative approach branch
    await gitDb.initSolutionSpace(
      'iterative-approach',
      'Exploring iterative solution to fibonacci sequence'
    );

    // Save first iterative attempt
    await gitDb.saveAttempt('Initial iterative implementation', {
      code: `
function fibonacci(n) {
  if (n <= 1) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}`,
      performance: 'O(n)',
      spaceComplexity: 'O(1)'
    });

    // List all solution spaces
    console.log('\nAvailable solution spaces:');
    const spaces = await gitDb.listSolutionSpaces();
    console.log(spaces);

    // Get history of current solution space
    console.log('\nAttempt history for current solution space:');
    const history = await gitDb.getAttemptHistory();
    console.log(JSON.stringify(history, null, 2));

    // Switch back to recursive approach to see its history
    await gitDb.switchSolutionSpace('recursive-approach');
    console.log('\nAttempt history for recursive approach:');
    const recursiveHistory = await gitDb.getAttemptHistory();
    console.log(JSON.stringify(recursiveHistory, null, 2));

    // Create a final converged solution
    await gitDb.initSolutionSpace(
      'converged-solution',
      'Final optimized fibonacci implementation'
    );

    // Save the converged solution combining insights from both approaches
    await gitDb.saveAttempt('Optimized implementation', {
      code: `
function fibonacci(n) {
  // For small inputs, use recursive with memoization
  if (n <= 10) {
    return fibonacciMemo(n);
  }
  // For larger inputs, use iterative approach
  return fibonacciIterative(n);
}

// Memoized recursive for small inputs (better readability)
function fibonacciMemo(n, memo = {}) {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  memo[n] = fibonacciMemo(n - 1, memo) + fibonacciMemo(n - 2, memo);
  return memo[n];
}

// Iterative for larger inputs (better performance)
function fibonacciIterative(n) {
  if (n <= 1) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}`,
      performance: 'O(n)',
      spaceComplexity: 'O(1) for n > 10, O(n) for n <= 10',
      reasoning: 'Combines readability of recursive approach for small inputs with performance of iterative approach for larger inputs'
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
exploreMultipleSolutions();
