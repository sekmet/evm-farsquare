/**
 * Happy DOM Preload Script for Bun Test
 *
 * This script registers happy-dom globals before running tests,
 * making browser APIs like document available in the test environment.
 * This is required for React component testing with Bun.
 */

// Import and register happy-dom
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Register happy-dom globals
GlobalRegistrator.register();

// Export for potential cleanup if needed
export { GlobalRegistrator };
