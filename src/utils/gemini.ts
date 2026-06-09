import { GoogleGenAI, Type } from '@google/genai';
import { ActionPlan } from '../types';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing in secrets / environment.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

/**
 * Uses Gemini to parse a natural language test case prompt into a structured Action Plan JSON
 */
export async function generateActionPlan(
  prompt: string, 
  sampleAppUrl?: string, 
  credentialsRef?: string
): Promise<ActionPlan> {
  const finalSampleUrl = sampleAppUrl || 'https://demo.example.com';
  const systemInstruction = `You are an expert QA Automation Engineer.
Your task is to parse a plain English browser test instruction and convert it into a strictly formatted JSON Action Plan for browser automation.

Available actions you can plan:
1. "open_url" - navigates to URL. Must have "target" as URL.
2. "click" - clicks element. Must have "target" as CSS/XPath selector (e.g. css=button.login, css=input[type=submit], or simple class/ID/placeholder selector).
3. "fill" - types into element. Must have "target" selector and a "value" representing the text.
4. "select" - selects an option from a drop-down. Must have "target" selector and "value".
5. "screenshot" - captures current page. Target can be null or a descriptive label, value is null.
6. "verify_text" - asserts that specified text is visible on the page or in a selector. Target can be css selector or "body", value is expected text content.
7. "wait" - pauses for a specified duration. Target can be a number of seconds as a string, e.g. "5".
8. "close" - closes browser session.

Verifications list:
You should automatically deduce logical checks to perform as steps. These must be listed in a separate "verifications" list matching the step numbers in the action.
Each verification has:
- "step_number": the action step integer where this assertion takes place (typically a "verify_text" step, or right after login/checkout click).
- "type": "text" | "element" | "url" | "status_code"
- "expected": expected value string (e.g., "Thank you for your order", or homepage URL).

Provide reasonable default values for timeouts (e.g. 15 for clicks, 10 for fills, 30 for open_url) and set "retry" logically (e.g. 2 or 3 for clicks).
Replace common secret inputs with a safe credential reference string <CRED_STORE_KEY> if password fields or keys are detected.

Return a valid JSON matching this schema:
{
  "test_name": "string (concise descriptive name)",
  "steps": [
    {
      "step_number": integer,
      "action": "open_url|click|fill|select|screenshot|verify_text|wait|close",
      "target": "string",
      "value": "string or null",
      "timeout_seconds": integer,
      "retry": integer,
      "screenshot_on": "always|on_failure|never"
    }
  ],
  "verifications": [
    {
      "step_number": integer,
      "type": "text|element|url|status_code",
      "expected": "string"
    }
  ],
  "metadata": {
    "sample_app": "string",
    "credentials_ref": "string"
  }
}`;

  const promptMessage = `User test prompt: "${prompt}"
Target Sample App URL: "${finalSampleUrl}"
Credentials Reference: "${credentialsRef || '<CRED_STORE_KEY>'}"

Generate the perfect action plan JSON. Do not output markdown backticks or any explanation, just raw valid JSON.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptMessage,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            test_name: { type: Type.STRING, description: "A concise name for the test" },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step_number: { type: Type.INTEGER },
                  action: { type: Type.STRING, description: "open_url|click|fill|select|screenshot|verify_text|wait|close" },
                  target: { type: Type.STRING },
                  value: { type: Type.STRING, description: "Value used for fill/select/verify actions. Omit or set to string or empty if unused." },
                  timeout_seconds: { type: Type.INTEGER },
                  retry: { type: Type.INTEGER },
                  screenshot_on: { type: Type.STRING, description: "always|on_failure|never" }
                },
                required: ["step_number", "action", "target", "timeout_seconds", "retry", "screenshot_on"]
              }
            },
            verifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step_number: { type: Type.INTEGER },
                  type: { type: Type.STRING, description: "text|element|url|status_code" },
                  expected: { type: Type.STRING }
                },
                required: ["step_number", "type", "expected"]
              }
            },
            metadata: {
              type: Type.OBJECT,
              properties: {
                sample_app: { type: Type.STRING },
                credentials_ref: { type: Type.STRING }
              }
            }
          },
          required: ["test_name", "steps", "verifications", "metadata"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Gemini returned an empty test plan');
    }

    const cleanedText = jsonText.trim();
    const parsedPlan: ActionPlan = JSON.parse(cleanedText);
    
    // Normalize step values (ensure 'value' is strictly defined as string or null)
    if (parsedPlan && parsedPlan.steps) {
      parsedPlan.steps = parsedPlan.steps.map(step => ({
        ...step,
        value: (step.value === undefined || step.value === null || step.value === 'null') ? null : String(step.value)
      }));
    }
    
    return parsedPlan;

  } catch (err: any) {
    console.error('Error generating action plan with Gemini:', err);
    // Fallback static action plan for the demo scenario to avoid total failure
    return getFallbackActionPlan(prompt, finalSampleUrl, credentialsRef);
  }
}

/**
 * Returns a custom set of suggestions for improving a test case based on its instructions
 */
export async function generateSuggestions(prompt: string): Promise<string[]> {
  const systemInstruction = `You are a Principal QA Automation Engineer.
Analyze the user's plain English browser test prompt and suggest 4 concrete and high-value improvement goals or assertions that the user should consider adding to improve test coverage, verify visual correctness, assert performance thresholds, or handle session state.
Return the suggestions as a JSON list of strings (array of strings).`;

  const queryPrompt = `Analyze this test instruction: "${prompt}"
Return 4 suggestions. Ensure the output is valid JSON: string[] like ["Suggestion 1", "Suggestion 2", ...]`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: queryPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text.trim());
    }
  } catch (err) {
    console.error('Failed to get AI suggestions:', err);
  }

  // Fallback default suggestions
  return [
    "Verify successful login state (e.g. assert profile dropdown is visible)",
    "Verify cart quantity badge updates instantly after clicking Add to Cart",
    "Add confirmation code validation after checking out (status_code and body check)",
    "Test keyboard control accessibility (e.g. check tab indexing on target navigation inputs)"
  ];
}

/**
 * Static fallback plan matching the standard demo scenario if LLM fail
 */
function getFallbackActionPlan(prompt: string, sampleAppUrl: string, credentialsRef?: string): ActionPlan {
  const url = sampleAppUrl || 'https://demo.example.com';
  return {
    test_name: "Login Add2 Checkout Fallback",
    steps: [
      {
        step_number: 1,
        action: "open_url",
        target: url,
        value: null,
        timeout_seconds: 30,
        retry: 1,
        screenshot_on: "on_failure"
      },
      {
        step_number: 2,
        action: "click",
        target: "css=button.login",
        value: null,
        timeout_seconds: 15,
        retry: 2,
        screenshot_on: "on_failure"
      },
      {
        step_number: 3,
        action: "fill",
        target: "css=input[name=email]",
        value: "demo_user@example.com",
        timeout_seconds: 10,
        retry: 1,
        screenshot_on: "on_failure"
      },
      {
        step_number: 4,
        action: "fill",
        target: "css=input[name=password]",
        value: credentialsRef || "<CRED_STORE_KEY>",
        timeout_seconds: 10,
        retry: 1,
        screenshot_on: "on_failure"
      },
      {
        step_number: 5,
        action: "click",
        target: "css=button.submit-login",
        value: null,
        timeout_seconds: 15,
        retry: 2,
        screenshot_on: "on_failure"
      },
      {
        step_number: 6,
        action: "click",
        target: "css=.product-card:nth-of-type(1) button.add-to-cart",
        value: null,
        timeout_seconds: 10,
        retry: 2,
        screenshot_on: "on_failure"
      },
      {
        step_number: 7,
        action: "click",
        target: "css=.product-card:nth-of-type(2) button.add-to-cart",
        value: null,
        timeout_seconds: 10,
        retry: 2,
        screenshot_on: "on_failure"
      },
      {
        step_number: 8,
        action: "click",
        target: "css=a[href='/cart']",
        value: null,
        timeout_seconds: 10,
        retry: 1,
        screenshot_on: "on_failure"
      },
      {
        step_number: 9,
        action: "click",
        target: "css=button.checkout",
        value: null,
        timeout_seconds: 20,
        retry: 2,
        screenshot_on: "on_failure"
      },
      {
        step_number: 10,
        action: "fill",
        target: "css=input[name=cardnumber]",
        value: "4242424242424242",
        timeout_seconds: 15,
        retry: 1,
        screenshot_on: "on_failure"
      },
      {
        step_number: 11,
        action: "click",
        target: "css=button.place-order",
        value: null,
        timeout_seconds: 30,
        retry: 2,
        screenshot_on: "on_failure"
      },
      {
        step_number: 12,
        action: "verify_text",
        target: "css=.order-confirmation",
        value: "Thank you for your order",
        timeout_seconds: 15,
        retry: 1,
        screenshot_on: "always"
      }
    ],
    verifications: [
      {
        step_number: 12,
        type: "text",
        expected: "Thank you for your order"
      }
    ],
    metadata: {
      sample_app: url,
      credentials_ref: credentialsRef || "<CRED_STORE_KEY>"
    }
  };
}
