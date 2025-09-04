import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
  computed,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { ActionSheetController, Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { addIcons } from 'ionicons';
import { locate } from 'ionicons/icons';
import { environment } from 'src/app/environment/environment';

export type LocationSelection = {
  placeName: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  radiusMeters: number;
};

@Component({
  selector: 'app-location-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonInput, IonButton],
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss'],
  host: { class: 'location-picker' },
})
export class LocationPickerComponent implements OnInit, OnDestroy {
  constructor() {
    addIcons({ locate });
  }

  initialLat = input<number | null>(null);
  initialLng = input<number | null>(null);
  initialPlace = input<string>('');
  initialRadiusMiles = input<number>(15);

  changed = output<LocationSelection>();

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput', { static: true }) searchInput!: IonInput;

  private map = signal<google.maps.Map | null>(null);
  private marker = signal<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  private circle = signal<google.maps.Circle | null>(null);

  radiusMiles = signal<number>(15);
  searchQuery = signal<string>('');
  centerLatLng = signal<google.maps.LatLngLiteral | null>(null);
  placeName = signal<string>('');
  locationDenied = signal<boolean>(false);

  private autocomplete!: google.maps.places.Autocomplete;
  private dragListener?: google.maps.MapsEventListener;

  private radiusMeters = computed(() =>
    Math.round(this.radiusMiles() * 1609.344)
  );

  private actionSheet = inject(ActionSheetController);

  async ngOnInit() {
    await this.waitForGoogleMaps();

    this.radiusMiles.set(this.initialRadiusMiles());

    let start: google.maps.LatLngLiteral | null =
      this.initialLat() != null && this.initialLng() != null
        ? { lat: this.initialLat()!, lng: this.initialLng()! }
        : null;

    if (!start) {
      try {
        const perm = await Geolocation.requestPermissions();
        const granted =
          perm.location === 'granted' || perm.coarseLocation === 'granted';
        this.locationDenied.set(!granted);

        if (granted) {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 8000,
          });
          start = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        this.locationDenied.set(true);
      }
    }

    if (!start) start = { lat: 55.9533, lng: -3.1883 };

    const map = new google.maps.Map(this.mapEl.nativeElement, {
      center: start,
      zoom: 11,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      gestureHandling: 'greedy',
      mapId: environment.googleMapsMapId,
    });
    this.map.set(map);
    this.centerLatLng.set(start);
    if (this.initialPlace()) this.placeName.set(this.initialPlace());

    const advMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: start,
      gmpDraggable: true,
    });
    this.marker.set(advMarker);

    const circle = new google.maps.Circle({
      map,
      center: start,
      radius: this.radiusMeters(),
      fillColor: '#0a1172',
      fillOpacity: 0.18,
      strokeColor: '#0a1172',
      strokeOpacity: 0.6,
      strokeWeight: 1,
      clickable: false,
    });
    this.circle.set(circle);
    this.fitCircle();
    this.emitSelection();

    this.dragListener = advMarker.addListener(
      'dragend',
      (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const pos = e.latLng.toJSON();
        this.centerLatLng.set(pos);
        this.circle()?.setCenter(pos);
        map.panTo(pos);
        this.fitCircle();
        this.reverseGeocode(pos);
      }
    );

    const inputEl = await this.searchInput.getInputElement();
    this.autocomplete = new google.maps.places.Autocomplete(inputEl, {
      fields: ['geometry', 'name', 'formatted_address'],
      types: ['geocode'],
    });
    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete.getPlace();
      const loc = place.geometry?.location?.toJSON();
      if (!loc) return;
      this.placeName.set(place.formatted_address || place.name || '');
      this.centerLatLng.set(loc);
      this.marker()!.position = loc;
      this.circle()?.setCenter(loc);
      this.map()?.panTo(loc);
      this.fitCircle();
      this.emitSelection();
    });
  }

  ngOnDestroy() {
    this.dragListener?.remove();
  }

  onSearch(v: string) {
    this.searchQuery.set(v);
  }

  async openRadiusSheet() {
    const options = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);

    const sheet = await this.actionSheet.create({
      header: 'Set radius',
      buttons: [
        ...options.map((m) => ({
          text: `${m} miles`,
          handler: () => this.radiusMiles.set(m),
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async useMyLocation() {
    try {
      const perm = await Geolocation.requestPermissions();
      const granted =
        perm.location === 'granted' || perm.coarseLocation === 'granted';
      this.locationDenied.set(!granted);
      if (!granted) return;

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      this.centerLatLng.set(center);
      this.marker()!.position = center;
      this.circle()?.setCenter(center);
      this.map()?.panTo(center);
      this.fitCircle();
      await this.reverseGeocode(center);
      this.emitSelection();
    } catch {
      // ignore
    }
  }

  private async reverseGeocode(pos: google.maps.LatLngLiteral) {
    try {
      const geocoder = new google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: pos });
      if (results?.length) this.placeName.set(results[0].formatted_address);
    } catch {}
  }

  private fitCircle() {
    const c = this.circle();
    const m = this.map();
    if (!c || !m) return;
    const b = c.getBounds();
    if (!b) return;
    m.fitBounds(b, {
      top: 120,
      right: 28,
      bottom: 160,
      left: 28,
    } as any);
    if (m.getZoom()! > 16) m.setZoom(16);
  }

  private emitSelection() {
    const center = this.centerLatLng();
    if (!center) return;
    this.changed.emit({
      placeName: this.placeName(),
      lat: center.lat,
      lng: center.lng,
      radiusMiles: this.radiusMiles(),
      radiusMeters: this.radiusMeters(),
    });
  }

  private async waitForGoogleMaps(): Promise<void> {
    const exists = () =>
      typeof (window as any).google !== 'undefined' && !!google.maps;
    if (exists()) return;
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const id = setInterval(() => {
        if (exists()) {
          clearInterval(id);
          resolve();
        } else if (Date.now() - start > 8000) {
          clearInterval(id);
          reject(new Error('Google Maps SDK not loaded'));
        }
      }, 50);
    });
  }
}
