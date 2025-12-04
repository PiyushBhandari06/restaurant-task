// Import LiveKit agents core functionalities
import {
  type JobContext, // Context for each agent job/session -- A type that describes what information is available when agent runs
  //type in JobContext tells TypeScript - "I'm only importing this for type-checking, not to actually use it in the running code." It's a best practice for cleaner, more optimized TypeScript!
  ServerOptions, // Configuration for the agent server
  cli, // Command-line interface to run the agent
  defineAgent, // Function to create an agent & define its behavior
  voice, // Tools for voice conversations
} from "@livekit/agents";

// Import OpenAI plugins for STT, LLM
import * as openai from "@livekit/agents-plugin-openai";
// Import ElevenLabs plugin for TTS
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";

// Imports a utility to convert file URLs to file paths
import { fileURLToPath } from "node:url";
// Needed at the bottom to tell the CLI where your agent file is located

// Define the agent - This is the main agent configuration that LiveKit will use
export default defineAgent({
  // This is where your agent logic starts - it runs every time a user joins
  // Define an entry function that runs when a user joins a LiveKit room
  entry: async (ctx: JobContext) => {           //ctx: Contains information about the room and connection   //JobContext: TypeScript type telling us what's inside ctx
    // Connect the agent to the LiveKit room
    await ctx.connect();

    // Create the voice agent with system instructions
    // This defines the agent's personality and behavior
    const agent = new voice.Agent({         //Creates a new agent instance
      instructions:
        "You are a helpful voice assistant. Keep responses concise.",
    });

    // Create a session that handles the voice conversation pipeline:
    // User speaks -> STT (speech-to-text) -> LLM (generates response) -> TTS (text-to-speech) -> User hears
    const session = new voice.AgentSession({
      stt: new openai.STT(), // Speech-to-Text using OpenAI Whisper
      llm: new openai.LLM({ model: "gpt-4" }), // Language model for generating responses
      tts: new elevenlabs.TTS(),                // Text-to-Speech using ElevenLabs
    });

    // Start the session by connecting the agent to the room
    await session.start({
      agent: agent,
      room: ctx.room,
    });

    // Have the agent speak an initial greeting
    session.say("Hello! How can I help you today?");
  },
});

// CLI runner - this starts the agent worker process
// The worker listens for LiveKit room connections and spawns agent instances
if (import.meta.url === `file://${process.argv[1]}`) {
    // What it does: Checks if this file is being run directly (not imported by another file)
    // import.meta.url: Current file's URL
    // process.argv[1]: The file that was run from command line
    // Why: Only run the CLI if this is the main file being executed

  // cli.runApp() does the following:
  // 1. Reads LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET from environment
  // 2. Connects to your LiveKit server
  // 3. Waits for room events (when users join rooms)
  // 4. Automatically spawns agent instances for each room connection
  cli.runApp(
    //What it does: Starts the agent server using the CLI tool
    // Why: This creates a background server that waits for LiveKit room connections
    new ServerOptions({
      agent: fileURLToPath(import.meta.url),
        // What it does: Creates server configuration
        //  agent: Path to this file (so CLI knows where your agent code is)
        //  fileURLToPath(): Converts URL to file path
        // Why: Tells the CLI where to find your agent definition
    })
  );
}