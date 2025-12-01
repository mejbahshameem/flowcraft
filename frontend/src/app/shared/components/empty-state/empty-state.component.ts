import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon">{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 24px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.4;
      margin-bottom: 16px;
    }
    h3 {
      margin: 0 0 8px;
      font-weight: 500;
    }
    p {
      margin: 0;
      max-width: 400px;
    }
  `,
})
export class EmptyStateComponent {
  icon = input('search_off');
  title = input('Nothing here');
  message = input('');
}
