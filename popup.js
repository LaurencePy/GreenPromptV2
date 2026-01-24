import { InferenceClient } from "@huggingface/inference";

let originalPrompt = '';

async function callPromptOptimiser(promptToOptimise, apiKey) {
  const client = new InferenceClient(apiKey);

  try {
    const response = await client.chatCompletion({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        {
          role: "system",
          content: "You are an assistant that rewrites prompts to be as short as possible without changing their meaning. Remove politeness and unnecessary words.",
        },
        {
          role: "user",
          content: `Rewrite the following prompt to be as short as possible without changing its meaning. Remove politeness and unnecessary words. Return ONLY the rewritten prompt, with NO extra words, explanations, or quotes.\nInput prompt: """${promptToOptimise}"""`,
        },
      ],
      max_tokens: 60,
      temperature: 0.1,
    });

    const rewrittenText = response.choices[0].message.content.trim();

    return {
      rewrittenText: rewrittenText,
      inputTokens: promptToOptimise.split(/\s+/).length,
      outputTokens: rewrittenText.split(/\s+/).length,
    };
  } catch (error) {
    console.error("Error calling prompt optimiser:", error);
    throw error;
  }
}

document.addEventListener('DOMContentLoaded', () => {
    const optionsButton = document.getElementById('options-btn');
    const promptInputElement = document.getElementById('prompt-input');
    const optimiseButton = document.getElementById('optimise-btn');
    const revertButton = document.getElementById('revert-btn');
    const helpButton = document.getElementById('help-btn');
    const statusDiv = document.getElementById('status');

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

            if (!apiKey) {
                statusDiv.textContent = 'Hugging Face API Key not set. Please set it in the settings.';
                optimiseButton.disabled = false;
                optimiseButton.textContent = originalButtonText;
                return;
            }

            try {
                // Call the updated function name
                const result = await callPromptOptimiser(originalPrompt, apiKey);

                if (result && result.rewrittenText) {
                    promptInputElement.value = result.rewrittenText;
                    await navigator.clipboard.writeText(result.rewrittenText);

                    inputTokensSpan.textContent = result.inputTokens;
                    outputTokensSpan.textContent = result.outputTokens;

                    localStorage.setItem('lastPrompt', result.rewrittenText);

                    optimiseButton.textContent = 'Optimised & Copied!';
                    revertButton.classList.remove('hidden');
                } else {
                    throw new Error("The API did not return a valid response.");
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