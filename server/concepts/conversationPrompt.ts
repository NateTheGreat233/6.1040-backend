import OpenAI from "openai";

export default class ConversationPromptConcept {
  private static numPromptsToFetch = 1;

  private readonly openAIClient: OpenAI;
  private readonly cachedPrompts: Array<string>;
  private readonly previousPrompts: Set<string>;

  public constructor() {
    this.openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.cachedPrompts = [];
    this.previousPrompts = new Set();

    this.fetchPrompts();
  }

  public async getPrompt(): Promise<string> {
    if (this.cachedPrompts.length === 0) {
      // must fetch some more prompts!
      await this.fetchPrompts();
    }

    if (this.cachedPrompts.length === 0) {
      // all the fetched prompts were already used :(
      // in order to respond relatively quickly, let's use one of the previously
      // used prompts
      return [...this.previousPrompts][Math.floor(Math.random() * [...this.previousPrompts].length)];
    }

    if (this.cachedPrompts.length < Math.floor(ConversationPromptConcept.numPromptsToFetch / 2)) {
      // running low on prompts, let's fetch some in the background (do not wait for the response)
      this.fetchPrompts();
    }

    // let's return a new prompt!
    const prompt = this.cachedPrompts.pop();
    if (prompt !== undefined) {
      this.previousPrompts.add(prompt);
      return prompt;
    }

    throw new Error("This line shouldn't be reached!");
  }

  private async fetchPrompts(): Promise<void> {
    const instructions = `
                Give me exactly one fun, conversation starter.

                Some good examples are:
                Would you rather have the neck of a giraffe or the body of a hippo?
                If you could eat one food for the rest of your life, what would it be?
                If you could have any superpower, what would it be?

                Provide the conversation starter, and nothing else.
            `;

    const response = await this.openAIClient.chat.completions.create({
      messages: [{ role: "user", content: instructions }],
      model: "gpt-3.5-turbo",
      temperature: 2, // make responses more random,
      n: ConversationPromptConcept.numPromptsToFetch,
    });

    const newPrompts = response.choices.map((choice) => choice.message.content).filter((prompt) => prompt !== null) as Iterable<string>;
    for (const prompt of newPrompts) {
      if (this.previousPrompts.has(prompt)) continue;
      this.cachedPrompts.push(prompt);
    }
  }
}
