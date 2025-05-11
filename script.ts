let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
const recordButton = document.getElementById('recordButton') as HTMLButtonElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const statusElement = document.getElementById('status') as HTMLDivElement;
const transcriptionElement = document.getElementById('transcription') as HTMLDivElement;
const copyButton = document.getElementById('copyButton') as HTMLButtonElement;

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

        mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {
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
    } catch (error) {
        console.error('Error accessing microphone:', error);
        statusElement.textContent = 'Error accessing microphone';
    }
});

// Handle file upload
fileInput.addEventListener('change', async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        statusElement.textContent = 'Processing...';
        await sendAudioToServer(file);
    }
});

// Send audio to backend
async function sendAudioToServer(audioData: Blob): Promise<void> {
    const formData = new FormData();
    formData.append('file', audioData);

    try {
        const response = await fetch('https://vercel-transcription.vercel.app/api/transcribe', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        
        if (response.ok) {
            transcriptionElement.textContent = data.transcript;
            statusElement.textContent = 'Transcription complete';
            copyButton.classList.remove('hidden'); // Show copy button when there's text
        } else {
            throw new Error(data.error || 'Transcription failed');
        }
    } catch (error) {
        console.error('Error:', error);
        if (error instanceof Error) {
            statusElement.textContent = `Error: ${error.message}`;
        } else {
            statusElement.textContent = 'An unknown error occurred';
        }
        transcriptionElement.textContent = 'Failed to get transcription';
        copyButton.classList.add('hidden'); // Hide copy button on error
    }
} 