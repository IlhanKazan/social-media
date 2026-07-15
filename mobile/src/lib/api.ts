import axios from 'axios';

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and fill it in.');
}

export const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 30_000,
});
