/**
 * @jest-environment jsdom
 */

//==============================
// Import
//==============================
import {
  getDomainName,
  SENSITIVE_KEYS,
  bypassAntiEmbeddingTokens,
} from '../utils.js';

import {
  matchKeys,
} from '../http/analyze_http_body.js';


//==============================
// Tests
//==============================

describe('Bypass anti-embedding JSON tokens', () => {
  test('{"test":true}', () => {
    const idx = bypassAntiEmbeddingTokens(`{"test":true}`);
    expect(idx).toEqual([0, undefined]);
  });

  test(')}while(1);</x>//', () => {
    const idx = bypassAntiEmbeddingTokens(`)}while(1);</x>//{"test":true}`);
    expect(idx).toEqual([17, undefined]);
  });

  test('{{', () => {
    const idx = bypassAntiEmbeddingTokens(`{{"test":true}`);
    expect(idx).toEqual([1, undefined]);
  });

  test('for(;;);', () => {
    const idx = bypassAntiEmbeddingTokens(`for(;;);{"test":true}`);
    expect(idx).toEqual([8, undefined]);
  });

  test('{"test":{"test":true}}', () => {
    const idx = bypassAntiEmbeddingTokens(`{"test":{"test":true}}`);
    expect(idx).toEqual([0, undefined]);
  });
});


describe('Get domain name', () => {
  test('www.google.com', () => {
    const domain = getDomainName(`www.google.com`);
    expect(domain).toEqual(['google']);
  });
  
  test('www.very.long.domain.com', () => {
    const domain = getDomainName(`www.very.long.domain.com`);
    expect(domain).toEqual(['very','long','domain']);
  });

  test('www.very.very.long.domain.com', () => {
    const domain = getDomainName(`www.very.very.long.domain.com`);
    expect(domain).toEqual(['very','long','domain']);
  });
});


describe('Matching keys', () => {
  test('key', () => {
    const obj = {pro: true };
    const res = matchKeys(obj, SENSITIVE_KEYS);
    expect(res).toEqual(['pro']);
  });

  test('_key', () => {
    const obj = {user_pro: true };
    const res = matchKeys(obj, SENSITIVE_KEYS);
    expect(res).toEqual(['user_pro']);
  });

  test('key_', () => {
    const obj = {pro_user: true };
    const res = matchKeys(obj, SENSITIVE_KEYS);
    expect(res).toEqual(['pro_user']);
  });

  test('nested keys', () => {
    const obj = {app: {user: {license: {premium: false}}} };
    const res = matchKeys(obj, SENSITIVE_KEYS);
    expect(res).toEqual(['user', 'license', 'premium']);
  });
})