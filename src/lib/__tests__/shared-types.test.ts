import { describe, it, expect } from 'vitest';
import type { SearchResult, ChatMessage, ToolResult, RateLimitResult } from '../shared-types';

describe('Shared Types', () => {
  it('SearchResult has required fields', () => {
    const result: SearchResult = { title: 'test', url: 'https://example.com', snippet: 'hello' };
    expect(result.title).toBe('test');
  });

  it('ChatMessage accepts all roles', () => {
    const user: ChatMessage = { role: 'user', content: 'hi' };
    const assistant: ChatMessage = { role: 'assistant', content: 'hello' };
    expect(user.role).toBe('user');
    expect(assistant.role).toBe('assistant');
  });
});
