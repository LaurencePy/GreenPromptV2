document.getElementById('optimizeBtn').addEventListener('click', async () => {
  const prompt = document.getElementById('inputPrompt').value.trim();
  if (!prompt) {
    alert('Please enter a prompt');
    return;
  }

  document.getElementById('result').textContent = 'Optimizing...';

  try {
    const response = await fetch('http://localhost:8000/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    document.getElementById('result').textContent = data.optimized_prompt;
  } catch (e) {
    document.getElementById('result').textContent = 'Error: ' + e.message;
  }
});
