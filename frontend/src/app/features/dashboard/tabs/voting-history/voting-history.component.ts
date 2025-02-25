import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserService } from '../../../../core/services/user.service';
import { VotingHistoryItem } from '../../../../core/models/workflow.model';

@Component({
  selector: 'app-voting-history',
  standalone: true,
  imports: [
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './voting-history.component.html',
  styleUrl: './voting-history.component.scss',
})
export class VotingHistoryComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  history = signal<VotingHistoryItem[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'vote'];

  ngOnInit(): void {
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
}
