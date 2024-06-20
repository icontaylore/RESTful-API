const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('api work');
});

const SECRET_KEY = 'quadroBadroBbabebeSBbN3snns';

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Получаем токен из заголовка Authorization

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing token' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => { // Проверяем валидность токена с использованием SECRET_KEY
    if (err) {
      return res.status(403).json({ error: 'Forbidden', message: 'Invalid token' });
    }
    req.user = user; // Если токен валиден, сохраняем пользователя в объекте запроса для дальнейшего использования
    next();
  });
};

// Валидация данных при регистрации пользователя
const validateRegister = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('email').isLength({ min: 6, max: 50 }).withMessage('Email must be between 6 and 50 characters long'),
];

// Регистрация нового пользователя
app.post('/auth/register', validateRegister, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // Проверка существующего мэйла
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Registration failed', message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed', message: error.message });
  }
});

// Вход пользователя и выдача JWT токена
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new Error('Invalid password');

    const token = jwt.sign({ userId: user.id }, SECRET_KEY);
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: 'Login failed', message: error.message });
  }
});

// Создание новой задачи
app.post('/tasks', authenticateToken, async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.userId; // Получаем идентификатор текущего пользователя из JWT токена

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        user: { connect: { id: userId } } // Подключаем новую задачу к текущему пользователю
      },
    });

    res.json({ message: 'Task created successfully', task });
  } catch (error) {
    res.status(400).json({ error: 'Task creation failed', message: error.message });
  }
});

// Получение списка всех задач текущего пользователя
app.get('/tasks', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const tasks = await prisma.task.findMany({ where: { userId } });
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch tasks', message: error.message });
  }
});

// Получение информации о конкретной задаче текущего пользователя
app.get('/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = parseInt(req.params.id);
  const userId = req.user.userId;

  try {
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch task', message: error.message });
  }
});

// Обновление информации о задаче текущего пользователя
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, status } = req.body;
  const userId = req.user.userId;

  try {
    const updatedTask = await prisma.task.updateMany({
      where: { id: taskId, userId },
      data: {
        title,
        description,
        status,
      },
    });

    if (updatedTask.count === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Task update failed', message: error.message });
  }
});

// Удаление задачи текущего пользователя
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = parseInt(req.params.id);
  const userId = req.user.userId;

  try {
    const deletedTask = await prisma.task.deleteMany({
      where: { id: taskId, userId },
    });

    if (deletedTask.count === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Task deletion failed', message: error.message });
  }
});

const PORT = process.env.PORT || 8660;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
