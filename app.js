import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
// app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // allow localhost
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }

    // allow ALL vercel preview + production URLs
    if (origin.includes('.vercel.app')) {
      return callback(null, origin); // 🔥 IMPORTANT: return origin
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// 🔥 handle preflight properly
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      origin === 'http://localhost:5173' ||
      origin.includes('.vercel.app')
    ) {
      return callback(null, origin);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));


app.get('/', (req, res) => res.send('Neurolance API is running...'));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dashboard', dashboardRoutes);

export default app;
