import { InferenceClient } from "@huggingface/inference";

let originalPrompt = '';

async function callMixtralPromptOptimiser(promptToOptimise, apiKey) {
  const hf = new InferenceClient(apiKey);

  try {
    const response = await hf.chatCompletion({
      provider: "together",
      model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that rewrites prompts to be as short as possible without changing their meaning. Remove politeness and unnecessary words.",
        },
        {
          role: "user",
          content: `Rewrite the following prompt to be as short as possible without changing its meaning. Return ONLY the rewritten prompt, with NO extra words, explanations, or quotes.\nInput prompt: """${promptToOptimise}"""`,
        },
      ],
      max_tokens: 60,
      temperature: 0.1,
    });

    return {
      rewrittenText: response.choices[0].message.content,
      inputTokens: promptToOptimise.split(/\s+/).length,
      outputTokens: response.choices[0].message.content.split(/\s+/).length,
    };
  } catch (error) {
    console.error("Error calling Mixtral prompt optimiser:", error);
    throw error;
  }
}

function simpleTokenise(text) {
    if (!text) return [];
    return text.trim().split(/\s+|(?=[,.!?:;])/).filter(Boolean);
}

function extractRewrittenPrompt(fullOutput) {
    if (!fullOutput) return "";
    const lines = fullOutput.trim().split('\n');
    let lastLine = "";
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line) {
            lastLine = line;
            break;
        }
    }
    lastLine = lastLine.replace(/^.*?:\s*/, '');
    lastLine = lastLine.replace(/^["']+|["']+$/g, '');
    return lastLine.trim();
}

document.addEventListener('DOMContentLoaded', () => {
    const optionsButton = document.getElementById('options-btn');
    const promptInputElement = document.getElementById('prompt-input');
    const optimiseButton = document.getElementById('optimise-btn');
    const revertButton = document.getElementById('revert-btn');
    const helpButton = document.getElementById('help-btn');
    const statusDiv = document.getElementById('status');
    const outputDiv = document.getElementById('optimised-output');

    const inputTokensSpan = document.getElementById('input-tokens');
    const outputTokensSpan = document.getElementById('output-tokens');

    revertButton.classList.add('hidden');

    if (optionsButton) {
        optionsButton.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    if (helpButton) {
        helpButton.addEventListener('click', () => {
            window.open('https://github.com/LaurencePy/GreenPromptV2/issues', '_blank');
        });
    }

    if (!optimiseButton) {
        console.error("Element with ID 'optimise-btn' not found!");
        if (statusDiv) statusDiv.textContent = "Error: optimise button not found in HTML.";
        return;
    }

    if (statusDiv) statusDiv.textContent = '';
    optimiseButton.disabled = false;

    optimiseButton.addEventListener('click', async () => {
        const originalButtonText = 'Optimise & Copy';
        originalPrompt = promptInputElement.value.trim();

        if (!originalPrompt) {
            statusDiv.textContent = 'Please enter a prompt.';
            return;
        }

        statusDiv.textContent = '';
        optimiseButton.disabled = true;
        optimiseButton.textContent = 'Optimising...';
        revertButton.classList.add('hidden');

        chrome.storage.sync.get('hfApiKey', async (data) => {
            const apiKey = data.hfApiKey;
            console.log('API Key:', apiKey, typeof apiKey);

            if (!apiKey) {
                statusDiv.textContent = 'Hugging Face API Key not set. Please set it in the settings.';
                optimiseButton.disabled = false;
                optimiseButton.textContent = originalButtonText;
                return;
            }

            try {
                const result = await callMixtralPromptOptimiser(originalPrompt, apiKey);

                if (result && result.rewrittenText) {
                    promptInputElement.value = result.rewrittenText;
                    await navigator.clipboard.writeText(result.rewrittenText);

                    inputTokensSpan.textContent = result.inputTokens;
                    outputTokensSpan.textContent = result.outputTokens;

                    localStorage.setItem('lastPrompt', result.rewrittenText);

                    optimiseButton.textContent = 'Optimised & Copied!';
                    revertButton.classList.remove('hidden');

                } else {
                    throw new Error("The API did not return a valid rewritten prompt.");
                }

            } catch (err) {
                console.error("An error occurred during optimisation:", err);
                statusDiv.textContent = `Error: ${err.message}`;
                optimiseButton.textContent = 'Error!';
            } finally {
                setTimeout(() => {
                    optimiseButton.disabled = false;
                    optimiseButton.textContent = originalButtonText;
                }, 2000);
            }
        });
    });

    revertButton.addEventListener('click', () => {
        if (originalPrompt) {
            promptInputElement.value = originalPrompt;
        }
        revertButton.classList.add('hidden');
    });

    promptInputElement.addEventListener('input', () => {
        revertButton.classList.add('hidden');
    });
});




