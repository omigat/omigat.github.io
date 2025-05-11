"use strict";
let mediaRecorder = null;
let audioChunks = [];
const recordButton = document.getElementById('recordButton');
const fileInput = document.getElementById('fileInput');
const statusElement = document.getElementById('status');
const transcriptionElement = document.getElementById('transcription');
const copyButton = document.getElementById('copyButton');
copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(transcriptionElement.textContent || '')
        .then(() => {
        const originalText = copyButton.textContent || 'Copy';
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 2000);
    })
        .catch(err => {
        console.error('Failed to copy:', err);
        statusElement.textContent = 'Failed to copy text';
    });
});
// Handle recording
recordButton.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordButton.textContent = 'Start Recording';
        statusElement.textContent = 'Processing...';
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Check supported MIME types
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/mp3';
            if (!MediaRecorder.isTypeSupported('audio/mp3')) {
                mimeType = 'audio/wav';
            }
        }
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType
        });
        audioChunks = [];
        mediaRecorder.addEventListener('dataavailable', (event) => {
            audioChunks.push(event.data);
        });
        mediaRecorder.addEventListener('stop', async () => {
            const audioBlob = new Blob(audioChunks, {
                type: mimeType
            });
            await sendAudioToServer(audioBlob);
        });
        mediaRecorder.start(1000); // Collect data every second
        recordButton.textContent = 'Stop Recording';
        statusElement.textContent = 'Recording...';
    }
    catch (error) {
        console.error('Error accessing microphone:', error);
        statusElement.textContent = 'Error accessing microphone';
    }
});
// Handle file upload
fileInput.addEventListener('change', async (event) => {
    const target = event.target;
    const file = target.files?.[0];
    if (file) {
        statusElement.textContent = 'Processing...';
        await sendAudioToServer(file);
    }
});
// Send audio to backend
async function sendAudioToServer(audioData) {
    const formData = new FormData();
    formData.append('file', audioData);
    try {
        const response = await fetch('https://vercel-transcription.vercel.app/api/transcribe', {
            method: 'POST',
            body: formData,
        });
        // Log the raw response for debugging
        const rawResponse = await response.text();
        console.log('Raw response:', rawResponse);
        // Parse the response as JSON
        const data = JSON.parse(rawResponse);
        if (response.ok) {
            transcriptionElement.textContent = data.transcript;
            statusElement.textContent = 'Transcription complete';
            copyButton.classList.remove('hidden');
        }
        else {
            throw new Error(data.error || 'Transcription failed');
        }
    }
    catch (error) {
        console.error('Error:', error);
        if (error instanceof Error) {
            statusElement.textContent = `Error: ${error.message}`;
        }
        else {
            statusElement.textContent = 'An unknown error occurred';
        }
        transcriptionElement.textContent = 'Failed to get transcription';
        copyButton.classList.add('hidden');
    }
}
//# sourceMappingURL=script.js.map