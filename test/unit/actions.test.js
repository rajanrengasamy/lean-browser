import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseActionSpec, validateAction, ValidationError, ElementNotFoundError } from '../../src/actions.js';

describe('parseActionSpec', () => {
  it('parses single click action', () => {
    const actions = parseActionSpec('click:e1');
    assert.equal(actions.length, 1);
    assert.deepEqual(actions[0], { type: 'click', elementId: 'e1' });
  });

  it('parses comma-separated actions', () => {
    const actions = parseActionSpec('click:e1,type:e2:hello,submit:e3');
    assert.equal(actions.length, 3);
    assert.equal(actions[0].type, 'click');
    assert.equal(actions[1].type, 'type');
    assert.equal(actions[1].value, 'hello');
    assert.equal(actions[2].type, 'submit');
  });

  it('parses type with slow modifier', () => {
    const actions = parseActionSpec('type:e1:password123:slow');
    assert.equal(actions[0].slow, true);
    assert.equal(actions[0].value, 'password123');
  });

  it('parses select action', () => {
    const actions = parseActionSpec('select:e3:admin');
    assert.deepEqual(actions[0], { type: 'select', elementId: 'e3', value: 'admin' });
  });

  it('parses wait action', () => {
    const actions = parseActionSpec('wait:2000');
    assert.deepEqual(actions[0], { type: 'wait', ms: 2000 });
  });

  it('caps wait at 30 seconds', () => {
    const actions = parseActionSpec('wait:60000');
    assert.equal(actions[0].ms, 30000);
  });

  it('parses navigate action (URL with colons)', () => {
    const actions = parseActionSpec('navigate:https://example.com/page');
    assert.equal(actions[0].type, 'navigate');
    assert.equal(actions[0].url, 'https://example.com/page');
  });

  it('parses scroll action', () => {
    const actions = parseActionSpec('scroll:500');
    assert.deepEqual(actions[0], { type: 'scroll', pixels: 500 });
  });

  it('handles negative scroll (up)', () => {
    const actions = parseActionSpec('scroll:-300');
    assert.equal(actions[0].pixels, -300);
  });

  it('returns empty array for null/empty input', () => {
    assert.deepEqual(parseActionSpec(null), []);
    assert.deepEqual(parseActionSpec(''), []);
  });

  it('throws on invalid action spec', () => {
    assert.throws(() => parseActionSpec('badaction'), ValidationError);
  });

  it('throws on unknown action type', () => {
    assert.throws(() => parseActionSpec('hover:e1'), ValidationError);
  });

  it('throws on type without value', () => {
    assert.throws(() => parseActionSpec('type:e1'), ValidationError);
  });

  it('handles type value containing colons', () => {
    const actions = parseActionSpec('type:e1:user:pass');
    assert.equal(actions[0].value, 'user:pass');
  });
});

describe('validateAction', () => {
  const elementMap = { e1: '#btn', e2: '#input', e3: '#select' };

  it('passes for valid click action', () => {
    assert.doesNotThrow(() => validateAction({ type: 'click', elementId: 'e1' }, elementMap));
  });

  it('passes for wait (no element needed)', () => {
    assert.doesNotThrow(() => validateAction({ type: 'wait', ms: 1000 }, elementMap));
  });

  it('passes for navigate (no element needed)', () => {
    assert.doesNotThrow(() => validateAction({ type: 'navigate', url: 'https://example.com' }, elementMap));
  });

  it('throws ElementNotFoundError for missing element', () => {
    assert.throws(() => validateAction({ type: 'click', elementId: 'e99' }, elementMap), ElementNotFoundError);
  });

  it('throws ValidationError for missing elementId', () => {
    assert.throws(() => validateAction({ type: 'click' }, elementMap), ValidationError);
  });
});
