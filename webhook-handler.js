/**
 * Physio Chat & Exam System - Express Webhook Handler
 * 
 * This file contains sample webhook handlers for:
 * 1. Chat Widget webhook (/physio_chatbot)
 * 2. Exam webhook (/physio_exam)
 * 
 * Installation:
 * npm install express cors body-parser
 * 
 * Usage:
 * node webhook-handler.js
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============== Storage (use database in production) ==============
let chatHistory = [];
let examResponses = [];

// ============== Utility Functions ==============

function saveToFile(data, filename) {
    const filePath = path.join(__dirname, 'data', `${filename}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadFromFile(filename) {
    try {
        const filePath = path.join(__dirname, 'data', `${filename}.json`);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
        return [];
    }
}

// ============== Chat Webhook Handler ==============

/**
 * Chat Widget Webhook
 * Receives user messages and returns AI responses
 * Can trigger question ready notifications
 */
app.post('/webhook-test/physio_chatbot', async (req, res) => {
    try {
        const { message, timestamp } = req.body;

        console.log('[CHAT] Received message:', message);

        // Validate input
        if (!message) {
            return res.status(400).json({
                error: 'Message is required'
            });
        }

        // Store chat message
        const chatEntry = {
            id: Date.now(),
            message: message,
            timestamp: timestamp || new Date().toISOString(),
            role: 'user'
        };

        chatHistory.push(chatEntry);
        saveToFile(chatHistory, 'chat-history');

        // Simple AI response (replace with actual AI integration)
        let botResponse = getAIResponse(message);
        let shouldShowQuestionModal = false;
        let modalMessage = '';

        // Check if message contains question-related keywords
        if (message.toLowerCase().includes('test') || 
            message.toLowerCase().includes('exam') || 
            message.toLowerCase().includes('question')) {
            
            // In production, you'd check if questions are actually available
            shouldShowQuestionModal = true;
            botResponse = 'Great! Let me prepare your assessment...';
            modalMessage = 'Your question is ready. Go for test!';
        }

        // Store bot response
        const botEntry = {
            id: Date.now() + 1,
            message: botResponse,
            timestamp: new Date().toISOString(),
            role: 'assistant'
        };

        chatHistory.push(botEntry);
        saveToFile(chatHistory, 'chat-history');

        // Return response
        res.json({
            message: botResponse,
            questionReady: shouldShowQuestionModal,
            showQuestionModal: shouldShowQuestionModal,
            modalMessage: modalMessage,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[CHAT ERROR]', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============== Exam Webhook Handler ==============

/**
 * Exam Webhook
 * Receives exam submissions and validates answers
 * Stores exam response data
 */
app.post('/webhook-test/physio_exam', async (req, res) => {
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

        console.log('[EXAM] Received submission:', {
            question: question?.substring(0, 50),
            selectedAnswer,
            isCorrect,
            timeUsed
        });

        // Validate input
        if (selectedAnswer === undefined || correctAnswer === undefined) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Create exam response record
        const examResponse = {
            id: Date.now(),
            passage: passage,
            question: question,
            options: options,
            selectedAnswer: selectedAnswer,
            selectedText: selectedText,
            correctAnswer: correctAnswer,
            isCorrect: isCorrect,
            timeUsed: timeUsed,
            timestamp: timestamp || new Date().toISOString(),
            recordedAt: new Date().toISOString()
        };

        // Store response
        examResponses.push(examResponse);
        saveToFile(examResponses, 'exam-responses');

        // Generate feedback
        let feedback = '';
        if (isCorrect) {
            feedback = 'Excellent! Your answer is correct.';
        } else {
            feedback = `Your answer was incorrect. The correct answer is "${options[correctAnswer]}"`;
        }

        // Calculate score
        const stats = calculateExamStats(examResponses);

        // Return response
        res.json({
            success: true,
            message: 'Exam response recorded successfully',
            feedback: feedback,
            isCorrect: isCorrect,
            correctAnswer: correctAnswer,
            correctText: options[correctAnswer],
            stats: {
                totalAttempts: stats.total,
                correctAnswers: stats.correct,
                score: stats.percentage,
                averageTime: stats.avgTime
            }
        });

    } catch (error) {
        console.error('[EXAM ERROR]', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============== Utility Endpoints ==============

/**
 * Get chat history
 */
app.get('/api/chat-history', (req, res) => {
    res.json({
        total: chatHistory.length,
        messages: chatHistory
    });
});

/**
 * Get exam responses
 */
app.get('/api/exam-responses', (req, res) => {
    res.json({
        total: examResponses.length,
        responses: examResponses
    });
});

/**
 * Get exam statistics
 */
app.get('/api/exam-stats', (req, res) => {
    const stats = calculateExamStats(examResponses);
    res.json(stats);
});

/**
 * Clear data (for testing)
 */
app.post('/api/clear-data', (req, res) => {
    chatHistory = [];
    examResponses = [];
    saveToFile([], 'chat-history');
    saveToFile([], 'exam-responses');
    res.json({ message: 'Data cleared' });
});

// ============== Helper Functions ==============

/**
 * Simple AI response generator
 * Replace with actual AI API (OpenAI, Claude, etc.)
 */
function getAIResponse(userMessage) {
    const responses = {
        'hello': 'Hello! How can I help you with your physio assessment today?',
        'hi': 'Hi there! How are you doing?',
        'test': 'I can help you prepare for the physio assessment. What would you like to know?',
        'exam': 'Ready to take the exam? Let me prepare a question for you.',
        'help': 'I can help you with physiology concepts or prepare you for the exam. What do you need?',
        'default': 'That\'s interesting. Can you tell me more or ask me something specific about physiology?'
    };

    const lowerMessage = userMessage.toLowerCase();
    
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }

    return responses.default;
}

/**
 * Calculate exam statistics
 */
function calculateExamStats(responses) {
    if (responses.length === 0) {
        return {
            total: 0,
            correct: 0,
            incorrect: 0,
            percentage: 0,
            avgTime: 0
        };
    }

    const correct = responses.filter(r => r.isCorrect).length;
    const incorrect = responses.length - correct;
    const avgTime = Math.round(
        responses.reduce((sum, r) => sum + (r.timeUsed || 0), 0) / responses.length
    );

    return {
        total: responses.length,
        correct: correct,
        incorrect: incorrect,
        percentage: Math.round((correct / responses.length) * 100),
        avgTime: avgTime,
        passRate: correct / responses.length > 0.7 ? 'Pass' : 'Fail'
    };
}

// ============== Error Handling ==============

app.use((error, req, res, next) => {
    console.error('[ERROR]', error);
    res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
    });
});

// ============== Server Start ==============

const server = app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════╗
    ║   Physio Chat & Exam Webhook Handler      ║
    ║   Server running on port ${PORT}                  ║
    ╚════════════════════════════════════════════╝
    
    Endpoints:
    
    Chat Webhook:
    POST /webhook-test/physio_chatbot
    
    Exam Webhook:
    POST /webhook-test/physio_exam
    
    Admin Endpoints:
    GET  /api/chat-history
    GET  /api/exam-responses
    GET  /api/exam-stats
    POST /api/clear-data
    
    Webhook URLs:
    http://localhost:${PORT}/webhook-test/physio_chatbot
    http://localhost:${PORT}/webhook-test/physio_exam
    `);
});

// ============== Example curl commands ==============

/*
TEST CHAT WEBHOOK:
curl -X POST http://localhost:3000/webhook-test/physio_chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to take the exam",
    "timestamp": "2024-03-24T10:00:00Z"
  }'

TEST EXAM WEBHOOK:
curl -X POST http://localhost:3000/webhook-test/physio_exam \
  -H "Content-Type: application/json" \
  -d '{
    "passage": "The skeletal system comprises 206 bones",
    "question": "How many bones in adult skeleton?",
    "options": ["150", "206", "300", "100"],
    "selectedAnswer": 1,
    "selectedText": "206",
    "correctAnswer": 1,
    "isCorrect": true,
    "timeUsed": 45,
    "timestamp": "2024-03-24T10:00:00Z"
  }'

GET STATISTICS:
curl http://localhost:3000/api/exam-stats
*/

module.exports = app;
