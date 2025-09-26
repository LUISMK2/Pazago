import { Agent } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
import { berkshireTool } from "../tools/berkshireTool";

const model = openai("gpt-4o-mini");

export const buffettAgent = new Agent({
  name: "buffettAgent",
  instructions: "You are an assistant that answers questions using Buffett’s Berkshire Hathaway shareholder letters.",
  model,
  // Pass the tools as an object, not an array
  tools: { berkshireTool },
});