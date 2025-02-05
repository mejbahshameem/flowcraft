import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-activate-account',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './activate-account.component.html',
  styleUrl: './activate-account.component.scss',
})
export class ActivateAccountComponent implements OnInit {
  loading = signal(true);
  success = signal(false);
  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.errorMessage.set('Invalid activation link. No token provided.');
      return;
    }

    this.authService.activateAccount(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.error || 'Activation failed. The link may have expired.');
      },
    });
  }
}
