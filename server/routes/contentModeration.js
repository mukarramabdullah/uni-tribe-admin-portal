import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { admin } from '../config/firebase.js';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post(
  '/verify',
  authenticateToken,
  [
    body('title').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('type').isIn(['lost-found', 'academic', 'event']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, type, imageUrl } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ message: 'Gemini API key not configured' });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
        You are an AI content verification system for a university student portal.
        Your task is to analyze the submitted content and determine whether it is authentic, appropriate, and suitable for publishing on a university platform.

        Content to evaluate:
        Title: ${title}
        Description: ${description}
        Type: ${type}
        ${imageUrl ? `Image provided: Yes` : `Image provided: No`}

        Evaluation Criteria:
        1. The title must be clear, relevant, and non-misleading.
        2. The description must match the title and should not contain false, spam, abusive, or irrelevant information.
        3. The content must not include hate speech, explicit language, or inappropriate material.
        4. The content should appear realistic and related to university activities such as lost & found, events, or academic resources.
        5. If an image is provided, evaluate whether it appears relevant to the title and description (based on context provided).

        Response Format (JSON only, no markdown formatting):
        {
          "isAuthentic": true | false,
          "confidenceScore": 0-100,
          "reason": "Short explanation of the decision"
        }

        Be fair and balanced; only reject clearly inappropriate, misleading, or abusive content. When in doubt, prefer to approve.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean up markdown formatting if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      let verificationResult;
      try {
        verificationResult = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        return res.status(500).json({ message: 'Verification failed', error: 'Invalid AI response' });
      }

      // Save to Firestore
      const db = admin.firestore();
      const docRef = await db.collection('content_requests').add({
        title,
        description,
        type,
        imageUrl: imageUrl || null,
        verificationResult,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: verificationResult.isAuthentic ? 'approved' : 'rejected', // Auto-status based on AI? Or just 'pending'? User prompt implies the AI decides.
        userId: req.user ? req.user.id : 'anonymous' // If using auth middleware
      });

      res.json({
        id: docRef.id,
        ...verificationResult
      });

    } catch (error) {
      console.error('Content verification error:', error);
      res.status(500).json({ message: 'Server error during verification' });
    }
  }
);

export default router;
