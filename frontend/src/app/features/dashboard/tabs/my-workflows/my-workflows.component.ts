import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { UserService } from '../../../../core/services/user.service';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { CreatedWorkflow } from '../../../../core/models/workflow.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-my-workflows',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './my-workflows.component.html',
  styleUrl: './my-workflows.component.scss',
})
export class MyWorkflowsComponent implements OnInit {
  private userService = inject(UserService);
  private workflowService = inject(WorkflowService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  workflows = signal<CreatedWorkflow[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'up_votes', 'down_votes', 'followers', 'actions'];

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.loading.set(true);
    this.userService.getCreatedWorkflows().subscribe({
      next: (data) => {
        this.workflows.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load workflows', 'Close', { duration: 4000 });
      },
    });
  }

  editWorkflow(id: string): void {
    this.router.navigate(['/workflow', id, 'edit']);
  }

  viewWorkflow(id: string): void {
    this.router.navigate(['/workflow', id]);
  }

  deleteWorkflow(wf: CreatedWorkflow): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Workflow', message: `Are you sure you want to delete "${wf.name}"?` },
      width: '380px',
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.workflowService.delete(wf._id).subscribe({
        next: () => {
          this.workflows.update(list => list.filter(w => w._id !== wf._id));
          this.snackBar.open('Workflow deleted', 'Close', { duration: 3000 });
        },
        error: () => this.snackBar.open('Could not delete workflow', 'Close', { duration: 4000 }),
      });
    });
  }
}
