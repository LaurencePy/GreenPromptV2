document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveButton = document.getElementById('save-btn');
    const statusDiv = document.getElementById('status');
    const toggleContainer = document.getElementById('toggle-container');
    const showKeyToggle = document.getElementById('show-key-toggle');

    function setStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'red' : 'green';
    }

    chrome.storage.sync.get('hfApiKey', (data) => {
        if (data.hfApiKey) {
            apiKeyInput.value = data.hfApiKey;
            toggleContainer.style.display = 'flex';
        }
    });

    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ hfApiKey: apiKey }, () => {
                if (chrome.runtime.lastError) {
                    setStatus(`Error saving key: ${chrome.runtime.lastError.message}`, true);
                } else {
                    setStatus('API Key saved successfully!', false);
                    toggleContainer.style.display = 'flex';
                    setTimeout(() => {
                        setStatus('');
                    }, 3000);
                }
            });
        } else {
            setStatus('Please enter an API key.', true);
        }
    });

    showKeyToggle.addEventListener('change', () => {
        if (showKeyToggle.checked) {
            apiKeyInput.type = 'text';
        } else {
            apiKeyInput.type = 'password';
        }
    });
});