import fetch from 'node-fetch';

export class Agent {
  constructor(name, specialty = null, modelDescriptions = {}) {
    this.name = name;
    this.specialty = specialty;
    this.knowledge = new Set(); // Learned patterns and heuristics
    this.community = null;
    this.modelDescriptions = modelDescriptions;
  }

  async selectModel(task, context) {
    // If no models are described, default to first available
    if (Object.keys(this.modelDescriptions).length === 0) {
      return Object.keys(await this.getAvailableModels())[0];
    }

    // Ask a fast model to help choose the best model for this specific task
    const selectionPrompt = `
      Task to perform: ${task}
      Context: ${context}

      Available models and their characteristics:
      ${Object.entries(this.modelDescriptions)
        .map(([name, desc]) => `${name}: ${desc}`)
        .join('\n')}

      Based on the task and model characteristics, which model would be most appropriate?
      Consider:
      - Task complexity and required reasoning
      - Speed requirements
      - Accuracy needs
      - Resource efficiency

      Return only the model name, nothing else.
    `;

    // Use a quick model for this decision
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Object.keys(this.modelDescriptions)[0], // Use first model for quick decision
        prompt: selectionPrompt,
        stream: false
      })
    });

    const data = await response.json();
    return data.response.trim();
  }

  async getAvailableModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      return data.models || {};
    } catch (error) {
      console.error('Error fetching available models:', error);
      return {};
    }
  }

  async think(prompt, context = '') {
    try {
      const model = await this.selectModel(prompt, context);
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      });

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      return null;
    }
  }

  async performTask(task) {
    // First attempt to solve the task directly
    const solution = await this.think(
      `
      Task: ${task}
      Your specialty: ${this.specialty || 'None'}
      Think through how to solve this task step by step.
      `,
      'Complex task requiring detailed analysis and solution generation'
    );

    // After completing the task, analyze if it could be split into subtasks
    const analysis = await this.think(
      `
      I just completed this task: ${task}
      Solution: ${solution}
      
      Could this task be better handled by splitting it into multiple specialized agents?
      If yes, what would be the specialties of these agents?
      If no, explain why it's better handled by a single agent.
      
      Format your response as:
      SPLIT: yes/no
      REASON: your explanation
      SPECIALTIES: specialty1, specialty2, etc (if split=yes)
      `,
      'Strategic analysis of task division and specialization'
    );

    // Store any patterns or heuristics identified
    await this.learnFromExperience(task, solution);

    return {
      solution,
      analysis,
      canSplit: analysis.includes('SPLIT: yes')
    };
  }

  async learnFromExperience(task, solution) {
    const reflection = await this.think(
      `
      Analyze this task and solution:
      Task: ${task}
      Solution: ${solution}
      
      Can any part of this be converted into a JavaScript function for faster future execution?
      If yes, provide the code. If no, explain why not.
      `,
      'Pattern recognition and code generation task'
    );

    if (reflection.includes('```javascript')) {
      // Extract and store the JavaScript code for future use
      const code = reflection.split('```javascript')[1].split('```')[0];
      this.knowledge.add({
        pattern: task,
        implementation: code
      });
    }
  }

  async splitIntoSpecialists(specialties) {
    return specialties.map(specialty => 
      new Agent(`${this.name}_${specialty}`, specialty, this.modelDescriptions)
    );
  }

  setContext(role, community) {
    this.role = role;
    this.community = community;
  }
}
