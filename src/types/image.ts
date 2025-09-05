export type ProcessImageSuccess = {
  imageBase64: string;
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg';
  safety?: { blocked: boolean; reasons?: string[] } | unknown;
};

export type ProcessImageError = {
  error: string;
  details?: unknown;
};

export type ProcessImageResponse = ProcessImageSuccess | ProcessImageError;

