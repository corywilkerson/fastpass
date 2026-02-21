import ora from 'ora';
import pc from 'picocolors';

/**
 * Start an ora spinner with consistent styling.
 */
export function spin(text) {
  return ora({ text, indent: 2, color: 'cyan' }).start();
}

/**
 * Wrap an async operation with an auto-succeed/fail spinner.
 */
export async function withSpinner(text, fn, successText) {
  const s = spin(text);
  try {
    const result = await fn(s);
    s.succeed(successText || text);
    return result;
  } catch (err) {
    s.fail(text);
    throw err;
  }
}

/**
 * Print a bold section heading with a separator line.
 */
export function heading(text) {
  console.log(`\n  ${pc.bold(text)}`);
  console.log(pc.dim(`  ${'─'.repeat(40)}`));
}
