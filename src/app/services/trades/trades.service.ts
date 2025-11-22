import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Trades, TradeSubcategories } from 'src/app/interfaces/trades';
import { environment } from 'src/app/environment/environment';
import { TradeCertificateRef } from 'src/app/interfaces/certificate';

@Injectable({ providedIn: 'root' })
export class TradesService {
  private http = inject(HttpClient);

  getTrades(): Observable<Trades[]> {
    return this.http.get<Trades[]>(
      `${environment.apiEndpoint}/api/reference/trades`
    );
  }

  getTradeSubcategories(tradeId: number): Observable<TradeSubcategories[]> {
    return this.http.get<TradeSubcategories[]>(
      `${environment.apiEndpoint}/api/reference/trades/${tradeId}/subcategories`
    );
  }

  getTradeSubcategoriesByName(
    tradeName?: string
  ): Observable<TradeSubcategories[]> {
    return this.http.get<TradeSubcategories[]>(
      `${environment.apiEndpoint}/api/reference/trades/${tradeName}/subcategories`
    );
  }

  getTradeCertificates(tradeId: number): Observable<TradeCertificateRef[]> {
    return this.http.get<TradeCertificateRef[]>(
      `${environment.apiEndpoint}/api/reference/trades/${tradeId}/certificates`
    );
  }

  getTradeCertificatesByName(
    tradeName: string
  ): Observable<TradeCertificateRef[]> {
    const encoded = encodeURIComponent(tradeName.trim());
    return this.http.get<TradeCertificateRef[]>(
      `${environment.apiEndpoint}/api/reference/trades/by-name/${encoded}/certificates`
    );
  }
}
