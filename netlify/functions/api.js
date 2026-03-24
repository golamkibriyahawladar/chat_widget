const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const router = express.Router();

// Middleware (Fix: Added urlencoded for better data parsing)
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============== Storage (Temporary for Serverless) ==============
let chatHistory = [];
let examResponses = [];
let currentQuestion = null;

// ============== Helper Functions ==============

function getAIResponse(userMessage) {
    const responses = {
        'hello': 'Hello! How can I help you with your physio assessment today?',
        'hi': 'Hi there! Ready to learn?',
        'exam': 'Ready to take the exam? Ask me to generate a question or wait for the trigger!',
        'test': 'I can help you prepare for the physio assessment.',
        'help': 'I can assist with physiology topics and generate exam questions.',
        'default': 'That\'s interesting! Ask me something specific or request an exam.'
    };
    const lowerMessage = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) return response;
    }
    return responses.default;
}

function calculateExamStats(responses) {
    if (!responses || responses.length === 0) {
        return { total: 0, correct: 0, incorrect: 0, percentage: 0, avgTime: 0 };
    }
    const correct = responses.filter(r => r.isCorrect).length;
    const avgTime = Math.round(responses.reduce((sum, r) => sum + (r.timeUsed || 0), 0) / responses.length);
    return {
        total: responses.length,
        correct: correct,
        incorrect: responses.length - correct,
        percentage: Math.round((correct / responses.length) * 100),
        avgTime: avgTime
    };
}

// ============== API Routes ==============

// 1. Chat Webhook
router.post('/webhook/physio_chatbot', (req, res) => {
    try {
        const { message, timestamp } = req.body;

        // Fix: Validation added
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        let botResponse = getAIResponse(message);
        let questionReady = false;

        if (currentQuestion && (message.toLowerCase().includes('exam') || message.toLowerCase().includes('test'))) {
            questionReady = true;
            botResponse = `Great! Here's your exam on ${currentQuestion.topic}. Answer the question carefully.`;

            return res.json({
                message: botResponse,
                questionReady: true,
                showQuestionModal: true,
                modalMessage: 'Your question is ready! Click to start the exam',
                questionData: currentQuestion.data,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            message: botResponse,
            questionReady: false,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CHAT ERROR]', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Exam Submission Webhook
router.post('/webhook/physio_exam', (req, res) => {
    try {
        const examData = req.body;

        // Fix: Strict validation to prevent server crash
        if (examData.selectedAnswer === undefined || examData.correctAnswer === undefined || !examData.options) {
            return res.status(400).json({ error: 'Missing required fields (selectedAnswer, correctAnswer, options)' });
        }

        examResponses.push({ ...examData, id: Date.now() });
        const stats = calculateExamStats(examResponses);

        // Fix: Safe array access for correct text
        const correctText = examData.options[examData.correctAnswer] || "Unknown";

        res.json({
            success: true,
            message: 'Exam response recorded',
            feedback: examData.isCorrect ? 'Excellent! Correct.' : `Incorrect. The correct answer was: ${correctText}`,
            stats: stats
        });
    } catch (error) {
        console.error('[EXAM ERROR]', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Question Trigger Endpoint
router.post('/webhook/trigger-question', (req, res) => {
    try {
        const { topic, passage, question, options, correctAnswer, timeLimit } = req.body;

        // Fix: Enhanced validation
        if (!question || !options || !Array.isArray(options) || options.length !== 4) {
            return res.status(400).json({ error: 'Invalid format. Need a question and an array of exactly 4 options.' });
        }

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

        res.json({
            success: true,
            message: 'Question triggered successfully',
            status: 'Ready for user',
            topic: currentQuestion.topic
        });
    } catch (error) {
        console.error('[TRIGGER ERROR]', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. Admin/Utility Routes
router.get('/api/chat-history', (req, res) => res.json({ total: chatHistory.length, messages: chatHistory }));
router.get('/api/exam-responses', (req, res) => res.json({ total: examResponses.length, responses: examResponses }));
router.get('/api/exam-stats', (req, res) => res.json(calculateExamStats(examResponses)));
router.post('/api/clear-data', (req, res) => {
    chatHistory = []; examResponses = []; currentQuestion = null;
    res.json({ message: 'All temporary data cleared' });
});

// Netlify Base Path Setup
// (Handling both base paths to ensure Netlify redirects work perfectly)
app.use(['/.netlify/functions/api', '/api'], router);

module.exports.handler = serverless(app);