import { Component, input, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { WorkflowService } from '../../../core/services/workflow.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-vote-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="vote-buttons">
      <button mat-icon-button (click)="onVote('up_vote')" [class.voted]="userVote() === 'up'">
        <mat-icon>thumb_up</mat-icon>
      </button>
      <span class="vote-count">{{ currentUpVotes() }}</span>
      <button mat-icon-button (click)="onVote('down_vote')" [class.voted-down]="userVote() === 'down'">
        <mat-icon>thumb_down</mat-icon>
      </button>
      <span class="vote-count">{{ currentDownVotes() }}</span>
    </div>
  `,
  styles: [`
    .vote-buttons {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .vote-count {
      font-size: 0.9rem;
      font-weight: 500;
      min-width: 20px;
    }
    .voted { color: var(--mat-sys-primary); }
    .voted-down { color: var(--mat-sys-error); }
  `],
})
export class VoteButtonsComponent {
  workflowId = input.required<string>();
  upVotes = input<number>(0);
  downVotes = input<number>(0);

  private workflowService = inject(WorkflowService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  currentUpVotes = signal(0);
  currentDownVotes = signal(0);
  userVote = signal<'up' | 'down' | null>(null);

  ngOnChanges(): void {
    this.currentUpVotes.set(this.upVotes());
    this.currentDownVotes.set(this.downVotes());
  }

  onVote(voteType: string): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.workflowService.vote(this.workflowId(), voteType).subscribe({
      next: () => {
        if (voteType === 'up_vote') {
          if (this.userVote() === 'down') {
            this.currentDownVotes.update(v => Math.max(0, v - 1));
          }
          this.currentUpVotes.update(v => v + 1);
          this.userVote.set('up');
        } else {
          if (this.userVote() === 'up') {
            this.currentUpVotes.update(v => Math.max(0, v - 1));
          }
          this.currentDownVotes.update(v => v + 1);
          this.userVote.set('down');
        }
      },
      error: (err) => {
        const msg = err.error?.error || 'Vote could not be recorded';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      },
    });
  }
}
