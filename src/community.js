import { Agent } from './agent.js';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

export class Community {
  constructor(name, modelDescriptions = {}) {
    this.name = name;
    this.agents = new Map();
    this.contexts = new Map();
    this.modelDescriptions = modelDescriptions;
    this.configPath = path.join(process.cwd(), 'communities');
  }

  // Load a community from a YAML configuration
  static async fromConfig(configPath) {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(content);
      
      const community = new Community(config.name, config.modelDescriptions);
      
      // Recreate agents
      for (const agentConfig of config.agents) {
        const agent = new Agent(
          agentConfig.name,
          agentConfig.specialty,
          config.modelDescriptions
        );
        agent.knowledge = new Set(agentConfig.knowledge);
        community.addAgent(agent);
      }
      
      // Recreate contexts
      for (const [contextName, contextConfig] of Object.entries(config.contexts)) {
        community.defineContext(contextName, contextConfig.roles);
        if (contextConfig.roleAssignments) {
          community.assignRoles(contextName, contextConfig.roleAssignments);
        }
      }
      
      return community;
    } catch (error) {
      console.error('Error loading community config:', error);
      return null;
    }
  }

  // Save the current community state as YAML
  async saveConfig() {
    try {
      // Ensure communities directory exists
      await fs.mkdir(this.configPath, { recursive: true });
      
      const config = {
        name: this.name,
        modelDescriptions: this.modelDescriptions,
        agents: Array.from(this.agents.values()).map(agent => ({
          name: agent.name,
          specialty: agent.specialty,
          knowledge: Array.from(agent.knowledge)
        })),
        contexts: Object.fromEntries(
          Array.from(this.contexts.entries()).map(([name, context]) => [
            name,
            {
              roles: context.roles,
              roleAssignments: this.getRoleAssignments(name)
            }
          ])
        )
      };
      
      const yamlContent = yaml.dump(config, {
        indent: 2,
        noRefs: true,
        sortKeys: true
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.name}-${timestamp}.yml`;
      await fs.writeFile(
        path.join(this.configPath, filename),
        yamlContent,
        'utf8'
      );
      
      console.log(`Community configuration saved to: ${filename}`);
    } catch (error) {
      console.error('Error saving community config:', error);
    }
  }

  addAgent(agent) {
    this.agents.set(agent.name, agent);
    agent.community = this;
  }

  defineContext(contextName, roles) {
    this.contexts.set(contextName, {
      roles,
      interactions: new Map()
    });
  }

  assignRoles(contextName, roleAssignments) {
    const context = this.contexts.get(contextName);
    if (!context) return false;

    for (const [roleName, agentName] of Object.entries(roleAssignments)) {
      const agent = this.agents.get(agentName);
      if (agent && context.roles.includes(roleName)) {
        agent.setContext(roleName, this);
      }
    }
  }

  getRoleAssignments(contextName) {
    const context = this.contexts.get(contextName);
    if (!context) return {};

    const assignments = {};
    for (const agent of this.agents.values()) {
      if (agent.role && context.roles.includes(agent.role)) {
        assignments[agent.role] = agent.name;
      }
    }
    return assignments;
  }

  async handleTask(task) {
    // If this is a new type of task, start with a single agent
    if (this.agents.size === 0) {
      const initialAgent = new Agent('initial_agent', null, this.modelDescriptions);
      this.addAgent(initialAgent);
      
      const result = await initialAgent.performTask(task);
      
      // If the agent suggests splitting, evolve the community
      if (result.canSplit) {
        const specialties = this.parseSpecialties(result.analysis);
        const specialists = await initialAgent.splitIntoSpecialists(specialties);
        
        // Add new specialist agents to the community
        specialists.forEach(agent => this.addAgent(agent));
        
        // Create a new context for this type of task
        this.defineContext(task, specialties);
        
        // Reassign the task to the new specialists
        const roleAssignments = {};
        specialists.forEach(agent => {
          roleAssignments[agent.specialty] = agent.name;
        });
        this.assignRoles(task, roleAssignments);
        
        // Save the evolved configuration
        await this.saveConfig();
        
        // Re-run the task with the specialized community
        return this.handleTask(task);
      }
      
      return result.solution;
    }
    
    // If we already have a community, collaborate to solve the task
    const taskAnalysis = await this.analyzeTask(task);
    const relevantAgents = this.findRelevantAgents(taskAnalysis);
    
    // Let agents collaborate on the solution
    const solutions = await Promise.all(
      relevantAgents.map(agent => agent.performTask(task))
    );
    
    // Combine solutions and learn from the experience
    return this.synthesizeSolutions(solutions);
  }

  parseSpecialties(analysis) {
    const specialtiesMatch = analysis.match(/SPECIALTIES: (.*)/);
    if (specialtiesMatch) {
      return specialtiesMatch[1].split(',').map(s => s.trim());
    }
    return [];
  }

  async analyzeTask(task) {
    const analyses = await Promise.all(
      Array.from(this.agents.values()).map(agent =>
        agent.think(`
          Task: ${task}
          Your specialty: ${agent.specialty}
          
          Can you contribute to this task? How?
          Rate your relevance from 0-10.
          
          Format response as:
          RELEVANCE: [0-10]
          CONTRIBUTION: [brief explanation]
        `)
      )
    );
    
    return analyses;
  }

  findRelevantAgents(analyses) {
    return Array.from(this.agents.values()).filter((agent, index) => {
      const analysis = analyses[index];
      const relevanceMatch = analysis.match(/RELEVANCE: (\d+)/);
      return relevanceMatch && parseInt(relevanceMatch[1]) > 5;
    });
  }

  async synthesizeSolutions(solutions) {
    const mainAgent = this.agents.values().next().value;
    const synthesis = await mainAgent.think(`
      Multiple agents provided solutions to the task:
      ${solutions.map(s => s.solution).join('\n---\n')}
      
      Synthesize these solutions into a single coherent solution.
      Consider the strengths of each approach.
    `);
    
    return synthesis;
  }

  async retrospective() {
    let communityEvolved = false;
    
    for (const agent of this.agents.values()) {
      const improvements = await agent.think(`
        Review your recent tasks and interactions.
        What patterns have you noticed?
        What could be improved?
        What new specialties might be useful?
        
        Format response as:
        PATTERNS: [identified patterns]
        IMPROVEMENTS: [suggested improvements]
        NEW_SPECIALTIES: [potential new specialties]
      `);
      
      // Process improvements and potentially evolve the community
      const evolved = await this.processRetrospective(improvements);
      if (evolved) communityEvolved = true;
    }
    
    // If the community evolved during retrospective, save the new configuration
    if (communityEvolved) {
      await this.saveConfig();
    }
  }

  async processRetrospective(improvements) {
    const specialtiesMatch = improvements.match(/NEW_SPECIALTIES: (.*)/);
    if (specialtiesMatch) {
      const newSpecialties = specialtiesMatch[1].split(',').map(s => s.trim());
      // Consider adding new specialist agents
      return this.evolveWithNewSpecialties(newSpecialties);
    }
    return false;
  }

  async evolveWithNewSpecialties(newSpecialties) {
    let evolved = false;
    for (const specialty of newSpecialties) {
      if (!Array.from(this.agents.values()).some(a => a.specialty === specialty)) {
        const newAgent = new Agent(
          `${specialty}_specialist`,
          specialty,
          this.modelDescriptions
        );
        this.addAgent(newAgent);
        evolved = true;
      }
    }
    return evolved;
  }
}
