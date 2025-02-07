export interface Comment {
  _id: string;
  description: string;
  workflow: string;
  comment_type: 'public' | 'private';
  commenter: { _id: string; name: string };
  createdAt?: string;
}
