//==============================
// Import
//==============================
import {
  getDomainName,
  bypassAntiEmbeddingTokens,
} from '../utils.js';


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

  test('}}', () => {
    const idx = bypassAntiEmbeddingTokens(`{"test":true}}`);
    expect(idx).toEqual([0, -1]);
  });

  test('{{"test":true}}', () => {
    const idx = bypassAntiEmbeddingTokens(`{{"test":true}}`);
    expect(idx).toEqual([1, -1]);
  });
  
  
  test('{""}{{"test":true}}{"test"}', () => {
    const idx = bypassAntiEmbeddingTokens(`{""}{{"test":true}}{"test"}`);
    expect(idx).toEqual([5, -9]);
  });
 
  test('{"}{:}{{"test":true}}{""}{{:}}', () => {
    const idx = bypassAntiEmbeddingTokens(`{"}{:}{{"test":true}}{""}{{:}}`);
    expect(idx).toEqual([7, -10]);
  });
  
  test('{"a":""}{{{"{{:}}', () => {
    const idx = bypassAntiEmbeddingTokens(`{"a":""}{{{"{{:}}`);
    expect(idx).toEqual([0, -9]);
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
})