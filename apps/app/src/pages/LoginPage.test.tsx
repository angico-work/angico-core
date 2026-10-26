import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import { getSession } from '../lib/api';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAccess(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage key="login" />} />
        <Route path="/cadastro" element={<LoginPage key="register" mode="register" />} />
        <Route path="/app" element={<h1>Meu painel</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function fillRegistration(confirmation = 'senha-de-teste') {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Ana Silva ' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.test' } });
  fireEvent.change(screen.getByLabelText('Angico ID'), { target: { value: '@Ana.Silva' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-de-teste' } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: confirmation } });
}

describe('LoginPage', () => {
  it('starts with empty credentials and discloses no demo account', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.queryByText(/julia@angico\.demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/angico-demo/i)).not.toBeInTheDocument();
  });

  it('opens registration from login and returns to an empty login form', () => {
    renderAccess();
    fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }));

    expect(screen.getByRole('heading', { name: 'Criar sua conta' })).toBeInTheDocument();
    fillRegistration();
    fireEvent.click(screen.getByRole('link', { name: 'Entrar' }));

    expect(screen.getByRole('heading', { name: 'Acessar Angico' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  it('creates the account through the API, stores its session, and opens the app', async () => {
    const session = {
      pessoaId: 12, nome: 'Ana Silva', email: 'ana@example.test', angicoId: 'ana.silva',
      papel: 'OWNER', workspaceId: 'espaco-ana-silva', expiresAt: '2099-01-01T00:00:00Z',
      csrfToken: 'test-csrf'
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe('/api/auth/register');
      expect(init?.method).toBe('POST');
      expect(init?.credentials).toBe('include');
      expect(JSON.parse(String(init?.body))).toEqual({
        nome: 'Ana Silva', email: 'ana@example.test', angicoId: 'ana.silva', password: 'senha-de-teste'
      });
      return new Response(JSON.stringify(session), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAccess('/cadastro');
    fillRegistration();
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('heading', { name: 'Meu painel' })).toBeInTheDocument();
    expect(getSession()).toEqual(session);
  });

  it('does not send registration when the password confirmation differs', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAccess('/cadastro');
    fillRegistration('outra-senha');
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não coincidem.');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });

  it('shows a duplicate-account error without entering the app or losing the filled fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Email já cadastrado.' }), { status: 400 })
    ));
    renderAccess('/cadastro');
    fillRegistration();
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email já cadastrado.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.test');
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
    expect(getSession()).toBeNull();
  });
});
