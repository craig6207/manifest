import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonFooter,
  IonButtons,
  IonButton,
  IonSpinner,
  IonNote,
  IonInput,
  IonChip,
  IonIcon,
  ActionSheetController,
  Platform,
} from '@ionic/angular/standalone';

import { TradesService } from 'src/app/services/trades/trades.service';
import {
  TradeCertificateRef,
  CertDefinition,
} from 'src/app/interfaces/certificate';

import { addIcons } from 'ionicons';
import {
  documentOutline,
  closeCircleOutline,
  cloudUploadOutline,
  imagesOutline,
  cameraOutline,
  folderOpenOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  Camera,
  CameraPermissionType,
  CameraResultType,
  CameraSource,
  PermissionStatus,
} from '@capacitor/camera';

const OTHER_ID = -1;
const MAX_UPLOADS = 5;

type PreviewItem = {
  file: File;
  url: string;
  name: string;
  mime: string;
};

type UploadMap = Record<string, PreviewItem[]>;

@Component({
  selector: 'app-certificate-profile-setup',
  templateUrl: './certificate-profile-setup.component.html',
  styleUrls: ['./certificate-profile-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonFooter,
    IonButtons,
    IonButton,
    IonSpinner,
    IonNote,
    IonInput,
    IonChip,
    IonIcon,
  ],
})
export class CertificateProfileSetupComponent implements OnInit, OnChanges {
  @Input() tradeId!: number;
  @Input() tradeName: string = '';
  @Input() initialCertificates: CertDefinition[] = [];

