import SolutionExplorer from '../src/utils/solution-explorer.js';

// Example evaluator for code solutions (e.g., sorting algorithm)
const codeEvaluator = async (solution) => {
  try {
    // Example metrics: code length, performance, readability
    const metrics = {
      length: 1 - Math.min(solution.length / 1000, 1), // Shorter is better (up to 1000 chars)
      hasComments: solution.includes('//') || solution.includes('/*'),
      hasTests: solution.includes('test') || solution.includes('assert'),
    };
    return (metrics.length + metrics.hasComments + metrics.hasTests) / 3;
  } catch (error) {
    return 0;
  }
};

// Example evaluator for creative writing
const writingEvaluator = async (text) => {
  // Example metrics: length, vocabulary diversity, structure
  const words = text.split(/\s+/);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  
  const metrics = {
    length: Math.min(words.length / 500, 1), // Target length ~500 words
    vocabulary: uniqueWords.size / words.length, // Vocabulary diversity
    structure: text.includes('\n\n') ? 1 : 0, // Has paragraphs
  };
  
  return (metrics.length + metrics.vocabulary + metrics.structure) / 3;
};

// Example of how to use SolutionExplorer for code generation
async function exploreCodeSolutions() {
  // Initialize explorer with 3 parallel paths for code solutions
  const codeExplorer = new SolutionExplorer({
    numExplorations: 3,
    evaluator: codeEvaluator,
    convergenceThreshold: 0.8,
    maxIterations: 5
  });

  try {
    console.log('Exploring sorting algorithm implementations...');
    
    // Initialize exploration spaces
    const spaces = await codeExplorer.initializeExplorationSpaces(
      'Implement a sorting algorithm'
    );

    // Exploration Path 1: Quicksort
    await codeExplorer.gitDb.switchSolutionSpace(spaces[0]);
    await codeExplorer.saveAttempt('Quicksort implementation', `
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[0];
  const left = arr.slice(1).filter(x => x <= pivot);
  const right = arr.slice(1).filter(x => x > pivot);
  
  return [...quickSort(left), pivot, ...quickSort(right)];
}`);

    // Exploration Path 2: Merge Sort
    await codeExplorer.gitDb.switchSolutionSpace(spaces[1]);
    await codeExplorer.saveAttempt('Merge Sort implementation', `
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    result.push(left[i] <= right[j] ? left[i++] : right[j++]);
  }
  
  return [...result, ...left.slice(i), ...right.slice(j)];
}`);

    // Exploration Path 3: Insertion Sort
    await codeExplorer.gitDb.switchSolutionSpace(spaces[2]);
    await codeExplorer.saveAttempt('Insertion Sort implementation', `
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i];
    let j = i - 1;
    
    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j];
      j--;
    }
    
    arr[j + 1] = current;
  }
  
  return arr;
}`);

    // Get best solutions
    const bestSolutions = await codeExplorer.getBestSolutions();
    console.log('\nBest solutions from each path:');
    console.log(JSON.stringify(bestSolutions, null, 2));

    // Create converged solution
    const converged = await codeExplorer.createConvergedSolution(
      'Hybrid sorting algorithm',
      async (solutions) => {
        // Combine best aspects of each approach
        return `
function hybridSort(arr) {
  // Use insertion sort for small arrays
  if (arr.length <= 10) {
    return insertionSort(arr);
  }
  
  // Use quicksort for larger arrays
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const equal = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...hybridSort(left), ...equal, ...hybridSort(right)];
}

// Helper function for small arrays
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    let j = i - 1;
    const current = arr[i];
    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = current;
  }
  return arr;
}`;
      }
    );

    console.log('\nConverged solution:', converged);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example of how to use SolutionExplorer for creative writing
async function exploreWritingSolutions() {
  // Initialize explorer with 2 parallel paths for writing
  const writingExplorer = new SolutionExplorer({
    numExplorations: 2,
    evaluator: writingEvaluator,
    convergenceThreshold: 0.7,
    maxIterations: 3
  });

  try {
    console.log('\nExploring story variations...');
    
    // Initialize exploration spaces
    const spaces = await writingExplorer.initializeExplorationSpaces(
      'Write a short story about a mysterious package'
    );

    // Exploration Path 1: Focus on suspense
    await writingExplorer.gitDb.switchSolutionSpace(spaces[0]);
    await writingExplorer.saveAttempt('Suspense-focused version', `
The package sat unopened on Sarah's doorstep, its brown paper wrapping dampened by the morning mist. No return address, no markings, just her name written in an elegant script she didn't recognize.

She circled it cautiously, noting how the paper pulsed slightly, as if breathing. The movement was so subtle she wondered if her eyes were playing tricks on her. As she knelt down, a faint humming emanated from within.

Sarah's hand trembled as she reached for the string holding the package together. Just as her fingers brushed against the twine, her phone rang, shattering the silence.`);

    // Exploration Path 2: Focus on mystery
    await writingExplorer.gitDb.switchSolutionSpace(spaces[1]);
    await writingExplorer.saveAttempt('Mystery-focused version', `
Detective Chen examined the security footage for the third time. At 3:42 AM, the package materialized on Ms. Walker's doorstep. No delivery person, no vehicle - it simply appeared between one frame and the next.

The lab results were equally puzzling. The paper was decades old, yet the ink was fresh. The string was made of a material they couldn't identify. And the faint traces of radiation...

He pulled out his phone and dialed the number he'd been avoiding. "Dr. Martinez? Remember that theory you had about quantum displacement? I think we need to talk."`);

    // Get best solutions
    const bestSolutions = await writingExplorer.getBestSolutions();
    console.log('\nBest story versions:');
    console.log(JSON.stringify(bestSolutions, null, 2));

    // Create converged solution
    const converged = await writingExplorer.createConvergedSolution(
      'Combined story with both suspense and mystery elements',
      async (solutions) => {
        // Combine the best elements of both versions
        return `
The package appeared on Sarah's doorstep between one heartbeat and the next. The security camera would later show no delivery person, no vehicle - just empty space transforming into a brown-paper wrapped mystery.

Detective Chen arrived within the hour. He circled the package slowly, noting how the decades-old paper seemed to pulse with a subtle rhythm, while his radiation detector hummed an impossible song. The elegant script that spelled Sarah's name seemed to shimmer, the ink impossibly fresh against the aged wrapping.

As Sarah reached for the twine - a material that looked familiar yet felt wrong somehow - her phone rang. On the other end, Dr. Martinez's voice trembled with excitement: "Don't open it yet. What you have there... it's not just a package. It's a message from another time."`
      }
    );

    console.log('\nConverged story:', converged);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the examples
console.log('=== Code Solution Exploration ===');
await exploreCodeSolutions();

console.log('\n=== Creative Writing Exploration ===');
await exploreWritingSolutions();
