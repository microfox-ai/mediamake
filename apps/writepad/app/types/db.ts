export interface ApiKeyInfo {
  id: string;
  apiKey: string;
  clientId: string;
  clientName: string;
  isValid: boolean;
}

export interface AppSession {
  id: string;
  clientId: string;
  expires: number;
}
