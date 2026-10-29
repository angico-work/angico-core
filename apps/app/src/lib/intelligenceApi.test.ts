import { beforeEach, expect, it, vi } from 'vitest';
import { requestAnalysis, sendIntelligenceFeedback } from './intelligenceApi';
import { apiFetch } from './api';
vi.mock('./api', () => ({ apiFetch: vi.fn(), apiUrl: (path: string) => path }));
const input={workspaceId:'a',requestId:'1234567890123456',entityType:'observacao',title:'Lixo',description:''};
const unavailable={analysisId:null,status:'UNAVAILABLE',category:null,summary:'',message:'Indisponível',connections:[],recommendations:[],sources:[]};
beforeEach(() => vi.clearAllMocks());
it('uses the authenticated transport with explicit cancellation', async () => {
  vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify(unavailable),{status:200})); const controller=new AbortController();
  expect(await requestAnalysis(input,controller.signal)).toEqual(unavailable);
  expect(apiFetch).toHaveBeenCalledWith('/api/intelligence/analyses',expect.objectContaining({method:'POST',signal:controller.signal,body:JSON.stringify(input)}));
});
it('rejects malformed success bodies and HTTP errors', async () => {
  for(const response of [new Response('{}',{status:200}),new Response('internal secret',{status:500})]) {
    vi.mocked(apiFetch).mockResolvedValue(response); await expect(requestAnalysis(input)).rejects.toThrow();
  }
});
it('uses stable feedback IDs and rejects unsuccessful acknowledgements', async () => {
  const feedback={suggestionId:'category',decision:'accepted' as const,correctedCategory:null,requestId:'1234567890123456'};
  vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({status:'recorded'}),{status:200}));
  await expect(sendIntelligenceFeedback('analysis/1',feedback)).resolves.toBeUndefined();
  expect(apiFetch).toHaveBeenCalledWith('/api/intelligence/analyses/analysis%2F1/feedback',expect.objectContaining({body:JSON.stringify(feedback)}));
  vi.mocked(apiFetch).mockResolvedValue(new Response('{}',{status:200})); await expect(sendIntelligenceFeedback('1',feedback)).rejects.toThrow();
});
