import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessmentInput, evidenceSignature, parseQuizDraft } from '../../src/lib/validation';

test('rubric rejects missing, negative and excessive scores', () => {
  const form = new FormData(); form.set('decision','ASSESSED'); form.set('feedback','Checked actual evidence.');
  const criteria = [{id:'a',maxScore:5}];
  assert.throws(() => assessmentInput(form, criteria));
  for (const score of ['-1','6','NaN','']) { form.set('criterion_a',score); assert.throws(() => assessmentInput(form,criteria)); }
  form.set('criterion_a','4.5'); assert.equal(assessmentInput(form,criteria).scores[0],4.5);
  form.set('decision','PASSED'); assert.throws(() => assessmentInput(form,criteria));
});

test('evidence rejects spoofed MIME types', () => {
  assert.equal(evidenceSignature(new TextEncoder().encode('<script>'), 'image/png'), false);
  assert.equal(evidenceSignature(new TextEncoder().encode('%PDF-1.7'), 'application/pdf'), true);
  assert.equal(evidenceSignature(new Uint8Array([137,80,78,71,13,10,26,10]), 'image/png'), true);
  assert.equal(evidenceSignature(new TextEncoder().encode('RIFF1234WEBP'), 'image/webp'), true);
});

test('quiz authoring requires answer membership and distinct options', () => {
  const q = { prompt: 'Safe wiring?', options: ['Power off','Power on'], correctAnswer:'Power off', explanation:'Disconnect power.' };
  assert.equal(parseQuizDraft(JSON.stringify([q])).length,1);
  assert.throws(() => parseQuizDraft(JSON.stringify([{...q, correctAnswer:'Unknown'}])));
  assert.throws(() => parseQuizDraft(JSON.stringify([{...q, options:['Power off','Power off']}])));
  assert.throws(() => parseQuizDraft('[]'));
});
