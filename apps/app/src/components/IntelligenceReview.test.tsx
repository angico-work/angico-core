import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IntelligenceReview from './IntelligenceReview';
import { requestAnalysis, sendIntelligenceFeedback, type IntelligenceAnalysis } from '../lib/intelligenceApi';
vi.mock('../lib/intelligenceApi', () => ({ requestAnalysis: vi.fn(), sendIntelligenceFeedback: vi.fn() }));
const analysis: IntelligenceAnalysis = {
  analysisId: 'analysis-1', status: 'READY', category: 'Água e Saneamento', summary: 'O relato menciona água turva; a causa não foi confirmada.', message: '',
  connections: [{ sourceId: 'OBSERVACAO:7', relationType: null, reason: 'Relato semelhante, precisa de revisão.' }],
  recommendations: [{ text: 'Verificar o relato no local.', sourceIds: ['OBSERVACAO:7'] }],
  sources: [{ sourceId: 'OBSERVACAO:7', entityType: 'OBSERVACAO', entityId: '7', title: 'Água turva na praça', excerpt: 'Registro anterior', occurredAt: '2026-10-29T12:00:00Z' }]
};
const props = { workspaceId: 'a', entityType: 'observacao', title: 'Água turva', description: 'Relato sintético', categories: ['Resíduos','Água e Saneamento'], onApplyCategory: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks(); vi.mocked(requestAnalysis).mockResolvedValue(analysis); vi.mocked(sendIntelligenceFeedback).mockResolvedValue();
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function start() { fireEvent.click(screen.getByRole('button', { name: 'Analisar com IA' })); }
it('requires an explicit request, exposes sources and applies only after review', async () => {
  render(<IntelligenceReview {...props} />);
  expect(requestAnalysis).not.toHaveBeenCalled(); expect(screen.getByText(/OpenAI/)).toBeInTheDocument(); start();
  expect(await screen.findByText(analysis.summary)).toBeInTheDocument(); expect(props.onApplyCategory).not.toHaveBeenCalled();
  expect(screen.getAllByRole('link', { name: /Água turva na praça/ })[0]).toHaveAttribute('href','/app/rastro/OBSERVACAO/7');
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar Água e Saneamento' }));
  expect(props.onApplyCategory).toHaveBeenCalledWith('Água e Saneamento');
  await waitFor(() => expect(sendIntelligenceFeedback).toHaveBeenCalledWith('analysis-1',expect.objectContaining({ suggestionId: 'category', decision: 'accepted' }),expect.any(AbortSignal)));
});
it('shows loading and preserves ability to continue after provider failure', async () => {
  let reject!: (error: Error) => void;
  vi.mocked(requestAnalysis).mockReturnValue(new Promise((_,r) => { reject=r; }));
  render(<IntelligenceReview {...props} />); start();
  expect(screen.getByRole('button', { name: 'Analisando…' })).toBeDisabled();
  await act(async () => reject(new Error('Falha de conexão')));
  expect(await screen.findByRole('alert')).toHaveTextContent(/salvar/); expect(props.onApplyCategory).not.toHaveBeenCalled();
});
it('disables external analysis offline and reacts when connectivity returns', () => {
  vi.spyOn(navigator,'onLine','get').mockReturnValue(false); render(<IntelligenceReview {...props} />);
  expect(screen.getByRole('button', { name: 'Analisar com IA' })).toBeDisabled(); expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true); fireEvent(window,new Event('online'));
  expect(screen.getByRole('button', { name: 'Analisar com IA' })).toBeEnabled();
});
it('invalidates completed suggestions immediately when the draft changes', async () => {
  const view=render(<IntelligenceReview {...props} />); start(); await screen.findByText(analysis.summary);
  view.rerender(<IntelligenceReview {...props} title="Outro relato" />);
  expect(screen.queryByText(analysis.summary)).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Aplicar Água e Saneamento' })).not.toBeInTheDocument();
});
it('aborts on workspace change and discards late results even if transport ignores abort', async () => {
  let resolve!: (result: IntelligenceAnalysis) => void;
  vi.mocked(requestAnalysis).mockReturnValue(new Promise(r => { resolve=r; }));
  const view=render(<IntelligenceReview {...props} />); start(); const signal=vi.mocked(requestAnalysis).mock.calls[0][1]!;
  view.rerender(<IntelligenceReview {...props} workspaceId="b" />); expect(signal.aborted).toBe(true);
  await act(async () => resolve(analysis)); expect(screen.queryByText(analysis.summary)).not.toBeInTheDocument(); expect(props.onApplyCategory).not.toHaveBeenCalled();
});
it('keeps the same idempotency key after an uncertain transport failure', async () => {
  vi.mocked(requestAnalysis).mockRejectedValueOnce(new Error('Timeout')); render(<IntelligenceReview {...props} />);
  start(); await screen.findByRole('alert'); start(); await screen.findByText(analysis.summary);
  expect(vi.mocked(requestAnalysis).mock.calls[0][0].requestId).toEqual(vi.mocked(requestAnalysis).mock.calls[1][0].requestId);
});
it('records human correction and retries feedback without blocking draft application', async () => {
  vi.mocked(sendIntelligenceFeedback).mockRejectedValueOnce(new Error('offline'));
  render(<IntelligenceReview {...props} />); start(); await screen.findByText(analysis.summary);
  fireEvent.change(screen.getByLabelText('Corrigir categoria sugerida'), { target: { value: 'Resíduos' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar correção' })); expect(props.onApplyCategory).toHaveBeenCalledWith('Resíduos');
  fireEvent.click(await screen.findByRole('button', { name: 'Reenviar revisão' }));
  await waitFor(() => expect(sendIntelligenceFeedback).toHaveBeenCalledTimes(2));
  const first=vi.mocked(sendIntelligenceFeedback).mock.calls[0][1];
  expect(first.decision).toEqual('corrected'); expect(first.correctedCategory).toEqual('Resíduos');
  expect(first.requestId).toEqual(vi.mocked(sendIntelligenceFeedback).mock.calls[1][1].requestId);
});
it('shows unavailable state without substituting a local classifier', async () => {
  vi.mocked(requestAnalysis).mockResolvedValue({ ...analysis,status:'UNAVAILABLE',category:null,summary:'',message:'A IA ainda não está ativada.',connections:[],recommendations:[],sources:[] });
  render(<IntelligenceReview {...props} />); start();
  expect(await screen.findByText(/ainda não está ativada/)).toBeInTheDocument(); expect(screen.queryByRole('button', { name:/Aplicar/ })).not.toBeInTheDocument();
});

it('starts a fresh review when explicitly requesting another completed analysis', async () => {
  render(<IntelligenceReview {...props} />); start(); await screen.findByText(analysis.summary);
  fireEvent.click(screen.getByRole('button', { name:'Aplicar Água e Saneamento' }));
  await screen.findByText('Revisão registrada.');
  vi.mocked(requestAnalysis).mockResolvedValue({ ...analysis,analysisId:'analysis-2' });
  start();
  expect(await screen.findByRole('button', { name:'Aplicar Água e Saneamento' })).toBeInTheDocument();
});

it.each(['success','failure'])('ignores late %s feedback from a previous analysis', async (outcome) => {
  let finish!: () => void;
  vi.mocked(sendIntelligenceFeedback).mockReturnValueOnce(new Promise<void>((resolve,reject) => { finish = () => outcome === 'success' ? resolve() : reject(new Error('offline')); }));
  render(<IntelligenceReview {...props} />); start(); await screen.findByText(analysis.summary);
  fireEvent.click(screen.getByRole('button', { name:'Aplicar Água e Saneamento' }));
  vi.mocked(requestAnalysis).mockResolvedValue({ ...analysis,analysisId:'analysis-2' });
  start(); await screen.findByRole('button', { name:'Aplicar Água e Saneamento' });
  await act(async () => finish());
  expect(screen.getByRole('button', { name:'Aplicar Água e Saneamento' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name:'Reenviar revisão' })).not.toBeInTheDocument();
  expect(screen.queryByText('Revisão registrada.')).not.toBeInTheDocument();
});
