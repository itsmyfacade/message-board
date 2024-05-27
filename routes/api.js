'use strict';
const mongoose = require('mongoose');
const express = require('express');
const Thread = require('../models');
const router = express.Router();
const assert = require('assert');
const request = require('supertest');
const app = require('../server');



// Helper function to sanitize thread objects
const sanitizeThread = (thread) => {
  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies: thread.replies.slice(-3).map(reply => ({
      _id: reply._id,
      text: reply.text,
      created_on: reply.created_on
    }))
  };
};

// Helper function to sanitize reply objects
const sanitizeReplies = (replies) => {
  return replies.map(reply => ({
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on
  }));
};
// POST request to create a new thread
router.post('/threads/:board', async (req, res) => {
  const board = req.params.board;
  const { text, delete_password } = req.body;

  try {
    const newThread = new Thread({
      text,
      delete_password,
      board,
      created_on: new Date(),
      bumped_on: new Date(),
      reported: false,
      replies: []
    });
    await newThread.save();
    res.json(newThread);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// POST request to add a reply to a thread
router.post('/replies/:board', async (req, res) => {
  const board = req.params.board;
  const { text, delete_password, thread_id } = req.body;

  try {
    const thread = await Thread.findOne({ _id: thread_id, board });

    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    const newReply = {
      _id: new mongoose.Types.ObjectId(),
      text,
      created_on: new Date(),
      delete_password,
      reported: false
    };

    thread.replies.push(newReply);
    thread.bumped_on = newReply.created_on; // Update bumped_on date to comment's date
    await thread.save();

    res.json(newReply);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add reply');
  }
});

// GET request to fetch the most recent 10 threads
router.get('/threads/:board', async (req, res) => {
  const board = req.params.board;

  try {
    const threads = await Thread.find({ board })
      .sort({ bumped_on: -1 })
      .limit(10)
      .lean();
    
    const sanitizedThreads = threads.map(thread => sanitizeThread(thread));
    res.json(sanitizedThreads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// GET request to get the entire thread with all its replies
router.get('/replies/:board', async (req, res) => {
  const board = req.params.board;
  const { thread_id } = req.query;

  try {
    const thread = await Thread.findOne({ _id: thread_id, board }).lean();
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const sanitizedThread = {
      _id: thread._id,
      text: thread.text,
      created_on: thread.created_on,
      bumped_on: thread.bumped_on,
      replies: sanitizeReplies(thread.replies)
    };

    res.json(sanitizedThread);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// DELETE request to delete a thread
router.delete('/threads/:board', async (req, res) => {
  const board = req.params.board;
  const { thread_id, delete_password } = req.body;

  try {
    const thread = await Thread.findOne({ _id: thread_id, board });

    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    if (thread.delete_password !== delete_password) {
      return res.send('incorrect password');
    }

    await Thread.deleteOne({ _id: thread_id, board });
    res.send('success');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete thread');
  }
});


// DELETE request to delete a reply
router.delete('/replies/:board', async (req, res) => {
  const board = req.params.board;
  const { thread_id, reply_id, delete_password } = req.body;

  try {
    const thread = await Thread.findOne({ _id: thread_id, board });

    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    const reply = thread.replies.id(reply_id);

    if (!reply) {
      return res.status(404).send('Reply not found');
    }

    if (reply.delete_password !== delete_password) {
      return res.status(403).send('Incorrect password');
    }

    reply.text = '[deleted]';
    await thread.save();

    res.send('success');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete reply');
  }
});

// PUT request to report a thread
router.put('/threads/:board', async (req, res) => {
  const board = req.params.board;
  const { thread_id } = req.body;

  try {
    const thread = await Thread.findOne({ _id: thread_id, board });

    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    thread.reported = true;
    await thread.save();

    res.send('reported');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to report thread');
  }
});





// PUT request to report a reply
router.put('/replies/:board', async (req, res) => {
  const board = req.params.board;
  const { thread_id, reply_id } = req.body;

  try {
    const thread = await Thread.findOne({ _id: thread_id, board });

    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    const reply = thread.replies.id(reply_id);

    if (!reply) {
      return res.status(404).send('Reply not found');
    }

    reply.reported = true;
    await thread.save();

    res.send('reported');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to report reply');
  }
});


module.exports = router;
