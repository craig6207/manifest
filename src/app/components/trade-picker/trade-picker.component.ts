import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonCheckbox,
  IonLabel,
  IonFooter,
  ModalController,
} from '@ionic/angular/standalone';

type PickerItem = { id: number; name: string };

@Component({
  selector: 'app-trade-picker',
  templateUrl: './trade-picker.component.html',
  styleUrls: ['./trade-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModalController],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonCheckbox,
    IonLabel,
    IonFooter,
  ],
})
export class TradePickerComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);

  @Input() title = 'Select items';
  @Input() items: PickerItem[] = [];
  @Input() multi = false;
  @Input() preselectedIds: number[] | null = null;

  private selectedSet = signal<Set<number>>(new Set<number>());
  readonly count = computed(() => this.selectedSet().size);
  readonly valid = computed(() =>
    this.multi ? this.count() > 0 : this.count() === 1
  );

  ngOnInit(): void {
    this.selectedSet.set(new Set(this.preselectedIds ?? []));
  }

  isChecked(id: number) {
    return this.selectedSet().has(id);
  }

  toggle(id: number): void {
    const next = new Set(this.selectedSet());
    if (this.multi) {
      next.has(id) ? next.delete(id) : next.add(id);
    } else {
      if (next.has(id)) next.clear();
      else {
        next.clear();
        next.add(id);
      }
    }
    this.selectedSet.set(next);
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
  confirm() {
    this.modalCtrl.dismiss({ ids: Array.from(this.selectedSet()) }, 'confirm');
  }
}
