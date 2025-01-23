#!/usr/bin/env node

/**
 * dci-agent.js
 *
 * A generic agent script that sets its process title based on the role it receives,
 * so you can identify it in ps aux or top. In real usage, you'd also load the DCI
 * YAML to see what responsibilities or actions this role can perform.
 */

const process = require('process');

// A small function to parse arguments: e.g. node dci-agent.js --role "Command Planner"
function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index > -1 && index < process.argv.length - 1) {
    return process.argv[index + 1];
  }
  return null;
}

async function main() {
  // Determine the role from command-line args
  const roleName = getArgValue('--role') || 'UnknownRole';

  // Set the process title so it appears in ps aux. 
  // On Unix systems, you might see something like "DCI-Agent: Command Planner".
  process.title = `DCI-Agent: ${roleName}`;

  console.log(`Agent for role "${roleName}" is starting up...`);
  console.log(`Process title set to: "${process.title}"`);

  // TODO: In a real system, you might do something like:
  // 1) Load the DCI YAML to see this role's responsibilities
  // 2) Start a message loop or server that performs "Command Planner" tasks
  // 3) Possibly connect to other agents or orchestrators

  // For demo, we'll just keep running until killed.
  setInterval(() => {
    // Periodically show we're alive
    console.log(`[${roleName}] still running... (pid: ${process.pid}, title: "${process.title}")`);
  }, 5000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});