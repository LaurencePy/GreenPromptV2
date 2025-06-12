// src/popup.js
console.log("%%%% POPUP.JS API MODE - START - v2.3 (google-t5/t5-small) %%%%");

// --- Configuration ---
const HF_API_TOKEN = "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"; // !!! REPLACE THIS !!!
const MODEL_API_URL = "https://api-inference.huggingface.co/models/google-t5/t5-small";

document.addEventListener('DOMContentLoaded', () => {
    console.log("%%%% DOMContentLoaded event fired - API v2.3 (google-t5/t5-small) %%%%");

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
        console.log("%%%% Optimize button clicked - API v2.3 (google-t5/t5-small) %%%%");
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
            const rewrittenText = await callT5ForSummarization(promptToOptimize); // Renamed function
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
    console.log("%%%% Event listener attached to optimize-btn - API v2.3 (google-t5/t5-small) %%%%");
});

async function callT5ForSummarization(promptToOptimize) { // Renamed to reflect T5's summarization task
    const statusDiv = document.getElementById('status');
    const originalPromptWordCount = promptToOptimize.split(/\s+/).length;

    // Parameters for T5 summarization - aim for very concise
    let minOutputLength = Math.max(3, Math.floor(originalPromptWordCount * 0.2));
    let maxOutputLength = Math.max(5, Math.floor(originalPromptWordCount * 0.6));

    if (originalPromptWordCount < 10) {
        minOutputLength = Math.max(1, Math.floor(originalPromptWordCount * 0.4));
        maxOutputLength = originalPromptWordCount; // For very short, allow up to original length if needed
    }
     if (originalPromptWordCount < 5) {
        minOutputLength = 1;
        maxOutputLength = originalPromptWordCount + 1; // Max can be slightly more if rephrasing adds a word
    }


    // For T5 summarization, the input should be prefixed with "summarize: "
    const inputTextForModel = `summarize: ${promptToOptimize}`;

    const requestBody = {
        inputs: inputTextForModel,
        parameters: {
            min_length: minOutputLength, // T5 uses min_length/max_length for summarization
            max_length: maxOutputLength, // Not max_new_tokens for this task type typically with T5 summarization
            temperature: 0.7,        // A bit of temperature can help
            num_beams: 4,            // Beam search is good for T5 summarization
            early_stopping: true,
            length_penalty: 2.0,     // Strongly encourage shorter outputs
            // repetition_penalty: 1.1, 
        }
    };
    
    console.log(`Sending to Hugging Face (${MODEL_API_URL}):`, JSON.stringify(requestBody, null, 2));
    if (statusDiv) statusDiv.textContent = 'Calling T5 API (summarize)...';

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
        } catch(e) {
            specificError = errorBody.substring(0, 200);
        }
        throw new Error(`Hugging Face API error (${response.status}). Details: ${specificError}`);
    }

    const results = await response.json();
    console.log("Hugging Face API Result:", results);

    // For T5 summarization tasks with HuggingFace API, the result is usually in results[0].summary_text
    // However, sometimes it might be results[0].generated_text. Let's check both.
    let rewrittenText = results[0]?.summary_text || results[0]?.generated_text;

    if (rewrittenText) {
        rewrittenText = rewrittenText.trim();
        
        if (!rewrittenText || rewrittenText.length < 2) { 
             if (statusDiv) statusDiv.textContent = 'API did not provide a substantial rewrite. Using original.';
            return promptToOptimize;
        }
        return rewrittenText;
    } else {
        const sampleResponse = JSON.stringify(results, null, 2).substring(0, 300);
        console.warn("Unexpected API response structure:", sampleResponse);
        // If it was translation_text before, log that specifically for debugging
        if (results[0]?.translation_text) {
            console.warn("API returned 'translation_text' again:", results[0].translation_text);
            throw new Error(`API seems to be translating. Got: ${results[0].translation_text.substring(0,50)}...`);
        }
        throw new Error(`No 'summary_text' or 'generated_text' in API response. Got: ${sampleResponse}...`);
    }
}

console.log("%%%% POPUP.JS SCRIPT BOTTOM - API v2.3 (google-t5/t5-small) %%%%");
