import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SearchService } from '../../../core/services/search.service';
import { Workflow } from '../../../core/models/workflow.model';
import { WorkflowCardComponent } from '../../../shared/components/workflow-card/workflow-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    WorkflowCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent implements OnInit {
  query = signal('');
  sortBy = signal('relevant');
  results = signal<Workflow[]>([]);
  loading = signal(false);
  searched = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') || '';
      const sort = params.get('sort') || 'relevant';
      this.query.set(q);
      this.sortBy.set(sort);
      if (q) {
        this.performSearch();
      }
    });
  }

  onSearch(): void {
    const q = this.query().trim();
    if (!q) return;
    this.router.navigate(['/search'], {
      queryParams: { q, sort: this.sortBy() },
    });
  }

  onSortChange(sort: string): void {
    this.sortBy.set(sort);
    if (this.query().trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.query(), sort },
      });
    }
  }

  private performSearch(): void {
    this.loading.set(true);
    this.searched.set(true);

    this.searchService.search(this.query(), this.sortBy()).subscribe({
      next: (workflows) => {
        this.results.set(workflows);
        this.loading.set(false);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }
}
