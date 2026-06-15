/**
 * Stub type declarations for optional native modules that may not be installed.
 * These modules are loaded via dynamic import with try-catch fallbacks in the app.
 */

declare module "expo-document-picker" {
  export interface DocumentPickerResult {
    canceled: boolean;
    assets?: Array<{
      uri: string;
      name?: string;
      mimeType?: string;
      size?: number;
    }>;
  }

  export function getDocumentAsync(options?: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }): Promise<DocumentPickerResult>;
}
