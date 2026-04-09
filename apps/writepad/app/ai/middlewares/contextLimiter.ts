import { AiMiddleware } from '@microfox/ai-router';

/**
 * Middleware to limit the number of messages in the context
 * @param count - From the last message, number of messages to keep
 * @returns
 */
export const contextLimiter = (count: number) => {
  const middleware: AiMiddleware<any, any, any, any, any> = async (
    props,
    next,
  ) => {
    const { messages } = props.request;
    if (messages.length < count) {
      return next();
    } else {
      // Keep only the latest messages, but avoid starting the trimmed window
      // on an assistant turn. Some providers require tool/function turns to be
      // preceded by a valid user/context turn.
      const sliced = [...messages.slice(-count)];
      while (sliced.length > 1 && sliced[0]?.role === 'assistant') {
        sliced.shift();
      }
      props.request.messages = sliced;
      return next();
    }
  };
  return middleware;
};
