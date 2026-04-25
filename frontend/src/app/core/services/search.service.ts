import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Workflow } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(query: string, sortBy?: string): Observable<Workflow[]> {
    let params = new HttpParams().set('interest', query);
    if (sortBy === 'popular') {
      params = params.set('sortBy', 'up_vote');
    }
    return this.http.get<any[]>(`${this.apiUrl}/search`, { params }).pipe(
      map(results => results.map(r => ({
        _id: r._id,
        name: r.name,
        description: r.description,
        location: r.location,
        access: r.access,
        owner: r.owner,
        upvotes: typeof r.upvotes === 'number' ? r.upvotes : r.voting?.up_vote?.length || 0,
        downvotes: typeof r.downvotes === 'number' ? r.downvotes : r.voting?.down_vote?.length || 0,
        isDeleted: typeof r.isDeleted === 'boolean' ? r.isDeleted : r.deleted || false,
        tasks: Array.isArray(r.tasks) ? r.tasks.length : (typeof r.tasks === 'number' ? r.tasks : 0),
      })))
    );
  }
}
