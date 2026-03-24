/**
 * Physio Chat & Exam System - Complete Webhook Endpoints
 * 
 * This file includes:
 * 1. Chat Webhook - /webhook/physio_chatbot
 * 2. Exam Webhook - /webhook/physio_exam
 * 3. Question Trigger - /webhook/trigger-question (NEW!)
 * 
 * npm install express cors body-parser
 * node webhook-complete.js
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ============== Storage ==============
let chatHistory = [];
let examResponses = [];
let currentQuestion = null;

// ============== Chat Webhook ==============
/**
 * Chat Widget Webhook
 * POST /webhook/physio_chatbot
 * 
 * Receives user messages and returns AI responses
 */
app.post('/webhook/physio_chatbot', (req, res) => {
    try {
        const { message, timestamp } = req.body;
        
        console.log('[CHAT] Message received:', message);
        
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }
        
        // Store message
        chatHistory.push({
            role: 'user',
            message: message,
            timestamp: timestamp || new Date().toISOString()
        });
        
        // Check if question is available
        let responseData = {
            message: `Processing your request: "${message}"...`,
            questionReady: false
        };
        
        // If question is available and user asks for exam
        if (currentQuestion && 
            (message.toLowerCase().includes('exam') || 
             message.toLowerCase().includes('question') ||
             message.toLowerCase().includes('test'))) {
            
            console.log('[CHAT] Question ready, sending to user');
            
            responseData = {
                message: `Great! Here's your exam on ${currentQuestion.topic}. Answer the question carefully.`,
                questionReady: true,
                showQuestionModal: true,
                modalMessage: 'Your question is ready! Click to start the exam',
                questionData: currentQuestion.data
            };
            
            // Store chat response
            chatHistory.push({
                role: 'assistant',
                message: responseData.message,
                timestamp: new Date().toISOString()
            });
        } else {
            // Regular chat response
            const botResponse = getAIResponse(message);
            responseData.message = botResponse;
            
            // Store chat response
            chatHistory.push({
                role: 'assistant',
                message: botResponse,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json(responseData);
        
    } catch (error) {
        console.error('[CHAT ERROR]', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Exam Webhook ==============
/**
 * Exam Webhook
 * POST /webhook/physio_exam
 * 
 * Receives exam submissions and validates answers
 */
app.post('/webhook/physio_exam', (req, res) => {
    try {
        const {
            passage,
            question,
            options,
            selectedAnswer,
            selectedText,
            correctAnswer,
            isCorrect,
            timeUsed,
            timestamp
        } = req.body;
        
        console.log('[EXAM] Submission received:', {
            question: question?.substring(0, 50),
            selected: selectedAnswer,
            correct: correctAnswer,
            isCorrect: isCorrect
        });
        
        // Validate
        if (selectedAnswer === undefined || correctAnswer === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Store response
        const examResponse = {
            id: Date.now(),
            passage,
            question,
            options,
            selectedAnswer,
            selectedText,
            correctAnswer,
            isCorrect,
            timeUsed,
            timestamp: timestamp || new Date().toISOString(),
            recordedAt: new Date().toISOString()
        };
        
        examResponses.push(examResponse);
        
        // Send response
        res.json({
            success: true,
            message: 'Exam response recorded',
            feedback: isCorrect ? 'Correct!' : 'Incorrect',
            isCorrect: isCorrect,
            correctAnswer: options[correctAnswer],
            timeUsed: timeUsed
        });
        
    } catch (error) {
        console.error('[EXAM ERROR]', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== QUESTION TRIGGER ENDPOINT (NEW!) ==============
/**
 * Trigger Question Endpoint
 * POST /webhook/trigger-question
 * 
 * This endpoint triggers a question to be sent to chat page
 * and ready for exam page
 * 
 * Usage:
 * curl -X POST http://localhost:3000/webhook/trigger-question \
 *   -H "Content-Type: application/json" \
 *   -d '{...question-data...}'
 */
app.post('/webhook/trigger-question', (req, res) => {
    try {
        const {
            topic,
            passage,
            question,
            options,
            correctAnswer,
            timeLimit
        } = req.body;
        
        console.log('[TRIGGER] Question triggered for topic:', topic);
        
        // Validate
        if (!question || !options || options.length !== 4 || correctAnswer === undefined) {
            return res.status(400).json({
                error: 'Invalid question format. Required: question, options (4), correctAnswer'
            });
        }
        
        // Store current question
        currentQuestion = {
            topic: topic || 'General Knowledge',
            data: {
                timeLimit: timeLimit || 600,
                passage: passage || '',
                question: question,
                options: options,
                correctAnswer: correctAnswer
            }
        };
        
        console.log('[TRIGGER] Question stored and ready');
        console.log('[TRIGGER] Question:', question);
        console.log('[TRIGGER] Topic:', topic);
        
        // Return response
        res.json({
            success: true,
            message: 'Question triggered successfully',
            question: question,
            topic: topic,
            status: 'Ready - User can now access in chat/exam',
            questionData: currentQuestion.data
        });
        
    } catch (error) {
        console.error('[TRIGGER ERROR]', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Utility Endpoints ==============

/**
 * Get current question status
 * GET /api/current-question
 */
app.get('/api/current-question', (req, res) => {
    if (!currentQuestion) {
        return res.json({ message: 'No question set' });
    }
    
    res.json({
        topic: currentQuestion.topic,
        question: currentQuestion.data.question,
        hasPassage: !!currentQuestion.data.passage,
        optionCount: currentQuestion.data.options.length,
        timeLimit: currentQuestion.data.timeLimit
    });
});

/**
 * Get chat history
 * GET /api/chat-history
 */
app.get('/api/chat-history', (req, res) => {
    res.json({
        total: chatHistory.length,
        messages: chatHistory
    });
});

/**
 * Get exam responses
 * GET /api/exam-responses
 */
app.get('/api/exam-responses', (req, res) => {
    res.json({
        total: examResponses.length,
        responses: examResponses
    });
});

/**
 * Clear all data
 * POST /api/clear-data
 */
app.post('/api/clear-data', (req, res) => {
    chatHistory = [];
    examResponses = [];
    currentQuestion = null;
    
    res.json({ message: 'All data cleared' });
});

// ============== Helper Functions ==============

function getAIResponse(userMessage) {
    const responses = {
        'hello': 'Hello! How can I help you with physiology today?',
        'hi': 'Hi there! Ready to learn?',
        'exam': 'Would you like to take an exam? Ask me to generate a question!',
        'question': 'I can help you with a question. What topic interests you?',
        'help': 'I can assist with physiology topics and generate exam questions.',
        'default': 'That\'s interesting! Ask me something specific or request an exam.'
    };
    
    const lowerMessage = userMessage.toLowerCase();
    
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }
    
    return responses.default;
}

// ============== Server Start ==============

const server = app.listen(PORT, () => {
    console.log(`
    
    ╔════════════════════════════════════════════════╗
    ║   Physio Chat & Exam - Webhook Server         ║
    ║   Running on: http://localhost:${PORT}              ║
    ╚════════════════════════════════════════════════╝
    
    📍 ENDPOINTS:
    
    Chat Webhook:
      POST /webhook/physio_chatbot
      Body: { "message": "..." }
    
    Exam Webhook:
      POST /webhook/physio_exam
      Body: { "passage": "...", "question": "...", ... }
    
    🚀 TRIGGER ENDPOINT (TEST):
      POST /webhook/trigger-question
      Body: {
        "topic": "Cardiac Physiology",
        "passage": "...",
        "question": "...?",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "timeLimit": 600
      }
    
    📊 ADMIN ENDPOINTS:
      GET  /api/current-question
      GET  /api/chat-history
      GET  /api/exam-responses
      POST /api/clear-data
    
    `);
});

// ============== TEST COMMANDS ==============

/*

1️⃣ TRIGGER A QUESTION:
================================
curl -X POST http://localhost:3000/webhook/trigger-question \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "Cardiac Physiology",
    "passage": "The heart is a muscular organ that pumps blood throughout the body. The cardiac cycle consists of systole and diastole phases.",
    "question": "What are the two main phases of the cardiac cycle?",
    "options": [
      "Systole and diastole",
      "Atrial and ventricular contraction",
      "Filling and emptying",
      "Relaxation and stimulation"
    ],
    "correctAnswer": 0,
    "timeLimit": 600
  }'

Response:
{
  "success": true,
  "message": "Question triggered successfully",
  "question": "What are the two main phases...",
  "topic": "Cardiac Physiology",
  "status": "Ready - User can now access in chat/exam"
}


2️⃣ CHECK CURRENT QUESTION:
================================
curl http://localhost:3000/api/current-question

Response:
{
  "topic": "Cardiac Physiology",
  "question": "What are the two main phases of the cardiac cycle?",
  "hasPassage": true,
  "optionCount": 4,
  "timeLimit": 600
}


3️⃣ USER ASKS FOR EXAM IN CHAT:
================================
curl -X POST http://localhost:3000/webhook/physio_chatbot \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Give me an exam"
  }'

Response:
{
  "message": "Great! Here's your exam on Cardiac Physiology...",
  "questionReady": true,
  "showQuestionModal": true,
  "modalMessage": "Your question is ready! Click to start the exam",
  "questionData": {
    "timeLimit": 600,
    "passage": "...",
    "question": "...?",
    "options": [...]
  }
}


4️⃣ USER SUBMITS EXAM:
================================
curl -X POST http://localhost:3000/webhook/physio_exam \\
  -H "Content-Type: application/json" \\
  -d '{
    "passage": "...",
    "question": "What are the two main phases...",
    "options": [...],
    "selectedAnswer": 0,
    "selectedText": "Systole and diastole",
    "correctAnswer": 0,
    "isCorrect": true,
    "timeUsed": 45
  }'

Response:
{
  "success": true,
  "message": "Exam response recorded",
  "feedback": "Correct!",
  "isCorrect": true
}


5️⃣ GET ALL EXAM RESPONSES:
================================
curl http://localhost:3000/api/exam-responses

Response:
{
  "total": 1,
  "responses": [
    {
      "id": ...,
      "question": "...",
      "selectedAnswer": 0,
      "isCorrect": true,
      ...
    }
  ]
}

*/

module.exports = app;
