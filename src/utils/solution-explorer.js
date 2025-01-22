import GitDB from './git-db.js';

/**
 * SolutionExplorer - A class that uses GitDB to explore and converge on solutions
 * for any type of content (code, text, creative writing, etc.)
 */
class SolutionExplorer {
  constructor(options = {}) {
    this.gitDb = new GitDB(process.cwd());
    this.options = {
      numExplorations: options.numExplorations || 3, // Default number of parallel explorations
      convergenceThreshold: options.convergenceThreshold || 0.8, // Similarity threshold for convergence
      maxIterations: options.maxIterations || 5, // Max iterations per exploration path
      evaluator: options.evaluator || (() => 1), // Custom solution evaluation function
      ...options
    };
  }

  /**
   * Initialize multiple solution spaces for parallel exploration
   * @param {string} taskDescription - Description of the problem/task
   * @returns {Promise<Array<string>>} - List of created solution space names
   */
  async initializeExplorationSpaces(taskDescription) {
    const spaces = [];
    
    for (let i = 0; i < this.options.numExplorations; i++) {
      const spaceName = `exploration-path-${i + 1}`;
      const { branch } = await this.gitDb.initSolutionSpace(
        spaceName,
        `${taskDescription} - Exploration Path ${i + 1}`
      );
      spaces.push(branch);
    }

    return spaces;
  }

  /**
   * Save a solution attempt in the current exploration space
   * @param {string} description - Description of the attempt
   * @param {Object} solution - The solution content (code, text, etc.)
   * @param {Object} metadata - Additional metadata about the attempt
   * @returns {Promise<string>} - Commit hash
   */
  async saveAttempt(description, solution, metadata = {}) {
    const enrichedMetadata = {
      ...metadata,
      evaluation: await this.evaluateSolution(solution),
      timestamp: new Date().toISOString(),
      iteration: (metadata.iteration || 0) + 1
    };

    return this.gitDb.saveAttempt(description, {
      solution,
      metadata: enrichedMetadata
    });
  }

  /**
   * Evaluate a solution using the provided evaluator function
   * @param {any} solution - The solution to evaluate
   * @returns {Promise<number>} - Evaluation score between 0 and 1
   */
  async evaluateSolution(solution) {
    try {
      const score = await this.options.evaluator(solution);
      return Math.max(0, Math.min(1, score)); // Normalize between 0 and 1
    } catch (error) {
      console.error('Evaluation error:', error);
      return 0;
    }
  }

  /**
   * Get the best solution from each exploration space
   * @returns {Promise<Array>} - List of best solutions with their scores
   */
  async getBestSolutions() {
    const spaces = await this.gitDb.listSolutionSpaces();
    const bestSolutions = [];

    for (const space of spaces) {
      await this.gitDb.switchSolutionSpace(space);
      const history = await this.gitDb.getAttemptHistory();
      
      // Find attempt with highest evaluation score
      const best = history.reduce((best, current) => {
        const currentScore = current.metadata?.evaluation || 0;
        return currentScore > (best.metadata?.evaluation || 0) ? current : best;
      }, history[0]);

      bestSolutions.push({
        space,
        solution: best.metadata?.solution,
        score: best.metadata?.evaluation || 0,
        description: best.description,
        hash: best.hash
      });
    }

    return bestSolutions;
  }

  /**
   * Create a converged solution from the best solutions
   * @param {string} description - Description of the converged solution
   * @param {Function} convergenceStrategy - Function to combine best solutions
   * @returns {Promise<Object>} - The converged solution
   */
  async createConvergedSolution(description, convergenceStrategy) {
    const bestSolutions = await this.getBestSolutions();
    
    // Create convergence space
    await this.gitDb.initSolutionSpace(
      'converged-solution',
      'Final converged solution'
    );

    // Apply convergence strategy to combine best solutions
    const convergedSolution = await convergenceStrategy(bestSolutions);
    
    // Save and return the converged solution
    const hash = await this.saveAttempt(
      description,
      convergedSolution,
      {
        sourceSolutions: bestSolutions.map(s => ({
          space: s.space,
          hash: s.hash,
          score: s.score
        }))
      }
    );

    return {
      solution: convergedSolution,
      hash,
      sourceSolutions: bestSolutions
    };
  }

  /**
   * Compare solutions from different exploration spaces
   * @param {Array<string>} solutionHashes - Array of commit hashes to compare
   * @returns {Promise<Object>} - Comparison results
   */
  async compareSolutions(solutionHashes) {
    const comparisons = [];
    
    for (let i = 0; i < solutionHashes.length; i++) {
      for (let j = i + 1; j < solutionHashes.length; j++) {
        const diff = await this.gitDb.compareAttempts(
          solutionHashes[i],
          solutionHashes[j]
        );
        comparisons.push({
          solution1: solutionHashes[i],
          solution2: solutionHashes[j],
          diff
        });
      }
    }

    return comparisons;
  }

  /**
   * Get the exploration history for all solution spaces
   * @returns {Promise<Object>} - History for each solution space
   */
  async getExplorationHistory() {
    const spaces = await this.gitDb.listSolutionSpaces();
    const history = {};

    for (const space of spaces) {
      await this.gitDb.switchSolutionSpace(space);
      history[space] = await this.gitDb.getAttemptHistory();
    }

    return history;
  }
}

export default SolutionExplorer;
