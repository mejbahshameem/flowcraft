import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { UserService } from '../../../../core/services/user.service';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { VotingHistoryItem } from '../../../../core/models/workflow.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

type VoteFilter = 'ALL' | 'UP_VOTE' | 'DOWN_VOTE';

@Component({
  selector: 'app-voting-history',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatButtonToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './voting-history.component.html',
  styleUrl: './voting-history.component.scss',
})
export class VotingHistoryComponent implements OnInit {
  private userService = inject(UserService);
  private workflowService = inject(WorkflowService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  history = signal<VotingHistoryItem[]>([]);
  loading = signal(true);
  filter = signal<VoteFilter>('ALL');
  pending = signal<string | null>(null);

  filtered = computed(() => {
    const f = this.filter();
    if (f === 'ALL') return this.history();
    return this.history().filter(h => h.vote === f);
  });

  upCount = computed(() => this.history().filter(h => h.vote === 'UP_VOTE').length);
  downCount = computed(() => this.history().filter(h => h.vote === 'DOWN_VOTE').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.userService.getVotingHistory().subscribe({
      next: (data) => {
        this.history.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load voting history', 'Close', { duration: 4000 });
      },
    });
  }

  viewWorkflow(id: string): void {
    this.router.navigate(['/workflow', id]);
  }

  switchVote(item: VotingHistoryItem): void {
    const target = item.vote === 'UP_VOTE' ? 'DOWN_VOTE' : 'UP_VOTE';
    this.pending.set(item._id);
    this.workflowService.vote(item._id, target).subscribe({
      next: () => {
        this.history.update(list =>
          list.map(h => (h._id === item._id ? { ...h, vote: target } : h))
        );
        this.pending.set(null);
        this.snackBar.open('Vote changed', 'Close', { duration: 2500 });
      },
      error: () => {
        this.pending.set(null);
        this.snackBar.open('Could not change vote', 'Close', { duration: 3000 });
      },
    });
  }

  clearVote(item: VotingHistoryItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove vote',
        message: `Remove your vote on "${item.name}"?`,
        confirmLabel: 'Remove',
      },
      width: '380px',
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.pending.set(item._id);
      this.workflowService.clearVote(item._id).subscribe({
        next: () => {
          this.history.update(list => list.filter(h => h._id !== item._id));
          this.pending.set(null);
          this.snackBar.open('Vote removed', 'Close', { duration: 2500 });
        },
        error: () => {
          this.pending.set(null);
          this.snackBar.open('Could not remove vote', 'Close', { duration: 3000 });
        },
      });
    });
  }
}
