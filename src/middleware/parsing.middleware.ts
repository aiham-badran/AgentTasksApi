// src/middleware/parsing.middleware.ts
import express from 'express';

export const parsingStack = [
  express.json({ limit: '100kb' }),
  express.urlencoded({ extended: true }),
];
