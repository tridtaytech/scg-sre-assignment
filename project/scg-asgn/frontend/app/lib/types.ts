export type Item = {
  id: string;
  name: string;
  createdAt: string;
};

export type BackendStamp = {
  appVersion: string | null;
  podName: string | null;
  rolloutColor: string | null;
};

export type FrontendStamp = {
  version: string;
  pod: string;
  color: string;
};