  private readonly tradesService = inject(TradesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly platform = inject(Platform);

  // ----- State -----
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly warn = signal<string | null>(null);

  readonly certificates = signal<TradeCertificateRef[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly otherName = signal<string>('');

  // uploads grouped per-selection (keyed), single item per key
  readonly uploadMap = signal<UploadMap>({});

  // ----- Derived -----
  readonly hasData = computed(() => this.certificates().length > 0);
  readonly options = computed(() => [
    ...this.certificates(),
    { id: OTHER_ID, name: 'Other (not listed)' } as TradeCertificateRef,
  ]);

  private selectionKey(): string | null {
    const id = this.selectedId();
    if (id == null) return null;
    if (id === OTHER_ID) {
      const name = this.otherName().trim();
      if (!name) return null; // “Other” requires name to be valid
      return `other:${name.toLowerCase()}`;
    }
    return String(id);
  }

  private keyLabel(key: string): string {
    if (key.startsWith('other:')) {
      const nm = key.slice('other:'.length);
      // Re-capitalize nicely for display
      return nm || 'Other';
    }
    const id = Number(key);
    const match = this.certificates().find((c) => Number(c.id) === id);
    return match?.name ?? `Certificate #${id}`;
  }

  readonly totalUploads = computed(() =>
    Object.values(this.uploadMap()).reduce((n, arr) => n + arr.length, 0)
  );

  readonly hasReachedMax = computed(() => this.totalUploads() >= MAX_UPLOADS);

  // Does current selection already have an upload?
  readonly hasUploadForCurrent = computed(() => {
    const key = this.selectionKey();
    if (!key) return false;
    const arr = this.uploadMap()[key] ?? [];
    return arr.length > 0; // single upload per cert
  });

  readonly selectedLabel = computed(() => {
    const id = this.selectedId();
    if (id == null) return '';
    if (id === OTHER_ID) return this.otherName().trim() || 'Other (not listed)';
    const match = this.certificates().find((c) => Number(c.id) === Number(id));
    return match?.name ?? '';
  });

  // Flattened preview list across ALL certs (so thumbnails persist)
  readonly allUploads = computed(() => {
    const result: Array<{ key: string; label: string; item: PreviewItem }> = [];
    const map = this.uploadMap();
    for (const k of Object.keys(map)) {
      const label = this.keyLabel(k);
      for (const it of map[k]) result.push({ key: k, label, item: it });
    }
    return result;
  });

  // Upload enabled only when:
  // - a valid selection exists,
  // - name provided for Other,
  // - that cert does NOT already have an upload,
  // - global cap not reached.
  readonly canUploadForCurrent = computed(() => {
    const key = this.selectionKey();
    if (!key) return false;
    if (this.hasUploadForCurrent()) return false;
    if (this.hasReachedMax()) return false;
    return true;
  });

  // Confirm becomes available when at least 1 file exists overall and selection is valid
  // (You can relax this if you want confirm even when selection is empty)
  readonly canSubmit = computed(() => this.totalUploads() > 0);

  constructor() {
    addIcons({
      documentOutline,
      closeCircleOutline,
      cloudUploadOutline,
      imagesOutline,
      cameraOutline,
      folderOpenOutline,
      trashOutline,
    });
  }

  // ----- Lifecycle -----
  ngOnInit(): void {
    this.seedSelectedFromInitial(this.initialCertificates);
    if (typeof this.tradeId === 'number') {
      this.fetchCertificates(this.tradeId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCertificates'])
      this.seedSelectedFromInitial(this.initialCertificates);
    if (changes['tradeId'] && typeof this.tradeId === 'number')
      this.fetchCertificates(this.tradeId);
  }

  private seedSelectedFromInitial(
    certs: CertDefinition[] | null | undefined
  ): void {
    const first = (certs ?? []).find(
      (c) => typeof (c as any)?.id === 'number'
    ) as { id?: number } | undefined;
    this.selectedId.set(typeof first?.id === 'number' ? first.id : null);
    this.otherName.set('');
    // keep uploadMap (starts empty)
  }

  private fetchCertificates(tradeId: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.tradesService.getTradeCertificates(tradeId).subscribe({
      next: (data) => {
        const normalized = (data ?? []).map((c: any) => ({
          ...c,
          id: typeof c.id === 'string' ? Number(c.id) : c.id,
        })) as TradeCertificateRef[];
        this.certificates.set(normalized);
      },
      error: () => {
        this.loadError.set('Could not load certificates. Please try again.');
        this.certificates.set([]);
      },
      complete: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ----- Selection -----
  onSelectionChange(value: unknown): void {
    const num = value == null ? null : Number(value);
    const coerced = Number.isFinite(num as number) ? (num as number) : null;
    this.selectedId.set(coerced);
    if (coerced !== OTHER_ID) this.otherName.set('');
    this.warn.set(null);
  }

  clearSelection(): void {
    this.selectedId.set(null);
    this.otherName.set('');
    this.warn.set(null);
  }

  // “Other” input. If there is already an upload for current “Other”, lock editing.
  setOtherName(next: string | null | undefined): void {
    if (this.hasUploadForCurrent()) return; // lock name once uploaded
    const trimmed = (next ?? '').trim();
    this.otherName.set(trimmed);
    this.warn.set(null);
  }

  // ----- Upload UX -----
  async openUploadSheet(fileInput: HTMLInputElement): Promise<void> {
    if (!this.canUploadForCurrent()) {
      if (this.hasReachedMax())
        this.warn.set(`Maximum of ${MAX_UPLOADS} uploads reached.`);
      return;
    }
    await this.ensureMediaPermissions().catch(() => {});
    const sheet = await this.actionSheetCtrl.create({
      header: 'Add certificate',
      buttons: [
        {
          text: 'Choose from library',
          icon: 'images-outline',
          handler: () => this.pickFromLibrary(),
        },
        {
          text: 'Take a photo',
          icon: 'camera-outline',
          handler: () => this.takePhoto(),
        },
        {
          text: 'Choose a file',
          icon: 'folder-open-outline',
          handler: () => fileInput.click(),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async ensureMediaPermissions(): Promise<boolean> {
    try {
      if (!this.platform.is('capacitor')) return true;
      let perms: PermissionStatus = await Camera.checkPermissions();
      const photosOk = perms.photos === 'granted' || perms.photos === 'limited';
      const cameraOk = perms.camera === 'granted';
      if (!photosOk || !cameraOk) {
        perms = await Camera.requestPermissions({
          permissions: ['camera', 'photos'] as CameraPermissionType[],
        });
      }
      return (
        (perms.photos === 'granted' || perms.photos === 'limited') &&
        perms.camera === 'granted'
      );
    } catch {
      return false;
    }
  }

  async pickFromLibrary(): Promise<void> {
    const key = this.selectionKey();
    if (!key) return;
    if (this.guardAddBlocked()) return;

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        promptLabelHeader: 'Select certificate',
      });
      await this.addPhotoAsFile(key, photo);
    } catch {}
  }

  async takePhoto(): Promise<void> {
    const key = this.selectionKey();
    if (!key) return;
    if (this.guardAddBlocked()) return;

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        promptLabelHeader: 'Take certificate photo',
      });
      await this.addPhotoAsFile(key, photo);
    } catch {}
  }

  private async addPhotoAsFile(
    key: string,
    photo: { webPath?: string; mimeType?: string }
  ): Promise<void> {
    if (!photo?.webPath) return;
    const resp = await fetch(photo.webPath);
    const blob = await resp.blob();
    const mime = blob.type || photo.mimeType || 'image/jpeg';
    const name = `certificate_${Date.now()}.${mime.split('/')[1] || 'jpg'}`;
    const file = new File([blob], name, { type: mime });
    this.addFileToKey(key, file);
  }

  onNativeFileChosen(evt: Event): void {
    const key = this.selectionKey();
    if (!key) return;
    if (this.guardAddBlocked()) return;

    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (file) this.addFileToKey(key, file);
    input.value = '';
  }

  private guardAddBlocked(): boolean {
    if (this.hasUploadForCurrent()) {
      this.warn.set('Only one upload allowed for the selected certificate.');
      return true;
    }
    if (this.hasReachedMax()) {
      this.warn.set(`Maximum of ${MAX_UPLOADS} uploads reached.`);
      return true;
    }
    this.warn.set(null);
    return false;
  }

  private addFileToKey(key: string, file: File): void {
    if (this.totalUploads() >= MAX_UPLOADS) {
      this.warn.set(`Maximum of ${MAX_UPLOADS} uploads reached.`);
      return;
    }
    const url = URL.createObjectURL(file);
    const item: PreviewItem = { file, url, name: file.name, mime: file.type };

    this.uploadMap.update((map) => {
      const next = { ...map };
      const existing = next[key] ?? [];
      // enforce single upload per certificate
      if (existing.length > 0) {
        // revoke previous URL (replace)
        URL.revokeObjectURL(existing[0].url);
        next[key] = [item];
      } else {
        next[key] = [item];
      }
      return next;
    });
  }

  removeUploadByKey(key: string): void {
    const list = this.uploadMap()[key] ?? [];
    if (!list.length) return;
    for (const it of list) URL.revokeObjectURL(it.url);
    const next = { ...this.uploadMap() };
    delete next[key];
    this.uploadMap.set(next);
    this.warn.set(null);
  }

  // Optional helper if you ever want “Clear current”
  clearCurrentUpload(): void {
    const key = this.selectionKey();
    if (!key) return;
    this.removeUploadByKey(key);
  }

  confirmSelection(): void {
    // no-op for now
  }
}
