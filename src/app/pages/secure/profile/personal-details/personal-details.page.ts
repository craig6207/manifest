import { Component, effect, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonFooter,
  IonToolbar,
  IonButton,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonHeader,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { COUNTRY_DIALS } from 'src/app/interfaces/country-code';

type FieldKey = 'firstName' | 'lastName' | 'countryIso2' | 'phoneLocal' | 'sex';

const PHONE_LOCAL_PATTERN = /^\d{6,15}$/;

@Component({
  selector: 'app-personal-details',
  templateUrl: './personal-details.page.html',
  styleUrl: './personal-details.page.scss',
  imports: [
    IonHeader,
    IonContent,
    IonFooter,
    IonToolbar,
    IonButton,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
    IonGrid,
    IonRow,
    IonCol,
    ReactiveFormsModule,
    ToolbarBackComponent,
  ],
})
export class PersonalDetailsPage {
  private readonly store = inject(ProfileStore);
  private readonly fb = inject(FormBuilder);
  private readonly navCtrl = inject(NavController);

  personalDetails = this.store.profile;
  loading = this.store.loading;

  form: FormGroup;

  sexOptions = ['Male', 'Female', 'Other'];
  readonly countries = COUNTRY_DIALS;
  selectedDialText = '';

  constructor() {
    this.form = this.fb.group({
      firstName: ['', this.validatorsFor('firstName')],
      lastName: ['', this.validatorsFor('lastName')],
      countryIso2: ['', this.validatorsFor('countryIso2')],
      phoneLocal: ['', this.validatorsFor('phoneLocal')],
      sex: ['', this.validatorsFor('sex')],
    });

    const defaultCountry =
      this.countries.find((c) => c.iso2 === 'GB') ?? this.countries[0];

    if (defaultCountry) {
      this.form.patchValue(
        { countryIso2: defaultCountry.iso2 },
        { emitEvent: false }
      );
      this.updateSelectedDialText(defaultCountry.iso2);
    }

    effect(() => {
      const v = this.personalDetails();

      if (!v) {
        this.form.reset();

        if (defaultCountry) {
          this.form.patchValue(
            { countryIso2: defaultCountry.iso2 },
            { emitEvent: false }
          );
          this.updateSelectedDialText(defaultCountry.iso2);
        }

        this.form.markAsPristine();
        return;
      }

      const parsed = this.parsePhoneFromE164(v.phoneNumber);
      const iso2 = parsed?.countryIso2 ?? defaultCountry?.iso2 ?? '';
      const phoneLocal = parsed?.phoneLocal ?? '';

      this.form.patchValue(
        {
          firstName: v.firstName ?? '',
          lastName: v.lastName ?? '',
          countryIso2: iso2,
          phoneLocal,
          sex: v.sex ?? '',
        },
        { emitEvent: false }
      );

      this.updateSelectedDialText(iso2);
      this.form.markAsPristine();
    });
  }

  ionViewWillEnter(): void {
    this.store.loadProfile();
  }

  onCountryChange(iso2: string): void {
    this.updateSelectedDialText(iso2);
  }

  disableSave(): boolean {
    return this.loading() || this.form.invalid || !this.form.dirty;
  }

  onSave(): void {
    if (this.disableSave()) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
      }
      return;
    }

    const current = this.personalDetails();
    if (!current) return;

    const raw = this.form.getRawValue() as {
      firstName: string;
      lastName: string;
      countryIso2: string;
      phoneLocal: string;
      sex: string;
    };

    const phoneNumber = this.buildE164(raw.countryIso2, raw.phoneLocal);

    if (!/^\+\d{8,15}$/.test(phoneNumber)) {
      this.form.get('phoneLocal')?.setErrors({ invalidPhone: true });
      this.form.markAllAsTouched();
      return;
    }

    const patch: Partial<CandidateProfile> = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      sex: raw.sex,
      phoneNumber,
    };

    const payload = { ...current, ...patch } as CandidateProfile;
    this.store.updateProfile(payload);
    this.form.markAsPristine();
    this.navCtrl.back();
  }

  private updateSelectedDialText(iso2: string): void {
    const hit = this.countries.find((c) => c.iso2 === iso2);
    this.selectedDialText = hit ? `${hit.flag}\u00A0${hit.dialCode}` : '';
  }

  private buildE164(iso2: string, local: string): string {
    const dial = this.countries.find((c) => c.iso2 === iso2)?.dialCode ?? '+44';
    const nsn = String(local).replace(/\D+/g, '').replace(/^0+/, '');
    return `${dial}${nsn}`;
  }

  private parsePhoneFromE164(
    phoneNumber?: string | null
  ): { countryIso2: string; phoneLocal: string } | null {
    if (!phoneNumber) return null;

    const cleaned = String(phoneNumber).replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) return null;

    let bestMatch: (typeof COUNTRY_DIALS)[number] | undefined;
    for (const c of this.countries) {
      if (cleaned.startsWith(c.dialCode)) {
        if (!bestMatch || c.dialCode.length > bestMatch.dialCode.length) {
          bestMatch = c;
        }
      }
    }

    if (!bestMatch) return null;

    const nsn = cleaned.slice(bestMatch.dialCode.length).replace(/\D+/g, '');
    return {
      countryIso2: bestMatch.iso2,
      phoneLocal: nsn,
    };
  }

  private validatorsFor(key: FieldKey) {
    const req = [Validators.required];

    switch (key) {
      case 'firstName':
      case 'lastName':
        return [...req, Validators.maxLength(50)];

      case 'countryIso2':
        return req;

      case 'phoneLocal':
        return [...req, Validators.pattern(PHONE_LOCAL_PATTERN)];

      case 'sex':
        return req;

      default:
        return [];
    }
  }
}
