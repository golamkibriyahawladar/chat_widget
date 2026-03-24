# Physio Chat & Exam System - Webhook Documentation

## 📋 Overview

This system consists of two main pages:
1. **Chat Widget** (`chat-widget.html`) - AI chat interface with question notifications
2. **Exam Page** (`exam.html`) - MCQ assessment with timer and scoring

---

## 🌐 Webhook Endpoints

### 1. Chat Widget Webhook
**URL:** `https://n8n2.srv980217.hstgr.cloud/webhook-test/physio_chatbot`

#### Request Format (Chat → Webhook)
```json
{
  "message": "User's message text",
  "timestamp": "2024-03-24T10:30:00.000Z"
}
```

#### Response Format (Webhook → Chat)
```json
{
  "message": "Bot response text",
  "questionReady": false,
  "showQuestionModal": false,
  "modalMessage": "Your question is ready. Go for the test!"
}
```

**To trigger question modal:**
```json
{
  "message": "A new question has been prepared for you",
  "questionReady": true,
  "showQuestionModal": true,
  "modalMessage": "Your question is ready. Go for the test!"
}
```

---

### 2. Exam Webhook
**URL:** `https://n8n2.srv980217.hstgr.cloud/webhook-test/physio_exam`

#### Request Format (Exam → Webhook)
```json
{
  "passage": "The complete passage text here...",
  "question": "The MCQ question text here?",
  "options": [
    "Option A",
    "Option B",
    "Option C",
    "Option D"
  ],
  "selectedAnswer": 0,
  "selectedText": "Option A (user's selected answer)",
  "correctAnswer": 1,
  "isCorrect": false,
  "timeUsed": 45,
  "timestamp": "2024-03-24T10:35:20.000Z"
}
```

#### Response Format (Webhook → Exam)
```json
{
  "success": true,
  "message": "Answer recorded successfully",
  "feedback": "This is the correct answer because..."
}
```

---

## 🔧 N8N Setup Guide

### Step 1: Create Chat Webhook in N8N

1. **Create a new workflow** in N8N
2. **Add HTTP Node** (Trigger)
   - Set URL: `webhook-test/physio_chatbot`
   - Method: POST
   - Enable "Use N8N Built-in Nodes"

3. **Add AI Node** (e.g., OpenAI, Claude, etc.)
   - Connect to HTTP trigger
   - Pass `$json.message` as input

4. **Add Response Node**
   ```javascript
   return {
     "message": $json.response_text,
     "questionReady": false
   }
   ```

### Step 2: Create Exam Webhook in N8N

1. **Create another workflow** in N8N
2. **Add HTTP Node** (Trigger)
   - Set URL: `webhook-test/physio_exam`
   - Method: POST

3. **Add Database/Storage Node** (Save responses)
   - Store all exam data

4. **Add Response Node**
   ```javascript
   return {
     "success": true,
     "message": "Exam response recorded"
   }
   ```

### Step 3: Trigger Question Ready Notification

When you want to send a question to the user:

**Make a POST request to the Chat webhook:**
```bash
curl -X POST https://n8n2.srv980217.hstgr.cloud/webhook-test/physio_chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "A new question has been prepared for you",
    "questionReady": true,
    "showQuestionModal": true,
    "modalMessage": "Your question is ready. Go for test!"
  }'
```

This will:
1. Trigger a notification in the chat widget
2. Show a modal popup saying "Your question is ready"
3. User can click "Go to Test" to navigate to exam.html

---

## 📱 Page Navigation Flow

```
Chat Widget (chat-widget.html)
    ↓
User sends message
    ↓
Webhook processes message
    ↓
If "questionReady": true
    ↓
Modal popup appears in Chat
    ↓
User clicks "Go to Test"
    ↓
Exam Page (exam.html) opens
    ↓
User clicks "Start Exam"
    ↓
Timer starts
    ↓
User answers question
    ↓
User clicks "Submit"
    ↓
Exam data sent to webhook
    ↓
Correct answer displayed
```

---

## 🔄 Complete Workflow Example

### Scenario: Student takes a test

**Step 1: Chat Interaction**
```json
// Chat Webhook Request
POST /webhook-test/physio_chatbot
{
  "message": "I want to take the physio test",
  "timestamp": "2024-03-24T10:00:00Z"
}

// Chat Webhook Response
{
  "message": "Great! Let me prepare a question for you...",
  "questionReady": false
}
```

