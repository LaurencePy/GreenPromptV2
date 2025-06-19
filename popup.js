

const MODEL_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1";


function simpleTokenize(text) {
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
    if (optionsButton) {
        optionsButton.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }
    const promptInputElement = document.getElementById('prompt-input');
    const optimizeButton = document.getElementById('optimize-btn');
    const helpButton = document.getElementById('help-btn');
    const statusDiv = document.getElementById('status');
    const outputDiv = document.getElementById('optimized-output');

    const inputTokensSpan = document.getElementById('input-tokens');
    const outputTokensSpan = document.getElementById('output-tokens');

    if (!optimizeButton) {
        console.error("Element with ID 'optimize-btn' not found!");
        if (statusDiv) statusDiv.textContent = "Error: Optimize button not found in HTML.";
        return;
    }

    if (statusDiv) statusDiv.textContent = '';
    optimizeButton.disabled = false;

optimizeButton.addEventListener('click', async () => {
    const promptToOptimize = promptInputElement.value.trim();

    if (!promptToOptimize) {
        statusDiv.textContent = 'Please enter a prompt';
        return;
    }

    statusDiv.textContent = 'Getting API Key...';
    optimizeButton.disabled = true;

    chrome.storage.sync.get('hfApiKey', async (data) => {
        const apiKey = data.hfApiKey;

        if (!apiKey) {
            statusDiv.textContent = 'Hugging Face API Key not set. Please set it in the settings.';
            optimizeButton.disabled = false;
            return;
        }

        statusDiv.textContent = 'Optimizing...';

        try {

            const result = await callMixtralPromptOptimizer(promptToOptimize, apiKey);


            if (result && result.rewrittenText) {

                promptInputElement.value = result.rewrittenText;
                await navigator.clipboard.writeText(result.rewrittenText);

                inputTokensSpan.textContent = result.inputTokens;
                outputTokensSpan.textContent = result.outputTokens;

                const savingsThisRun = Math.max(0, result.inputTokens - result.outputTokens);

                localStorage.setItem('lastPrompt', result.rewrittenText);

                statusDiv.textContent = 'Optimized & copied!';

            } else {
                throw new Error("The API did not return a valid rewritten prompt. It might be loading. Please try again in a moment.");
            }

        } catch (err) {
            console.error("An error occurred during optimization:", err);
            statusDiv.textContent = `Error: ${err.message}`;
        } finally {
            optimizeButton.disabled = false;
        }
    });
});


});

async function callMixtralPromptOptimizer(promptToOptimize, apiKey) {
    const statusDiv = document.getElementById('status');
    const inputTokens = simpleTokenize(promptToOptimize).length;

    const requestBody = {
        inputs: `Rewrite the following prompt to be as short as possible without changing its meaning. Remove all politeness markers and unnecessary words.\nReturn ONLY the rewritten prompt, with NO extra words, explanations, or quotes.\nInput prompt: """${promptToOptimize}"""`,
        parameters: {
            max_new_tokens: 60,
            temperature: 0.1,
            do_sample: false,
            early_stopping: true
        }
    };

    if (statusDiv) statusDiv.textContent = 'Calling model...';

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
            const outputTokens = simpleTokenize(rewrittenText).length;
            const gptInputTokens = outputTokens;
            const gptOutputTokens = 50;


            return { rewrittenText, inputTokens, outputTokens };
        }
    }
    
    console.warn("API response was not in the expected format:", results);
    return null; 
}

