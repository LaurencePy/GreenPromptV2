// src/popup.js
console.log("%%%% POPUP.JS API MODE - START - v2.3 (Falconsai/text_summarization) %%%%");

// --- Configuration ---
const HF_API_TOKEN = "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"; // !!! REPLACE THIS !!!
const MODEL_API_URL = "https://api-inference.huggingface.co/models/Falconsai/text_summarization";

document.addEventListener('DOMContentLoaded', () => {
    console.log("%%%% DOMContentLoaded event fired - API v2.3 (Falconsai/text_summarization) %%%%");

    const promptInputElement = document.getElementById('prompt-input');
    const optimizeButton = document.getElementById('optimize-btn');
    const statusDiv = document.getElementById('status');
    const outputDiv = document.getElementById('optimized-output');

    if (!optimizeButton) {
        console.error("Element with ID 'optimize-btn' not found!");
        if (statusDiv) statusDiv.textContent = "Error: Optimize button not found in HTML.";
        return;
    }

    if (statusDiv) statusDiv.textContent = 'Ready. Enter a prompt to optimize.';
    optimizeButton.disabled = false;

    optimizeButton.addEventListener('click', async () => {
        console.log("%%%% Optimize button clicked - API v2.3 (Falconsai/text_summarization) %%%%");
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
            const rewrittenText = await callFalconsaiSummarizer(promptToOptimize);
            if (outputDiv) outputDiv.textContent = rewrittenText;
            if (statusDiv) statusDiv.textContent = 'Prompt rewritten successfully!';
        } catch (error) {
            console.error("Error during API call or processing:", error);
            if (outputDiv) outputDiv.textContent = `Error: ${error.message}`;
            if (statusDiv) statusDiv.textContent = 'Failed to rewrite prompt.';
        } finally {
            optimizeButton.disabled = false;
        }
    });

    console.log("%%%% Event listener attached to optimize-btn - API v2.3 (Falconsai/text_summarization) %%%%");
});

async function callFalconsaiSummarizer(promptToOptimize) {
    const statusDiv = document.getElementById('status');

    const requestBody = {
        inputs: promptToOptimize,
        parameters: {
            max_length: 60,
            min_length: 5,
            temperature: 0.7,
            top_k: 50,
            top_p: 0.95,
            do_sample: false,
            early_stopping: true
        }
    };

    console.log(`Sending to Hugging Face (${MODEL_API_URL}):`, JSON.stringify(requestBody, null, 2));
    if (statusDiv) statusDiv.textContent = 'Calling Falconsai Summarizer API...';

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

    let rewrittenText = results[0]?.summary_text || results[0]?.generated_text;

    if (rewrittenText) {
        rewrittenText = rewrittenText.trim();
        return rewrittenText.length > 1 ? rewrittenText : promptToOptimize;
    } else {
        const sampleResponse = JSON.stringify(results, null, 2).substring(0, 300);
        throw new Error(`No usable summary returned. Got: ${sampleResponse}...`);
    }
}

console.log("%%%% POPUP.JS SCRIPT BOTTOM - API v2.3 (Falconsai/text_summarization) %%%%");
