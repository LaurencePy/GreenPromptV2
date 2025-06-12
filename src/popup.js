console.log("%%%% POPUP.JS API MODE - START - v2.5 (Mixtral token & energy tracking with output trimming) %%%%");

// --- Configuration ---
const HF_API_TOKEN = "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"; // !!! REPLACE THIS !!!
const MODEL_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1";

const MIXTRAL_ENERGY_PER_TOKEN = 1;
const GPT4O_ENERGY_PER_TOKEN = 10;  // Adjust as needed

// Simple approximate tokenizer (for demo, split on spaces and punctuation)
function simpleTokenize(text) {
    if (!text) return [];
    return text.trim().split(/\s+|(?=[,.!?:;])/).filter(Boolean);
}

// Estimate energy usage based on token counts and energy per token
function estimateEnergyUsage(mixtralInputTokens, mixtralOutputTokens, gptInputTokens, gptOutputTokens) {
    const mixtralTokens = mixtralInputTokens + mixtralOutputTokens;
    const gptTokens = gptInputTokens + gptOutputTokens;
    return (mixtralTokens * MIXTRAL_ENERGY_PER_TOKEN) + (gptTokens * GPT4O_ENERGY_PER_TOKEN);
}

// Extract only the rewritten prompt from the AI output (assumes last non-empty line is the prompt)
function extractRewrittenPrompt(fullOutput) {
    if (!fullOutput) return "";

    // Grab the last non-empty line
    const lines = fullOutput.trim().split('\n');
    let lastLine = "";
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line) {
            lastLine = line;
            break;
        }
    }

    // Remove known prefixes like "Rewritten prompt:" or anything before a colon
    lastLine = lastLine.replace(/^.*?:\s*/, '');

    // Remove all surrounding quotes including """ and ""
    lastLine = lastLine.replace(/^["']+|["']+$/g, '');

    return lastLine.trim();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("%%%% DOMContentLoaded event fired - API v2.5 %%%%");

    const promptInputElement = document.getElementById('prompt-input');
    const optimizeButton = document.getElementById('optimize-btn');
    const statusDiv = document.getElementById('status');
    const outputDiv = document.getElementById('optimized-output');

    // Token and energy stats elements
    const inputTokensSpan = document.getElementById('input-tokens');
    const outputTokensSpan = document.getElementById('output-tokens');
    const energyUsageSpan = document.getElementById('energy-usage');
    const totalSavingsSpan = document.getElementById('total-token-savings');

    if (!optimizeButton) {
        console.error("Element with ID 'optimize-btn' not found!");
        if (statusDiv) statusDiv.textContent = "Error: Optimize button not found in HTML.";
        return;
    }

    if (statusDiv) statusDiv.textContent = 'Ready. Enter a prompt to optimize.';
    optimizeButton.disabled = false;

    // Load and display all-time token savings from localStorage
    let totalTokenSavings = parseInt(localStorage.getItem('totalTokenSavings') || '0', 10);
    if (totalSavingsSpan) totalSavingsSpan.textContent = totalTokenSavings;

    optimizeButton.addEventListener('click', async () => {
        console.log("%%%% Optimize button clicked - API v2.5 %%%%");
        const promptToOptimize = promptInputElement.value;

        if (!promptToOptimize.trim()) {
            if (statusDiv) statusDiv.textContent = 'Please enter a prompt.';
            return;
        }
        if (HF_API_TOKEN === "YOUR_HUGGINGFACE_API_TOKEN_HERE" || !HF_API_TOKEN) {
            if (statusDiv) statusDiv.textContent = 'API Token not set in popup.js!';
            if (outputDiv) outputDiv.textContent = 'Please configure the Hugging Face API Token.';
            console.error("API Token is not set!");
            return;
        }

        if (statusDiv) statusDiv.textContent = 'Rewriting prompt via API...';
        if (outputDiv) outputDiv.textContent = '';
        optimizeButton.disabled = true;

        try {
            const { rewrittenText, inputTokens, outputTokens, estimatedEnergy } = await callMixtralPromptOptimizer(promptToOptimize);

            if (outputDiv) outputDiv.textContent = rewrittenText;
            if (inputTokensSpan) inputTokensSpan.textContent = inputTokens;
            if (outputTokensSpan) outputTokensSpan.textContent = outputTokens;
            if (energyUsageSpan) energyUsageSpan.textContent = estimatedEnergy;

            // Calculate token savings for this run
            const savingsThisRun = Math.max(0, inputTokens - outputTokens);
            totalTokenSavings += savingsThisRun;
            localStorage.setItem('totalTokenSavings', totalTokenSavings.toString());

            if (totalSavingsSpan) totalSavingsSpan.textContent = totalTokenSavings;

            if (statusDiv) statusDiv.textContent = 'Prompt rewritten successfully!';
        } catch (error) {
            console.error("Error during API call or processing:", error);
            if (outputDiv) outputDiv.textContent = `Error: ${error.message}`;
            if (statusDiv) statusDiv.textContent = 'Failed to rewrite prompt.';
        } finally {
            optimizeButton.disabled = false;
        }
    });

    console.log("%%%% Event listener attached to optimize-btn - API v2.5 %%%%");
});

async function callMixtralPromptOptimizer(promptToOptimize) {
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

    console.log(`Sending to Hugging Face (${MODEL_API_URL}):`, JSON.stringify(requestBody, null, 2));
    if (statusDiv) statusDiv.textContent = 'Calling Mixtral model API...';

    const response = await fetch(MODEL_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_API_TOKEN}`,
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
    console.log("Hugging Face API Result:", results);

    let rawOutput = results[0]?.generated_text || results[0]?.summary_text;

    if (rawOutput) {
        // Extract just the rewritten prompt (clean output)
        const rewrittenText = extractRewrittenPrompt(rawOutput);

        const outputTokens = simpleTokenize(rewrittenText).length;

        // Simulated GPT4o usage (input + output tokens)
        const gptInputTokens = outputTokens;  // GPT input is rewritten prompt tokens
        const gptOutputTokens = 50;           // Example GPT output tokens

        const estimatedEnergy = estimateEnergyUsage(inputTokens, outputTokens, gptInputTokens, gptOutputTokens);

        return { rewrittenText, inputTokens, outputTokens, estimatedEnergy };
    } else {
        const sampleResponse = JSON.stringify(results, null, 2).substring(0, 300);
        throw new Error(`No usable summary returned. Got: ${sampleResponse}...`);
    }
}

console.log("%%%% POPUP.JS SCRIPT BOTTOM - API v2.5 %%%%");
