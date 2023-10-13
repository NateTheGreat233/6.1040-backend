import { ObjectId } from "mongodb";
import OpenAI from "openai";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface ConversationPromptDoc extends BaseDoc {
  requesterId: ObjectId;
  cachedPrompts: Array<string>;
  previousPrompts: Array<string>;
}

export default class ConversationPromptConcept {
  private static numPromptsToFetch = 3;
  private static maxTokens = 25;
  private static model = 'gpt-3.5-turbo';
  private static temperature = 1.2;
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

  private static readonly openAIClient: OpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  public readonly conversationPrompts = new DocCollection<ConversationPromptDoc>("conversationPrompts");

  private async getConversationPromptInfo(requesterId: ObjectId) {
    return await this.conversationPrompts.readOne({ requesterId });
  }

  private async createConversationPromptInfo(requesterId: ObjectId) {
    const cachedPrompts: Array<string> = [];
    await this.fetchPrompts([], cachedPrompts);
    return await this.conversationPrompts.createOne({ requesterId, cachedPrompts, previousPrompts: [] })
  }

  public async getPrompt(requesterId: ObjectId): Promise<string> {
    let promptInfo = await this.getConversationPromptInfo(requesterId);
    if (promptInfo === null) {
      await this.createConversationPromptInfo(requesterId);
      promptInfo = await this.getConversationPromptInfo(requesterId);
    }
    if (!promptInfo) throw new Error("This line should not be reached");

    if (promptInfo.cachedPrompts.length === 0) {
      // must fetch some more prompts!
      await this.fetchPrompts(promptInfo.previousPrompts, promptInfo.cachedPrompts);
    }

    if (promptInfo.cachedPrompts.length === 0) {
      // all the fetched prompts were already used :(
      // in order to respond relatively quickly, let's use one of the previously
      // used prompts
      return promptInfo.previousPrompts[Math.floor(Math.random() * promptInfo.previousPrompts.length)];
    }

    if (promptInfo.cachedPrompts.length < Math.floor(ConversationPromptConcept.numPromptsToFetch / 2)) {
      // running low on prompts, let's fetch some in the background (do not wait for the response)
      this.fetchPrompts(promptInfo.previousPrompts, promptInfo.cachedPrompts);
    }

    // let's return a new prompt!
    const prompt = promptInfo.cachedPrompts.pop();
    if (prompt !== undefined) {
      promptInfo.previousPrompts.push(prompt);
      // store mutated data back into db
      await this.conversationPrompts.updateOne({ requesterId }, promptInfo);
      return prompt;
    }

    throw new Error("This line shouldn't be reached!");
  }

  public async deleteCache(requesterId: ObjectId) {
    await this.conversationPrompts.deleteMany({ requesterId });
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

    const response = await ConversationPromptConcept.openAIClient.chat.completions.create({
      messages: [{ role: "user", content: instructions }],
      model: ConversationPromptConcept.model,
      temperature: ConversationPromptConcept.temperature,
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
