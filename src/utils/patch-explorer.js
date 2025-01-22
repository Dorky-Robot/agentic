import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';

/**
 * PatchExplorer - Uses Git patches to explore and manage multiple solution attempts
 * Each solution is stored as a patch file that can be easily applied, compared, and combined
 */
class PatchExplorer {
  constructor(workingDir = process.cwd()) {
    this.git = simpleGit(workingDir);
    this.patchDir = path.join(workingDir, '.patches');
    this.currentBranch = null;
  }

  /**
   * Initialize the patch explorer
   */
  async init() {
    // Create patches directory if it doesn't exist
    await fs.mkdir(this.patchDir, { recursive: true });
    
    // Store current branch name
    this.currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
  }

  /**
   * Create a new solution attempt as a patch
   * @param {string} name - Name for this solution attempt
   * @param {Function} modifier - Async function that makes the desired changes
   * @returns {Promise<string>} - Path to the created patch file
   */
  async createSolution(name, modifier) {
    const branchName = `solution/${name}`;
    
    try {
      // Create and checkout new branch
      await this.git.checkoutLocalBranch(branchName);
      
      // Apply the modifications
      await modifier();
      
      // Stage all changes
      await this.git.add('.');
      
      // Create commit with solution
      await this.git.commit(`Solution attempt: ${name}`);
      
      // Create patch file
      const patchPath = path.join(this.patchDir, `${name}.patch`);
      await this.git.raw(['format-patch', '-1', '--stdout', 'HEAD'])
        .then(patch => fs.writeFile(patchPath, patch));
      
      // Return to original branch
      await this.git.checkout(this.currentBranch);
      
      // Clean up temporary branch
      await this.git.deleteLocalBranch(branchName, true);
      
      return patchPath;
    } catch (error) {
      // Clean up on error
      await this.git.checkout(this.currentBranch);
      try {
        await this.git.deleteLocalBranch(branchName, true);
      } catch {}
      throw error;
    }
  }

  /**
   * Apply a patch to see its changes
   * @param {string} patchName - Name of the patch file (without .patch extension)
   * @returns {Promise<void>}
   */
  async applySolution(patchName) {
    const patchPath = path.join(this.patchDir, `${patchName}.patch`);
    await this.git.raw(['apply', patchPath]);
  }

  /**
   * Remove a patch's changes
   * @param {string} patchName - Name of the patch file (without .patch extension)
   * @returns {Promise<void>}
   */
  async revertSolution(patchName) {
    const patchPath = path.join(this.patchDir, `${patchName}.patch`);
    await this.git.raw(['apply', '--reverse', patchPath]);
  }

  /**
   * List all available solution patches
   * @returns {Promise<Array<string>>} - List of patch names (without .patch extension)
   */
  async listSolutions() {
    const files = await fs.readdir(this.patchDir);
    return files
      .filter(f => f.endsWith('.patch'))
      .map(f => f.replace('.patch', ''));
  }

  /**
   * Compare two solution patches
   * @param {string} patch1 - Name of first patch
   * @param {string} patch2 - Name of second patch
   * @returns {Promise<string>} - Diff between the patches
   */
  async compareSolutions(patch1, patch2) {
    const path1 = path.join(this.patchDir, `${patch1}.patch`);
    const path2 = path.join(this.patchDir, `${patch2}.patch`);
    
    const content1 = await fs.readFile(path1, 'utf8');
    const content2 = await fs.readFile(path2, 'utf8');
    
    return this.git.raw(['diff', '--no-index', path1, path2]);
  }

  /**
   * Combine multiple solutions into a single patch
   * @param {Array<string>} patchNames - Names of patches to combine
   * @param {string} outputName - Name for the combined patch
   * @returns {Promise<string>} - Path to the combined patch file
   */
  async combineSolutions(patchNames, outputName) {
    // Create temporary branch for combining
    const tempBranch = `combine/${outputName}`;
    
    try {
      await this.git.checkoutLocalBranch(tempBranch);
      
      // Apply all patches in sequence
      for (const name of patchNames) {
        await this.applySolution(name);
      }
      
      // Create combined patch
      await this.git.add('.');
      await this.git.commit(`Combined solution: ${outputName}`);
      
      const outputPath = path.join(this.patchDir, `${outputName}.patch`);
      await this.git.raw(['format-patch', '-1', '--stdout', 'HEAD'])
        .then(patch => fs.writeFile(outputPath, patch));
      
      // Clean up
      await this.git.checkout(this.currentBranch);
      await this.git.deleteLocalBranch(tempBranch, true);
      
      return outputPath;
    } catch (error) {
      // Clean up on error
      await this.git.checkout(this.currentBranch);
      try {
        await this.git.deleteLocalBranch(tempBranch, true);
      } catch {}
      throw error;
    }
  }
}

export default PatchExplorer;
