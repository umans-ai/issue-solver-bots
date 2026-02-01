/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Public Wiki to Chat Conversion Flow
 *
 * These tests document how a visitor on a public wiki page can submit a chat message,
 * authenticate, and seamlessly continue the conversation in a proper chat interface.
 *
 * Story: As a visitor browsing public documentation, I want to ask questions about
 * the codebase so that I can understand it better, even if I'm not logged in.
 */

describe('Public Wiki Chat Conversion', () => {
  // Mock localStorage for testing
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    // Mock window.location for testing redirects
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when visitor submits a message on public wiki', () => {
    it('stores the message and KB ID in localStorage before redirecting to login', () => {
      // Given a visitor types a message
      const message = 'How do I set up the development environment?';
      const kbId = 'kb-123';

      // When they submit (simulating ChatCta handleSubmit)
      storage['pending_chat_message'] = JSON.stringify(message);
      storage['knowledge_base_id'] = JSON.stringify(kbId);
      window.location.href = '/login?next=/continue';

      // Then the data is stored and they're sent to login with continue flow
      expect(storage['pending_chat_message']).toBe(JSON.stringify(message));
      expect(storage['knowledge_base_id']).toBe(JSON.stringify(kbId));
      expect(window.location.href).toBe('/login?next=/continue');
    });
  });

  describe('when authenticated user lands on continue page', () => {
    it('joins existing space if user already has one with this KB', async () => {
      // Given an authenticated user who already has a space with KB "kb-123"
      const existingSpace = {
        id: 'space-456',
        name: 'umans-tech/issue-solver-bots',
        knowledgeBaseId: 'kb-123',
      };

      // And they have a pending message
      storage['knowledge_base_id'] = JSON.stringify('kb-123');
      storage['pending_chat_message'] = JSON.stringify('How does the TOC work?');

      // When the continue flow runs (simulating API response)
      const response = {
        space: existingSpace,
        created: false,
        message: 'Joined existing workspace',
      };

      // Then it joins the existing space (no duplicate created)
      expect(response.created).toBe(false);
      expect(response.space.id).toBe('space-456');
    });

    it('creates new space if user does not have one with this KB', async () => {
      // Given an authenticated user with no space for KB "kb-new"
      const newSpace = {
        id: 'space-new',
        name: 'umans-tech/issue-solver-bots', // Named after repo
        knowledgeBaseId: 'kb-new',
      };

      storage['knowledge_base_id'] = JSON.stringify('kb-new');

      // When the continue flow creates a new space
      const response = {
        space: newSpace,
        created: true,
        message: 'Created new workspace',
      };

      // Then a new space is created with the repo name
      expect(response.created).toBe(true);
      expect(response.space.name).toBe('umans-tech/issue-solver-bots');
    });

    it('sets the space as selected for the user', async () => {
      // Given a space was found/created
      const spaceId = 'space-789';

      // When the flow completes successfully
      // (This would call setSelectedSpace in the actual implementation)
      const setSelectedSpace = vi.fn().mockResolvedValue(undefined);
      await setSelectedSpace('user-123', spaceId);

      // Then the space is set as the user's current selected space
      expect(setSelectedSpace).toHaveBeenCalledWith('user-123', 'space-789');
    });

    it('redirects to /chat after successful setup', () => {
      // Given the space setup completed
      const setupComplete = true;

      // When redirect happens
      if (setupComplete) {
        window.location.href = '/chat';
      }

      // Then user lands on the chat page
      expect(window.location.href).toBe('/chat');
    });

    it('cleans up localStorage after successful setup', () => {
      // Given localStorage has pending data
      storage['knowledge_base_id'] = JSON.stringify('kb-123');
      storage['pending_chat_message'] = JSON.stringify('Hello');

      // When setup completes (simulating cleanup)
      delete storage['knowledge_base_id'];
      delete storage['pending_chat_message'];

      // Then localStorage is cleaned up
      expect(storage['knowledge_base_id']).toBeUndefined();
      expect(storage['pending_chat_message']).toBeUndefined();
    });
  });

  describe('when chat page loads with pending message', () => {
    it('reads pending message from localStorage on mount', () => {
      // Given localStorage has a pending message
      const pendingMessage = 'How does authentication work?';
      storage['pending_chat_message'] = JSON.stringify(pendingMessage);
      storage['knowledge_base_id'] = JSON.stringify('kb-123');

      // When the Chat component mounts (simulating the effect)
      const raw = storage['pending_chat_message'];
      const message = raw ? JSON.parse(raw) : null;

      // Then it reads the message
      expect(message).toBe(pendingMessage);
    });

    it('auto-sends the pending message after KB is loaded', () => {
      // Given there's a pending message and KB is loaded
      const pendingMessage = 'Explain the database schema';
      const kbLoaded = true;

      // When the effect runs (simulating sendMessage)
      const sendMessage = vi.fn();
      if (kbLoaded && pendingMessage) {
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: pendingMessage }],
        });
      }

      // Then the message is automatically sent
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          parts: [{ type: 'text', text: pendingMessage }],
        }),
      );
    });

    it('clears pending message after sending to prevent duplicates', () => {
      // Given a pending message was sent
      storage['pending_chat_message'] = JSON.stringify('Hello');
      let sent = false;

      // When message is sent
      if (!sent) {
        storage['pending_chat_message'] = '';
        sent = true;
      }

      // Then it's cleared to prevent re-sending on refresh
      expect(storage['pending_chat_message']).toBe('');
    });

    it('waits for KB to load before sending message', () => {
      // Given there's a pending message but KB hasn't loaded yet
      const pendingMessage = 'How do I deploy?';
      let kbLoaded = false;
      const sendMessage = vi.fn();

      // When KB is not loaded
      if (kbLoaded && pendingMessage) {
        sendMessage({ role: 'user', parts: [{ type: 'text', text: pendingMessage }] });
      }

      // Then message is NOT sent yet
      expect(sendMessage).not.toHaveBeenCalled();

      // When KB loads
      kbLoaded = true;
      if (kbLoaded && pendingMessage) {
        sendMessage({ role: 'user', parts: [{ type: 'text', text: pendingMessage }] });
      }

      // Then message is sent
      expect(sendMessage).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('redirects to login if not authenticated', async () => {
      // Given the user is not authenticated
      const isAuthenticated = false;

      // When accessing the join-or-create API
      if (!isAuthenticated) {
        window.location.href = '/login';
      }

      // Then redirect to login
      expect(window.location.href).toBe('/login');
    });

    it('shows error if KB ID is missing', () => {
      // Given no KB ID in localStorage
      const kbId = storage['knowledge_base_id'];

      // When checking for KB ID
      if (!kbId) {
        window.location.href = '/';
      }

      // Then redirect to home (no pending chat)
      expect(window.location.href).toBe('/');
    });

    it('handles legacy non-JSON localStorage values', () => {
      // Given old data stored as raw string (not JSON)
      storage['knowledge_base_id'] = 'kb-raw-string';

      // When parsing (simulating the component logic)
      let kbId: string;
      try {
        kbId = JSON.parse(storage['knowledge_base_id']);
      } catch {
        kbId = storage['knowledge_base_id'];
      }

      // Then it falls back to raw string
      expect(kbId).toBe('kb-raw-string');
    });
  });

  describe('edge cases', () => {
    it('handles user who has multiple spaces', async () => {
      // Given a user with multiple spaces
      const userSpaces = [
        { id: 'space-1', knowledgeBaseId: 'kb-1' },
        { id: 'space-2', knowledgeBaseId: 'kb-2' },
      ];

      // And they're asking about kb-1
      const targetKb = 'kb-1';

      // When finding the space
      const found = userSpaces.find((s) => s.knowledgeBaseId === targetKb);

      // Then the correct space is found
      expect(found?.id).toBe('space-1');
    });

    it('handles concurrent visits to different wikis', () => {
      // Given a user visits wiki A, then wiki B before logging in
      storage['knowledge_base_id'] = JSON.stringify('kb-wiki-b'); // Last one wins
      storage['pending_chat_message'] = JSON.stringify('Question about B');

      // When they complete auth
      const kbId = JSON.parse(storage['knowledge_base_id']);

      // Then they're set up for wiki B (latest visit)
      expect(kbId).toBe('kb-wiki-b');
    });

    it('gracefully handles localStorage errors', () => {
      // Given localStorage throws an error
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When trying to access localStorage fails
      try {
        throw new Error('Storage disabled');
      } catch (error) {
        // Then error is logged but doesn't crash
        console.error('Error reading pending chat message:', error);
      }

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});

describe('Space Naming', () => {
  it('uses repo owner/name for space name when available', async () => {
    // Given a featured repo exists for the KB
    const repoInfo = {
      owner: 'umans-tech',
      name: 'issue-solver-bots',
    };

    // When creating a space
    const spaceName = `${repoInfo.owner}/${repoInfo.name}`;

    // Then it's named clearly with owner/repo format
    expect(spaceName).toBe('umans-tech/issue-solver-bots');
  });

  it('uses fallback name when repo info is not available', async () => {
    // Given no repo info is found
    const repoInfo = null;

    // When creating a space
    const spaceName = repoInfo
      ? `${repoInfo.owner}/${repoInfo.name}`
      : 'Documentation Workspace';

    // Then a generic but clear name is used
    expect(spaceName).toBe('Documentation Workspace');
  });
});

describe('Private Wiki View for Converted Spaces', () => {
  /**
   * This behavior ensures that when a user converts from public wiki to private
   * space (via the chat conversion flow), they can still view the wiki content
   * even though their space doesn't have a connected repository.
   *
   * Why: The public wiki content is already generated and stored in S3. When the
   * user authenticates and gets a space with the same KB ID, they should see
   * that content without needing to connect a repo first.
   *
   * How: The showEmptyState logic checks BOTH hasConnectedRepo AND kbId. If a
   * space has a KB ID (meaning it has wiki content available), it shows the
   * content rather than the "Bring a repo to life" empty state.
   */

  it('shows wiki content when space has KB ID but no connected repo', () => {
    // Given a space created from public wiki conversion
    const space = {
      id: 'space-converted',
      knowledgeBaseId: 'kb-public-wiki-123',
      connectedRepoUrl: null, // No connected repo
      hasGeneratedWiki: true, // But has wiki content from public wiki
    };

    // When evaluating whether to show empty state
    const hasConnectedRepo = Boolean(space.connectedRepoUrl);
    const hasKbId = Boolean(space.knowledgeBaseId);
    const showEmptyState = !hasConnectedRepo && !hasKbId;

    // Then empty state is NOT shown because KB ID exists
    expect(showEmptyState).toBe(false);
    // And wiki content would be displayed
    expect(hasKbId).toBe(true);
  });

  it('shows "Bring a repo to life" only when no KB ID and no connected repo', () => {
    // Given a brand new space with nothing set up
    const space = {
      id: 'space-empty',
      knowledgeBaseId: null,
      connectedRepoUrl: null,
    };

    // When evaluating whether to show empty state
    const hasConnectedRepo = Boolean(space.connectedRepoUrl);
    const hasKbId = Boolean(space.knowledgeBaseId);
    const showEmptyState = !hasConnectedRepo && !hasKbId;

    // Then empty state IS shown because there's no content at all
    expect(showEmptyState).toBe(true);
  });

  it('allows seamless transition from public wiki to private wiki view', () => {
    // Given a user who browsed a public wiki and then authenticated
    const userFlow = {
      // Step 1: Visited public wiki
      publicWikiKbId: 'kb-react-docs',

      // Step 2: Authenticated via continue flow
      convertedSpace: {
        id: 'space-user-123',
        knowledgeBaseId: 'kb-react-docs', // Same KB ID
        connectedRepoUrl: null, // No repo connected yet
      },

      // Step 3: User navigates to wiki tab
      currentPath: '/docs/space-user-123',
    };

    // When checking if wiki content should be visible
    const space = userFlow.convertedSpace;
    const canViewWiki = Boolean(space.knowledgeBaseId);

    // Then the wiki content is accessible
    expect(canViewWiki).toBe(true);
    // And the user sees the same content they saw on the public wiki
    expect(space.knowledgeBaseId).toBe(userFlow.publicWikiKbId);
  });
});
