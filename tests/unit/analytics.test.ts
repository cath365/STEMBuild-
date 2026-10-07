import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:5433/postgres';
const { effectiveLearningEvents, summarizeSkillEvents } = await import('../../src/lib/analytics');

test('rubric re-reviews replace the same criterion while preserving different criteria for the same skill', () => {
  const base = { type:'RUBRIC_SCORED', practicalSubmissionId:'submission',projectSubmissionId:null,skillId:'wiring',maxScore:5 };
  const events = [
    {...base,id:'old',score:1,occurredAt:new Date('2026-01-01'),metadata:{criterionId:'polarity'}},
    {...base,id:'other',score:2,occurredAt:new Date('2026-01-01'),metadata:{criterionId:'connections'}},
    {...base,id:'revised',score:5,occurredAt:new Date('2026-01-02'),metadata:{criterionId:'polarity'}},
  ];
  const effective = effectiveLearningEvents(events);
  assert.equal(effective.length,2);
  assert.ok(!effective.some((event) => event.id === 'old'));
  const mastery = summarizeSkillEvents(effective,[{id:'wiring',slug:'circuit-building',name:'Wiring',description:'Circuit evidence'}])[0];
  assert.equal(mastery.practicalEvidence,2);
  assert.equal(mastery.practicalMastery,0.7);
});

test('skills without scored evidence stay unknown', () => {
  const mastery = summarizeSkillEvents([],[{id:'s',slug:'sensors',name:'Sensors',description:'Sensor evidence'}])[0];
  assert.equal(mastery.overallMastery,null);
  assert.equal(mastery.evidenceCount,0);
});
