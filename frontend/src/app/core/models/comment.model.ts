export interface Comment {
  _id: string;
  text: string;
  access: 'public' | 'private';
  workflow: string;
  owner: string | { _id: string; name: string };
  createdAt?: string;
}
