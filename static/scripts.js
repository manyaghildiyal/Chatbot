document.addEventListener('DOMContentLoaded', function () {
    const sendButton = document.getElementById('send-button');
    const chatInputText = document.getElementById('chat-input-text');
    const chatContent = document.getElementById('chat-content');

    // Image paths for toggling
    const toggleImages1 = [
        'http://127.0.0.1:500/static/images/1.jpg', // Image 1 for button 1
        'http://127.0.0.1:5000/static/images/2.jpg' // Image 2 for button 1
    ];
    const toggleImages2 = [
        'http://127.0.0.1:5000/static/images/4.jpg', // Image 1 for button 2
        'http://127.0.0.1:5000/static/images/5.jpg' // Image 2 for button 2
    ];

    function sendMessage() {
        const message = chatInputText.value.trim();
        if (message !== "") {
            // Create a new message element for the user message
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', 'user-message');
            messageElement.textContent = message;

            // Append the user message to the chat content
            chatContent.appendChild(messageElement);

            // Clear the input field
            chatInputText.value = '';

            // Scroll to the bottom of the chat content
            chatContent.scrollTop = chatContent.scrollHeight;

            // Call the Flask API with the user's message
            callApi(message);
        }
    }

    function callApi(message) {
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: message })
        })
        .then(response => response.json())
        .then(data => {
            // Create a new message element for the bot response
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', 'bot-message');
            messageElement.textContent = data.response;

            // Append the bot message to the chat content
            chatContent.appendChild(messageElement);

            // Create response buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('response-buttons');

            // Create response buttons
            const button1 = document.createElement('button');
            button1.classList.add('button-icon');
            const img1 = document.createElement('img');
            img1.src = toggleImages1[0]; // Set initial image
            button1.appendChild(img1);

            const button2 = document.createElement('button');
            button2.classList.add('button-icon');
            const img2 = document.createElement('img');
            img2.src = toggleImages2[0]; // Set initial image
            button2.appendChild(img2);

            const button3 = document.createElement('button');
            button3.classList.add('button-icon');
            const img3 = document.createElement('img');
            img3.src = 'http://127.0.0.1:5000/static/images/3.jpg'; // Static image
            button3.appendChild(img3);

            // Append buttons to the container
            buttonsContainer.appendChild(button1);
            buttonsContainer.appendChild(button2);
            buttonsContainer.appendChild(button3);

            // Create a submit button for the current response
            const submitButton = document.createElement('button');
            submitButton.classList.add('submit-button');
            submitButton.textContent = 'Submit';

            // Append the buttons container and submit button to the chat content
            chatContent.appendChild(buttonsContainer);
            chatContent.appendChild(submitButton);

            // Scroll to the bottom of the chat content
            chatContent.scrollTop = chatContent.scrollHeight;

            // Toggle function for button 1
            let toggleState1 = 0;
            button1.addEventListener('click', () => {
                if (toggleState1 === 0) {
                    toggleState1 = 1;
                    img1.src = toggleImages1[toggleState1];
                    button1.disabled = false;
                    toggleState2 = 0; // Reset button 2 state
                    img2.src = toggleImages2[toggleState2];
                    button2.disabled = false;
                } else {
                    toggleState1 = 0;
                    img1.src = toggleImages1[toggleState1];
                }

                // Ensure only one button is toggled at a time
                if (toggleState1 === 1) {
                    button2.disabled = true;
                } else {
                    button2.disabled = false;
                }
            });

            // Toggle function for button 2
            let toggleState2 = 0;
            button2.addEventListener('click', () => {
                if (toggleState2 === 0) {
                    toggleState2 = 1;
                    img2.src = toggleImages2[toggleState2];
                    button2.disabled = false;
                    toggleState1 = 0; // Reset button 1 state
                    img1.src = toggleImages1[toggleState1];
                    button1.disabled = false;
                } else {
                    toggleState2 = 0;
                    img2.src = toggleImages2[toggleState2];
                }

                // Ensure only one button is toggled at a time
                if (toggleState2 === 1) {
                    button1.disabled = true;
                } else {
                    button1.disabled = false;
                }
            });

            // Toggle function for button 3
            let isTextBoxVisible = false;
            const textBox = document.createElement('textarea');
            textBox.classList.add('response-textbox');
            textBox.placeholder = "Type your response...";

            button3.addEventListener('click', () => {
                isTextBoxVisible = !isTextBoxVisible;
                if (isTextBoxVisible) {
                    buttonsContainer.appendChild(textBox);
                } else {
                    buttonsContainer.removeChild(textBox);
                }
            });

            submitButton.addEventListener('click', () => {
                const responseText = textBox.value;
                const buttonStates = {
                    button1: toggleState1 ? 'Yes' : '-',
                    button2: toggleState2 ? 'Yes' : '-'
                };

                // Remove response buttons and submit button
                buttonsContainer.remove();
                submitButton.remove();

                // Create and append review submission confirmation
                const reviewElement = document.createElement('div');
                reviewElement.classList.add('message', 'review-message');
                reviewElement.textContent = 'Review submitted.';
                reviewElement.style.backgroundColor = '#e6e6e6';
                reviewElement.style.padding = '10px';
                reviewElement.style.borderRadius = '5px';
                reviewElement.style.textAlign = 'center';
                
                chatContent.appendChild(reviewElement);

                // Scroll to the bottom of the chat content
                chatContent.scrollTop = chatContent.scrollHeight;

                // Log data to the server
                fetch('/api/log', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_input: message,
                        bot_response: data.response,
                        button1_state: buttonStates.button1,
                        button2_state: buttonStates.button2,
                        review_text: responseText
                    })
                })
                .then(response => response.json())
                .then(data => console.log('Log saved:', data))
                .catch(error => console.error('Error:', error));
            });
        })
        .catch(error => console.error('Error:', error));
    }

    // Send message on button click
    sendButton.addEventListener('click', sendMessage);

    // Send message on Enter key press
    chatInputText.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
