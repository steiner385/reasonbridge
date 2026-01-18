import React, { useState, useMemo } from 'react';
import ResponseCard from './ResponseCard';
import type { Response } from '../../types/response';
import Button from '../ui/Button';

export interface ThreadedResponseDisplayProps {
  /**
   * Flat list of all responses for a topic
   */
  responses: Response[];

  /**
   * Callback when user wants to reply to a response
   */
  onReply?: (parentId: string) => void;

  /**
   * Currently highlighted response ID (e.g., from URL hash)
   */
  highlightedResponseId?: string;

  /**
   * Maximum nesting depth before flattening (prevents excessive indentation)
   */
  maxDepth?: number;

  /**
   * Whether to show actions (reply, etc.) on each response
   */
  showActions?: boolean;
}

interface ResponseNode extends Response {
  children: ResponseNode[];
  depth: number;
}

/**
 * Builds a tree structure from flat list of responses
 */
const buildResponseTree = (
  responses: Response[],
  parentId: string | null = null,
  depth: number = 0,
  maxDepth: number = 5,
): ResponseNode[] => {
  const children = responses.filter((r) => r.parentId === parentId);

  return children.map((response) => ({
    ...response,
    depth: Math.min(depth, maxDepth),
    children:
      depth < maxDepth ? buildResponseTree(responses, response.id, depth + 1, maxDepth) : [],
  }));
};

/**
 * Single response item with threading visual indicators
 */
interface ResponseItemProps {
  node: ResponseNode;
  onReply?: (parentId: string) => void;
  highlightedResponseId?: string;
  showActions?: boolean;
  isLastChild?: boolean;
}

const ResponseItem: React.FC<ResponseItemProps> = ({
  node,
  onReply,
  highlightedResponseId,
  showActions = true,
  isLastChild = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;

  // Calculate indentation based on depth
  const indentationClass = `ml-${Math.min(node.depth * 4, 16)}`;

  return (
    <div className={`relative ${node.depth > 0 ? indentationClass : ''}`}>
      {/* Threading line indicator */}
      {node.depth > 0 && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-px bg-gray-200 ${
            isLastChild ? 'h-8' : 'h-full'
          }`}
          style={{ left: '-1rem' }}
        />
      )}

      {/* Horizontal connector */}
      {node.depth > 0 && (
        <div className="absolute top-8 left-0 w-4 h-px bg-gray-200" style={{ left: '-1rem' }} />
      )}

      <div className="mb-4">
        <ResponseCard
          response={node}
          highlighted={highlightedResponseId === node.id}
          actions={
            showActions ? (
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCollapsed(!isCollapsed);
                    }}
                  >
                    {isCollapsed ? `Show ${node.children.length}` : 'Hide'}{' '}
                    {node.children.length === 1 ? 'reply' : 'replies'}
                  </Button>
                )}
                {onReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReply(node.id);
                    }}
                  >
                    Reply
                  </Button>
                )}
              </div>
            ) : undefined
          }
        />

        {/* Render children recursively */}
        {hasChildren && !isCollapsed && (
          <div className="mt-4 space-y-4">
            {node.children.map((child, index) => (
              <ResponseItem
                key={child.id}
                node={child}
                {...(onReply ? { onReply } : {})}
                {...(highlightedResponseId ? { highlightedResponseId } : {})}
                showActions={showActions}
                isLastChild={index === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ThreadedResponseDisplay component
 *
 * Displays responses in a threaded/nested format based on parent-child relationships.
 * Features:
 * - Automatic tree building from flat response list
 * - Visual threading indicators (lines connecting parent and children)
 * - Expand/collapse for response threads
 * - Reply functionality
 * - Depth limiting to prevent excessive nesting
 */
const ThreadedResponseDisplay: React.FC<ThreadedResponseDisplayProps> = ({
  responses,
  onReply,
  highlightedResponseId,
  maxDepth = 5,
  showActions = true,
}) => {
  // Build tree structure from flat list
  const responseTree = useMemo(
    () => buildResponseTree(responses, null, 0, maxDepth),
    [responses, maxDepth],
  );

  // Show empty state if no responses
  if (responses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No responses yet</p>
        <p className="text-gray-400 text-sm mt-2">Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {responseTree.map((node, index) => (
        <ResponseItem
          key={node.id}
          node={node}
          {...(onReply ? { onReply } : {})}
          {...(highlightedResponseId ? { highlightedResponseId } : {})}
          showActions={showActions}
          isLastChild={index === responseTree.length - 1}
        />
      ))}
    </div>
  );
};

export default ThreadedResponseDisplay;