**Step 2: Question Ready Notification (from backend/admin)**
```json
// Chat Webhook Request (Admin-initiated)
POST /webhook-test/physio_chatbot
{
  "message": "Your physiology question is ready",
  "questionReady": true,
  "showQuestionModal": true,
  "modalMessage": "Question ready! Click to start exam"
}
```

**Step 3: User Takes Exam**
- User clicks "Go to Test" button
- exam.html opens
- User clicks "Start Exam"
- Timer counts down
- User selects answer and submits

**Step 4: Exam Submission**
```json
// Exam Webhook Request
POST /webhook-test/physio_exam
{
  "passage": "The skeletal system comprises 206 bones in adults...",
  "question": "How many bones are in the adult human skeleton?",
  "options": ["150", "206", "300", "100"],
  "selectedAnswer": 1,
  "selectedText": "206",
  "correctAnswer": 1,
  "isCorrect": true,
  "timeUsed": 45,
  "timestamp": "2024-03-24T10:05:30Z"
}
```

---

## 🎨 UI Features

### Chat Widget Features:
✅ Real-time messaging
✅ Typing indicator
✅ Smooth animations
✅ Question notification popup
✅ Mobile responsive
✅ Message history

### Exam Page Features:
✅ Passage display
✅ MCQ with multiple choice
✅ Countdown timer
✅ Read-only after timeout
✅ Answer validation
✅ Correct answer display
✅ Time tracking
✅ Responsive design

---

## 🔐 Security Considerations

1. **CORS**: Enable CORS for your webhook if frontend is on different domain
2. **Rate Limiting**: Implement rate limiting on webhooks
3. **Authentication**: Consider adding API keys for production
4. **Validation**: Validate all input data on backend
5. **HTTPS**: Always use HTTPS for production

---

## 🚀 Deployment Checklist

- [ ] Update webhook URLs if deploying to production
- [ ] Set up N8N workflows
- [ ] Configure database for storing exam responses
- [ ] Test all webhook endpoints
- [ ] Set up logging/monitoring
- [ ] Configure CORS settings
- [ ] Test on multiple devices
- [ ] Set up SSL certificates
- [ ] Configure backup strategies

---

## 📞 Troubleshooting

### Modal not appearing?
- Check if webhook response includes `questionReady: true`
- Verify browser console for errors
- Check if popup is being blocked by browser

### Timer not working?
- Ensure browser allows scripts
- Check if `examData.timeLimit` is provided
- Verify timer interval is starting

### Webhook not receiving data?
- Check URL is correct
- Verify POST method is used
- Check Content-Type is application/json
- Enable CORS if needed

### Exam data not saved?
- Verify webhook endpoint is responding
- Check database connection in N8N
- Review N8N workflow logs

---

## 📊 Data Models

### Chat Message
```javascript
{
  message: string,
  timestamp: ISO8601,
  questionReady?: boolean,
  showQuestionModal?: boolean,
  modalMessage?: string
}
```

### Exam Submission
```javascript
{
  passage: string,
  question: string,
  options: string[],
  selectedAnswer: number (0-3),
  selectedText: string,
  correctAnswer: number (0-3),
  isCorrect: boolean,
  timeUsed: number (seconds),
  timestamp: ISO8601
}
```

---

## 💡 Tips & Best Practices

1. **Store exam data** - Save all submissions for analytics
2. **Track time** - Monitor average time per question
3. **Performance analysis** - Track correct answer rates
4. **User progress** - Keep history of all attempts
5. **Customization** - Modify passages and questions dynamically
6. **Testing** - Test webhooks before production deployment

---

## 📝 Example N8N Workflow JSON

### Chat Webhook Workflow
```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-test/physio_chatbot"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "model": "gpt-3.5-turbo",
        "messages": "={{ { 'role': 'user', 'content': $json.message } }}"
      },
      "name": "OpenAI",
      "type": "n8n-nodes-base.openai",
      "inputs": ["Webhook"]
    },
    {
      "parameters": {
        "responseData": "={{ { 'message': $json.choices[0].message.content } }}"
      },
      "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook"
    }
  ]
}
```

---

**Version:** 1.0  
**Last Updated:** March 24, 2024  
**Contact:** support@physioapp.local
