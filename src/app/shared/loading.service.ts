import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new Subject<boolean>();
  public isLoading$: Observable<boolean> = this.loadingSubject.asObservable();
  activateLoading(): void {
    this.loadingSubject.next(true);
  }

  deactivateLoading(): void {
    this.loadingSubject.next(false);
  }
}