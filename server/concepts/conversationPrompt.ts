import { ObjectId } from "mongodb";
import OpenAI from "openai";

export default class ConversationPromptConcept {
  private static numPromptsToFetch = 3;
  private static maxTokens = 25;
  private static promptExamples = [
    'Would you rather have the neck of a giraffe or the body of a hippo?',
    'If you could eat one food for the rest of your life, what would it be?',
    'If you could have any superpower, what would it be?',
    "If you were stranded on a desert island, what three items would you want to have with you?",
    "If you were a character in a movie or a book, who would you be?",
    "If you could travel back in time to a historical period, what would it be?",
    "Would you rather be super overdressed or super underdressed?",
    "Would you rather lose your sight or your memories?"
  ]

  private readonly openAIClient: OpenAI;
  private readonly cachedPrompts: Map<string, Array<string>>;  // maps requester to prompts that are ready-to-go and unseen by the requester
  private readonly previousPrompts: Map<string, Array<string>>;  // maps requester to prompts that have already been seen by the requester
  private readonly starterPrompts: Array<string>;  // some prompts that all requesters will be given at the start

  public constructor() {
    this.openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.cachedPrompts = new Map<string, Array<string>>();
    this.previousPrompts = new Map<string, Array<string>>();

    const starterPrompts: Array<string> = [];
    this.starterPrompts = starterPrompts;
    this.fetchPrompts([], starterPrompts);
  }

  public async getPrompt(requester: ObjectId): Promise<string> {
    const id = requester.toString();
    let cached = this.cachedPrompts.get(id);
    if (cached === undefined) {
      // the requester hasn't asked for any prompts before
      this.cachedPrompts.set(id, this.starterPrompts);
      this.previousPrompts.set(id, []);
    }

    cached = this.cachedPrompts.get(id) as string[];
    const previous = this.previousPrompts.get(id) as string[];

    if (cached.length === 0) {
      // must fetch some more prompts!
      await this.fetchPrompts(previous, cached);
    }

    if (cached.length === 0) {
      // all the fetched prompts were already used :(
      // in order to respond relatively quickly, let's use one of the previously
      // used prompts
      return previous[Math.floor(Math.random() * previous.length)];
    }

    if (cached.length < Math.floor(ConversationPromptConcept.numPromptsToFetch / 2)) {
      // running low on prompts, let's fetch some in the background (do not wait for the response)
      this.fetchPrompts(previous, cached);
    }

    // let's return a new prompt!
    const prompt = cached.pop();
    if (prompt !== undefined) {
      previous.push(prompt);
      return prompt;
    }

    throw new Error("This line shouldn't be reached!");
  }

  private async fetchPrompts(previous: Array<string>, cached: Array<string>): Promise<void> {
    const randomExamples = ConversationPromptConcept.promptExamples.sort((_a, _b) => Math.random() > 0.5 ? -1 : 1);
    const instructions = `
                Provide exactly one fun, conversation starter.

                Some good examples are:
                ${randomExamples[0]}
                ${randomExamples[1]}
                ${randomExamples[2]}

                Provide the conversation starter, and nothing else.
            `;

    const response = await this.openAIClient.chat.completions.create({
      messages: [{ role: "user", content: instructions }],
      model: "gpt-3.5-turbo",
      temperature: 1.2, // make responses more random,
      max_tokens: ConversationPromptConcept.maxTokens,
      n: ConversationPromptConcept.numPromptsToFetch,
    });

    const newPrompts = response.choices.map((choice) => choice.message.content).filter((prompt) => prompt !== null) as Iterable<string>;
    for (const prompt of newPrompts) {
      const processedPrompt = this.postProcessPrompt(prompt);
      if (previous.includes(processedPrompt)) continue;
      cached.push(processedPrompt);
    }
  }

  private postProcessPrompt(prompt: string): string {
    prompt = prompt.trim();
    prompt = prompt.replace('\n', '');

    return prompt;
  }
}
