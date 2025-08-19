import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';

@Component({
  selector: 'app-rating-bar',
  templateUrl: './rating-bar.component.html',
  styleUrl: './rating-bar.component.scss',
  imports: [IonIcon],
})
export class RatingBarComponent {
  value = input<number>(0);
  max = input<number>(5);
  showText = input<boolean>(false);
  size = input<'sm' | 'md' | 'lg'>('md');

  stars = computed(() =>
    Array.from({ length: Math.max(0, this.max()) }, (_, i) => i)
  );
  fillPercent = computed(() => {
    const max = Math.max(1, this.max());
    const v = Math.min(Math.max(this.value(), 0), max);
    return (v / max) * 100;
  });
  ariaLabel = computed(
    () => `${this.value().toFixed(1)} out of ${this.max()} stars`
  );
  sizePx = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 16;
      case 'lg':
        return 24;
      default:
        return 20;
    }
  });

  constructor() {
    addIcons({ star, starOutline });
  }
}
