import simpleGit from 'simple-git';

/**
 * GitDB - A utility class that uses Git as a database for storing and exploring solutions
 * Each solution space is represented by a Git branch, and each attempt is a commit
 */
class GitDB {
  constructor(workingDir = process.cwd()) {
    this.git = simpleGit(workingDir);
  }

  /**
   * Initialize a new solution space (creates and switches to a new branch)
   * @param {string} spaceName - Name of the solution space
   * @param {string} description - Description of the problem/task
   * @returns {Promise<void>}
   */
  async initSolutionSpace(spaceName, description) {
    try {
      const sanitizedName = this.sanitizeBranchName(spaceName);
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      
      // Create new branch from current HEAD
      await this.git.checkoutLocalBranch(sanitizedName);
      
      // Create initial commit with description
      await this.git.add('.');
      await this.git.commit(description);
      
      return { branch: sanitizedName, originalBranch: currentBranch };
    } catch (error) {
      throw new Error(`Failed to initialize solution space: ${error.message}`);
    }
  }

  /**
   * Save a solution attempt
   * @param {string} description - Description of the attempt
   * @param {Object} metadata - Additional metadata about the attempt
   * @returns {Promise<string>} - Commit hash
   */
  async saveAttempt(description, metadata = {}) {
    try {
      await this.git.add('.');
      const commitMessage = JSON.stringify({ description, metadata }, null, 2);
      const result = await this.git.commit(commitMessage);
      return result.commit;
    } catch (error) {
      throw new Error(`Failed to save attempt: ${error.message}`);
    }
  }

  /**
   * List all solution spaces
   * @returns {Promise<Array>} - List of branches (solution spaces)
   */
  async listSolutionSpaces() {
    try {
      const result = await this.git.branch();
      return result.all.filter(branch => branch !== 'main' && branch !== 'master');
    } catch (error) {
      throw new Error(`Failed to list solution spaces: ${error.message}`);
    }
  }

  /**
   * Get the history of attempts for the current solution space
   * @returns {Promise<Array>} - List of commits (attempts)
   */
  async getAttemptHistory() {
    try {
      const log = await this.git.log();
      return log.all.map(commit => {
        try {
          const { description, metadata } = JSON.parse(commit.message);
          return {
            hash: commit.hash,
            date: commit.date,
            description,
            metadata
          };
        } catch {
          // If commit message isn't JSON, return as is
          return {
            hash: commit.hash,
            date: commit.date,
            description: commit.message,
            metadata: {}
          };
        }
      });
    } catch (error) {
      throw new Error(`Failed to get attempt history: ${error.message}`);
    }
  }

  /**
   * Switch to a specific solution space
   * @param {string} spaceName - Name of the solution space
   * @returns {Promise<void>}
   */
  async switchSolutionSpace(spaceName) {
    try {
      const sanitizedName = this.sanitizeBranchName(spaceName);
      await this.git.checkout(sanitizedName);
    } catch (error) {
      throw new Error(`Failed to switch solution space: ${error.message}`);
    }
  }

  /**
   * Retrieve a specific attempt
   * @param {string} commitHash - Hash of the commit to retrieve
   * @returns {Promise<Object>} - Commit details
   */
  async retrieveAttempt(commitHash) {
    try {
      const show = await this.git.show([commitHash]);
      const log = await this.git.log(['-1', commitHash]);
      const commit = log.latest;

      try {
        const { description, metadata } = JSON.parse(commit.message);
        return {
          hash: commit.hash,
          date: commit.date,
          description,
          metadata,
          diff: show
        };
      } catch {
        return {
          hash: commit.hash,
          date: commit.date,
          description: commit.message,
          metadata: {},
          diff: show
        };
      }
    } catch (error) {
      throw new Error(`Failed to retrieve attempt: ${error.message}`);
    }
  }

  /**
   * Compare two solution attempts
   * @param {string} hash1 - First commit hash
   * @param {string} hash2 - Second commit hash
   * @returns {Promise<string>} - Diff between commits
   */
  async compareAttempts(hash1, hash2) {
    try {
      return await this.git.diff([hash1, hash2]);
    } catch (error) {
      throw new Error(`Failed to compare attempts: ${error.message}`);
    }
  }

  /**
   * Delete a solution space
   * @param {string} spaceName - Name of the solution space to delete
   * @returns {Promise<void>}
   */
  async deleteSolutionSpace(spaceName) {
    try {
      const sanitizedName = this.sanitizeBranchName(spaceName);
      await this.git.branch(['-D', sanitizedName]);
    } catch (error) {
      throw new Error(`Failed to delete solution space: ${error.message}`);
    }
  }

  /**
   * Sanitize branch name to be Git-compatible
   * @param {string} name - Branch name to sanitize
   * @returns {string} - Sanitized branch name
   */
  sanitizeBranchName(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
      .trim();
  }
}

export default GitDB;
