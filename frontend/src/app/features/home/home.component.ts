import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { WorkflowService } from '../../core/services/workflow.service';
import { Workflow } from '../../core/models/workflow.model';
import { WorkflowCardComponent } from '../../shared/components/workflow-card/workflow-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    WorkflowCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  popularWorkflows = signal<Workflow[]>([]);
  loading = signal(true);
  error = signal(false);

  constructor(private workflowService: WorkflowService) {}

  ngOnInit(): void {
    this.workflowService.getPopular().subscribe({
      next: (workflows: Workflow[]) => {
        this.popularWorkflows.set(workflows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
