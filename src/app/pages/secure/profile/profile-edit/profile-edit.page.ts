import { Component, effect, input, output, computed } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';

type FieldKey = Exclude<keyof CandidateProfile, 'userId'>;

const PERSONAL_KEYS: FieldKey[] = [
  'firstName',
  'lastName',
  'phoneNumber',
  'sex',
  'bankAccountNumber',
  'bankSortCode',
  'niNumber',
];

const PREF_KEYS: FieldKey[] = [
  'location',
  'locationRadius',
  'expectedPay',
  'tradeCategory',
  'tradeSubcategory',
];

const UK_SORTCODE = /^(\d{2}-\d{2}-\d{2}|\d{6})$/;
const UK_NI = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i;

type SelectOptions = {
  sex?: string[];
  tradeCategory?: string[];
  tradeSubcategory?: string[];
};

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.page.html',
  imports: [
    IonNote,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonRange,
  ],
})
export class ProfileEditPage {
  isPersonalDetails = input(true);
  value = input<Partial<CandidateProfile> | null>(null);
  selectOptions = input<SelectOptions>({});
  title = input<string>('Edit profile');
  saveText = input<string>('Save');

  save = output<Partial<CandidateProfile>>();
  cancel = output<void>();

  private fb = new FormBuilder();
  form: FormGroup = this.fb.group({});

  private keys = computed<FieldKey[]>(() =>
    this.isPersonalDetails() ? PERSONAL_KEYS : PREF_KEYS
  );

  constructor() {
    addIcons({ closeOutline, saveOutline });
    effect(() => {
      const keys = this.keys();
      const v = this.value();

      const group = this.fb.group({});
      for (const k of keys) {
        group.addControl(
          k,
          this.fb.control(v?.[k] ?? null, this.validatorsFor(k))
        );
      }
      this.form = group;
    });

    effect(() => {
      const v = this.value();
      if (v) this.form.patchValue(v, { emitEvent: false });
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as Partial<CandidateProfile>;
    const patch: Partial<CandidateProfile> = {};
    for (const k of this.keys()) {
      patch[k] = raw[k] as never;
    }
    this.save.emit(patch);
  }

  private validatorsFor(key: FieldKey) {
    const req = [Validators.required];
    switch (key) {
      case 'firstName':
      case 'lastName':
        return [...req, Validators.maxLength(50)];
      case 'phoneNumber':
        return [...req, Validators.maxLength(20)];
      case 'location':
        return [...req, Validators.maxLength(100)];
      case 'bankAccountNumber':
        return [...req, Validators.minLength(6), Validators.maxLength(10)];
      case 'bankSortCode':
        return [...req, Validators.pattern(UK_SORTCODE)];
      case 'niNumber':
        return [...req, Validators.pattern(UK_NI)];
      case 'locationRadius':
      case 'expectedPay':
      case 'sex':
      case 'tradeCategory':
      case 'tradeSubcategory':
        return req;
      default:
        return [];
    }
  }
}
