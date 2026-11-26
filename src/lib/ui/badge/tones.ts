export type Tone = 'active' | 'done' | 'attention' | 'fault' | 'quiet';

export const tones: Record<Tone, string> = {
  active:
    'border-state-active border-l-state-active-edge bg-state-active text-state-active-text',
  done: 'border-state-done border-l-state-done-edge bg-state-done text-state-done-text',
  attention:
    'border-state-attention border-l-state-attention-edge bg-state-attention text-state-attention-text',
  fault:
    'border-state-fault border-l-state-fault-edge bg-state-fault text-state-fault-text',
  quiet:
    'border-state-quiet border-l-state-quiet-edge bg-state-quiet text-state-quiet-text',
};
