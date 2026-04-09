import { AiMiddleware } from '@microfox/ai-router';
import { UIMessage } from 'ai';

/**
 * Middleware to only keep the text parts of the messages and limit the total combined length
 * of all assistant message text parts to the specified maximum
 * @param maxTotalTextLength - The maximum total length of all assistant message text parts combined
 * @returns
 */
export const onlyTextParts = (maxTotalTextLength: number) => {
  const middleware: AiMiddleware = async (props, next) => {
    const messages = props.request.messages;

    // Build a text-only context for the model.
    // Gemini can reject historical function-call turns if ordering is not exact.
    // We keep rich/tool parts in UI persistence, but remove them from model context.
    const assistantTextParts: string[] = [];
    let totalAssistantTextLength = 0;

    messages.forEach((message) => {
      if (message.role === 'assistant') {
        message.parts
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .forEach((part) => {
            assistantTextParts.push(part.text);
            totalAssistantTextLength += part.text.length;
          });
      }
    });

    // Calculate how much to truncate if we exceed the limit
    const truncationNeeded = totalAssistantTextLength > maxTotalTextLength;
    const truncationRatio = truncationNeeded
      ? maxTotalTextLength / totalAssistantTextLength
      : 1;

    const onlyTextMessages: UIMessage<any, any, any>[] = messages.map(
      (message) => {
        // Keep text parts only for all roles in model context.
        const textParts = message.parts.filter(
          (part): part is { type: 'text'; text: string } => part.type === 'text',
        );
        return {
          ...message,
          parts: textParts.map((part) => {
            if (message.role !== 'assistant') return part;
            return {
              type: 'text',
              text: truncationNeeded
                ? part.text.slice(
                    0,
                    Math.floor(part.text.length * truncationRatio),
                  )
                : part.text,
            };
          }),
        };
      },
    );

    props.state.onlyTextMessages = onlyTextMessages;
    return next();
  };
  return middleware;
};
