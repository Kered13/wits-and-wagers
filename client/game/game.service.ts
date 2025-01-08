import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { GameJson } from '../../shared/game/game.interface';


@Injectable({providedIn: 'root'})
export class GameService {
  private game: GameJson = {counter: 0};
  private counterUpdated: Subject<GameJson> = new Subject<GameJson>();

  constructor() { }

  getGameState(): GameJson {
    return this.game;
  }
  
  getGameUpdateListener(): Observable<GameJson> {
    return this.counterUpdated.asObservable();
  }
  
  addOne(): void {
    this.game.counter++;
    this.counterUpdated.next(this.game);
  }
  
  resetCounter(): void {
    this.game.counter = 0;
    this.counterUpdated.next(this.game);
  }
}
