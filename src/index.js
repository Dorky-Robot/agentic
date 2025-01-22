import { Community } from './community.js';
import fs from 'fs/promises';
import path from 'path';

// Natural language descriptions of model capabilities
const modelDescriptions = {
  'llama3.3': 'Latest and most capable model. Very smart but slower. Best for complex reasoning and detailed analysis.',
  'llama3.2': 'Balanced model. Moderately fast with good capabilities. Good for general tasks.',
  'qwen2.5-coder': 'Specialized for code generation and technical tasks. Fast for programming-related queries.',
  'gemma2': 'Efficient and quick model. Good for simple tasks and rapid responses.',
  'nomic-embed-text': 'Very fast, lightweight model. Best for quick text analysis and simple tasks.'
};

async function findLatestConfig(communityName) {
  try {
    const configDir = path.join(process.cwd(), 'communities');
    const files = await fs.readdir(configDir);
    
    // Find the latest config file for this community
    const configFiles = files.filter(f => 
      f.startsWith(communityName) && f.endsWith('.yml')
    );
    
    if (configFiles.length === 0) return null;
    
    // Sort by timestamp in filename
    configFiles.sort().reverse();
    return path.join(configDir, configFiles[0]);
  } catch (error) {
    // Directory doesn't exist or other error
    return null;
  }
}

async function main() {
  try {
    const communityName = 'weekend_planner';
    let community;

    // Try to load existing community configuration
    const latestConfig = await findLatestConfig(communityName);
    if (latestConfig) {
      console.log(`Loading existing community from: ${latestConfig}`);
      community = await Community.fromConfig(latestConfig);
      if (!community) {
        throw new Error('Failed to load community configuration');
      }
    } else {
      console.log('Creating new community...');
      community = new Community(communityName, modelDescriptions);
    }

    // Example task: Planning weekend activities
    const task = `
      I need help planning activities for my weekends. Consider:
      - Indoor and outdoor activities
      - Weather conditions
      - Social vs solo activities
      - Budget considerations
      
      Start by analyzing if this task needs multiple specialized agents or can be handled by one agent.
    `;

    console.log('\nInitial task:', task);
    console.log('\nProcessing...\n');

    // Handle the task - this will start with one agent and potentially evolve
    const result = await community.handleTask(task);
    
    console.log('Result:', result);
    console.log('\nCurrent community structure:');
    console.log('Number of agents:', community.agents.size);
    for (const agent of community.agents.values()) {
      console.log(`- Agent: ${agent.name}, Specialty: ${agent.specialty || 'None'}`);
    }

    // During idle time, perform retrospective
    console.log('\nPerforming retrospective analysis...');
    await community.retrospective();

    // Show any learned patterns
    console.log('\nLearned patterns and heuristics:');
    for (const agent of community.agents.values()) {
      console.log(`\nAgent ${agent.name}:`);
      for (const knowledge of agent.knowledge) {
        console.log('Pattern:', knowledge.pattern);
        console.log('Implementation:', knowledge.implementation);
      }
    }

    // The community configuration is automatically saved after evolution
    console.log('\nCommunity configuration has been saved to the communities directory.');
    console.log('You can share this configuration to replicate this community structure.');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Ensure Ollama is running before starting
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      console.log('Ollama is running. Starting application...\n');
      main();
    }
  } catch (error) {
    console.error('Error: Ollama is not running. Please start Ollama first.');
    console.log('You can start Ollama by running the "ollama serve" command.');
    process.exit(1);
  }
}

checkOllama();
