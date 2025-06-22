const MODEL_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1";

let originalPrompt = '';

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

            if (!apiKey) {
                statusDiv.textContent = 'Hugging Face API Key not set. Please set it in the settings.';
                optimiseButton.disabled = false;
                optimiseButton.textContent = originalButtonText;
                return;
            }

            try {
                const result = await callMixtralPromptoptimiser(originalPrompt, apiKey);

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

async function callMixtralPromptoptimiser(promptTooptimise, apiKey) {
    const statusDiv = document.getElementById('status');
    const inputTokens = simpleTokenise(promptTooptimise).length;

    const requestBody = {
        inputs: `Rewrite the following prompt to be as short as possible without changing its meaning. Remove all politeness markers and unnecessary words.\nReturn ONLY the rewritten prompt, with NO extra words, explanations, or quotes.\nInput prompt: """${promptTooptimise}"""`,
        parameters: {
            max_new_tokens: 60,
            temperature: 0.1,
            do_sample: false,
            early_stopping: true
        }
    };

    const response = await fetch(MODEL_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Hugging Face API Error (${response.status}): ${response.statusText}`, errorBody);
        let specificError = "API request failed.";
        try {
            const parsedError = JSON.parse(errorBody);
            if (parsedError.error) specificError = parsedError.error;
            else if (parsedError.detail) specificError = parsedError.detail;
        } catch (e) {
            specificError = errorBody.substring(0, 200);
        }
        throw new Error(`Hugging Face API error (${response.status}). Details: ${specificError}`);
    }

    const results = await response.json();

    if (Array.isArray(results) && results.length > 0) {
        const rawOutput = results[0]?.generated_text || results[0]?.summary_text;

        if (rawOutput) {
            const rewrittenText = extractRewrittenPrompt(rawOutput);
            const outputTokens = simpleTokenise(rewrittenText).length;
            
            return { rewrittenText, inputTokens, outputTokens };
        }
    }
    
    console.warn("API response was not in the expected format:", results);
    return null; 
}