document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveButton = document.getElementById('save-btn');
    const statusDiv = document.getElementById('status');
    const toggleContainer = document.getElementById('toggle-container');
    const showKeyToggle = document.getElementById('show-key-toggle');

    // Function to set status messages
    function setStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'red' : 'green';
    }

    // Load any previously saved API key and set up the page state
    chrome.storage.sync.get('hfApiKey', (data) => {
        if (data.hfApiKey) {
            apiKeyInput.value = data.hfApiKey;
            // If a key exists, show the toggle switch
            toggleContainer.style.display = 'flex';
        }
    });

    // Save the key when the button is clicked
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ hfApiKey: apiKey }, () => {
                // Check for any runtime error during save
                if (chrome.runtime.lastError) {
                    setStatus(`Error saving key: ${chrome.runtime.lastError.message}`, true);
                } else {
                    setStatus('API Key saved successfully!', false);
                    toggleContainer.style.display = 'flex'; // Show toggle immediately on save
                    setTimeout(() => {
                        setStatus('');
                    }, 3000); // Clear message after 3 seconds
                }
            });
        } else {
            setStatus('Please enter an API key.', true);
        }
    });

    // Add event listener for the show/hide toggle
    showKeyToggle.addEventListener('change', () => {
        if (showKeyToggle.checked) {
            // If the checkbox is checked, show the key
            apiKeyInput.type = 'text';
        } else {
            // Otherwise, hide it
            apiKeyInput.type = 'password';
        }
    });
});