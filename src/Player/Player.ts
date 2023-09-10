export class Player {
  private _name: string;
  private _money: number;

  constructor(name: string) {
    this._name = name;
    this._money = 1500;
  }
  get name() {
    return this._name;
  }
  get money() {
    return this._money;
  }
}
