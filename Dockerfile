# Используем базовый образ Node.js с поддержкой LTS
FROM node:lts-alpine

# Установка зависимостей и копирование файлов проекта
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production

# Копируем остальные файлы проекта
COPY . .

# Указываем порт, который будет использоваться в приложении
EXPOSE 8660

# Команда для запуска приложения
CMD ["npm", "start"]
