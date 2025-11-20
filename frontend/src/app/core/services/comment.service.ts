import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getComments(workflowId: string, type: string, token?: string): Observable<Comment[]> {
    const url = token
      ? `${this.apiUrl}/workflow/${workflowId}/comments/${type}/all/${token}`
      : `${this.apiUrl}/workflow/${workflowId}/comments/${type}/all`;
    return this.http.get<Comment[]>(url);
  }

  postComment(comment: Partial<Comment>): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/comment/post`, comment);
  }
}
