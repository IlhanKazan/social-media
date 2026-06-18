import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/utils';
import { server } from '@/test/server';
import { CreatePost } from './CreatePost';

const POSTS_URL = 'http://localhost:8080/api/v1/posts';

describe('CreatePost', () => {
  it('keeps submit disabled until there is content', () => {
    renderWithProviders(<CreatePost />);
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled();
  });

  it('clears the composer after a successful post', async () => {
    server.use(
      http.post(POSTS_URL, () => HttpResponse.json({ id: 99, content: 'hello world' }, { status: 201 }))
    );

    renderWithProviders(<CreatePost />);
    const textarea = screen.getByPlaceholderText('Neler oluyor?');

    fireEvent.change(textarea, { target: { value: 'hello world' } });
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Gönder' }));

    await waitFor(() => expect(textarea).toHaveValue(''));
  });
});
