//==============================
// Import
//==============================
import {
  bypassAntiEmbeddingTokens,
} from '../utils.js';


//==============================
// Tests
//==============================

describe('Bypass anti-embedding JSON tokens', () => {
  test('Regular JSON', () => {
    const idx = bypassAntiEmbeddingTokens(`{"test":true}`);
    expect(idx).toBe(0);
  });

  test('Variant with `)}while(1);</x>//`', () => {
    const idx = bypassAntiEmbeddingTokens(`)}while(1);</x>//{"test":true}`);
    expect(idx).toBe(17);
  });

  test('Variant with double opening `{{`', () => {
    const idx = bypassAntiEmbeddingTokens(`{{"test":true}`);
    expect(idx).toBe(1);
  });
  
  test('Variant with double opening `for(;;);`', () => {
    const idx = bypassAntiEmbeddingTokens(`for(;;);{"test":true}`);
    expect(idx).toBe(8);
  });

   test('Variant with double closing `}}`', () => {
    // (!) This case has never been found, but it is possible to have tokens at the end. To handle
    const idx = bypassAntiEmbeddingTokens(`{"test":true}}`);
    expect(idx).toBe(1);
  });

})
