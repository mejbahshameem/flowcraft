export interface Comment {
  _id: string;
  comment: string;
  workflow: string;
  comment_type: 'PUBLIC' | 'PRIVATE';
  commenter: { _id: string; name: string; avatar?: string };
  createdAt?: string;
  updatedAt?: string;
}
