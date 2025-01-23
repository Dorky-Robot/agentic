#!/usr/bin/env node

/**
 * dci-agent-manager.js
 *
 * This script:
 * 1) Loads a DCI YAML file (e.g. dci.yaml).
 * 2) Extracts the "roles" object.
 * 3) For each role, spawns a child process running "dci-agent.js" with --role <roleName>.
 * 4) Each agent process sets its process.title so it can be easily identified in ps aux.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml'); // npm install js-yaml

async function main() {
  const yamlPath = path.join(__dirname, 'dci.yaml');
  let doc;
  try {
    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    doc = yaml.load(fileContents);
  } catch (e) {
    console.error('Error reading dci.yaml:', e);
    process.exit(1);
  }

  // The 'roles' section is typically doc.roles if you followed the structure.
  const roles = doc.roles || {};

  // For each role in the YAML, spawn a child process:
  Object.keys(roles).forEach((roleName) => {
    console.log(`Spawning agent for role: ${roleName}`);

    // We pass the role name as an argument so the child knows which role it is.
    // Also, we might pass additional data if needed.
    const child = spawn(process.execPath, [
      path.join(__dirname, 'dci-agent.js'),
      '--role',
      roleName
    ], {
      stdio: 'inherit', // So we can see logs in our terminal
    });

    // Optionally handle child exit
    child.on('exit', (code) => {
      console.log(`Agent for role "${roleName}" exited with code ${code}`);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});